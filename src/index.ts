import {
  Server,
  Document,
  onStoreDocumentPayload,
  afterLoadDocumentPayload,
} from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Elasticsearch } from '@cofacts/hocuspocus-extension-elasticsearch';
import { Snapshot, addVersion } from './snapshot';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import { Node } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import elasticsearch from '@elastic/elasticsearch';
import 'dotenv/config';

const elasticsearchOpts: elasticsearch.ClientOptions = {
  node: process.env.ELASTICSEARCH_URL,
};

const afterLoadDocument = async ({ document }: afterLoadDocumentPayload) => {
  // migration script, for those article had transcript already but didn't have version snapshots
  if (
    document.getArray('versions').length === 0 &&
    document.getXmlFragment('prosemirror').toJSON()
  ) {
    console.log('Snapshot doc: ', document.name);
    addVersion(document);
  }
};

const storeArticleText = async (data: onStoreDocumentPayload) => {
  try {
    // console.log(data.document.getXmlFragment('prosemirror').toJSON());
    // output: `<paragraph>First line</paragraph><paragraph>Second line</paragraph>`
    // We should parse it to plaintext
    const text = docToPlainText(data.document);

    const db = new elasticsearch.Client(elasticsearchOpts);
    await db?.update({
      index: 'articles',
      type: 'doc',
      id: data.documentName,
      body: {
        doc: {
          text,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (e) {
    console.error(e);
  }
};

const docToPlainText = (document: Document) => {
  // get prosemirror json
  const json = yDocToProsemirrorJSON(document);
  // get prosemirror doc
  const doc = Node.fromJSON(schema, json);
  // get plaintext
  let text = '';
  doc.content.forEach((node, offset, index) => {
    // console.log(node.textContent);
    // console.log(node.type.name);
    if (node.textContent) {
      text += node.textContent;
    }
    text += '\n';
  });
  return text;
};

const server = Server.configure({
  yDocOptions: { gc: false, gcFilter: () => true },
  port: process.env.PORT ? Number(process.env.PORT) : 1234,
  afterLoadDocument,
  onStoreDocument: storeArticleText,
  extensions: [
    new Logger(),
    new Snapshot(),
    new Elasticsearch({ elasticsearchOpts }),
  ],
});

server.listen();

import { Server, Document, onStoreDocumentPayload } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Elasticsearch } from '@cofacts/hocuspocus-extension-elasticsearch';
import { Snapshot } from './snapshot.js';
import { Contributors } from './contributors.js';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import { Node } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { Client, type ClientOptions } from '@elastic/elasticsearch';
import 'dotenv/config';

const elasticsearchOpts: ClientOptions = {
  node: process.env.ELASTICSEARCH_URL,
};
const db = new Client(elasticsearchOpts);

const storeArticleText = async (data: onStoreDocumentPayload) => {
  try {
    // console.log(data.document.getXmlFragment('prosemirror').toJSON());
    // output: `<paragraph>First line</paragraph><paragraph>Second line</paragraph>`
    // We should parse it to plaintext
    const text = docToPlainText(data.document);

    await db?.update({
      index: 'articles',
      id: data.documentName,
      doc: {
        text,
        updatedAt: new Date().toISOString(),
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

const server = new Server({
  yDocOptions: { gc: false, gcFilter: () => true },
  port: process.env.PORT ? Number(process.env.PORT) : 1234,
  onStoreDocument: storeArticleText,
  extensions: [
    new Logger(),
    new Snapshot(),
    new Elasticsearch({ elasticsearchOpts }),
    new Contributors(),
  ],
});

server.listen();

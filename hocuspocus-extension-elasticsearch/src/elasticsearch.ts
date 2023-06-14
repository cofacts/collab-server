import {
  Database,
  DatabaseConfiguration,
} from '@hocuspocus/extension-database';
import { Document } from '@hocuspocus/server';
import elasticsearch from '@elastic/elasticsearch';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import { Node } from 'prosemirror-model';
import { schema } from './schema';

export interface ElasticsearchConfiguration extends DatabaseConfiguration {
  elasticsearchOpts?: elasticsearch.ClientOptions;
  dbIndex?: string;
}

export class Elasticsearch extends Database {
  db?: elasticsearch.Client;
  dbIndex: string;

  configuration: ElasticsearchConfiguration = {
    fetch: async ({ documentName }) => {
      // console.log(`DB fetch ${documentName}`);
      try {
        const {
          body: {
            _source: { ydoc: data },
          },
        } =
          (await this.db?.get({
            index: this.dbIndex,
            id: documentName,
            type: 'doc',
          })) || {};

        return Buffer.from(data, 'base64');
      } catch (e) {
        // console.log(JSON.stringify(e));
        if (e.meta.statusCode !== 404) {
          console.error(e);
        }
        return null;
      }
    },
    store: async ({ documentName, state, document }) => {
      // console.log(`DB store ${state}`)
      await this.db?.update({
        index: this.dbIndex,
        type: 'doc',
        id: documentName,
        body: {
          doc: {
            // elasticsearch stores binary as a Base64 encoded string
            // https://www.elastic.co/guide/en/elasticsearch/reference/current/binary.html
            ydoc: state.toString('base64'),
          },
          upsert: {
            ydoc: state.toString('base64'),
          },
        },
      });

      // console.log(document.getXmlFragment('prosemirror').toJSON());
      // output: `<paragraph>First line</paragraph><paragraph>Second line</paragraph>`
      // We should parse it to plaintext
      const text = this.docToPlainText(document);

      const now = new Date().toISOString();
      await this.db?.update({
        index: 'articles',
        type: 'doc',
        id: documentName,
        body: {
          doc: {
            text,
            updatedAt: now,
          },
        },
      });
    },
  };

  constructor(configuration?: Partial<ElasticsearchConfiguration>) {
    super({});
    this.configuration = {
      ...this.configuration,
      ...configuration,
    };
  }

  async onConfigure() {
    const elasticsearchOpts = this.configuration.elasticsearchOpts || {
      node: 'http://localhost:62222',
    };
    this.db = new elasticsearch.Client(elasticsearchOpts);

    this.dbIndex = this.configuration.dbIndex || 'ydocs';
  }

  private docToPlainText(document: Document) {
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
  }
}

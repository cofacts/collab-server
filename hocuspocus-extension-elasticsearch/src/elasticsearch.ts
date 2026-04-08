import {
  Database,
  DatabaseConfiguration,
} from '@hocuspocus/extension-database';
import { Client, type ClientOptions } from '@elastic/elasticsearch';

export interface ElasticsearchConfiguration extends DatabaseConfiguration {
  elasticsearchOpts?: ClientOptions;
  dbIndex?: string;
}

export class Elasticsearch extends Database {
  db?: Client;
  dbIndex: string;

  configuration: ElasticsearchConfiguration = {
    fetch: async ({ documentName }) => {
      // console.log(`DB fetch ${documentName}`);
      try {
        /* istanbul ignore next */
        const result = await this.db?.get<{ ydoc?: string }>({
          index: this.dbIndex,
          id: documentName,
        });
        const data = result?._source?.ydoc;
        if (!data) return null;

        return Buffer.from(data, 'base64');
      } catch (e) {
        // console.log(JSON.stringify(e));
        if (e?.meta?.statusCode !== 404) {
          console.error('[db]', e);
        }
        return null;
      }
    },
    store: async ({ documentName, state }) => {
      // console.log(`DB store ${state}`)
      try {
        /* istanbul ignore next */
        await this.db?.update({
          index: this.dbIndex,
          id: documentName,
          doc: {
            // elasticsearch stores binary as a Base64 encoded string
            // https://www.elastic.co/guide/en/elasticsearch/reference/current/binary.html
            ydoc: state.toString('base64'),
          },
          upsert: {
            ydoc: state.toString('base64'),
          },
        });
      } catch (e) {
        console.error('[db]', e);
      }
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
    /* istanbul ignore next */
    const elasticsearchOpts = this.configuration.elasticsearchOpts || {
      node: 'http://localhost:62222',
    };
    this.db = new Client(elasticsearchOpts);

    this.dbIndex = this.configuration.dbIndex || 'ydocs';
  }
}

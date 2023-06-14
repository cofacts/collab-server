import {
  Database,
  DatabaseConfiguration,
} from '@hocuspocus/extension-database';
import elasticsearch from '@elastic/elasticsearch';

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
      const { body: docExist } =
        (await this.db?.exists({
          index: this.db_index,
          id: documentName,
          type: 'doc',
        })) || {};
      if (!docExist) {
        return null;
      }
      const {
        body: {
          _source: {
            ydoc: { data },
          },
        },
      } =
        (await this.db?.get({
          index: this.db_index,
          id: documentName,
          type: 'doc',
        })) || {};
      // console.log(JSON.stringify(body))

      return Buffer.from(data);
    },
    store: async ({ documentName, state }) => {
      // console.log(`DB store ${state}`)
      await this.db?.update({
        index: this.dbIndex,
        type: 'doc',
        id: documentName,
        body: {
          doc: {
            ydoc: state,
          },
          upsert: {
            ydoc: state,
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
}

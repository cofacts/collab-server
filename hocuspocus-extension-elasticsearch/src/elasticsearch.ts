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
    store: async ({ documentName, state }) => {
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

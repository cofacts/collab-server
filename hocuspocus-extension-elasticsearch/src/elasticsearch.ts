import { Database, DatabaseConfiguration } from '@hocuspocus/extension-database'
import elasticsearch from '@elastic/elasticsearch'

export interface ElasticsearchConfiguration extends DatabaseConfiguration {
  
  elasticsearchOpts?: elasticsearch.ClientOptions
}

export class Elasticsearch extends Database {
  db?: elasticsearch.Client

  configuration: ElasticsearchConfiguration = {
    fetch: async ({ documentName }) => {
      console.log('DB fetch')
      const { body: docExist } = await this.db?.exists({ index: 'ydocs', id: documentName, type: 'doc' }) || {}
      if (!docExist) {
        return ''
      }
      const { body: { _source: { ydoc: { data } } } } = (await this.db?.get({ index: 'ydocs', id: documentName, type: 'doc' })) || {}
      // console.log(JSON.stringify(body))

      return data
    },
    store: async ({ documentName, state }) => {
      // console.log(`DB store ${state}`)
      const result = await this.db?.update({
        index: 'ydocs',
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
      })
      console.log(`DB store result\n${JSON.stringify(result)}`)
    },
  }

  constructor(configuration?: Partial<ElasticsearchConfiguration>) {
    super({})

    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  async onConfigure() {
    this.db = new elasticsearch.Client(this.configuration.elasticsearchOpts)
  }

  async onListen() {
  }
}

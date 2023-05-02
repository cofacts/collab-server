import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Elasticsearch } from '@nonumpa/hocuspocus-extension-elasticsearch'

const server = Server.configure({
  port: 1234,
  address: '127.0.0.1',
  name: 'hocuspocus-fra1-01',
  extensions: [
    new Logger(),
    new Elasticsearch(),
  ],
})

server.listen()

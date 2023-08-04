import { Server } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Elasticsearch } from '@cofacts/hocuspocus-extension-elasticsearch';
import { Snapshot } from './snapshot';
import 'dotenv/config';

const server = Server.configure({
  yDocOptions: { gc: false, gcFilter: () => true },
  port: process.env.PORT ? Number(process.env.PORT) : 1234,
  extensions: [
    new Logger(),
    new Snapshot(),
    new Elasticsearch({
      elasticsearchOpts: { node: process.env.ELASTICSEARCH_URL },
    }),
  ],
});

server.listen();

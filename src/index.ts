import { Server } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Elasticsearch } from '@cofacts/hocuspocus-extension-elasticsearch';
import 'dotenv/config';

const server = Server.configure({
  port: process.env.PORT ? Number(process.env.PORT) : 1234,
  extensions: [
    new Logger(),
    new Elasticsearch({
      elasticsearchOpts: { node: process.env.ELASTICSEARCH_URL },
    }),
  ],
  async onAuthenticate(data) {
    if (process.env.SECRET) {
      // console.log('onAuthenticate ' + data.token);
      const secrets = process.env.SECRET.split(' ');
      if (!secrets.includes(data.token)) {
        throw new Error('Incorrect access token');
        // data.connection.readOnly = true;
      }
    }
    return true;
  },
});

server.listen();

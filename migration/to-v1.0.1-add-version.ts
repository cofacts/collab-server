/**
 * How to use
 *  1. Make sure reindexed the ydocs using `npm run reload -- ydocs` in rumors-db
 *  2. Run `npx ts-node --esm .\migration\migrate_to_v1.0.1.ts`
 */

import { pushVersion } from '../src/snapshot.js';
import * as Y from 'yjs';
import elasticsearch from '@elastic/elasticsearch';
import 'dotenv/config';

const elasticsearchOpts: elasticsearch.ClientOptions = {
  node: process.env.ELASTICSEARCH_URL,
};

const client = new elasticsearch.Client(elasticsearchOpts);

async function main() {
  const size = 1000;
  let from = 0,
    total = Infinity;

  while (total > from) {
    const {
      body: { hits },
    } = await client.search({
      index: 'ydocs',
      type: 'doc',
      from,
      size,
      body: {
        query: {
          match_all: {},
        },
      },
      _source: ['ydoc'],
    });

    const docs = hits.hits;
    total = hits.total;
    from = from + size;
    console.log(`progress: ${from} / ${total}`);
    docs.map(({ _id: id, _source: { ydoc: data } }) => {
      // console.log('id: ', id);
      const update = Buffer.from(data, 'base64');
      const doc = new Y.Doc();
      Y.applyUpdate(doc, update);
      const snapshot = Y.snapshot(doc);
      // console.log('snapshot: ', Y.encodeSnapshot(snapshot));
      pushVersion(id, new Date().toISOString(), Y.encodeSnapshot(snapshot));
    });
  }
}

main().catch(console.error);

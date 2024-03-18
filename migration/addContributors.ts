/**
 * How to use
 *  1. Make sure reindexed the articles using `npm run reload -- articles` in rumors-db
 *  2. Run `npx ts-node --esm ./migration/addContributors.ts`
 */

import * as Y from 'yjs';
import elasticsearch from '@elastic/elasticsearch';
import 'dotenv/config';

const elasticsearchOpts: elasticsearch.ClientOptions = {
  node: process.env.ELASTICSEARCH_URL,
};

const client = new elasticsearch.Client(elasticsearchOpts);
const errorArticles = [];
const usersMap = new Map();

export const getAllContributors = async (
  articleId: string,
  document: Y.Doc,
  versions: { createdAt: string; snapshot: string }[]
) => {
  const contributors = new Map();
  const permanentUserData = new Y.PermanentUserData(document);
  const yXmlFragment = document.getXmlFragment('prosemirror');

  /**
   * @param {'removed'|'added'} type
   * @param {Y.ID} id
   */
  const computeYChange = (type: string, id: Y.ID) => {
    let user =
      type === 'added'
        ? permanentUserData.getUserByClientId(id.client)
        : permanentUserData.getUserByDeletedId(id);

    // fix user === null, item is GCed for unknown reason
    if (!user) {
      document.getMap('users')._map.forEach((item, key) => {
        if (
          item.content.getContent()[item.length - 1]._item.left?.id.client ===
          id.client
        ) {
          user = key;
          return;
        }
      });
      // console.log('unknown user: ', { user, type });
    }
    return { user, type };
  };

  for await (const [i, v] of versions.entries()) {
    const snapshot = Y.decodeSnapshot(Buffer.from(v.snapshot, 'base64'));
    const versionCreatedAt = v.createdAt;
    const versionDate = new Date(versionCreatedAt);
    const prevSnapshot =
      i > 0
        ? Y.decodeSnapshot(Buffer.from(versions[i - 1].snapshot, 'base64'))
        : Y.createSnapshot(Y.createDeleteSet(), new Map());

    for await (const xmlElement of yXmlFragment.toArray()) {
      const fragmentContent = Y.typeListToArraySnapshot(
        xmlElement,
        new Y.Snapshot(prevSnapshot.ds, snapshot.sv)
      );
      for await (const f of fragmentContent) {
        const deltas =
          f.constructor === Y.XmlText
            ? f.toDelta(snapshot, prevSnapshot, computeYChange)
            : undefined;
        if (deltas) {
          for await (const d of deltas) {
            const { attributes } = d;
            if (attributes && attributes.ychange) {
              const { user } = attributes.ychange;
              if (!user) {
                if (errorArticles.at(-1) !== articleId)
                  errorArticles.push(articleId);
                console.log('unknown user in article: ', articleId);
                continue;
              }

              // fix user name is number
              const userId = await getUserId(user.toString());
              if (!userId) {
                continue;
              }

              const contributor = contributors.get(userId);
              if (
                !contributor ||
                versionDate > new Date(contributor.createdAt)
              ) {
                contributors.set(userId, {
                  userId,
                  updatedAt: versionCreatedAt,
                  appId: 'WEBSITE',
                });
              }
            }
          }
        }
      }
    }
  }
  return [...contributors.values()];
};

const forEachYdoc = async (callback) => {
  let scroll_id,
    processedCount = 0,
    total = Infinity;

  const {
    body: { hits, _scroll_id },
  } = await client.search({
    index: 'ydocs',
    type: 'doc',
    scroll: '30s',
    size: 100,
    body: {
      query: {
        match_all: {},
      },
    },
    _source: ['ydoc', 'versions'],
  });

  await callback(hits.hits);

  processedCount += hits.hits.length;
  total = hits.total;
  scroll_id = _scroll_id;

  // eslint-disable-next-line no-console
  console.info(`${processedCount} / ${total} Processed`);
  while (processedCount < total) {
    const {
      body: { hits, _scroll_id },
    } = await client.scroll({
      scroll: '30s',
      scroll_id, // Fix: Change 'scrollId' to 'scroll_id'
    });

    await callback(hits.hits);

    processedCount += hits.hits.length;
    scroll_id = _scroll_id;

    // eslint-disable-next-line no-console
    console.info(`${processedCount} / ${total} Processed`);
  }
};

const getUserId = async (user: string) => {
  let userId: string;
  try {
    const { id } = JSON.parse(user);
    userId = id;
  } catch (e) {
    // console.error('Failed to parse user JSON:', e.message);
  }

  // ychange user is already userId
  if (userId) return userId;

  // ychange user is username, use the name to search/get userId
  try {
    userId = usersMap.get(user);

    if (userId) return userId;

    const {
      body: { hits },
    } = await client.search({
      index: 'users',
      type: 'doc',
      body: {
        query: {
          term: {
            name: user,
          },
        },
      },
      _source: 'false',
    });
    // console.log('hit:', hits);
    if (hits.hits.length === 1) {
      userId = hits.hits[0]._id;
      usersMap.set(user, userId);
    } else if (hits.hits.length === 0) {
      // user not found
      userId = 'USER-NOT-FOUND';
      usersMap.set(user, userId);
      console.log('user not found:', user);
    } else {
      console.log('Error: User format is incorrect: ', hits, ', user: ', user);
      userId = undefined;
    }
  } catch (searchError) {
    console.log(
      'Error occurred while searching for user:',
      searchError.message
    );
    userId = undefined;
  }

  return userId;
};

async function main() {
  // list all ydocs
  await forEachYdoc(async (hits) => {
    const operations = [];
    await Promise.all(
      hits.map(async ({ _id: id, _source: { ydoc: data, versions } }) => {
        if (!id || !data || !versions) {
          // maybe user click the transcribe button but did not save the transcript
          console.log('ydoc error: id, data or versions null: ', id);
          errorArticles.push(id);
          return;
        }

        const result = await client.getSource({
          index: 'articles',
          id,
          type: 'doc',
          _source_includes: ['text'],
        });

        // article text is empty or just '/n'
        if (!result.body?.text.match(/\S/g)) {
          // console.log('empty article text: ', id, result);
          return;
        }

        // restore the document
        const update = Buffer.from(data, 'base64');
        const doc = new Y.Doc({ gc: false });
        Y.applyUpdate(doc, update);

        const contributors = await getAllContributors(id, doc, versions);
        // if (contributors.length > 1) console.log('contributors more then 1: ', contributors, id);

        if (contributors.length === 0) {
          if (errorArticles.at(-1) !== id) errorArticles.push(id);
          return;
        }
        operations.push({
          update: {
            _index: 'articles',
            _type: 'doc',
            _id: id,
          },
        });
        operations.push({
          doc: { contributors },
        });
      })
    );

    if (operations.length !== 0) {
      try {
        const { body: result } = await client.bulk({
          body: operations,
          refresh: 'true',
          _source: 'false',
          timeout: '10m',
        });
        // console.log('result: ', result);
      } catch (e) {
        console.error('error: ', e);
        throw e;
      }
    }
  });
  console.log('usersMap: ', usersMap);
  console.log('errorArticles: ', errorArticles);
}

main().catch(console.error);

import { Extension, Document, onDisconnectPayload } from '@hocuspocus/server';
import { getVersion, equalSnapshots } from './snapshot';
import elasticsearch from '@elastic/elasticsearch';
import 'dotenv/config';

import * as Y from 'yjs';
const elasticsearchOpts: elasticsearch.ClientOptions = {
  node: process.env.ELASTICSEARCH_URL,
};
const db = new elasticsearch.Client(elasticsearchOpts);

export class Contributors implements Extension {
  // make sure this extension runs before Snapshot
  priority = 1000;

  async onDisconnect(data: onDisconnectPayload) {
    await updateContributors(data);
  }
}

// compare current snapshot with previous snapshot to get contributors
export const getContributorsSinceLastTime = async (document: Document) => {
  const versions: { createdAt: string; snapshot: string }[] = await getVersion(
    document
  );
  const prevVersion =
    versions.length === 0 ? null : versions[versions.length - 1];

  const prevSnapshot =
    prevVersion === null
      ? Y.emptySnapshot
      : Y.decodeSnapshot(Buffer.from(prevVersion.snapshot, 'base64'));
  const snapshot = Y.snapshot(document);

  // use the same createdAt for all contributors in the same snapshot
  const now = new Date();
  const contributors = new Map();

  // for computeYChange to get user data
  const permanentUserData = new Y.PermanentUserData(document);
  const yXmlFragment = document.getXmlFragment('prosemirror');

  /**
   * @param {'removed'|'added'} type
   * @param {Y.ID} id
   */
  const computeYChange = (type: string, id: Y.ID) => {
    const user =
      type === 'added'
        ? permanentUserData.getUserByClientId(id.client)
        : permanentUserData.getUserByDeletedId(id);
    const userId = JSON.parse(user).id;
    return {
      userId,
      type,
    };
  };

  if (equalSnapshots(document, prevSnapshot, snapshot)) return [];

  yXmlFragment.forEach((xmlElement) => {
    const fragmentContent = Y.typeListToArraySnapshot(
      xmlElement,
      new Y.Snapshot(prevSnapshot.ds, snapshot.sv)
    );
    fragmentContent.forEach((f) => {
      const deltas =
        f.constructor === Y.XmlText
          ? f.toDelta(snapshot, prevSnapshot, computeYChange)
          : undefined;
      deltas.forEach((d) => {
        const { attributes } = d;
        if (attributes && attributes.ychange) {
          const { userId } = attributes.ychange;
          const contributor = contributors.get(userId);
          if (!contributor) {
            contributors.set(userId, {
              userId,
              updatedAt: now.toISOString(),
              appId: 'WEBSITE',
            });
          }
        }
      });
    });
  });
  return contributors;
};

export const updateContributors = async (data: onDisconnectPayload) => {
  try {
    const contributors = [
      ...(await getContributorsSinceLastTime(data.document)).values(),
    ];
    console.log('contributors: ', contributors);
    await db?.update({
      index: 'articles',
      type: 'doc',
      id: data.documentName,
      body: {
        script: {
          source: `
            if (ctx._source.contributors == null) {
            ctx._source.contributors = [];
            }
            
            def existingContributors = [:];
            for (def contributor : ctx._source.contributors) {
                existingContributors[contributor.userId] = contributor;
            }
            
            for (def contributor : params.contributors) {
                existingContributors[contributor.userId] = contributor;
            }
            
            ctx._source.contributors = existingContributors.values();
          `,
          params: {
            contributors,
          },
          lang: 'painless',
        },
        refresh: true,
      },
    });
  } catch (e) {
    console.error(e);
  }
};

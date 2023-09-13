import { Extension, onDisconnectPayload, Document } from '@hocuspocus/server';
import * as Y from 'yjs';
import elasticsearch from '@elastic/elasticsearch';
import 'dotenv/config';

export class Snapshot implements Extension {
  async onDisconnect(data: onDisconnectPayload) {
    addVersion(data.document);
  }
}

const elasticsearchOpts: elasticsearch.ClientOptions = {
  node: process.env.ELASTICSEARCH_URL,
};

const db = new elasticsearch.Client(elasticsearchOpts);

/**
 * Add a snapshot for current doc
 * ref: https://github.com/yjs/yjs-demos/blob/d8e33e619d6f2da0fae0c6a361286e6901635a9b/prosemirror-versions/prosemirror-versions.js#L26
 * @param {Document} doc
 */
export const addVersion = async (doc: Document) => {
  const versions: { createdAt: string; snapshot: string }[] = await getVersion(doc);
  console.log(versions);
  const prevVersion: {
    createdAt: string;
    snapshot: string;
  } = versions.length === 0 ? null : versions[versions.length - 1];
  console.log(prevVersion);
  const prevSnapshot =
    prevVersion === null
      ? Y.emptySnapshot
      : Y.decodeSnapshot(Buffer.from(prevVersion.snapshot, 'base64'));
  const snapshot = Y.snapshot(doc);

  if (!equalSnapshots(doc, prevSnapshot, snapshot)) {
    pushVersion(doc.name, new Date().toISOString(), Y.encodeSnapshot(snapshot));
  }
};

export const equalSnapshots = (
  doc: Y.Doc,
  snap1: Y.Snapshot,
  snap2: Y.Snapshot
) => {
  const doc1 = Y.createDocFromSnapshot(doc, snap1);
  const doc2 = Y.createDocFromSnapshot(doc, snap2);

  return (
    doc1.getXmlFragment('prosemirror').toString() ===
    doc2.getXmlFragment('prosemirror').toString()
  );
};

export const getVersion = async (
  doc: Document
): Promise<{ createdAt: string; snapshot: string }[]> => {
  try {
    // const db = new elasticsearch.Client(elasticsearchOpts);
    const result = await db?.getSource({
      index: 'ydocs',
      id: doc.name,
      type: 'doc',
      _source_includes: ['versions'],
    });

    return result.body?.versions || [];
  } catch (e) {
    if (!e.meta) {
      console.error('[snapshot]', e);
    } else if (e.meta.statusCode !== 404) {
      console.error('[snapshot]', JSON.stringify(e));
    }
    return [];
  }
};

export const pushVersion = async (
  docName: string,
  createdAt: string,
  snapshot: Uint8Array
) => {
  try {
    const s = Buffer.from(snapshot).toString('base64');

    const version: { createdAt: string; snapshot: string } = {
      createdAt,
      snapshot: s,
    };
    await db.update({
      index: 'ydocs',
      type: 'doc',
      id: docName,
      body: {
        script: {
          source: `
              if(ctx._source.versions == null) {
                ctx._source.versions = [];
              }
              ctx._source.versions.add(params.version);
            `,
          params: {
            // elasticsearch stores binary as a Base64 encoded string
            // https://www.elastic.co/guide/en/elasticsearch/reference/current/binary.html
            version,
          },
          lang: 'painless',
        },
        refresh: true,
      },
    });
  } catch (e) {
    if (!e.meta) {
      console.error('[snapshot]', e);
    } else if (e.meta.statusCode !== 404) {
      console.error('[snapshot]', JSON.stringify(e));
    }
  }
};

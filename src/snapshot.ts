import { Extension, onDisconnectPayload } from '@hocuspocus/server';
import * as Y from 'yjs';

export class Snapshot implements Extension {
  async onDisconnect(data: onDisconnectPayload) {
    addVersion(data.document);
  }
}

/**
 * Add a snapshot for current doc
 * ref: https://github.com/yjs/yjs-demos/blob/d8e33e619d6f2da0fae0c6a361286e6901635a9b/prosemirror-versions/prosemirror-versions.js#L26
 * @param {Y.Doc} doc
 */
export const addVersion = (doc: Y.Doc) => {
  const versions: Y.Array<{
    date: number;
    snapshot: Uint8Array;
  }> = doc.getArray('versions');
  const prevVersion: {
    date: number;
    snapshot: Uint8Array;
  } = versions.length === 0 ? null : versions.get(versions.length - 1);
  const prevSnapshot =
    prevVersion === null
      ? Y.emptySnapshot
      : Y.decodeSnapshot(prevVersion.snapshot);
  const snapshot = Y.snapshot(doc);

  if (!equalSnapshots(doc, prevSnapshot, snapshot)) {
    // console.log('current clientID: ', doc.clientID);
    versions.push([
      {
        date: new Date().getTime(),
        snapshot: Y.encodeSnapshot(snapshot),
      },
    ]);
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

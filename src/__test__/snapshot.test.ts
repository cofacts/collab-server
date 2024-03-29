import {
  newHocuspocus,
  syncedNewHocuspocusProvider,
  delayForMs,
} from 'test/utils';
import { Snapshot } from '../snapshot';
import elasticsearch from '@elastic/elasticsearch';
import Y from 'yjs';

describe('Snapshot extension', () => {
  const elasticsearchOpts: elasticsearch.ClientOptions = {
    node: process.env.ELASTICSEARCH_URL,
  };
  afterEach(async () => {
    // server.destroy() does not resolve after cleanup functions such as onStoreDocument called
    // thus we should wait for these functions finished
    await delayForMs(1000);
  });

  it('store snapshot', async () => {
    const dbIndex = 'ydocs';
    const documentName = 'hocuspocus-test';
    const db = new elasticsearch.Client(elasticsearchOpts);

    // create the ydoc for Snapshot extension to update
    await db?.index({
      index: dbIndex,
      type: 'doc',
      id: documentName,
      body: {
        doc: {
          ydoc: 'mockydoc',
        },
      },
    });

    const server = await newHocuspocus({
      yDocOptions: { gc: false, gcFilter: () => true },
      port: 1234,
      extensions: [new Snapshot()],
    });

    // Note: newHocuspocusProvider's default is connected to 'hocuspocus-test'
    const provider = await syncedNewHocuspocusProvider(server);
    const ydoc = provider.document;
    // mock prosemirror input
    ydoc.getXmlFragment('prosemirror').insert(0, [new Y.XmlText('foo')]);
    provider.configuration.websocketProvider.disconnect();
    provider.disconnect();

    // wait for Snapshot.addVersion which is called when provider disconnected
    // server should destroy after Snapshot.addVersion finished
    await delayForMs(1000);

    await server.destroy();
    const result = await db?.getSource({
      index: dbIndex,
      id: documentName,
      type: 'doc',
      _source_includes: ['versions'],
    });

    // snapshot binary is different every time, because ydoc has some random variable values such as clientId
    // we just check the snapshot size
    expect(result.body.versions[0].snapshot.length).toMatchInlineSnapshot(`12`);
  });
});

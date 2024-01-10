import {
  newHocuspocus,
  syncedNewHocuspocusProvider,
  delayForMs,
} from 'test/utils';
import { Elasticsearch } from '../elasticsearch';
import elasticsearch from '@elastic/elasticsearch';

describe('elasticsearch extension', () => {
  const elasticsearchOpts: elasticsearch.ClientOptions = {
    node: process.env.ELASTICSEARCH_URL,
  };
  afterEach(async () => {
    // server.destroy() does not resolve after cleanup functions such as onStoreDocument called
    // thus we should wait for these functions finished
    await delayForMs(1000);
  });

  it('return default ydoc when fetched documentName does not exist', async () => {
    const server = await newHocuspocus({
      yDocOptions: { gc: false, gcFilter: () => true },
      port: process.env.PORT ? Number(process.env.PORT) : 1234,
      extensions: [
        new Elasticsearch({
          elasticsearchOpts,
        }),
      ],
    });

    const provider = await syncedNewHocuspocusProvider(server);
    expect(provider.document.share.size).toBe(0);
    provider.configuration.websocketProvider.disconnect();
    provider.disconnect();

    await server.destroy();
  });

  it('return fetched ydoc', async () => {
    const textName = 'test_name';
    const server = await newHocuspocus({
      yDocOptions: { gc: false, gcFilter: () => true },
      port: process.env.PORT ? Number(process.env.PORT) : 1234,
      extensions: [
        new Elasticsearch({
          elasticsearchOpts,
        }),
      ],
    });
    const provider1 = await syncedNewHocuspocusProvider(server);
    const ydoc = provider1.document;
    ydoc.getText(textName).insert(0, 'foo');
    provider1.configuration.websocketProvider.disconnect();
    provider1.disconnect();

    const provider2 = await syncedNewHocuspocusProvider(server);
    expect(provider2.document.getText(textName)).toMatchInlineSnapshot(`"foo"`);
    provider2.configuration.websocketProvider.disconnect();
    provider2.disconnect();

    await server.destroy();
  });

  it('logs error', async () => {
    jest.spyOn(global.console, 'error');
    const server = await newHocuspocus({
      yDocOptions: { gc: false, gcFilter: () => true },
      port: 1234,

      extensions: [
        new Elasticsearch({
          elasticsearchOpts: {
            node: 'https://wrong-url/',
          },
        }),
      ],
    });
    const provider = await syncedNewHocuspocusProvider(server);
    expect(console.error).toBeCalledTimes(1);
    provider.configuration.websocketProvider.disconnect();
    provider.disconnect();

    // Note: console.error will be called again because onStoreDocument will be called as server cleanup
    await server.destroy();
  });
});

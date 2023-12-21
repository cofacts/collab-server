import { newHocuspocus, newHocuspocusProvider, delayForMs } from 'test/utils';
import { Elasticsearch } from '../elasticsearch';
import elasticsearch from '@elastic/elasticsearch';

describe('elasticsearch extension', () => {
  const elasticsearchOpts: elasticsearch.ClientOptions = {
    node: process.env.ELASTICSEARCH_URL,
  };
  afterEach(async () => {
    // wait for server async function such as onStoreDocument finished
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
    const provider = newHocuspocusProvider(server, {
      onSynced() {
        expect(provider.document.share.size).toBe(0);
        provider.configuration.websocketProvider.disconnect();
        provider.disconnect();
      },
    });

    // wait for provider to connect(onSynced) and close
    await delayForMs(1000);
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
    const provider1 = newHocuspocusProvider(server, {
      onSynced() {
        const ydoc = provider1.document;
        ydoc.getText(textName).insert(0, 'foo');
        provider1.configuration.websocketProvider.disconnect();
        provider1.disconnect();
      },
    });

    // wait for provider1 to connect(onSynced) and close
    await delayForMs(1000);

    const provider2 = newHocuspocusProvider(server, {
      onSynced() {
        expect(provider2.document.getText(textName)).toMatchInlineSnapshot(
          `"foo"`
        );
        provider2.configuration.websocketProvider.disconnect();
        provider2.disconnect();
      },
    });

    // wait for provider2 to connect(onSynced) and close
    await delayForMs(1000);
    await server.destroy();
  });

  it('logs error', (resolve) => {
    jest.spyOn(global.console, 'error');
    newHocuspocus({
      yDocOptions: { gc: false, gcFilter: () => true },
      port: 1234,

      extensions: [
        new Elasticsearch({
          elasticsearchOpts: {
            node: 'https://wrong-url/',
          },
        }),
      ],
    }).then((server) => {
      newHocuspocusProvider(server, {
        onSynced() {
          expect(console.error).toBeCalledTimes(1);
          server.destroy().then(resolve());
        },
      });
    });
  });
});

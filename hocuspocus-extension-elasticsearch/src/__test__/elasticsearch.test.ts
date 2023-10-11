import { newHocuspocus, newHocuspocusProvider, delayForMs } from 'test/utils';
import { Elasticsearch } from '../elasticsearch';
import elasticsearch from '@elastic/elasticsearch';

describe('elasticsearch extension', () => {
  let server;
  const elasticsearchOpts: elasticsearch.ClientOptions = {
    node: process.env.ELASTICSEARCH_URL,
  };
  beforeAll(async () => {
    server = await newHocuspocus({
      yDocOptions: { gc: false, gcFilter: () => true },
      port: process.env.PORT ? Number(process.env.PORT) : 1234,

      extensions: [
        new Elasticsearch({
          elasticsearchOpts,
        }),
      ],
    });
  });
  afterAll(async () => {
    await server.destroy();
    await delayForMs(1000);
  });

  it('return default ydoc when fetched documentName does not exist', (resolve) => {
    const provider = newHocuspocusProvider(server, {
      onSynced() {
        expect(provider.document.share.size).toBe(0);
        provider.disconnect();
        provider.destroy();
        resolve();
      },
    });
  });

  it('return fetched ydoc', async () => {
    const textName = 'test_name';

    const provider1 = newHocuspocusProvider(server, {
      onSynced() {
        const ydoc = provider1.document;
        ydoc.getText(textName).insert(0, 'foo');
        provider1.disconnect();
        provider1.destroy();
      },
    });

    // wait for provider1 to connect and close
    await delayForMs(1000);

    const provider2 = newHocuspocusProvider(server, {
      onSynced() {
        expect(provider2.document.getText(textName)).toMatchInlineSnapshot(
          `"foo"`
        );
        provider2.disconnect();
        provider2.destroy();
      },
    });
    // wait for provider2 to connect and close
    await delayForMs(1000);
  });

  it('logs error', (resolve) => {
    newHocuspocus({
      yDocOptions: { gc: false, gcFilter: () => true },
      port: 12345,

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
          server.destroy().then(resolve());
        },
      });
    });
  });
});

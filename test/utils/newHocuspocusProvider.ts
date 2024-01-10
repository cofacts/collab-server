import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
  HocuspocusProviderWebsocketConfiguration,
} from '@hocuspocus/provider';
import { Hocuspocus } from '@hocuspocus/server';
import { newHocuspocusProviderWebsocket } from './newHocuspocusProviderWebsocket';

export const newHocuspocusProvider = (
  server: Hocuspocus,
  options: Partial<HocuspocusProviderConfiguration> = {},
  websocketOptions: Partial<HocuspocusProviderWebsocketConfiguration> = {}
): HocuspocusProvider => {
  return new HocuspocusProvider({
    websocketProvider: newHocuspocusProviderWebsocket(server, websocketOptions),
    // Just use a generic document name for all tests.
    name: 'hocuspocus-test',
    // There is no need to share data with other browser tabs in the testing environment.
    broadcast: false,
    // We don’t need console logging in tests. If we actually do, we can overwrite it anyway.
    quiet: true,
    // Add or overwrite settings, depending on the test case.
    ...options,
  });
};

export const syncedNewHocuspocusProvider = (
  server: Hocuspocus,
  options: Partial<HocuspocusProviderConfiguration> = {},
  websocketOptions: Partial<HocuspocusProviderWebsocketConfiguration> = {}
): Promise<HocuspocusProvider> => {
  return new Promise<HocuspocusProvider>((resolve) => {
    const provider = newHocuspocusProvider(server, options, websocketOptions);
    provider.on('synced', () => {
      provider.off('synced');
      resolve(provider);
    });
  });
};

import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
  HocuspocusProviderWebsocketConfiguration,
} from '@hocuspocus/provider';
import { Server } from '@hocuspocus/server';
import { newHocuspocusProviderWebsocket } from './newHocuspocusProviderWebsocket';

export const newHocuspocusProvider = (
  server: Server,
  options: Partial<HocuspocusProviderConfiguration> = {},
  websocketOptions: Partial<HocuspocusProviderWebsocketConfiguration> = {}
): HocuspocusProvider => {
  const provider = new HocuspocusProvider({
    websocketProvider: newHocuspocusProviderWebsocket(server, websocketOptions),
    // Just use a generic document name for all tests.
    name: 'hocuspocus-test',
    // Add or overwrite settings, depending on the test case.
    ...options,
  });
  // In v3, providers with a shared websocketProvider must call attach()
  // to start sending sync messages.
  provider.attach();
  return provider;
};

export const syncedNewHocuspocusProvider = (
  server: Server,
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

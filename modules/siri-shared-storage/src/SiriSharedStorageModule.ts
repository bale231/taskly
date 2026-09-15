import { NativeModule, requireNativeModule } from 'expo';

declare class SiriSharedStorageModule extends NativeModule<{}> {
  isAvailable(): boolean;
  setTodoLists(lists: { id: number; name: string }[]): void;
  setTokens(accessToken: string, refreshToken: string): void;
  clearTokens(): void;
}

export default requireNativeModule<SiriSharedStorageModule>('SiriSharedStorage');

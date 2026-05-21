declare module 'use-intl' {
  interface AppConfig {
    Messages: typeof import('../../messages/ko.json').default;
  }
}

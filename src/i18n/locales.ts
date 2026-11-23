// TASK-B-350 (Issue #1292): 로케일 상수 — next-intl 런타임에 의존하지 않는 단일 출처.
// `src/i18n/routing.ts`(defineRouting)와 서버 액션 헬퍼(`src/lib/i18n/action-error.ts`)가
// 함께 사용한다. 라우팅 모듈은 `createNavigation()`까지 포함해 클라이언트 번들 의존성이 있으므로,
// 서버 액션/테스트에서는 이 모듈만 참조한다.
export const LOCALES = ['ko', 'en', 'zh', 'ja'] as const;

export type Locale = (typeof LOCALES)[number];

/** 로케일 해석 실패 시 폴백 (next-intl `routing.defaultLocale`과 동일) */
export const DEFAULT_LOCALE: Locale = 'ko';

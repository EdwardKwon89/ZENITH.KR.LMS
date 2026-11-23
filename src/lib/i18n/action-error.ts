// TASK-B-350 (Issue #1292, 부모 #1280): 서버 액션용 로케일 오류 문구 헬퍼.
//
// 확정 방식(안 ②): 서버 액션이 현재 로케일의 문장을 반환하고, 기존 `{ error: string }`
// 계약은 유지한다. 메시지는 `messages/{ko,en,zh,ja}.json`의 `Errors` 네임스페이스에서 읽는다.
//
// 로케일 해석: next-intl 미들웨어가 Server Action POST에도 `x-next-intl-locale`을 주입하며
// (실증: TASK-B-350 task file §2 — /ko·/en·/zh·/ja 실제 응답), 요청 컨텍스트가 없는
// 테스트/스크립트에서는 라우팅 기본 로케일('ko')로 폴백한다.
import { getLocale, getTranslations } from 'next-intl/server';
import type koMessages from '../../../messages/ko.json';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/locales';

/** `Errors` 네임스페이스의 키 (ko.json 기준) */
export type ErrorKey = keyof (typeof koMessages)['Errors'];

/** 현재 요청 로케일을 해석한다. 실패·미지원 로케일은 기본 로케일('ko')로 폴백. */
export async function actionLocale(): Promise<string> {
  try {
    const locale = await getLocale();
    return (LOCALES as readonly string[]).includes(locale) ? locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** 로케일별 오류 문장을 반환한다. `params`는 ICU 플레이스홀더({code}, {fields})에 치환된다. */
export async function trError(
  key: ErrorKey,
  params?: Record<string, string | number>,
): Promise<string> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'Errors' });
  return params ? t(key, params) : t(key);
}

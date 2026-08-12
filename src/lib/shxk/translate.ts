// SHXK 응답 중문 텍스트 로케일 번역 유틸 (TASK-B-290 / Issue #1085 / DEF-B-060)
//
// SHXK gettrack/gettrackingnumber 등 응답의 track_description/cnmessage 등이 중문 원문으로
// 내려온다. track_description_en은 신뢰 불가(실측 12건 중 2건만 실제 영어)하므로,
// 앱 자체의 정적 중→한/영 사전으로 번역해 ko/en 로케일에 표출한다.
//
// 이 모듈은 트래킹 이벤트 전용이 아니라 SHXK 응답 전체에 재사용 가능한 범용 시그니처로 작성한다.

// ─── 정적 중→한/영 사전 ─────────────────────────────────────────────────────
// 2026-08-12 실측 응답(1ZJ443D30403088388) 및 SHXK 공통 문구 기반 시딩.
// 사전에 없는 문구는 강제 번역하지 않고 원문 유지한다(translateShxkText → null).
export const SHXK_TRANSLATION_DICT: Record<string, { ko: string; en: string }> = {
  '离开设施': { ko: '시설을 출발했습니다', en: 'Departed from facility' },
  '抵达设施': { ko: '시설에 도착했습니다', en: 'Arrived at facility' },
  '取件扫描': { ko: '픽업 스캔 완료', en: 'Pickup scan' },
  '出口扫描': { ko: '수출 스캔 완료', en: 'Export scan' },
  '您的包裹正在途中': { ko: '패키지가 배송 중입니다', en: 'Your package is on the way' },
  '我们正在遇到运输延迟': { ko: '운송 지연이 발생하고 있습니다', en: 'We are experiencing a transport delay' },
  '发件人已创建标签': { ko: '발송인이 라벨을 생성했습니다', en: 'The shipper has created a label' },
  '包裹到达操作中心': { ko: '패키지가 운영 센터에 도착했습니다', en: 'Package arrived at operations center' },
  '包裹操作完成': { ko: '패키지 처리 완료', en: 'Package processing completed' },
  '包裹正在运输中': { ko: '패키지가 운송 중입니다', en: 'Package is in transit' },
  '包裹已送达': { ko: '패키지가 배송 완료되었습니다', en: 'Package delivered' },
  '尝试递送失败': { ko: '배송 시도 실패', en: 'Delivery attempt failed' },
  '正在派送': { ko: '배송 중입니다', en: 'Out for delivery' },
  '跟踪号码不存在': { ko: '운송장 번호가 존재하지 않습니다', en: 'Tracking number does not exist' },
};

// ─── 번역 함수 ──────────────────────────────────────────────────────────────

/**
 * 중문 텍스트를 ko/en 번역본으로 변환한다.
 * 사전에 정확히 일치하는 문구가 없으면 null 반환(원문 유지, 강제 번역 금지).
 */
export function translateShxkText(zh: string | null | undefined): { ko: string; en: string } | null {
  if (!zh) return null;
  const hit = SHXK_TRANSLATION_DICT[zh.trim()];
  if (!hit) return null;
  return { ko: hit.ko, en: hit.en };
}

/**
 * 로케일에 따라 표출 문자열을 결정한다.
 * - ko: ko 번역본(없으면 중문 원문)
 * - zh: 중문 원문
 * - 그 외(en/ja 등): en 번역본(없으면 중문 원문)
 */
export function pickShxkLocaleText(
  locale: string,
  zh: string,
  ko?: string | null,
  en?: string | null,
): string {
  if (locale === 'ko') return ko || zh;
  if (locale === 'zh') return zh;
  return en || zh;
}

// SHXK 응답 중문 텍스트 로케일 번역 유틸 (TASK-B-290 / Issue #1085 / DEF-B-060)
//
// SHXK gettrack/gettrackingnumber 등 응답의 track_description/cnmessage 등이 중문 원문으로
// 내려온다. track_description_en은 신뢰 불가(실측 12건 중 2건만 실제 영어)이므로,
// 앱 자체의 정적 중→4개 로케일 사전으로 번역해 표출한다.
//
// TASK-B-351 (Issue #1299): ko/en 2개 → **ko/en/zh/ja 4개**로 확장.
//   - zh 는 중문 원문을 그대로 사용한다.
//   - 오류 문구는 **실제 관측된 문구만** 등재한다(추측 금지): `未找到订单信息`, `Invalid ShipFrom AddressLine3`.
//   - 매칭 실패 시 호출부에서 로케일 일반문구(Errors.shxk_generic)로 대체하고, 원문은 로그에만 남긴다.

export type ShxkTranslation = { ko: string; en: string; zh: string; ja: string };

// ─── 정적 중→한/영/중/일 사전 ────────────────────────────────────────────────
// 2026-08-12 실측 응답(1ZJ443D30403088388) 및 SHXK 공통 문구 기반 시딩.
// 사전에 없는 문구는 강제 번역하지 않고 null 반환(호출부에서 대체/원문 처리).
export const SHXK_TRANSLATION_DICT: Record<string, ShxkTranslation> = {
  '离开设施': { ko: '시설을 출발했습니다', en: 'Departed from facility', zh: '离开设施', ja: '施設を出発しました' },
  '抵达设施': { ko: '시설에 도착했습니다', en: 'Arrived at facility', zh: '抵达设施', ja: '施設に到着しました' },
  '取件扫描': { ko: '픽업 스캔 완료', en: 'Pickup scan', zh: '取件扫描', ja: '集荷スキャン完了' },
  '出口扫描': { ko: '수출 스캔 완료', en: 'Export scan', zh: '出口扫描', ja: '輸出スキャン完了' },
  '您的包裹正在途中': { ko: '패키지가 배송 중입니다', en: 'Your package is on the way', zh: '您的包裹正在途中', ja: 'お荷物は輸送中です' },
  '我们正在遇到运输延迟': { ko: '운송 지연이 발생하고 있습니다', en: 'We are experiencing a transport delay', zh: '我们正在遇到运输延迟', ja: '輸送遅延が発生しています' },
  '发件人已创建标签': { ko: '발송인이 라벨을 생성했습니다', en: 'The shipper has created a label', zh: '发件人已创建标签', ja: '発送元がラベルを作成しました' },
  '包裹到达操作中心': { ko: '패키지가 운영 센터에 도착했습니다', en: 'Package arrived at operations center', zh: '包裹到达操作中心', ja: '荷物がオペレーションセンターに到着しました' },
  '包裹操作完成': { ko: '패키지 처리 완료', en: 'Package processing completed', zh: '包裹操作完成', ja: '荷物の処理が完了しました' },
  '包裹正在运输中': { ko: '패키지가 운송 중입니다', en: 'Package is in transit', zh: '包裹正在运输中', ja: '荷物は輸送中です' },
  '包裹已送达': { ko: '패키지가 배송 완료되었습니다', en: 'Package delivered', zh: '包裹已送达', ja: '荷物が配達されました' },
  '尝试递送失败': { ko: '배송 시도 실패', en: 'Delivery attempt failed', zh: '尝试递送失败', ja: '配達試行に失敗しました' },
  '正在派送': { ko: '배송 중입니다', en: 'Out for delivery', zh: '正在派送', ja: '配達中です' },
  '跟踪号码不存在': { ko: '운송장 번호가 존재하지 않습니다', en: 'Tracking number does not exist', zh: '跟踪号码不存在', ja: '追跡番号が存在しません' },
  // ─── 오류 문구 (실제 관측분만) ──────────────────────────────────────────────
  '未找到订单信息': { ko: '주문 정보를 찾을 수 없습니다', en: 'Order information was not found', zh: '未找到订单信息', ja: '注文情報が見つかりません' },
  'Invalid ShipFrom AddressLine3': { ko: '발송인 주소 3번째 줄이 올바르지 않습니다', en: 'Invalid ShipFrom AddressLine3', zh: '发件人地址第3行无效', ja: '発送元住所の3行目が無効です' },
};

/** 사전 키가 원문에 부분 포함되면 매칭한다 (SHXK 실측 응답은 뒷문장이 붙어 내려온다). */
function findShxkTranslation(text: string | null | undefined): ShxkTranslation | null {
  if (!text) return null;
  const trimmed = text.trim();
  for (const [key, val] of Object.entries(SHXK_TRANSLATION_DICT)) {
    if (trimmed.includes(key)) return val;
  }
  return null;
}

/**
 * 중문 텍스트를 4개 로케일 번역본으로 변환한다.
 * 사전 키가 전혀 포함되지 않으면 null 반환(강제 번역 금지).
 */
export function translateShxkText(zh: string | null | undefined): ShxkTranslation | null {
  return findShxkTranslation(zh);
}

/**
 * SHXK 원문을 지정 로케일 문장으로 변환한다. 사전 미매칭이면 null.
 * 호출부는 null 일 때 `Errors.shxk_generic` 등 일반문구로 대체해야 한다(원문 노출 금지).
 */
export function translateShxkMessage(
  message: string | null | undefined,
  locale: string,
): string | null {
  const translated = findShxkTranslation(message);
  if (!translated) return null;
  if (locale === 'ko') return translated.ko;
  if (locale === 'zh') return translated.zh;
  if (locale === 'ja') return translated.ja;
  return translated.en;
}

/**
 * 로케일에 따라 표출 문자열을 결정한다.
 * - ko: ko 번역본(없으면 중문 원문)
 * - zh: 중문 원문
 * - ja: 사전의 ja 번역본(없으면 en/ko 값 → 중문 원문)
 * - 그 외(en): en 번역본(없으면 중문 원문)
 */
export function pickShxkLocaleText(
  locale: string,
  zh: string,
  ko?: string | null,
  en?: string | null,
): string {
  const dict = findShxkTranslation(zh);
  if (locale === 'ko') return ko || dict?.ko || zh;
  if (locale === 'zh') return zh;
  if (locale === 'ja') return dict?.ja || en || ko || zh;
  return en || dict?.en || zh;
}

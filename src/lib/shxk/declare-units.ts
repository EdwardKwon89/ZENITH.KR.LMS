// SHXK 신고단위(declare unit) 정본 목록 — TASK-B-337 (Issue #1251)
//
// 출처: SHXK `getdeclareunit`(읽기 전용 기준 데이터) 실측, 2026-10-13 Jaison.
// 호출 방법: `getdeclareunit` (호출 형식은 `src/lib/shxk/client.ts`와 동일, 실서버 shxk.rtb56.com).
//
// v2 결정(JSJung 2026-10-21): 폼에는 아래 7개 코드를 **코드 그대로** 표출하고,
// 선택한 코드를 **변환 없이** SHXK `invoice[].unit_code`로 전송한다.
// 빈 값·목록에 없는 값만 `PCE`로 폴백한다.
//
// 주의: `EA`의 중국어 명칭은 "套"(세트)로, `SET`과 동일하다 — 의미 미확인(`EA`가 세트로 신고되는지 미확정).
//       실서버 createorder 수락 여부는 병합 후 JSJung 라이브 확인 몫이다.
//
// server-only import 금지: 클라이언트 컴포넌트(폼)와 테스트에서 import 한다.

export const SHXK_DECLARE_UNITS = [
  { code: 'PCE', cnname: '件' },
  { code: 'SET', cnname: '套' },
  { code: 'MTR', cnname: '米' },
  { code: 'PCS', cnname: '个' },
  { code: 'EA', cnname: '套' },
  { code: 'YDS', cnname: '码' },
  { code: 'KG', cnname: '千克' },
] as const;

export type ShxkDeclareUnitCode = (typeof SHXK_DECLARE_UNITS)[number]['code'];

const SHXK_DECLARE_UNIT_CODES: ReadonlySet<string> = new Set(SHXK_DECLARE_UNITS.map((u) => u.code));

export function isShxkDeclareUnit(v: string): boolean {
  return SHXK_DECLARE_UNIT_CODES.has((v || '').toUpperCase());
}

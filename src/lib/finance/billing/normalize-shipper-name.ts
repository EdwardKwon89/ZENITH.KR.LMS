// TASK-B-368 / DEF-B-162 (Issue #1415) — 수기 화주명 정규화 (순수 유틸)
//
// 'use server' 파일(서버 액션)은 **async 함수만 export**할 수 있어, 이 순수 함수를
// `billing-statements.ts`에서 export하면 클라이언트 컴포넌트가 해당 파일을 import하는 순간
// `npm run build`가 "Server Actions must be async functions"로 실패한다(DEF-B-162).
// 따라서 DB·세션과 무관한 이 규칙은 별도 모듈로 분리한다.
//
// **규칙은 현행과 바이트 단위 동일** (RPC `billed_key`의 ADHOC 규칙과 같은 순서):
//   공백 압축(`\s+` → 단일 공백) → 양끝 제거(`trim`) → 소문자(`toLowerCase`)
// 변경 시 반드시 `tests/unit/finance/task-b368-normalize-shipper-name.test.ts`와
// 실DB ADHOC 테스트를 함께 확인한다(서버·화면·RPC 3중 일치가 깨지면 매칭이 통째로 어긋난다).

/**
 * 수기 화주명 정규화 — RPC `billed_key`의 ADHOC 규칙과 동일(공백 압축·양끝 제거·소문자).
 * 후보 매칭(`listBillableOrders` ADHOC 필터)과 자동완성 집계(`listAdhocShipperNames`)에서 공용.
 */
export function normalizeShipperName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

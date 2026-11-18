# DEF-157 | `zen_order_rate_snapshots` — 화주 org 멤버가 `carrier_cost_amount`·`platform_fee_amount` 조회 가능

| 항목 | 내용 |
|:-----|:------|
| **긴급도** | **Medium** |
| **발견일 / 발견자** | 2026-11-18 / D_Kai (TASK-1166 `[설계 의견]` F-4, Issue #1386) — Aiden 등록 |
| **관련** | DEF-153 · DEF-156 · IMP/DEF-117 계열 RLS |

## 현상
`zen_order_rate_snapshots` RLS가 화주 org 멤버에게 SELECT를 허용해 `carrier_cost_amount`·`platform_fee_amount` 컬럼이 데이터 계층에서 노출된다. 서버 액션은 `isAdmin` 게이트로 막아 **화면에는 보이지 않는다**(DEF-153과 같은 "액션은 방어, RLS는 열림" 구조). 상세 재현은 D_Kai가 TASK-1166 task file에 기록 — 구현 전 Aiden이 확인한다.

## 소유 팀 근거
스냅샷 테이블·RLS는 Team A(IMP-107). 단 `src/app/actions/operations/tisa.ts`(Team B 영향 가능)와 연관 — 수정 시 git log 태그로 소유 확인.

## 권장 조치
화주에게는 원가·수수료 컬럼 없는 뷰 제공 또는 컬럼 제한. DEF-153 수정 패턴(안전 뷰)을 재사용. 화주 화면의 예상운임(`zen_order_rate_snapshots` 소비처)이 깨지지 않는지 먼저 확인.

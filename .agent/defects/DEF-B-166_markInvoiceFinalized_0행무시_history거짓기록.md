# DEF-B-166: `markInvoiceFinalized` 0행 갱신 무시 + history 거짓 기록 / MANAGER 마감 실패 경로

| 항목 | 내용 |
|:--|:--|
| **긴급도** | High (금전·감사) |
| **발견일/발견자** | 2026-11-23 / Jaison (TASK-B-377 설계 조사 중), Dave 확인 |
| **관련** | Issue #1451, #1449 A, DEF-B-165 |

## 현상 (a) — 0행 갱신을 성공으로 처리

`src/app/actions/finance/settlement.ts`의 `markInvoiceFinalized`:
- `zen_invoices` UPDATE의 `error`만 확인하고 **갱신 행 수(select/rowCount)를 검사하지 않는다**(L117~131).
- RLS 등으로 0행이어도 `zen_invoice_history`에 "정산 마감" 행을 INSERT한다(L132~).
- 그 결과 `finalizeInvoice`는 `{success:true}`를 반환하지만 `is_finalized=false`인 상태가 만들어진다.

## 현상 (b) — MANAGER 마감 실패 경로

- `zen_invoices`/`zen_order_costs` SELECT 정책에 MANAGER가 없다(실측: `pg_policies`).
- 따라서 MANAGER 계정으로 `finalizeInvoice`를 호출하면 `lookupInvoice`가 실패해 "인보이스를 찾을 수 없습니다"로 끝난다(추정 — 전체 경로 실DB 미실행).
- `recordActualCostAndFinalize`(MANAGER 허용)는 `finalizeInvoice` 실패를 `logger.warn`만 남기고 **원가는 저장한 채 `finalized:false`로 반환**한다(L695~704). 이 경우 정산마감은 되지 않았는데 원가만 갱신된 상태가 된다.

## 영향

- 감사 추적(`zen_invoice_history`)에 실제로 마감되지 않은 이력이 남는다.
- MANAGER가 "마감"을 시도하면 원가만 저장되고 인보이스는 미마감인 부분 성공 상태가 될 수 있다.
- 화면·서버 성공 표시가 실제 DB 상태와 불일치(DEF-B-165와 동일 계열).

## 권장 조치 (별도 Task)

1. `markInvoiceFinalized`에서 UPDATE 후 `.select('id')`/rowCount를 확인해 0행이면 실패 반환 + history 미기록.
2. MANAGER 정책 추가 여부는 JSJung 결정(현재 변경 금지). 결정 전에는 `recordActualCostAndFinalize`가 마감 실패를 `success:false` 또는 명시적 부분성공으로 반환하도록 정비.
3. 실DB 세션 테스트: AGENCY/MANAGER 호출 시 `is_finalized`·history 불변, ADMIN 정상.

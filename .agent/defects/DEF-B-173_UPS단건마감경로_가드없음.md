# DEF-B-173 — UPS 인보이스 단건 마감 경로에 차단 가드 없음

| 항목 | 내용 |
|:--|:--|
| **발견 경위** | TASK-B-400(#1569, PR #1572)에서 JSJung 확정 목표 상태(2026-11-27)를 기준으로 단건 마감 경로를 실DB 세션 테스트로 검증하던 중 발견. |
| **긴급도** | High — UPS 인보이스가 신규 정산마감 경로 외 경로로 마감될 수 있음(목표 상태 1 위반). |
| **현재 상태** | 미수정. TASK-B-400 범위는 테스트 추가이며, 프로덕션 코드 수정은 Aiden/JSJung 승인 후 별도 Task. |
| **관련 이력** | #1459(B-381) PR #1549(PR-3) → #1569(TASK-B-400) → 본 건 |

## 현상 (요약)

- JSJung 확정 목표 상태: **UPS 인보이스는 신규 정산마감 경로로만 마감**, 단건 마감 포함 다른 경로 없음(예외 없음).
- TASK-B-400의 단건 마감 경로 실세션 테스트 2건(admin·AGENCY)이 목표 대비 **불일치**했습니다.
- 구체 재현 절차·세션별 결과는 R-21 §2에 따라 공개 문서에 기재하지 않고 Edward 경유 비공개로 전달합니다.

## 영향 범위

- `src/app/actions/finance/settlement.ts`의 단건 마감 액션(`finalizeInvoice` → `markInvoiceFinalized`) 경로.
- 일괄 마감(`finalizeDailyShipperInvoices`)과 인보이스 생성(`generateInvoicesForOrder`·`InvoiceGenerator`)에는 PR-3 가드가 적용되어 있음.

## 권장 조치

- 단건 마감 액션에 UPS 판정 가드를 추가해 fail-closed로 거부하고, `is_finalized`가 변경되지 않도록 한다.
- 판정 불가 시에도 마감하지 않고 오류를 반환한다(목표 상태 2).
- 수정 시 TASK-B-400의 `it.fails` 2건을 일반 단언으로 전환해 목표 충족을 고정한다.

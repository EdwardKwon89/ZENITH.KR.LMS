# DEF-B-168 | `rejectInvoice`의 원가-인보이스 연결 해제가 트리거에 막혀 조용히 실패

| 항목 | 내용 |
|:-----|:-----|
| **발견 경위** | TASK-B-382(#1463) 설계 검토 중 Jaison이 `rejectInvoice`의 리뷰를 요청(PR #1465 2026-11-23 11:23 코멘트). Baker가 로컬 DB에서 ADMIN 세션으로 실측 확인 |
| **발견자 / 날짜** | Baker (Team B) / 2026-11-23 |
| **대상 파일** | `src/app/actions/finance/settlement.ts:669-672` (`rejectInvoice`) — **본 Task 범위 밖** |
| **긴급도** | **Medium** — 인보이스 취소 후 원가 행의 `invoice_id`가 남아 재발행·재청구 경로에 영향 가능. 조용히 실패해 탐지 어려움 |
| **상태** | OPEN — 본 Task에서 수정하지 않음(R-18). 번호는 병합 전 PR #1454(DEF-B-165·166), PR #1462(DEF-B-167)를 피해 **DEF-B-168**로 채번(커밋 직전 `next-def-number.sh` 재확인 완료 — 스크립트는 DEF-B-165를 반환하나 열린 PR 브랜치 합산 필요) |

## 현상 (실측)

`rejectInvoice`는 인보이스 취소 후 연결된 원가 행을 다음과 같이 해제합니다.

```ts
await supabase.from('zen_order_costs')
  .update({ invoice_id: null }).eq('order_id', orderId).eq('invoice_id', invoiceId);
```

그러나 `trg_prevent_cost_change_after_invoice`(`supabase/migrations/20260516090000_prevent_cost_change_after_invoice.sql`)가 `OLD.invoice_id IS NOT NULL`인 행의 UPDATE를 차단합니다. 호출부는 반환 `error`를 확인하지 않아 **어떤 역할에서든 조용히 실패**합니다.

**실측(2026-11-23, 로컬 Supabase, 매 트랜잭션 ROLLBACK — 잔여 데이터 0건)**

| 세션 | 연결 해제 UPDATE 결과 |
|:--|:--|
| `admin@zenith.kr` | **실패** — `Cannot modify order costs after invoice has been issued (invoice_id: ...)` |
| `manager@zenith.kr` | 변경 전 RLS로 0행 필터(정책 적용 후에는 ADMIN과 동일한 트리거 실패가 예상됨 — 추정) |

## 영향

- 인보이스를 취소해도 `zen_order_costs.invoice_id`가 남아, 재발행 인보이스의 합계·연결 정합성이 어긋날 수 있습니다.
- 오류 로깅·사용자 알림이 없어 **조용한 실패**로 남습니다(ZEN_A4 실패 관측성 원칙 위반).
- TASK-B-382의 영향 범위 표에서 `rejectInvoice`의 "정상 취소·재발행" 예측을 **"취소는 성공하나 원가 연결 해제는 실패(본 DEF)"**로 정정했습니다.

## 권장 조치

1. 트리거 예외를 피하는 경로를 별도 설계합니다(예: 취소 트랜잭션에서 트리거 예외를 허용하는 전용 RPC 또는 `invoice_id` 해제를 허용하는 트리거 조건 추가). **단순히 트리거를 제거하면 인보이스 발행 후 비용 변형 방지 규칙이 깨지므로 금지**.
2. 호출부에서 반환 `error`를 확인하고 `logger.error()`로 기록합니다.
3. 수정 Task 별도 발령(본 Task 범위 밖).

## 범위 밖 선언

본 Task(#1463 / TASK-B-382)는 **설계 의견 전용**이며 코드·정책 변경이 없습니다. 발견 즉시 R-18로 등록하고, 설계 문서에는 예측 정정만 반영합니다.

## 참조

- PR #1465 설계 검토 코멘트(2026-11-23 11:23, Jaison) 보완 2번
- `.agent/tasks/TASK-B-382_2026-11-23_Issue1463_MANAGER_정산마감_RLS_설계의견.md` §4-3 #3, `[발견 이슈]`

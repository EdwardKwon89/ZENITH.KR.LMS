# DEF-112: UPS 사후청구(실제요금) 조정 건이 "2차 인보이스로 추가 청구됨"이라고 안내하지만 실제로는 어떤 인보이스에도 연결되지 않음

## 발견 경위
Edward 질문 "실제 배송 완료 및 청구, 정산 완료까지 어떻게 검증할 수 있는가?"에 답하기 위해 2026-07-20 실제 E2E 검증 수행 중 발견(Aiden, DEF-111과 같은 세션·같은 오더로 연쇄 발견).

## 조사 결과

테스트 오더(ZEN-2026-000001)를 DB에서 직접 `status='DELIVERED'`로 전환(DEF-111로 인해 정상 경로로는 도달 불가했음) 후, `UpsActualAdjustmentForm`에서 실제 청구액(기본운임 362,500원, 견적 355,020.30원 대비 +7,479.70원 차이)을 입력·제출.

- `recordUpsActualCharges()`(`src/app/actions/finance/ups-actual-charges.ts`)는 정상 동작: `zen_ups_actual_charges`에 원장 행 INSERT, `zen_order_costs`에 `cost_type='UPS_ACTUAL_ADJUSTMENT'`, `total_amount=7479.70` 행 UPSERT — 여기까지 코드와 일치.
- UI는 제출 즉시 "**2차 인보이스로 추가 청구됨**"이라는 문구를 표시함.
- **그러나 실제 DB 확인 결과, 이 조정 행(`zen_order_costs.cost_type='UPS_ACTUAL_ADJUSTMENT'`)의 `invoice_id`는 NULL** — 기존 4개 정산 항목(BASE_FREIGHT 등)은 전부 `invoice_id`가 실제 인보이스(`INV-20260720-1393`)로 채워져 있는 것과 대조적.
- `zen_invoices` 테이블의 `INV-20260720-1393` 행은 조정 이후에도 `total_amount=355020.30`, `updated_at` 그대로 — **변경 없음**.
- 이 조정 건을 실제 2차 인보이스로 발행하는 액션(예: `generateSecondaryInvoice` 류)을 코드베이스에서 확인하지 못함(이번 조사에서 별도 확인 시도는 안 했으나, 최소한 이 E2E 흐름 안에서는 자동으로도 수동으로도 트리거되지 않았음).

## 영향 범위
**UPS 실제 요금 차이(사후청구) 조정이 기록만 되고 실제 청구(정산 완료)로 이어지는 다음 단계가 없다.** 즉 "실제 배송 완료 → 실제 요금 확인 → 정산 완료"라는 사용자가 질문한 전체 흐름 중 마지막 단계("정산 완료")가 현재 시스템에는 존재하지 않거나, 최소한 UI 문구("2차 인보이스로 추가 청구됨")가 약속하는 자동화가 구현되어 있지 않음. 화주 입장에서 실제 요금 차액을 언제·어떻게 청구받는지 시스템상 확인할 방법이 없어, 수동 추적(엑셀 등 시스템 밖)에 의존하게 될 위험.

## 재현 방법
1. 오더 상태를 DELIVERED로 전환(DEF-111 참조 — 현재는 DB 직접 수정 외 정상 경로 없음)
2. 오더 상세의 UPS 사후청구 폼에서 실제 청구액 입력·제출(견적과 차이 나는 금액으로)
3. `select cost_type, total_amount, invoice_id from zen_order_costs where order_id = '<주문ID>'` 실행 → `UPS_ACTUAL_ADJUSTMENT` 행의 `invoice_id`가 NULL임을 확인
4. `select invoice_no, total_amount, updated_at from zen_invoices where metadata->>'source_order_id' = '<주문ID>'` → 기존 인보이스 금액 불변 확인

## 긴급도
High — "정산 완료"라는 사용자에게 보이는 UI 문구와 실제 시스템 동작이 불일치. 청구 누락(SNTL이 화주에게 차액을 못 받는 상황) 또는 회계 불일치로 직결될 수 있는 재무 리스크.

## 권장 조치
1. 즉시: UI 문구("2차 인보이스로 추가 청구됨")를 실제 동작에 맞게 수정하거나("조정 내역이 기록되었습니다. 별도 청구 처리가 필요합니다" 등), 실제로 2차 인보이스/추가 청구서를 생성하는 기능을 구현.
2. 설계 검토 필요: 조정 건을 (a) 기존 인보이스에 소급 반영(단, 이미 발행된 인보이스 수정은 회계상 바람직하지 않을 수 있음), (b) 별도의 "추가 청구 인보이스" 신규 발행, (c) 크레딧/데빗 노트 방식 중 어느 것으로 처리할지 결정 — Aiden 단독 결정 대신 Edward 확인 후 Task 발령 권장(재무 프로세스 영향).
3. `/finance/order-revenue-cost` 또는 `/admin/sub-agency-profit`(TASK-187) 화면에서 `invoice_id IS NULL`인 미청구 조정 건을 집계·노출하는 대시보드 항목 추가 검토(현재 이런 건이 있어도 어디서도 눈에 띄지 않음).

## 관련 파일
`src/app/actions/finance/ups-actual-charges.ts`(`recordUpsActualCharges`), `src/components/orders/UpsActualAdjustmentForm.tsx`(문구 출처), `zen_order_costs`/`zen_invoices` 테이블

## 보고
Aiden 발견, 2026-07-20. DEF-111과 연계(선행 조건).

**GitHub Issue 등록**: [#622](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/622) (team:b, priority:p1, defect:high) — Team B 현재 진행 작업의 커버 범위 확인 요청, 미커버 시 Team A 처리 예정(Edward 지시, 2026-07-20).

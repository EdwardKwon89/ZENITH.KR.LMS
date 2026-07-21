# TASK-197: UPS 오더 E2E 정산 흐름 세밀 검증 (Issue #637, Phase 1)

> **담당**: B_Kai (Baker) | **생성일**: 2026-07-21 | **상태**: 🔄 진행 중

---

## 개요

TASK-186~194로 완성된 UPS 오더 상태 전이 + 정산/마감 로직이 처음부터 끝까지 매끄럽게 동작하는지, 각 단계 DB 상태 대조 + 엣지 케이스까지 포함해 세밀하게 검증한다.

## 범위

### 8단계 체크포인트 (각 단계 UI 확인 + DB 직접 쿼리 대조)

| Step | 검증 항목 | DB 검증 대상 | UI 검증 대상 |
|:----:|:----------|:-------------|:-------------|
| 1 | 오더 등록 상태 | `zen_orders.status = WAREHOUSED` | 상태 배지, 패키지 정보 |
| 2 | 창고 출고확정 | WAREHOUSED→RELEASED 전이, `zen_invoices` 자동 생성 | 출고 이력, UPS 레이블 상태 |
| 3 | 트래킹 이벤트 | `zen_tracking_events` INSERT, `zen_orders.status` 갱신 | 트래킹 타임라인 |
| 4 | DELIVERED 도달 | `zen_orders.status = DELIVERED` | `UpsActualAdjustmentForm` 활성화 |
| 5 | 사후청구 (마감 전) | `zen_ups_actual_charges` INSERT, `zen_invoices.total_amount` 갱신 | 조정 차액 카드, "자동 갱신" 문구 |
| 6 | 정산 마감 | `is_finalized=true`, `finalized_reason`, 히스토리 | 마감 상태 표시 |
| 7 | 마감 후 조정 | 신규 `zen_invoices` (`metadata.adjustment_of`) | "추가 인보이스 신규 발행" 문구 |
| 8 | 화주 거부 | `CANCELED` 전환, `superseded_by` 재발행 | 취소 상태, 새 인보이스 |

### 엣지 케이스 3건

| Edge | 검증 항목 | 예상 동작 |
|:----:|:----------|:----------|
| E1 | Agency가 타 화주 오더 마감 시도 | RLS 차단 + proxy.ts 경로 차단 |
| E2 | Admin 마감 시 사유 미입력 | `finalized_reason` 필수 검증 실패 |
| E3 | 마감 후 사후청구 재등록 | 자동갱신이 아닌 신규 인보이스 경로 분기 |

## 요구사항

- [ ] Playwright + 실제 단언문 (`expect().toContain()` 등)으로 재실행 가능한 회귀 자산
- [ ] `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 등록 (R-09)
- [ ] 각 단계 UI 구동 스크린샷 첨부 (R-10)
- [ ] 로컬 Supabase 환경에서 수행 (R-14)
- [ ] DB 직접 쿼리(serviceClient) + UI 단언문 이중 검증

## 참조

- Issue: #637
- 패턴: `tests/e2e/r10-upt-adjustment-ui-text.spec.ts`
- 소스: `src/app/actions/finance/settlement.ts`, `ups-actual-charges.ts`
- 소스: `src/components/orders/UpsActualAdjustmentForm.tsx`
- 소스: `src/components/warehouse/OutboundProcessForm.tsx`

## 작업 결과

| 구분 | 내용 |
|:-----|:-----|
| 테스트 파일 | `tests/e2e/r11-ups-settlement-e2e-flow.spec.ts` |
| TC 등록 | `LIVE_REGRESSION_TEST_MAP.md` §47 (TC-R11-01~08, TC-R11-E1~E3) |
| 스크린샷 | `tests/e2e/screenshots/r11_*.png` |

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:-----|:-----|:-------|:-----|
| v1.0 | 2026-07-21 | B_Kai (Baker) | 초안 작성 — 8단계 + 엣지 케이스 3건 |

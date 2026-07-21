# TASK-B-168: Issue #635 Task B — 오더픽업 + 입고처리 확장

## 상태
🔔 완료 (결과 보고 완료)

## 범위
- **B-1**: 오더픽업 (SCHEDULED, 신규 메뉴) — 픽업완료/픽업취소
- **B-2**: 입고처리 (WAREHOUSED, 기존 화면 확장) — 입고취소

## 작업 내역

### B-1: 오더픽업 (Pickup)

| 파일 | 변경 |
|------|------|
| `src/components/layout/NaviSidebar.tsx` | 물류관리 그룹에 `logistics_pickup` (`/warehouse/pickup`) 메뉴 추가 |
| `src/app/[locale]/(dashboard)/warehouse/pickup/page.tsx` | 신규 페이지 (inbound/outbound 패턴 동일) |
| `src/components/warehouse/PickupProcessForm.tsx` | 신규 컴포넌트 — UPS REGISTERED+PICKUP 오더 목록 조회, 픽업완료/취소 모달 |
| `src/app/actions/operations/warehouse.ts` | `getPickupOrders()`, `confirmPickup()`, `cancelPickup()`, `getTodayPickupHistory()` |

**필터 조건**: `transport_mode='UPS'` AND `status=REGISTERED` AND `delivery_method='PICKUP'`

**상태 전이**: REGISTERED → confirmPickup → SCHEDULED → cancelPickup → REGISTERED

### B-2: 입고처리 확장

| 파일 | 변경 |
|------|------|
| `src/components/warehouse/InboundProcessForm.tsx` | WAREHOUSED 상태 오더에 "입고취소" 버튼 추가 + 확인 모달 |
| `src/app/actions/operations/warehouse.ts` | `cancelInbound()` — WAREHOUSED → 직전 상태 복구 (prev_status 활용) |
| `src/lib/logistics/status-machine.ts` | `REGISTERED→WAREHOUSED`, `SCHEDULED→REGISTERED`, `WAREHOUSED→SCHEDULED` 전이 추가 |

**입고취소 로직**: `order_status_history`에서 `next_status=WAREHOUSED`의 직전 `prev_status` 조회 → 해당 상태로 복구 (이력 없으면 REGISTERED)

### 번역
- `Navigation.logistics_pickup`: "오더 픽업" (ko) / "Order Pickup" (en)
- `WarehousePickup.*` 신규 네임스페이스
- `WarehouseInbound.cancel_btn`, `cancel_success`, `cancel_confirm` 추가

### 테스트
- `tests/unit/warehouse/ups-pickup-inbound.test.ts` (14 tests) — 신규
- 상태 전이 규칙 검증 (TC-B2-05~07)

## 커밋
- 187c67ff `[Dave] feat: TASK-B-168 오더픽업 + 입고처리 확장 구현` (코드)
- (문서 커밋 pending)

## 참조
- Issue: #635
- PR: (pending)

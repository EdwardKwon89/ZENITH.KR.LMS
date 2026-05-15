# Phase B CRITICAL 사전 GitNexus 분석

> **수행**: D_Kai (OpenCode) | **검증**: Aiden (Claude)
> **분석 대상**: IMP-019 / IMP-039 / IMP-040 / IMP-042 / IMP-043 / IMP-044
> **분석일**: 2026-05-15 | **유형**: 순수 분석 (코드 수정 없음)

---

## IMP-019 — `createOrder()` 트랜잭션 도입

### 분석 방법

- `gitnexus_impact({target: "createOrder", direction: "upstream"})` — 호출자 1개 (테스트 파일)
- `gitnexus_context({name: "createOrder"})` — 내부 호출 체인 분석
- 소스 코드 직접 검증 (GitNexus content fetch)

### 함수 개요

`src/app/actions/orders.ts:17-121` (104줄)

**실행 시퀀스** (5~7회 DB 작업, 트랜잭션 없음):

```
1. validateUserAction()         → Supabase Auth + Profile 조회
2. generateOrderNo()            → DB 시퀀스 조회 (또는 계산)
3. zen_orders INSERT            → 주문 헤더 생성
4. zen_tracking_configs INSERT  → 트래킹 설정
5. [LOOP] zen_order_packages INSERT × N개 패키지
6. [LOOP] zen_order_items INSERT × N개 아이템 (패키지 당)
7. syncInventoryFromOrder()     → 인벤토리 예약 (REGISTERED)
```

### Blast Radius: HIGH

**직접 영향**: `order-actions.test.ts` (테스트), `orders.ts` 자체

**위험 포인트**:

| 단계 | 실패 시 | 현재 처리 | 위험도 |
|:----|:-------|:---------|:------:|
| 3. `zen_orders` INSERT 실패 | 전체 실패 | `throw new Error()` | LOW |
| 4. `tracking_configs` INSERT 실패 | 트래킹 없음 | `await` (throw) | MEDIUM |
| 5. 패키지 INSERT 실패 | **부분 순서 누락** | `console.error + continue` | **CRITICAL** |
| 6. 아이템 INSERT 실패 | **아이템 누락** | `console.error` (계속 진행) | **CRITICAL** |
| 7. `syncInventoryFromOrder` 실패 | 재고 불일치 | `await` (throw) | HIGH |

### Riley 구현 시 주의사항

1. **패키지/아이템 루프의 `console.error + continue`가 가장 위험** — 트랜잭션 도입 시 이 부분을 `throw`로 변경하거나 RPC 내에서 원자적 처리 필요
2. **Supabase RPC(`create_order_with_items`)로 전환 권장** — 5~7회 개별 호출을 단일 RPC 호출로 대체
3. **RPC 전환 시 `generateOrderNo()`도 RPC 내부 시퀀스 호출로 통합** 필요
4. 회귀 범위 작음 (테스트 1개 파일) — 낮은 위험으로 RPC 전환 가능

---

## IMP-039 — 정산 이중 실행 방지

### 분석 방법

- `gitnexus_query({query: "settlement duplicate calculateSettlement"})` — 정산 함수 호출 체인
- `gitnexus_context({name: "calculateSettlementAction"})` — 함수 상세

### 함수 개요

`calculateSettlementAction()` → `validateAdminAction()` → `SettlementEngine.calculateOrderCosts()`

**이중 실행 경로**:

| 경로 | 트리거 | 설명 |
|:----|:------|:-----|
| 자동 | 오더 RELEASED 시 `generateInvoicesForOrder()` | 상태 변경 트리거에서 자동 호출 |
| 수동 | `SettlementEngine.calculateOrderCosts()` | 관리자 UI에서 수동 호출 |
| 간접 | `syncInventoryFromOrder()` 내 정산 연동 | 재고 동기화 경로로도 정산 트리거 가능 |

### Blast Radius: MEDIUM

**직접 영향 파일**: `finance.ts`, `settlement.ts`, `OrderFinanceSummary.tsx`

**위험 포인트**:
- `calculateSettlementAction()`의 `console.log`로만 중복 추적 — 실제 방어 로직 없음
- `SettlementEngine.calculateOrderCosts()`가 매번 재계산하여 기존 cost 덮어씀
- `addIncidentFee()`도 인보이스 총액을 재계산하여 덮어씀 (claims.ts:136-187)

### Riley 구현 시 주의사항

1. **idempotency key**: `order_id + billing_status` 기반 중복 체크를 `calculateSettlementAction()` 선두에 추가
2. **`billing_status` 활용**: `IMP_EXECUTION_PLAN_BKai` 제안대로 `billing_status` 컬럼 활용 — 이미 정산된 오더는 재정산 불가 처리
3. **수동 재정산 허용 조건**: ADMIN 전용으로 명시적 override 버튼 (UI에서 "강제 재정산" 확인 필요)
4. `addIncidentFee()`는 인보이스 발행 후 호출되므로 `issued_at` 체크 로직 추가 필요

---

## IMP-040 — WAREHOUSED→CANCELED 재고 불일치

### 분석 방법

- `gitnexus_query({query: "WAREHOUSED CANCELED inventory syncInventory"})` — 인벤토리 동기화 체인
- `syncInventoryFromOrder()` 소스 검증

### 함수 개요

`syncInventoryFromOrder()` — `inventory.ts:141-262`에서 상태별 분기 처리.

**`createOrder()`에서의 호출 위치**: `orders.ts:117` — REGISTERED 상태에서 호출
**`updateOrderStatus()` 경유 호출**: `orders.ts:427` — 상태 변경 시 마다 호출

### Blast Radius: MEDIUM

**영향 파일**: `inventory.ts`, `orders.ts`, `inventory.test.ts`

**문제 상태 전이**:
```
WAREHOUSED → CANCELED:
  - WAREHOUSED 진입 시: on_hand_qty 증가 (+), reserved_qty 차감 (-)
  - CANCELED 시: reserved_qty만 차감, on_hand_qty는 유지됨
```

### Riley 구현 시 주의사항

1. **`syncInventoryFromOrder()`의 WAREHOUSED 분기 분석 필요** — 현재 `on_hand_qty` 복원 로직이 이전 상태에 따라 역연산하는 패턴인지 확인
2. **역연산 패턴 권장**: CANCELED 시점의 현재 상태를 확인하고 WAREHOUSED의 역연산 수행 (`on_hand_qty` 감소)
3. `inventory.ts:141-262`의 상태별 분기 로직이 120+줄 — 단위 테스트와 함께 수정 필수
4. `inventory.test.ts`에 WAREHOUSED→CANCELED 시나리오 테스트 케이스 추가 필요

---

## IMP-042 — `updateOrder()` 수정 차단 누락

### 분석 방법

- `gitnexus_impact({target: "updateOrder", direction: "upstream"})` — 호출자 분석
- `gitnexus_context({name: "isOrderEditable"})` — 가드 함수 분석

### Blast Radius: MEDIUM

**핵심 발견**: `isOrderEditable()` 함수가 `src/lib/logistics/status-machine.ts:76-87`에 존재하지만 **호출자가 없음** (incoming calls = 0).

```typescript
// status-machine.ts:76-87
export function isOrderEditable(status: OrderStatus): boolean {
  const nonEditableStates = [
    OrderStatus.WAREHOUSED, OrderStatus.PACKED, OrderStatus.RELEASED,
    OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, OrderStatus.CANCELED,
    OrderStatus.MASTERED
  ];
  return !nonEditableStates.includes(status);
}
```

`updateOrder()` (`orders.ts:191-230`)에는 `isOrderEditable()` 호출이 전혀 없음.

### Riley 구현 시 주의사항

1. **`updateOrder()` 선두에 `isOrderEditable(orderStatus)` 호출 1줄 추가** — 가장 단순한 수정
2. `updateOrder()` 수정 시 `updateOrderStatus()`와 함께 변경해야 함 (IMP-043 연계)
3. `isOrderEditable()`는 이미 MASTERED도 포함하고 있어 IMP-043의 MASTERED Lock과 자연스럽게 통합 가능

---

## IMP-043 — MASTERED Lock 액션별 우회

### 분석 방법

- `gitnexus_impact({target: "updateOrderStatus", direction: "upstream"})` — 7개 호출자 (MEDIUM)
- `gitnexus_query({query: "MASTERED lock invoice cost"})` — MASTERED 관련 로직

### Blast Radius: MEDIUM

**`updateOrderStatus()` 호출자** (7개):

| 호출자 | 파일 | 경로 |
|:-------|:-----|:-----|
| `handleUpdate` | `StatusChangeModal.tsx` | UI → 상태 변경 모달 |
| `handleScan` | `InventoryScanner.tsx` | 바코드 스캔 → 입고 |
| `tracking.test.ts` | 테스트 | 통합 테스트 |
| `finance.test.ts` | 테스트 | 통합 테스트 |
| `master_policy.test.ts` | 테스트 | 단위 테스트 |
| `order-status.test.ts` | 테스트 | 단위 테스트 |
| `order-actions.test.ts` | 테스트 | 단위 테스트 |

**우회 가능 액션**:
- `updateOrder()` — `isOrderEditable()` 미호출 (IMP-042)
- `addIncidentFee()` — MASTERED 체크 없이 인보이스 금액 수정
- `dissolveMasterOrder()` — MASTERED 해체 시 Lock 검증 부재
- `claims.createClaim()` — MASTERED 상태 오더에 클레임 등록 가능

### Riley 구현 시 주의사항

1. **DB 레벨 Check Constraint가 가장 안전** — 모든 코드 경로를 막으려면 애플리케이션 레벨만으로 불충분
2. 단기: `isMastered(orderId)` 헬퍼를 만들어 모든 쓰기 액션(`updateOrder`, `addIncidentFee`, `createClaim`, `dissolveMasterOrder`)에 추가
3. `updateOrderStatus()`에는 이미 MASTERED 체크가 있으나, `canChangeStatus()`에서 MASTERED 전이가 정의되어 있는지도 확인 필요
4. **가장 위험한 우회 경로**: `addIncidentFee()`가 MASTERED+인보이스 발행 후 금액 수정 가능

---

## IMP-044 — 인보이스 발행 후 비용 변경 차단

### 분석 방법

- `gitnexus_query({query: "MASTERED lock invoice cost"})` — 인보이스/비용 로직
- `addIncidentFee()` 소스 분석

### Blast Radius: MEDIUM

**문제 경로**:
1. `issueInvoicePdf()` 발행 후 `invoice_id`가 설정된 `zen_order_costs` row가 UPDATE 가능
2. `addIncidentFee()`가 invoice 발행 후에도 `total_amount` 직접 UPDATE 수행 (claims.ts)
3. `updateOrderCosts()`에 `invoice_id IS NULL` 체크 없음

### Riley 구현 시 주의사항

1. **DB 트리거가 가장 효과적** — `zen_order_costs`에 `invoice_id`가 NOT NULL인 레코드의 UPDATE/DELETE 차단
2. **`addIncidentFee()`는 특수 케이스** — 인보이스 발행 후 사고 비용 반영이 필요하므로 예외 처리 필요
   - 해결책: `invoice_adjustments` 테이블 신규 생성 → `total_amount` 직접 수정 대신 조정 내역 별도 기록
3. `invoice_id IS NULL` 조건을 모든 cost 수정 경로(`finance.ts`)에 추가

---

## 종합 Blast Radius 요약

| IMP | Risk | 직접 영향 파일 | 주요 발견 |
|:---:|:----:|:-------------|:---------|
| IMP-019 | **HIGH** | `orders.ts` | 패키지/아이템 INSERT 실패 시 silent continue — **부분 데이터 손실 위험** |
| IMP-039 | **MEDIUM** | `finance.ts`, `settlement.ts` | 자동/수동 중복 정산 방어 없음 |
| IMP-040 | **MEDIUM** | `inventory.ts`, `orders.ts` | WAREHOUSED→CANCELED on_hand_qty 미복원 |
| IMP-042 | **MEDIUM** | `orders.ts`, `status-machine.ts` | `isOrderEditable()` **호출자 0** — 사망 코드 |
| IMP-043 | **MEDIUM** | `orders.ts`, `claims.ts`, `finance.ts` | MASTERED Lock 4개 이상 우회 경로 |
| IMP-044 | **MEDIUM** | `finance.ts`, `claims.ts` | 인보이스 발행 후 cost 변경 가능 |

### 구현 순서 권장

```
IMP-042(1줄 추가) → IMP-043(isMastered 헬퍼) → IMP-044(DB 트리거)
                                           → IMP-019(RPC 트랜잭션) → IMP-040(재고 역연산)
IMP-039(idempotency key) ← 병렬 가능
```

> `isOrderEditable()`이 이미 MASTERED를 포함하고 있어 IMP-042(1줄 추가)만으로 IMP-043의 `updateOrder()` 경로가 자연스럽게 차단됨 — 두 IMP를 **동시 수정** 권장.

---

[D_Kai (OpenCode) | 2026-05-15 | 순수 분석 — 코드 수정 없음]

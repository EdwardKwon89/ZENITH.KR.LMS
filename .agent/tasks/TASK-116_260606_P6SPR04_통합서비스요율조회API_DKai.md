# TASK-116 — [P6-SPR-04] 통합 서비스 요율 조회 API + 오더-서비스 배정 Actions

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-116 |
| Phase | Phase 6 / SPR-04 |
| 생성일 | 2026-06-06 |
| 발령자 | Aiden (Claude, ZEN_CEO) |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P1 |
| 전제조건 | TASK-114 ✅ · TASK-115 ✅ |
| 관련 IMP | IMP-100 |
| 관련 설계 | [An-11 §6.1~6.3](../../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md) |
| 상태 | 🔔 검토 요청 |

---

## 목표

화주가 Order 등록 시 사용하는 **통합 서비스 요율 조회 API**와 **오더-서비스 배정 Actions**를 구현한다.
- 운송(AIR/SEA) + 통관 + 배송(Local/Total) 4개 서비스의 요율을 단일 API로 통합 조회
- 노선/비용 미등록 시 완전 차단 (An-11 §6.3)
- `zen_order_services` 레코드 생성/조회/상태 변경 Actions

---

## 배경 및 결정 경위

- An-11 §9 확정: 노선/비용 미등록 = 완전 차단 (빈 배열 반환 → 차단)
- 화주는 서비스 조합 선택 후 각 서비스별 가용 요율 목록에서 선택

---

## 구현 명세

### 1. 통합 요율 조회 (`src/app/actions/operations/service-rates.ts`)

```typescript
interface ServiceRateQueryParams {
  originCode: string;       // 출발 port code (예: 'ICN')
  destCode: string;         // 도착 port code (예: 'JFK')
  destCountryCode: string;  // 도착 국가 ISO-3166 (예: 'US') — 통관/Local 배송용
  transportMode: 'AIR' | 'SEA';
  cargoWeight: number;      // kg
  cargoCbm: number;         // CBM
}

interface TransportRateOption {
  id: string;               // zen_rate_cards.id
  carrierId: string;
  carrierName: string;
  transportMode: string;
  estimatedCost: number;    // tiers 기반 계산값
  currency: string;
  transitDays: number | null;
}

interface CustomsRateOption {
  id: string;               // zen_customs_rates.id
  orgId: string;
  orgName: string;
  countryCode: string;
  estimatedCost: number;    // cost_per_kg * weight + cost_per_cbm * cbm + fixed_fee
  currency: string;
  transitDays: number | null;
}

interface DeliveryRateOption {
  id: string;               // zen_delivery_rates.id
  orgId: string;
  orgName: string;
  serviceType: 'LOCAL' | 'TOTAL';
  estimatedCost: number;
  currency: string;
  transitDays: number | null;
}

interface AvailableServiceRates {
  transport: TransportRateOption[];
  customs: CustomsRateOption[];
  deliveryLocal: DeliveryRateOption[];
  deliveryTotal: DeliveryRateOption[];
}

// 빈 배열 반환 시 → 해당 서비스 선택 불가 (UI에서 차단)
getAvailableServiceRates(params: ServiceRateQueryParams): Promise<AvailableServiceRates>
```

### 2. 오더-서비스 배정 (`src/app/actions/operations/order-services.ts`)

```typescript
interface ServiceSelection {
  serviceType: 'TRANSPORT_AIR' | 'TRANSPORT_SEA' | 'TRANSPORT_LAND' | 'TRANSPORT_EXP'
             | 'CUSTOMS' | 'DELIVERY_LOCAL' | 'DELIVERY_TOTAL';
  providerId: string;     // zen_organizations.id
  rateCardId?: string;
  customsRateId?: string;
  deliveryRateId?: string;
  quotedCost: number;
  currency: string;
}

createOrderServices(orderId: string, services: ServiceSelection[]): Promise<{ success: boolean }>
getOrderServices(orderId: string): Promise<OrderService[]>
updateOrderServiceStatus(id: string, status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED'): Promise<{ success: boolean }>
```

**권한 검증**:
- `createOrderServices`: 화주(본인 order) 또는 ADMIN/MANAGER
- `getOrderServices`: 화주(본인 order) + service provider(본인 org) + ADMIN/MANAGER
- `updateOrderServiceStatus`: 해당 provider(본인 org) 또는 ADMIN/MANAGER

### 3. 미등록 노선 차단 처리

```typescript
// getAvailableServiceRates에서 transport가 빈 배열이면
// throw new Error('선택하신 노선/서비스에 등록된 비용 정보가 없습니다. 플랫폼 운영자에게 문의하세요.')
// → UI에서 catch하여 다음 Step 진입 차단
```

---

## DoD (Definition of Done)

- [x] `getAvailableServiceRates` 구현 — zen_rate_cards + zen_customs_rates + zen_delivery_rates 3개 테이블 통합 조회 확인
- [x] 요율 계산 로직 확인 (무게·부피 기반 예상 비용 계산)
- [x] 운송 요율 0건 시 에러 throw 및 UI 차단 동작 확인
- [x] `createOrderServices` — zen_order_services 레코드 생성 확인
- [x] `getOrderServices` — 역할별 데이터 격리 확인 (화주/provider/ADMIN)
- [x] `updateOrderServiceStatus` — provider 본인 org 건만 수정 가능 확인
- [x] R-09: `LIVE_REGRESSION_TEST_MAP.md`에 TC-P6-SVCRATE-01~03 신규 추가
- [x] 회귀 테스트 전체 PASS (265/265)
- [x] 코드 커밋 → task file 🔔 → ACTIVE_TASK.md 갱신 → DoD 검증 → 문서 커밋 (R-17 순서 엄수)

---

## [작업 결과]

| 검증 항목 | 결과 |
|:---------|:----:|
| **커밋 해시** | `2c46c94` |
| `getAvailableServiceRates` | `src/app/actions/operations/service-rates.ts` — port lookup + 3-table join + cost estimation(weight/CBM tier matching) + transport-empty guard |
| `createOrderServices` | `src/app/actions/operations/order-services.ts` — zen_order_services INSERT with role check(shipper/ADMIN/MANAGER) |
| `getOrderServices` | `src/app/actions/operations/order-services.ts` — role-based data isolation(shipper/provider/ADMIN) |
| `updateOrderServiceStatus` | `src/app/actions/operations/order-services.ts` — provider org match + ADMIN/MANAGER |
| Test | `tests/unit/rates/service-rates.test.ts` — TC-P6-SVCRATE-01~03 3 tests PASS |
| 회귀 테스트 | 265/265 PASS (53 test files, 기존 262 + 신규 3) |
| TC Map | `LIVE_REGRESSION_TEST_MAP.md` — 262→265 갱신 + TC-P6-SVCRATE-01~03 |

### 구현 상세

| 항목 | 설명 |
|:----|:-----|
| **getAvailableServiceRates** | zen_rate_cards는 tiers JSONB weight 기반 매칭, zen_customs_rates/zen_delivery_rates는 cost_per_kg*weight+cost_per_cbm*cbm+fixed_fee 계산. transport empty 시 에러 throw. |
| **createOrderServices** | ServiceSelection[] 배치 insert. serviceType enum 검증. 화주 본인 order or ADMIN/MANAGER 허용. |
| **getOrderServices** | 화주(shipper_id) + 서비스 제공자(provider_id) + ADMIN/MANAGER 조회 허용. |
| **updateOrderServiceStatus** | ACCEPTED/REJECTED/COMPLETED 전환. 서비스 제공자 본인 건만 수정(org_id match). ADMIN/MANAGER 전체 허용. |

---

## [Aiden 검토]

*(Aiden 전속)*

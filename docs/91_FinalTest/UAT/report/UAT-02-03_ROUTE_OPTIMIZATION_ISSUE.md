# UAT-02-03 경로 최적화(Route Optimization) 구조적 문제 보고서

| 항목 | 내용 |
|:---|:---|
| 문서 ID | RPT-UAT-02-03-ROUTE |
| 작성일 | 2026-05-29 |
| 작성자 | D_Kai (OpenCode) |
| 검토 대상 | Aiden (ZEN_CEO) |
| 관련 DEF | DEF-030 |
| 상태 | Aiden 협의 필요 |

---

## 1. Executive Summary

UAT-02-03(오더상세) 과정에서 경로 최적화 기능이 정상 동작하지 않는 4가지 구조적 문제를 발견했습니다. RLS 정책 누락(zen_route_network/carriers/rate_cards/route_options)은 `20260529150000` 마이그레이션으로 수정 완료되었으나, 근본적인 아키텍처 이슈는 코드 수정이 아닌 설계 협의가 필요하여 Aiden과의 상담을 위해 보고합니다.

**핵심 문제**: 경로 최적화가 Order 제출 전(운송사 선정·비용 산출)이 아닌 Order 생성 후 Detail 페이지에 위치하여, 실물 물류 프로세스와 역순으로 동작합니다.

---

## 2. Current Architecture

### 2.1 호출 흐름

```
User [경로 계산하기] 버튼 클릭
  └─ RouteOptimizationSection (Client Component)
       └─ getRouteOptions(orderId)
            ├─ validateUserAction() → supabase client
            ├─ SELECT zen_orders (origin_port_id, dest_port_id, transport_mode, cargo_details)
            ├─ RoutingEngine.calculateOptions(originCode, destCode)
            │    └─ DatabaseRouteAdapter.getPotentialRoutes(origin, dest)
            │         ├─ appendDirectRoutes(origin, dest)     ← transport_mode 미적용
            │         └─ appendHubRoutes(origin, dest)        ← transport_mode 미적용
            ├─ calculateCompositePricing({weight, volume, ...})  ← weight=0
            ├─ UPSERT zen_route_options
            └─ return options map (COST / TIME / BALANCED)
```

### 2.2 데이터 현황

| 구성 요소 | 데이터 | 비고 |
|:---|:---:|:---|
| zen_route_network | 7건 | ICN→LAX AIR/SEA, ICN→SIN 3건, PVG→ICN 2건 |
| zen_rate_cards | 2건 | AIR: $5.50/kg, SEA: $2.10/kg |
| zen_route_options | 0건 | RLS 수정 전이어서 INSERT 실패 |
| test order cargo_details | `{}` | weight=0 → 비용=0 |
| test order transport_mode | `AIR` | 등록 시 선택했으나 engine에 미전달 |

---

## 3. Identified Issues

### 3.1 Issue A — 설계 위상 오류 (Architectural)

| 항목 | 내용 |
|:---|:---|
| 심각도 | **CRITICAL** |
| 현재 | Order 등록(create) → Order 상세(detail) → "경로 계산하기" 클릭 → 경로 선택 |
| 올바른 흐름 | Order 등록 중 포장정보 입력 후 → 경로 조회·선택 → 운송사·비용 결정 → Order 최종 제출 |

경로 최적화는 **운송사 선정과 운임 산출**을 수반합니다. 현재 흐름에서는:
- Order가 먼저 생성된 후 경로를 선택 → 논리적 역순
- 운임(Cost)이 Order 제출 전에 확정되지 않음
- Order 등록 폼에 이미 ORG/DES/Transport Mode 선택이 있으나, Route 선택 단계가 분리되어 있지 않음

**제안**: Order Registration Multi-step 구조에 "Shipping Route" Step을 추가:
- Step 1: 기본정보 (Shipper, ORG/DES)
- Step 2: 포장정보 (Packages, Items)
- **Step 3 (신규)**: 경로 선택 (Route Optimization)
- Step 4: 제출 확인

### 3.2 Issue B — Transport Mode 미필터링

| 항목 | 내용 |
|:---|:---|
| 심각도 | **HIGH** |
| 영향 파일 | `routing.ts`, `DatabaseRouteAdapter.ts`, `routing.ts:IVirtualMapAdapter` |

**현재 코드**:
```typescript
// routing.ts:34
const engine = new RoutingEngine(new DatabaseRouteAdapter(supabase));
const options = await engine.calculateOptions(originCode, destCode);
// transport_mode가 전달되지 않음
```

```typescript
// DatabaseRouteAdapter.ts:48-56
const { data: routes } = await supabase
  .from('zen_route_network')
  .select('*, carrier:zen_carriers!carrier_id(...)')
  .eq('is_active', true)
  .eq('from_port_id', origin)
  .eq('to_port_id', dest);
// transport_mode WHERE 조건 없음
```

**결과**: AIR로 등록한 오더에도 SEA/LAND 경로가 함께 표시됨.

**수정 방향**:
1. `IVirtualMapAdapter.getPotentialRoutes(origin, dest)` → `(origin, dest, transportMode?)`
2. `RoutingEngine.calculateOptions` → transportMode 전달
3. `appendDirectRoutes`/`appendHubRoutes` → `.eq('transport_mode', transportMode)` 조건 추가
4. 동일 mode 내 복수 carrier 존재 시 최적 조건(비용/시간)으로 추천

### 3.3 Issue C — 비용 = 0 (Chargeable Weight 미계산)

| 항목 | 내용 |
|:---|:---|
| 심각도 | **HIGH** |
| 영향 파일 | `routing.ts:28-31` |

**현재 코드**:
```typescript
const cargoDetails = order.cargo_details as any;
const weight = Number(cargoDetails?.total_weight || 0);  // → 0
```

`cargo_details` 기본값은 `'{}'::jsonb` — `total_weight` 키가 없음 → `weight=0` → `chargeableWeight=0` → `baseFreight=0×unit_price=0`.

실제 화물 중량은 `zen_order_packages`에 저장되어 있습니다:
```sql
SELECT gross_weight, packing_count, volume, length, width, height
FROM zen_order_packages WHERE order_id = '...';
-- gross_weight=15.5, packing_count=2 → 총중량=31kg
```

**수정 방향**: `cargo_details` 대신 `zen_order_packages`에서 직접 weight/volume 합산:
```typescript
const { data: packages } = await supabase
  .from('zen_order_packages')
  .select('gross_weight, volume, packing_count, length, width, height')
  .eq('order_id', orderId);

const weight = packages?.reduce((sum, p) => 
  sum + (p.gross_weight || 0) * (p.packing_count || 1), 0) || 0;
```

### 3.4 Issue D — Scoring Tiebreaker 부재

| 항목 | 내용 |
|:---|:---|
| 심각도 | **MEDIUM** |
| 영향 파일 | `scoring.ts:26` |

**현재 코드**:
```typescript
export function selectCostOptimal<T extends Candidate>(candidates: T[]): T {
  return [...candidates].sort((a, b) => a.total_cost - b.total_cost)[0];
}
```

비용이 동점(모두 0)일 경우 `sort`의 안정성에 따라 결과가 달라집니다. ICN→LAX 현재 데이터:
- AIR: cost=0, transit=10일
- SEA: cost=0, transit=12일  
- 둘 다 cost=0이므로 어떤 것이 선택될지 불확정

**수정 방향**: transit_days를 tiebreaker로 추가:
```typescript
sort((a, b) => a.total_cost - b.total_cost || a.total_transit_days - b.total_transit_days)
```

---

## 4. RLS Issues (기조치 완료)

| 대상 | 정책 | 수정 |
|:---|:---|:---:|
| zen_route_network | SELECT — role에 CORPORATE/INDIVIDUAL 추가 | ✅ `20260529150000` |
| zen_carriers | SELECT — role에 CORPORATE/INDIVIDUAL 추가 | ✅ |
| zen_rate_cards | SELECT — role에 CORPORATE/INDIVIDUAL 추가 | ✅ |
| zen_route_options | INSERT + SELECT 정책 신규 생성 (missing completely) | ✅ |

---

## 5. Recommendation

### Short-term (UAT 진행 가능하게)
- Issue B·C·D만 코드 수정 (mode 필터링 + packages 기반 weight + tiebreaker)
- DEF-030 상태를 `미수정`으로 유지 → Aiden 판정 후 일괄 처리

### Long-term (Aiden 협의 필요)
- Issue A — Order Registration Multi-step에 Route Step 통합 설계
- Order 등록 폼 구조: `src/components/orders/OrderRegistrationForm.tsx` 확인 필요
- Packing List PDF/CI PDF와 Route 선택 데이터 연동 검토

---

## 6. Appendix

### 6.1 관련 파일

| 파일 | 역할 |
|:---|:---|
| `src/app/actions/operations/routing.ts` | getRouteOptions / selectRoute / getRouteVisualization server actions |
| `src/lib/logistics/routing.ts` | RoutingEngine, IVirtualMapAdapter, MockMapAdapter |
| `src/lib/logistics/adapters/DatabaseRouteAdapter.ts` | DB 기반 경로 조회 (직항 + Hub) |
| `src/lib/logistics/scoring.ts` | COST / TIME / BALANCED scoring |
| `src/lib/logistics/composite-pricing.ts` | 운임 계산 (TISA Rate Matcher) |
| `src/components/routing/RouteOptimizationSection.tsx` | Client Component — UI |
| `supabase/migrations/20260529150000_fix_route_rls_corporate_individual.sql` | RLS 수정 마이그레이션 |

### 6.2 관련 커밋

| 커밋 | 내용 |
|:---|:---|
| `fafd0d7` | RLS 수정 — CORPORATE/INDIVIDUAL + zen_route_options 정책 |
| `d9035e3` | tracking.ts/routing.ts — SELECT 컬럼 오류 수정 |
| `63ca29b` | getOrderDetails — total_gross_weight/volume computed 추가 |
| `f86bdd7` | packing_count 곱셈 + volume 계산 + PKG 테이블 |
| `e715a19` | PKG items Unit Price 컬럼 제거 |

### 6.3 DB 상태 (2026-05-29 기준)

```sql
zen_route_network: 7 rows
  ICN→LAX (SEA, 12d), ICN→LAX (AIR, 10d)
  ICN→SIN (SEA 7d, AIR 1d, LAND 5d)
  PVG→ICN (SEA 5d, AIR 2d)

zen_rate_cards: 2 rows
  AIR: $5.50/kg (0-100kg), $4.80/kg (100-500kg), $3.90/kg (500kg+)
  SEA: $2.10/kg (0-1000kg), $1.50/kg (1000-10000kg), $0.95/kg (10000kg+)

zen_route_options: 0 rows (RLS 수정 후 정상 INSERT 가능)
```

---

## 7. 결론

경로 최적화 기능의 현재 구현은 4가지 구조적 문제를 안고 있습니다. 그중 RLS 정책 누락은 긴급 수정 완료했으나, 나머지(위상 오류·mode 필터링·비용계산·tiebreaker)는 설계 협의가 필요합니다. Aiden의 판정에 따라 수정 범위와 우선순위를 결정해야 합니다.

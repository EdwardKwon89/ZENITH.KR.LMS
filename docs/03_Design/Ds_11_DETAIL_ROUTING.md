# Ds-11 API 상세 명세 — ROUTING (경로 최적화 및 시각화)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

---

## 13. 라우팅 (Routing)

### 13.1 getRouteOptions (Action)

- **설명**: 특정 오더의 출발지/목적지 및 화물 정보를 기반으로 최저비용, 최단시간, 최적(Balanced)의 3가지 경로 옵션을 생성하여 반환함. [WBS 3.3.1]
  - **데이터 정책 (UPSERT)**: 동일 오더에 대해 재계산 시 기존 레코드를 교체(Overwrite)하여 최신 결과만 유지함. (`order_id`, `option_type` 기준 UNIQUE)
- **권한**: User (소속 조직 오더만 가능)
- **파라미터**:
  - `orderId`: (uuid) 대상 오더 ID
- **응답**:
  ```typescript
  {
    success: true,
    options: {
      COST: RouteOption;
      TIME: RouteOption;
      BALANCED: RouteOption;
    }
  }
  ```

### 13.2 selectRoute (Action)

- **설명**: 제시된 경로 옵션 중 하나를 사용자가 선택하여 오더에 최종 적용함. [WBS 3.3.2]
- **권한**: User (소속 조직 오더만 가능)
- **파라미터**:
  - `orderId`: (uuid) 대상 오더 ID
  - `optionId`: (uuid) `zen_route_options` 테이블의 PK
- **응답**: `{ success: true, appliedRouteId: uuid }`

### 13.3 calculateRouteCost (Action)

- **설명**: 단일 경로 세그먼트(예: 인천->싱가포르 항공운송)에 대한 비용을 계산함. 내부적으로 `VirtualMapAdapter` 및 요율 카드를 참조함.
- **권한**: User/System
- **파라미터**:
  - `segment`: RouteSegment (출발/도착, 운송수단, 캐리어 정보 등)
- **응답**: `{ success: true, cost: number, currency: string }`

### 13.4 getRouteVisualization (Action)

- **설명**: 오더에 적용된 경로의 마일스톤 데이터 및 지도 시각화를 위한 좌표/경로 데이터를 반환함.
- **권한**: User
- **파라미터**: `orderId` (uuid)
- **응답**:
  ```typescript
  {
    success: true,
    milestones: Array<{
      name: string;
      location: { lat: number; lng: number };
      mode: TransportMode;
      status: 'PENDING' | 'COMPLETED';
    }>,
    polyline: string; // 지도 렌더링용 인코딩된 경로 데이터
  }
  ```

### 13.5 getRouteConsistencyStatus (Action)

- **설명**: 실제 발생한 트래킹 이벤트(실적)와 계획된 라우팅 경로를 비교하여 정합성을 점검함. (예: 싱가포르 경유 계획이었으나 홍콩 경유 발생 시 경고)
- **권한**: Admin
- **파라미터**: `orderId` (uuid)
- **응답**:
  ```typescript
  {
    success: true,
    isConsistent: boolean,
    discrepancies: string[]; // 정합성이 깨진 부분에 대한 설명 목록
  }
  ```

---

## Architecture & Algorithms

### 스코어링 알고리즘 (Scoring Algorithm)

Aiden Framework에 정의된 아래 기준을 구현에 적용함.

**1. Cost-Optimal (최저비용)**
- **스코어**: `Σ(unit_price × quantity)` — 전 구간 합산 화물비 + 부대비용
- **정렬**: `total_cost ASC`
- **필터**: 유효 요율 카드(`zen_rate_cards`) 매칭 필수

**2. Time-Optimal (최단시간)**
- **스코어**: `Σ(transit_days)` — 전 구간 리드타임 합산
- **정렬**: `total_transit_days ASC`
- **필터**: ETD 기준 유효 스케줄 존재 필수

**3. Balanced (최적, 기본 추천)**
- **스코어**: `α × norm_cost + β × norm_time`
- **가중치**: `α = 0.6` (비용), `β = 0.4` (시간)
- **Normalization**: `(value - min) / (max - min)` — 후보군 내 상대 정규화
- **정렬**: `balanced_score ASC`

### VirtualMapAdapter (Adapter Pattern)

다양한 지도 및 스케줄 공급자(Mock, Google Maps, 실제 운송사 스케줄 등)를 추상화하기 위한 어댑터 구조를 사용함.

```typescript
Interface RouteSegment {
  from_port_id: uuid;
  to_port_id:   uuid;
  transport_mode: 'AIR' | 'SEA' | 'LAND';
  carrier:      string;          // 항공사코드 또는 운송사명
  transit_days: number;
  cost:         number;
  currency:     string;
}

Interface VirtualMapAdapter {
  // 특정 지점 간 가능한 운송 세그먼트 목록을 반환함
  getSegments(origin: uuid, dest: uuid, mode: TransportMode): Promise<RouteSegment[]>;
}
```

- **현 단계**: Mock 기반 구현 (하드코딩 2~3 경유지 시나리오 제공)
- **향후 확장**: Phase 4에서 외부 API 연동 예정

---

## DB Schema & Types

### RouteOption (Type)

```typescript
type RouteOption = {
  id: string; // uuid
  orderId: string;
  type: 'COST' | 'TIME' | 'BALANCED';
  segments: RouteSegment[];
  totalCost: number;
  totalTransitDays: number;
  score: number;
  createdAt: string;
}
```

### zen_route_options (Table)

오더별로 계산된 경로 후보들을 임시 캐싱하기 위한 테이블.

| Column | Type | Default | Description |
|:---|:---|:---|:---|
| `id` | uuid | gen_random_uuid() | PK |
| `order_id` | uuid | - | FK (public.zen_orders.id), **Composite UNIQUE (with option_type)** |
| `option_type` | text | - | COST, TIME, BALANCED, **Composite UNIQUE (with order_id)** |
| `segments` | jsonb | - | RouteSegment 배열 정보 |
| `total_cost` | numeric | 0 | 합계 비용 |
| `total_transit_days` | integer | 0 | 합계 소요 일수 |
| `score` | numeric | 0 | 알고리즘에 따른 최종 점수 |
| `created_at` | timestamptz | now() | 생성 시각 |

### zen_order_routes (Table)

사용자가 최종적으로 선택하여 확정된 경로 정보.

| Column | Type | Default | Description |
|:---|:---|:---|:---|
| `id` | uuid | gen_random_uuid() | PK |
| `order_id` | uuid | - | FK (public.zen_orders.id, UNIQUE) |
| `selected_option_id` | uuid | - | FK (public.zen_route_options.id) |
| `applied_at` | timestamptz | now() | 적용 시각 |
| `applied_by` | uuid | auth.uid() | 적용자 (FK auth.users.id) |

#### RLS Policies

- **SELECT**: `Profiles.org_id = zen_orders.shipper_id` (자사 오더 관련 정보만 조회) 또는 `role = 'ADMIN'`
- **INSERT/UPDATE**: `Profiles.org_id = zen_orders.shipper_id` (자사 오더에 대해 경로 선택 권한) 또는 `role = 'ADMIN'`
- **DELETE**: 관리 목적 외 금지 (기본 불허)

---

## Sprint B — UI 명세 (3.3.2.x)

> **작성:** Aiden (2026-04-24) | **적용 Phase:** 3.3 Sprint B | **R-11 선행 명세**

### SCR-ROU-01: 경로 옵션 선택 패널 [WBS 3.3.2.1]

**위치**: 오더 상세 페이지 (`/orders/[orderId]`) — 신규 "경로 (Routing)" 섹션 (TrackingTimeline 섹션 바로 아래 삽입)

**화면 구성**:

```
┌─ Section: 경로 최적화 (Route Optimization) ────────────────────────────────┐
│                                                                              │
│  [경로 계산하기] 버튼  ← getRouteOptions(orderId) 호출                      │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  💰 최저비용  │  │  ⚡ 최단시간  │  │  ⭐ 최적균형  │                      │
│  │  (COST)      │  │  (TIME)      │  │  (BALANCED)  │  ← 추천 뱃지         │
│  │              │  │              │  │              │                      │
│  │  $450        │  │  $1,200      │  │  $650        │                      │
│  │  14일        │  │  2일         │  │  6일         │                      │
│  │  score:0.0   │  │  score:1.0   │  │  score:0.56  │                      │
│  │              │  │              │  │              │                      │
│  │  구간 목록    │  │  구간 목록    │  │  구간 목록    │                      │
│  │  ICN→SIN SEA │  │  ICN→SIN AIR │  │  ICN→Hub LAND│                      │
│  │              │  │              │  │  Hub→SIN SEA │                      │
│  │  [이 경로 선택]│ │  [이 경로 선택]│ │  [이 경로 선택]│                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                              │
│  ✅ 선택된 경로: BALANCED (applied_route_id: xxx) ← 확정 후 표시             │
└──────────────────────────────────────────────────────────────────────────────┘
```

**컴포넌트 명세**:

| 컴포넌트 | 경로 | 역할 |
|:---|:---|:---|
| `RouteOptimizationSection` | `components/routing/RouteOptimizationSection.tsx` | 섹션 전체 컨테이너 (Client Component) |
| `RouteOptionCard` | `components/routing/RouteOptionCard.tsx` | 단일 옵션 카드 (COST/TIME/BALANCED) |
| `RouteSegmentList` | `components/routing/RouteSegmentList.tsx` | 구간 목록 (from_port_id→to_port_id, transport_mode, carrier) |

**Props & 인터랙션**:

```typescript
// RouteOptimizationSection Props
interface RouteOptimizationSectionProps {
  orderId: string;
  initialAppliedRouteId?: string | null; // zen_order_routes.id (기존 선택 여부)
}

// RouteOptionCard Props
interface RouteOptionCardProps {
  option: {
    id: string;
    option_type: 'COST' | 'TIME' | 'BALANCED';
    segments: RouteSegment[];
    total_cost: number;
    total_transit_days: number;
    score: number;
  };
  isSelected: boolean;
  onSelect: (optionId: string) => void;
}
```

**인터랙션 흐름**:
1. 페이지 로드 시: `zen_order_routes`에서 기존 선택 여부 확인 → 있으면 선택 상태 표시
2. "경로 계산하기" 클릭 → `getRouteOptions(orderId)` → 3종 카드 렌더링 (로딩 상태 표시)
3. "이 경로 선택" 클릭 → `selectRoute(orderId, optionId)` → 선택 뱃지 갱신
4. 오류 시: toast 또는 인라인 오류 메시지

**BALANCED 옵션**: `🌟 추천` 뱃지 표시 (primary CTA 강조)

---

### SCR-ROU-02: 경로 마일스톤 타임라인 [WBS 3.3.2.1]

**위치**: SCR-ROU-01 하단 (경로 선택 완료 후 표시 — `appliedRouteId` 존재 시)

**화면 구성**:

```
┌─ Section: 경로 마일스톤 (Route Milestones) ─────────────────────────────────┐
│                                                                              │
│  ● ICN (인천)          ──[SEA 14일]──>  ● SIN (싱가포르)                     │
│  📍 lat:37.46 lng:126.44               📍 lat:1.36 lng:103.98               │
│  ✅ COMPLETED                          ⏳ PENDING                            │
│                                                                              │
│  (지도 시각화는 Phase 4 Google Maps 연동 시 활성화)                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**컴포넌트 명세**:

| 컴포넌트 | 경로 | 역할 |
|:---|:---|:---|
| `RouteMilestoneTimeline` | `components/routing/RouteMilestoneTimeline.tsx` | 마일스톤 타임라인 (Server Component 가능) |

**Props**:

```typescript
interface RouteMilestoneTimelineProps {
  milestones: Array<{
    name: string;
    location: { lat: number; lng: number };
    mode: 'AIR' | 'SEA' | 'LAND';
    status: 'PENDING' | 'COMPLETED';
  }>;
}
```

**`getRouteVisualization` 구현 지침 (Action 13.4)**:
- `zen_order_routes` → `selected_option_id` → `zen_route_options.segments` 조회
- 각 세그먼트의 `from_port_id`/`to_port_id` → `zen_ports` 테이블 `name`, `lat`, `lng` 조회
  - `zen_ports`에 `lat`/`lng` 컬럼 미존재 시: Mock 포트 좌표 맵 사용 (아래 참조)
- `status`: `zen_tracking_events`에서 해당 포트 도착 이벤트 여부로 결정 (없으면 PENDING)
- `polyline`: Mock 단계에서는 `"mock_polyline"` 반환

**Mock 포트 좌표 맵** (zen_ports에 lat/lng 없을 경우 fallback):

```typescript
const MOCK_PORT_COORDS: Record<string, { lat: number; lng: number }> = {
  'ICN': { lat: 37.4602, lng: 126.4407 },
  'SIN': { lat: 1.3521, lng: 103.8198 },
  'HKG': { lat: 22.3080, lng: 113.9185 },
  'PUS': { lat: 35.1796, lng: 129.0756 },
  'Incheon Hub': { lat: 37.4602, lng: 126.4407 },
};
```

---

### SCR-ROU-03: 정합성 모니터링 배지 [WBS 3.3.2.2]

**위치**: 경로 섹션 헤더 우측 (Admin role 전용 표시)

**화면 구성**:

```
┌─ Section 헤더 ──────────────────────────────────────────────────────────┐
│  경로 최적화            [✅ 경로 정합] or [⚠️ 불일치 N건]  ← Admin만 표시  │
└─────────────────────────────────────────────────────────────────────────┘
```

**컴포넌트 명세**:

| 컴포넌트 | 경로 | 역할 |
|:---|:---|:---|
| `RouteConsistencyBadge` | `components/routing/RouteConsistencyBadge.tsx` | 정합성 상태 배지 (Server Component) |

**Props**:

```typescript
interface RouteConsistencyBadgeProps {
  orderId: string;
  isAdmin: boolean;
}
```

**`getRouteConsistencyStatus` 구현 지침 (Action 13.5)**:
- `zen_order_routes` → 확정 경로의 `segments` 조회
- `zen_tracking_events` → 실제 발생한 항구/허브 이벤트 목록 조회
- 계획 경유지 vs 실제 이벤트 발생 항구 비교 → 불일치 시 discrepancies 배열 반환
- Mock 단계에서는 항상 `isConsistent: true` 반환 허용

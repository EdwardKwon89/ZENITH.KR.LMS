# UAT-02-04 개별 오더-운송 스케줄 매핑 Gap 보고서

| 항목 | 내용 |
|:---|:---|
| 문서 ID | RPT-UAT-02-04-SCHEDULE |
| 작성일 | 2026-06-04 |
| 작성자 | D_Kai (OpenCode) |
| 검토 대상 | Aiden (ZEN_CEO) |
| 관련 DEF | DEF-043 |
| 상태 | Aiden 협의 필요 |

---

## 1. Executive Summary

ADMIN이 SCHEDULED 상태로 전이할 때 "일정확정"은 경로(Carrier+Mode+소요일)만 승인될 뿐, **실제 운송 수단의 식별자(편명/항차, ETD, ETA)는 개별 오더에 저장되지 않습니다**. `zen_vessel_schedules` 테이블에 마스터 스케줄 데이터는 존재하나, `selectRoute()`와 SCHEDULED 전이 시 이 데이터를 참조/연결하는 로직이 없습니다.

---

## 2. 현황 분석

### 2.1 현재 데이터 흐름

```
zen_vessel_schedules (ADMIN 등록)
├─ carrier_id, vessel_name/voyage_no, origin_port_id, dest_port_id
├─ etd, eta, status
└─ 용도: /ko/schedules 조회용 — 개별 오더와 미연결 ❌

zen_route_options.segments (경로 계산 결과)
├─ transport_mode, from_port_id, to_port_id, carrier_id
├─ transit_days, cost, currency
└─ 편명/항차 ❌, ETD/ETA ❌

zen_master_orders (마스터 오더)
├─ vessel_flight_no, etd, eta
└─ 마스터 결합 시에만 연결 — 개별 오더에는 불가
```

### 2.2 영향

| 시나리오 | 문제 |
|:---------|:------|
| SCHEDULED 오더 Tracking | 편명/출도착 시간 미표시 — "어떤 비행기/선박인지" 추적 불가 |
| ADMIN 오더 조회 | SCHEDULED 상태이나 실제 스케줄 정보 없음 |
| SHIPPER Tracking 화면 | 예상 도착 시간 대신 transit_days(일수)만 표시 가능 |
| Master Order 미사용 오더 | 마스터 결합 없으면 영구히 편명/ETD 부재 |

---

## 3. 제안 방안

### 방안 A (권장) — `zen_vessel_schedules` 자동 매칭

**시점**: `selectRoute()` 실행 시 (경로 선택 + SCHEDULED 전이)

**처리 흐름**:
```
selectRoute(orderId, optionId)
    ↓
zen_route_options.segments[] 조회
    ↓ (각 segment별)
zen_vessel_schedules에서 carrier_id + from_port + to_port + mode 매칭
    ↓ ETD가 가장 가까운 미래 스케줄 1건 SELECT
segments JSONB에 schedule_id, flight_no, etd, eta 추가 저장
    ↓ 매칭 실패 시 → null 허용 (non-fatal)
zen_order_routes.schedule_id FK (선택)
```

**segments JSONB 변경**:
```typescript
// 기존
{ carrier_id, transport_mode, from_port_id, to_port_id, transit_days, cost, currency }

// 변경
{ carrier_id, transport_mode, from_port_id, to_port_id, transit_days, cost, currency,
  schedule_id?: string,           // zen_vessel_schedules.id
  flight_no?: string,             // vessel_name + voyage_no
  etd?: string,                   // ISO datetime
  eta?: string                    // ISO datetime
}
```

**장점**:
- ADMIN 추가 작업 불필요 (기존 등록된 스케줄 데이터 활용)
- UI 변경 최소화 (기존 RouteOptionCard에 편명/ETA만 추가 표시)
- Tracking 고도화 기반 마련 (`schedule_id`로 실시간 위치 연동 가능)
- Non-fatal (매칭 실패 시 기존 로직 유지)

**단점**:
- `zen_vessel_schedules`에 해당 carrier+port+mode 조합이 미리 등록되어 있어야 함
- 복수 스케줄 중 선택 로직 필요 (가장 가까운 ETD or ADMIN 선택)

### 방안 B — SCHEDULED 전이 시 ADMIN 직접 입력

**시점**: SCHEDULED 전이 시 StatusChangeModal에 편명/ETD/ETA 입력 필드 추가

**장점**: ADMIN이 의도적으로 정확한 정보 입력 가능

**단점**:
- ADMIN 작업 부담 증가 (매 오더마다 입력 필요)
- 입력 오류 가능성
- `zen_vessel_schedules` 마스터 데이터와 이중 관리

### 방안 C — 현행 유지 (마스터 오더 레벨만)

**장점**: 변경 불필요

**단점**:
- 마스터 결합 없는 개별 오더는 영구히 편명/ETD 부재
- Tracking 화면에서 "어떤 항공기/선박인지" 표시 불가
- UAT-02-04 SCHEDULED 상태의 완전성 미달

---

## 4. 추정 공수

| 항목 | 방안 A | 방안 B | 방안 C |
|:-----|:------:|:------:|:------:|
| `selectRoute()` segments 보강 | 0.3 MD | - | - |
| `zen_vessel_schedules` 매칭 로직 | 0.3 MD | - | - |
| StatusChangeModal 입력 UI | - | 0.3 MD | - |
| RouteOptionCard 편명/ETA 표시 | 0.2 MD | - | - |
| Tracking 화면 확장 | 0.2 MD | 0.2 MD | - |
| migration (zen_order_routes.schedule_id) | 0.1 MD | - | - |
| **합계** | **~1.1 MD** | **~0.5 MD** | **0 MD** |

---

## 5. 결정 요청 사항

1. **방안 선택**: A (자동매칭) / B (ADMIN 입력) / C (현행 유지)
2. **우선순위**: 현재 UAT 진행 중 발견 — DEF-043 (블로킹 N)으로 등록, UAT 완주 후 처리 or 즉시 Task 발령
3. **zen_vessel_schedules 데이터 정합성**: 방안 A 선택 시 ADMIN이 사전에 carrier+port+mode별 스케줄 등록 필요 — UAT-06-02/03과 연계

# TASK-B-208: 통합트래킹 통계/상태 판정을 order.status 기준으로 통일

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#851](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/851) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | 🔄 |

## 개요

통합트래킹(`/tracking`) 화면의 상단 통계 카드·행별 상태 아이콘이 UPS 오더에 대해 항상 매칭 실패하는 문제. Jaison이 원인·수정 스펙을 코드 레벨로 확정했으므로 **설계 판단 없이 아래 스펙대로 구현**하면 됩니다. Issue #770(본인이 이전에 작업한 TASK-B-201/PR#826)의 후속 심화 작업입니다.

## 근본 원인 (Jaison 분석 완료)

`getGlobalTrackingOverview()`(`src/app/actions/operations/tracking.ts:187-262`)가 UPS 오더는 `zen_ups_tracking_events`도 조회하도록 이미 확장돼 있지만(TASK-B-201), 거기 저장되는 `event_code`는 SHXK 원본 코드(`data.track_status`, 예: `DL`=배송완료 — `src/lib/shxk/tracking.ts:57`)를 그대로 저장합니다. 반면 `TrackingDashboard.tsx:83-85, 231-233`은 `event_code === "IN_TRANSIT" | "DELIVERED" | "EXCEPTION"`라는 **가상 시뮬레이터 전용 문자열**과 하드코딩 비교합니다. `"DL" !== "DELIVERED"`이므로 UPS 오더는 통계·아이콘이 절대 매칭되지 않습니다.

SHXK 상태 코드 전체 목록이 코드베이스에 없어(`docs/02_Analysis/An_13_...`도 일부만 나열, Phase 8 샌드박스 부재로 전수 확인 불가) 코드 매핑 테이블 방식은 채택하지 않았습니다. 대신 **이미 신뢰 가능한 단일 진실 소스인 `zen_orders.status`(OrderStatus enum)**로 통계/아이콘 판정 기준을 전환합니다 — UPS 실배송 완료 시 `checkRealtimeUpsTrackingAction()`(`tracking.ts:333-357`)이 `isDelivered()` 체크 후 직접 `zen_orders.status`를 `DELIVERED`로 갱신하므로 이미 정확합니다. AIR/SEA/LAND(가상 시뮬레이터)도 결국 동일한 `updateOrderStatus()` 경로를 거치므로 동일 기준으로 통일 가능합니다.

**이벤트 테이블(`zen_tracking_events`/`zen_ups_tracking_events`)은 건드리지 않습니다** — "최신 이벤트 설명/위치" 텍스트 표시 용도로 그대로 유지.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `getGlobalTrackingOverview()` — `src/app/actions/operations/tracking.ts:193-207`

기존 order 서브쿼리 select에 `status` 필드 추가:
```ts
order:zen_orders(
  id,
  order_no,
  shipper_id,
  recipient_name,
  transport_mode,
  status          // 추가
)
```
그리고 `configsWithEvents` 매핑(약 253-259행)에서 `orderData.status`를 그대로 노출되도록 유지(이미 `...config`로 order 서브 오브젝트가 통째로 포함되므로 별도 처리 불필요 — `track.order.status`로 프론트에서 접근 가능한지 직접 확인).

### 2. `TrackingDashboard.tsx` — 통계 카드 (81-86행)

기존 4개(Total/In Transit/Delivered/Issues)를 **6개**로 교체. Issues 단일 버킷은 JSJung 지시로 폐기하고 CLAIMED/HELD/RETURNED 개별 카드로 분리:
```ts
const stats = [
  { label: "Total Tracks", value: tracks.length, color: "text-slate-900" },
  { label: "In Transit", value: tracks.filter(t => t.order?.status === "IN_TRANSIT").length, color: "text-blue-600" },
  { label: "Delivered",  value: tracks.filter(t => t.order?.status === "DELIVERED").length,  color: "text-green-600" },
  { label: "Claimed",    value: tracks.filter(t => t.order?.status === "CLAIMED").length,     color: "text-amber-600" },
  { label: "Held",       value: tracks.filter(t => t.order?.status === "HELD").length,        color: "text-red-600" },
  { label: "Returned",   value: tracks.filter(t => t.order?.status === "RETURNED").length,    color: "text-rose-600" },
];
```
그리드 클래스(약 90행) `grid-cols-2 md:grid-cols-4` → `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`로 변경(6칸 대응).

### 3. 행별 상태 아이콘 (227-237행)

기존 `track.latest_event.event_code` 기준 분기를 `track.order?.status` 기준으로 전환:
```tsx
{track.order?.status === "DELIVERED" ? (
  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
) : track.order?.status === "HELD" ? (
  <AlertCircle size={14} className="text-red-500 shrink-0" />
) : track.order?.status === "CLAIMED" ? (
  <AlertCircle size={14} className="text-amber-500 shrink-0" />
) : track.order?.status === "RETURNED" ? (
  <AlertCircle size={14} className="text-rose-500 shrink-0" />
) : (
  <RefreshCw size={14} className="text-blue-500 animate-spin-slow shrink-0" />
)}
```
`track.latest_event.description`/`location` 텍스트 출력부는 변경하지 않습니다(그대로 이벤트 설명/위치 표시 유지).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성 (`feature/teamb-208-...`)
- [ ] `getGlobalTrackingOverview()`에 `order.status` select 추가
- [ ] `TrackingDashboard.tsx` 통계 카드 6개 분리 + 그리드 클래스 변경
- [ ] 행별 상태 아이콘 `order.status` 기준 전환
- [ ] 회귀 테스트 추가 — **반드시 behavioral/렌더링 기반**(`toContain` 소스 문자열 검사 금지 — TASK-B-201/PR#826 재작업 때 본인이 정확히 해낸 패턴 그대로 재사용):
  - `tracking-actions.test.ts`: `getGlobalTrackingOverview()`가 `order.status`를 포함해 반환하는지 mock 기반 검증
  - `tracking-dashboard.test.tsx`: UPS 오더(status=DELIVERED)가 실제로 "Delivered" 카드에 카운트되는지, CLAIMED/HELD/RETURNED 각각 올바른 카드에 분리 카운트되는지 실제 컴포넌트 렌더링으로 검증 (기존 `tests/unit/tracking/tracking-dashboard.test.tsx`, `tests/unit/tracking/ups-tracking-overview.test.ts` 파일에 케이스 추가)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 `/tracking` 화면 실기 확인 — UPS 오더가 DELIVERED 상태일 때 "Delivered" 카드에 반영되는지, 캐리어 배지(TASK-B-207 병합 후)가 "UPS"로 보이는지 스크린샷

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋 → 2. task file `[작업 결과]`+🔔 → 3. ACTIVE_TASK.md 반영 → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR (`→ TeamB_Dev`, `Closes #851` — TASK-B-207과 병행이므로 이 PR에서 최종 Close, 또는 두 PR 중 나중에 병합되는 쪽에서 Close)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 — `toContain` 소스 문자열 검사 8회 누적(가장 최근 TASK-B-206/PR#849도 재발). 이번 Task는 위험도가 UI 로직 자체(통계 카운트 정확성)라 vacuous test로는 실제 버그를 못 잡습니다. TASK-B-201/PR#826 재작업 때처럼 완전한 behavioral 테스트로 반드시 작성할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

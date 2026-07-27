# DEF-B-006: `/tracking` 대시보드 — 집계 캡(50건)·상태 텍스트 불일치·tracking_number 표기 3건

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — `/ko/tracking` 집계 규칙·리스트 표출 로직 검토 요청에 따른 코드 리뷰 중 발견 |
| **긴급도** | Medium |
| **우선순위** | P2 |

## 배경

JSJung 지시: "OrderStatus 13종 모두 집계 필요, Total Tracks는 13종의 합계여야 함" + "50건 제한도 풀어야 함" + "tracking_number NULL이면 공백 출력". 코드 리뷰로 원인 확인 완료.

## 현상 3건

### 1. 통계 카드가 최대 50건(1페이지)만 집계 — 실제 전체가 아님

`getGlobalTrackingOverview(page=1, pageSize=50)`(`src/app/actions/operations/tracking.ts:188`)가 기본 50건 페이지네이션(`.range(from, to)`)인데, `TrackingDashboard.tsx:51`이 인자 없이 호출해 항상 1페이지만 가져옵니다. 백엔드가 정확한 `count`(`total`)를 반환하지만 프론트가 버리고 `tracks.length`(≤50)로 통계를 계산 — 트래킹 대상이 50건을 넘으면 모든 통계 카드가 실제보다 축소되고, 페이지네이션 UI가 없어 50건 밖 데이터는 화면에서 확인 불가.

### 2. 통계 카드가 6개뿐 — `OrderStatus` 13종 중 5종만 집계

현재 카드: Total/In Transit/Delivered/Claimed/Held/Returned. 나머지 8종(REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/CANCELED/DISPOSED/MASTERED)은 Total에는 포함되나 세부 카드가 없음 — Total과 세부 카드 합이 안 맞는 것처럼 보임.

### 3. "Latest Status" 셀 — 아이콘은 order.status인데 텍스트는 원본 이벤트

`TrackingDashboard.tsx:234-247`에서 아이콘은 `track.order?.status` 기준으로 정확히 분기하지만, 옆 텍스트(`track.latest_event.description`)는 `zen_tracking_events`/`zen_ups_tracking_events`의 최신 원본 이벤트 그대로입니다. `CLAIMED`/`RETURNED`(부분적으로 `HELD`)는 `EVENT_TO_ORDER_STATUS` 매핑(`src/lib/logistics/tracking.ts:14-29`)에 대응하는 트래킹 이벤트가 없는 순수 비즈니스 상태라, 아이콘("Claimed")과 텍스트(클레임 이전 마지막 배송 이벤트 설명)가 서로 다른 정보를 보여줄 수 있음.

### 4. `tracking_no`가 NULL일 때 "—"로 표시됨(요구사항: 공백)

`TrackingDashboard.tsx:212`: `{track.tracking_no || "—"}` — JSJung 요구사항은 NULL일 때 빈 문자열.

## 조치안 — TASK-B-212 참조

전부 하나의 Task로 묶어 처리(같은 컴포넌트/함수, JSJung 지시로 통합 처리 확정). 상세 설계는 `.agent/tasks/TASK-B-212_260726_DefB006_TrackingDashboard집계및표출로직수정_Mike.md` 참조.

## 관련 파일
- `src/app/actions/operations/tracking.ts` (`getGlobalTrackingOverview`)
- `src/components/tracking/TrackingDashboard.tsx`
- `src/types/orders.ts` (`OrderStatus`, `ORDER_STATUS_META` — 재사용 대상)
- `src/components/domain/ZenStatusBadge.tsx` (재사용 대상)

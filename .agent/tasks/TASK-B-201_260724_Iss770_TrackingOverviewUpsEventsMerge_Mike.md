# TASK-B-201: getGlobalTrackingOverview에 UPS 오더는 zen_ups_tracking_events도 함께 조회

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#770](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/770) (3번째 안, jungjs 확정) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 배경

Issue #770(통합 트래킹 "Latest Status" 빈 값 문제) 논의 중 Aiden이 발견: UPS 오더는 이미 별도의 정상 작동하는 트래킹 메커니즘(`zen_ups_tracking_events` + `pollTracking()` + 매일 자동 실행 Vercel Cron)이 있어 실제 이벤트 데이터가 쌓이고 있음. 그런데 통합 트래킹 화면(`/ko/tracking`)이 참조하는 `getGlobalTrackingOverview()`는 범용 `zen_tracking_events`만 조회하고 있어(UPS 오더는 `provider_type='VIRTUAL'` 고정이라 이 테이블에 이벤트가 안 쌓임), UPS 오더는 "Latest Status"가 계속 빈 값으로 표시됨.

jungjs 결정(2026-07-24): DB CHECK 제약·`TrackingManager` Provider Map은 건드리지 않고, `getGlobalTrackingOverview()`가 UPS 오더는 `zen_ups_tracking_events`도 함께 조회하도록 확장하는 방향으로 진행.

## 현재 코드

`src/app/actions/operations/tracking.ts:188-237` `getGlobalTrackingOverview()`:
```ts
const orderIds = (data ?? []).map(c => c.order_id).filter(Boolean);
const { data: allEvents } = orderIds.length > 0 ? await supabase
  .from("zen_tracking_events")
  .select("order_id, event_time, location, description")
  .in("order_id", orderIds)
  .order("event_time", { ascending: false }) : { data: [] };

const latestEventMap = new Map<string, any>();
for (const evt of allEvents ?? []) {
  if (!latestEventMap.has(evt.order_id)) {
    latestEventMap.set(evt.order_id, evt);
  }
}
```
`config.order.transport_mode`는 이미 select에 포함되어 있음(TASK-B-200에서 추가).

## 조치안 (Jaison 진단 완료)

UPS 오더 ID 목록을 별도로 추려서 `zen_ups_tracking_events`도 조회하고, 두 소스를 병합해 `latestEventMap`을 채운다. 참고 — `zen_ups_tracking_events` 컬럼(`getUpsTrackingEvents()`, `tracking.ts:242-256`에서 이미 사용 중): `id, tracking_number, order_id, event_date, event_time, event_code, event_desc, location_city, location_country`.

**필드 매핑 주의**: `zen_tracking_events`는 `{ event_time(timestamp), location, description }` 형태인데 `zen_ups_tracking_events`는 `{ event_date, event_time(문자열), event_desc, location_city }` 형태로 컬럼명이 다름 — 프론트(`TrackingDashboard.tsx`)가 참조하는 `latest_event.location`/`latest_event.description`/`latest_event.event_code` 형태로 통일해서 매핑할 것:
```ts
// UPS 오더용 latest_event 구성 예시
{
  order_id: upsEvt.order_id,
  event_time: `${upsEvt.event_date}T${upsEvt.event_time}`, // 또는 실제 저장 포맷에 맞게 정규화
  location: upsEvt.location_city,
  description: upsEvt.event_desc,
}
```
정렬 기준(가장 최신 1건 선택)도 `event_date`+`event_time` 조합으로 정확히 처리할 것 — `zen_tracking_events`처럼 단일 timestamp 컬럼이 아님에 유의.

UPS 오더 판별은 `config.order.transport_mode === 'UPS'` 사용(`config.order`가 배열/객체 어느 쪽이든 안전하게 처리 — DEF-122에서 이미 `Array.isArray` 가드 패턴 확립됨, 참고).

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조(toContain 소스 문자열 검사 4회 누적, JSJung 결정에 따라 할당 지속). **반드시 실제 함수 호출 기반 behavioral 테스트로 검증할 것** — mock supabase로 `zen_tracking_events`/`zen_ups_tracking_events` 양쪽 응답을 구성해 실제 `getGlobalTrackingOverview()`를 호출하고 반환된 `latest_event` 내용을 검증.
- `zen_orders.transport_mode` FK 관계가 N:1이라 `config.order`가 객체로 반환됨(DEF-122 교훈) — 배열 인덱싱(`config.order?.[0]`) 사용 금지, `Array.isArray` 가드 사용.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-201 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `getGlobalTrackingOverview()`에 UPS 오더용 `zen_ups_tracking_events` 조회 + 병합 로직 추가
- [ ] 실제 함수 호출 기반 회귀 테스트 추가(UPS 오더는 zen_ups_tracking_events에서, 비UPS는 zen_tracking_events에서 latest_event가 나오는지 각각 검증)
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬 DB에 실제 UPS 트래킹 이벤트가 있는 오더(ZEN-2026-000001/000002 등)로 `/ko/tracking` 접속해 "Latest Status"가 더 이상 비어있지 않은지 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `check-R17-DoD` 실행 후 통과 확인
5. 문서 커밋
6. PR 생성 (`feature/teamb-201-... → TeamB_Dev`, `Refs #770`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

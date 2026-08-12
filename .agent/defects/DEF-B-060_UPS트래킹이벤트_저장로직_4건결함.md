# DEF-B-060 (Medium) — UPS 트래킹 이벤트 저장 로직 4건 결함 (중복저장·헤더값오염·상태미저장·번역미지원)

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-12 |
| **발견 경위** | JSJung과 SHXK `gettrack`/`gettrackingnumber` API 레벨 실측 테스트(라벨 이미지 실제 운송장번호 `1ZJ443D30403088388` 사용) 중, Jaison이 실제 응답 데이터를 `storeTrackingEvents()` 매핑 로직에 대입해보며 확정 |
| **긴급도** | Medium |
| **영향 범위** | `src/lib/shxk/tracking.ts`(`storeTrackingEvents`), `zen_ups_tracking_events`/`zen_tracking_configs` 테이블, `UpsTrackingEventsList.tsx`(오더상세 `/ups-detail` 화면) |

## 결함 ① — 중복 이벤트 저장 방지 로직이 사실상 동작 안 함

```ts
// src/lib/shxk/tracking.ts storeTrackingEvents()
const { data: existing } = await supabase
  .from('zen_ups_tracking_events')
  .select('event_time')
  .eq('tracking_number', trackingNumber)
const existingTimes = new Set(existing?.map((e) => e.event_time) ?? [])
const events = data.details.filter((d) => !existingTimes.has(d.track_occur_date))
```
`event_time` 컬럼 타입이 `TIME`이라 DB에서 재조회하면 `"15:24:27"`(날짜 없음) 형태로 돌아오는데, 비교 대상인 `d.track_occur_date`는 원본 전체 문자열 `"2026-08-11 15:24:27"`이라 **포맷이 달라 절대 일치하지 않음**. 재폴링(크론 매일 + 수동 버튼)할 때마다 동일 이벤트가 계속 중복 삽입됨.

## 결함 ② — `event_code`/`location_country`가 헤더값을 전 행에 복사

실측 응답 예시(`1ZJ443D30403088388`):
```json
{
  "data": [{
    "destination_country": "CN",
    "track_status": "ND",
    "details": [
      { "track_occur_date": "2026-08-11 15:24:27", "track_location": "KR", "track_code": "", "track_status": "" },
      { "track_occur_date": "2026-08-11 15:54:29", "track_location": "SEOUL KOREA", "track_code": "AF", "track_status": "AF" },
      ...(총 12건, 나머지 track_code/track_status 전부 "")
    ]
  }]
}
```
현재 코드는 `event_code`엔 헤더 `track_status`("ND")를, `location_country`엔 헤더 `destination_country`("CN")를 12건 전부에 동일하게 복사한다. 문제:
- `track_status`는 "폴링 시점의 현재 상태" 1개일 뿐 각 이벤트 시점의 상태가 아님 — 존재하지 않는 이력을 만들어냄(원본엔 이벤트별 상태 이력이 없음, 실측으로 확인).
- `destination_country`(최종 도착국, 중국)를 한국 내 창고 스캔 이벤트(`Incheon,KR`/`Goyang Si,KR`)에까지 찍어 실제 발생 국가와 다른 값이 기록됨.

## 결함 ③ — 헤더 `track_status`(현재 상태)를 저장하는 곳이 없음

`zen_tracking_configs`(전용 컬럼 없음, `metadata JSONB`도 코드 전체에서 write하는 곳 0건)를 포함 어디에도 폴링 시점의 전체 현재 상태가 저장되지 않는다. `storeTrackingEvents()`가 `zen_tracking_configs`를 건드리는 유일한 지점은 `isDelivered()===true`일 때 `is_active: false`뿐(tracking.ts:68-72). 결함②를 고치면(헤더값을 event_code에 복사하지 않으면) 이 정보를 얻을 유일한 경로마저 사라짐.

## 결함 ④ — SHXK 중문 메시지 번역 미지원

`event_desc`엔 `track_description`(중문 원문)만 저장된다. API가 주는 `track_description_en`은 신뢰 불가 — 실측 12건 중 실제 영어로 번역된 건 2건뿐, 나머지 10건은 중문을 그대로 복사해서 줌. `cnmessage`/`enmessage`(모든 SHXK 메서드 공통 응답 필드)도 동일 문제이며 `ups-labels.ts` 여러 곳에서 사용자 에러 메시지로 그대로 노출 중(예: `UPS 라벨 회수 실패(SHXK): 跟踪号码不存在`). 앱은 ko/en/zh/ja 4개 로케일을 지원하는데(`src/i18n/routing.ts`), 이 텍스트들은 로케일과 무관하게 항상 중문 그대로 표시됨.

## 수정 방향 (Jaison·JSJung 논의로 확정 — TASK-B-290 참조)

1. dedup 비교 시 `event_date`도 함께 조회해 `"${event_date} ${event_time}"`로 재조합 후 비교 (코드만)
2. `event_code`←이벤트별 `track_code||track_status||''`, `location_country`←`track_location`에서 국가코드 파싱(콤마 마지막 토큰이 2자리 대문자일 때만 채택, 아니면 NULL) (코드만)
3. `zen_tracking_configs`에 `last_track_status`/`last_track_status_name`/`last_tracked_at` 전용 컬럼 신설, 매 폴링마다 갱신 (마이그레이션+코드)
4. 신규 공유 모듈 `src/lib/shxk/translate.ts` — 정적 중→한/영 사전 + `translateShxkText()`/`pickShxkLocaleText(locale, zh, ko, en)`. `event_desc_ko`/`event_desc_en` 컬럼 신설(마이그레이션), `storeTrackingEvents()`에 적용. `callShxk()`/각 에러 노출 지점에서도 동일 유틸 재사용 가능하도록 범용 설계.
5. `UpsTrackingEventsList.tsx`(오더상세 화면) — `useLocale()`로 로케일 획득 후 `pickShxkLocaleText()`로 표출 문자열 결정. `event_time` 표시 로직(`split(" ")[1]` 가정)도 실제 `TIME` 포맷에 맞게 정리.

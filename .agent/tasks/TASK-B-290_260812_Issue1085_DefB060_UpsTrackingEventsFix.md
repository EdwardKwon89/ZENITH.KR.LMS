# TASK-B-290: Issue #1085 / DEF-B-060 (Medium) — UPS 트래킹 이벤트 저장 로직 4건 결함 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1085](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1085) |
| **DEF** | [DEF-B-060](../defects/DEF-B-060_UPS트래킹이벤트_저장로직_4건결함.md) |
| **배경** | JSJung과 SHXK API 레벨 실측 테스트(`gettrack`/`gettrackingnumber`, 실제 운송장번호 `1ZJ443D30403088388`) 중 Jaison이 실제 응답 데이터를 매핑 로직에 대입해보며 4가지 결함 확정, JSJung과 수정 방향 논의 확정 |
| **담당** | Dave (Team B) — 2026-08-12 Baker→Dave 재배정(JSJung 지시, Baker 사정으로 착수 불가) |
| **생성일** | 2026-08-12 |
| **우선순위** | P2 (Medium) |
| **상태** | 🔄 진행중 |

## 근본 원인 (확정 완료 — DEF-B-060 참조)

`src/lib/shxk/tracking.ts`의 `storeTrackingEvents()`에 4가지 결함이 있음: ① `event_time`(TIME 컬럼) dedup 비교 포맷 불일치로 중복저장 ② `event_code`/`location_country`가 이벤트별 실제값 대신 응답 헤더값을 전 행 복사 ③ 헤더 `track_status`(현재 상태)를 저장하는 곳이 전혀 없음 ④ SHXK 중문 메시지가 번역 없이 그대로 저장·노출됨(로케일 미반영).

## 수정 방향 (설계 확정 — 착수 승인)

### ① 중복 저장 방지 로직 수정 (코드만)
```ts
const { data: existing } = await supabase
  .from('zen_ups_tracking_events')
  .select('event_date, event_time')
  .eq('tracking_number', trackingNumber)
const existingKeys = new Set((existing ?? []).map((e) => `${e.event_date} ${e.event_time}`))
const events = data.details.filter((d) => !existingKeys.has(d.track_occur_date))
```

### ② `event_code`/`location_country` 이벤트별 값 사용 (코드만)
- `event_code` ← `d.track_code || d.track_status || ''` (헤더 `data.track_status` 사용 중단)
- `location_country` ← `track_location`에서 파싱:
```ts
function extractCountryCode(location?: string | null): string | null {
  if (!location) return null
  const last = location.split(',').pop()?.trim() ?? ''
  return /^[A-Z]{2}$/.test(last) ? last : null
}
```
(헤더 `data.destination_country` 사용 중단. `"SEOUL KOREA"`처럼 콤마 없는 표기는 파싱 실패 시 NULL — 잘못된 국가코드를 넣는 것보다 안전. 무리한 키워드 매핑 추가 금지, 과설계 방지)

### ③ 헤더 `track_status`(현재 상태) 전용 컬럼 저장 (마이그레이션 + 코드)
```sql
-- 신규 마이그레이션
ALTER TABLE public.zen_tracking_configs
  ADD COLUMN last_track_status TEXT,
  ADD COLUMN last_track_status_name TEXT,
  ADD COLUMN last_tracked_at TIMESTAMPTZ;
```
`storeTrackingEvents()`에서 배송완료 여부와 무관하게 매 폴링마다 갱신(기존 `is_active` 업데이트 블록과 별개로, 항상 실행):
```ts
await supabase.from('zen_tracking_configs')
  .update({
    last_track_status: data.track_status,
    last_track_status_name: data.track_status_name,
    last_tracked_at: new Date().toISOString(),
  })
  .eq('tracking_no', trackingNumber)
```

### ④ SHXK 중문 메시지 로케일 기반 번역 표출 (마이그레이션 + 신규 파일 + 코드)
- 신규 마이그레이션: `zen_ups_tracking_events`에 `event_desc_ko TEXT`, `event_desc_en TEXT` 컬럼 추가.
- 신규 파일 `src/lib/shxk/translate.ts`:
  - 정적 중→한/영 사전(오늘 실측으로 확인된 문구 최소 9개 이상 시딩 — 离开设施/抵达设施/取件扫描/出口扫描/您的包裹正在途中/我们正在遇到运输延迟.../发件人已创建标签.../包裹到达操作中心/包裹操作完成 등, DEF-B-060 원문 참조)
  - `translateShxkText(zh: string | null | undefined): { ko: string; en: string } | null` — 사전에 없으면 `null` 반환(원문 유지, 강제 번역 금지)
  - `pickShxkLocaleText(locale: string, zh: string, ko?: string | null, en?: string | null): string` — `ko`→ko(없으면 zh 폴백), `zh`→zh, 그 외(en/ja)→en(없으면 zh 폴백)
- `storeTrackingEvents()`에서 각 이벤트 저장 시 `translateShxkText(d.track_description)` 결과를 `event_desc_ko`/`event_desc_en`에 반영.
- 신규 유틸은 트래킹 이벤트 전용이 아니라 **SHXK 응답 전체에 재사용 가능**하도록 범용 시그니처로 작성(`cnmessage` 등 다른 호출부에서도 나중에 재사용 가능하게). 이번 Task에서 `ups-labels.ts` 등 기존 에러 메시지 노출부까지 전부 뜯어고치는 건 범위 밖 — `translate.ts` 신설 + 트래킹 이벤트 적용까지만.

### ⑤ `UpsTrackingEventsList.tsx` 로케일 연동 (코드만)
- `getUpsTrackingEvents` 액션이 `event_desc_ko`/`event_desc_en`도 함께 SELECT해서 반환하도록 확장.
- 컴포넌트(`use client`)는 `useLocale()`(next-intl)로 현재 로케일 획득 → `pickShxkLocaleText(locale, event.event_desc, event.event_desc_ko, event.event_desc_en)`로 표출 문자열 결정.
- `event_time` 표시 로직(`event.event_time?.split(" ")[1] || event.event_time`, [UpsTrackingEventsList.tsx:68](../../src/components/tracking/UpsTrackingEventsList.tsx#L68))도 실제 `TIME` 포맷(`"HH:MM:SS"`, 공백 없음)에 맞게 정리 — `split(" ")[1]` 가정 제거.

과설계 금지 — 위 5개 항목 외 추가 리팩토링/컬럼/유틸 확장 금지.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-290-ups-tracking-events-fix` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-290 확인
- [ ] 마이그레이션 2건 작성(③ `zen_tracking_configs` 컬럼 3개, ④ `zen_ups_tracking_events` 컬럼 2개) — 최신 TeamB_Dev 기준 타임스탬프 충돌 없는지 확인
- [ ] `src/lib/shxk/translate.ts` 신규 작성
- [ ] `storeTrackingEvents()` 5개 항목 반영
- [ ] `getUpsTrackingEvents` 액션 + `UpsTrackingEventsList.tsx` 로케일 연동
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - dedup: 동일 이벤트 재폴링 시 삽입 안 됨(진짜 삽입 로직 대상, mock 아님)
  - event_code/location_country: 이벤트별 값이 정확히 반영되는지(헤더값 아님을 확인하는 케이스 포함)
  - `zen_tracking_configs` last_track_status 갱신 확인
  - `translateShxkText`/`pickShxkLocaleText` 단위테스트(사전 존재/미존재 케이스, 로케일 4종)
  - `UpsTrackingEventsList` 로케일별 렌더링 확인(ko/zh/en 최소 3종)
- [ ] **독립 되돌리기 검증**: 실제 수정 부분을 되돌려서 신규 테스트가 정확히 FAIL하는지 확인 후 복원(가짜 되돌리기 금지 — 실제 소스 되돌리기)
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 오더상세 `/ups-detail` 화면에서 실제 트래킹 이벤트가 로케일별로 다르게 표출되는지 스크린샷 첨부(ko 최소 1장)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-290 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1085 --add-label status:review --remove-label status:open` (착수 시엔 `status:in-progress`로 우선 전환) → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1085`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 커밋 누락 유형 누적 이력(13회, 최다) 있음, JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①task file/ACTIVE_TASK.md 커밋 누락 ②채번 절차 미준수(`./scripts/next-task-number.sh B` 직접 실행 후 확인할 것) ③무관한 과거 task file 오염(워크트리 미격리 혼입 — 본인 전용 워크트리에서만 작업할 것). **이번 Task는 신규 마이그레이션 2건 포함** — 최신 TeamB_Dev 기준으로 타임스탬프 충돌 없는지 특히 주의.

_(2026-08-12 재배정 이력: 최초 Baker 배정 → Baker 사정으로 착수 불가 → Dave로 재배정. Baker 관련 위반 경고는 무의미해져 삭제, Dave 기준으로 갱신)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

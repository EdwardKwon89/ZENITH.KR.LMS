# TASK-B-357 — 로그 커버리지 ②: lib/shxk/order.ts·tracking.ts 실패 분기 logger 도입 (#1182)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1351](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1351) (관련 #1182/TASK-B-320 설계·DoD 원안) |
| 담당 | Mike (Team B) |
| 브랜치 | `feature/teamb-task-b357-iss1351-shxk-lib-logging` (base: `origin/TeamB_Dev`, 지시명) |
| 배정 | 2026-11-1703:47, JSJung (배정 코멘트 기준, TASK-B-357 지정) |
| 예상 공수 | 2~3h |
| 유형 | **순수 로그 추가 — 동작 불변**(반환 형태·throw 여부 변경 금지) |

## [목표]

`lib/shxk/order.ts`(createorder·gettrackingnumber·getnewlabel·removeorder)와 `lib/shxk/tracking.ts`(pollTracking·storeTrackingEvents)의 실패 분기에 `logger.warn`(예상 가능한 업무 실패: `success!==1`) / `logger.error`(예상 밖: 빈 데이터·DB 실패·예외)를 도입해 SHXK 업무 실패·빈 응답이 로그에 남게 한다.

## [DoD]

- [x] 분기 전수표(14분기) — **로그 누락 0건** (아래 작업1)
- [x] order.ts8 + tracking.ts6 logger 추가 근거 파일:줄 — 동작 불변(return/throw 원문 보존) 검증 포함 (작업2)
- [x] `client.ts` 패턴 준수(`logger.error(msg, err객체)`) · 예외 객체 폐기 금지 · **인증키·개인정보 미포분**(로그 필드 표 + TC-357-5 sentinel 테스트)
- [x] 알림 4기준 판정표 — createorder·getnewlabel·pollTracking **알림 필요** → **IMP-196** 등록(`scratch/post_launch_improvements.md:2222`, 최대195+1)
- [x] 신규 테스트 **23/23 PASS** — (a)warn 인자 (b)error+객체 (c)반환 불변 (d)성공 시 미호출 (e)민감정보 미포함
- [x] 되돌리기 검증: createorder warn 임시 제거 → **1 failed/22 passed** → 복구 **23/23 PASS**
- [x] 기존 SHXK 테스트 약화 없이 통과 — `tests/unit/shxk`+`tests/unit/ups` **51 files/518 tests PASS**
- [x] `npm run test:regression` **Test Files 262 passed (262) / Tests 1946 passed (1946)** + `npm run build` **EXIT=0**
- [x] 회귀맵 **§91** 등재 — 근거 `LIVE_REGRESSION_TEST_MAP.md:1398` + 헤더(1,946/262)
- [x] diff 제외 대상 **0건**(`client.ts`·`translate.ts`·호출 액션·`messages/` 미변경 — git diff로 확인)
- [x] 파일 길이: order.ts **128줄**·tracking.ts **132줄**(<1,500) · 신규 함수 0(기존 함수 내 분기 삽입, 각 ≤5줄)
- [x] R-20 GitNexus **불가** + 호출처 grep(createorder·getnewlabel·gettrackingnumber·removeorder·pollTracking·storeTrackingEvents)

## [작업 결과]

### 코드 커밋
- 코드 커밋: `0af2c3e49a8b74e91e316045728c724739aba6b4`

### 실측 (착수 기준)

```bash
grep -cn "logger" src/lib/shxk/order.ts src/lib/shxk/tracking.ts   # → 0 / 0
grep -nE "success|throw|return null|catch" ...                     # → 아래 전수표의 원본 분기
```

### 작업1 — 분기 전수표 (14분기, 로그 누락 0건)

| # | 함수 | 줄(현재) | 실패 유형 | 레벨 | 로그 필드 |
|:-:|:--|:--|:--|:--|:--|
| 1 | `assertData` | `order.ts:37-44` | 비객체 data → 기존 message 그대로 **throw**(예외) | `error`(**Error 객체**) | `err`(message `shxk API returned empty data`) |
| 2 | `createorder` | `:54` | `success!==1`(업무 실패) | `warn` | method·success·message(응답 원문 en→cn)·`reference_no` |
| 3 | `createorder` | `:56` | `success===1`인데 data 없음(예상 밖) | `error` | method·message·`reference_no` |
| 4 | `gettrackingnumber` | `:72` | `success!==1` | `warn` | method·success·message·`order_id` |
| 5 | `gettrackingnumber` | `:74` | 성공인데 data 없음 | `error` | method·message·`order_id` |
| 6 | `getnewlabel` | `:104` | `success!==1` | `warn` | method·success·message·`reference_nos[]` |
| 7 | `getnewlabel` | `:106` | 성공인데 라벨 data 없음(items null) | `error` | method·message·`reference_nos[]` |
| 8 | `removeorder` | `:122` | `success!==1` | `warn` | method·success·message·`reference_no` |
| 9 | `pollTracking` | `tracking.ts:45` | `success!==1` → `return null` | `warn` | method(`gettrack`)·success·message·`tracking_number` |
| 10 | `pollTracking` | `:50` | 성공인데 빈 데이터 → `return null` | `error` | method·`tracking_number` |
| 11 | `storeTrackingEvents` | `:72` | select DB error(기존 무시) | `error` | `tracking_number`·`order_id`·**err 객체** |
| 12 | `storeTrackingEvents` | `:104` | insert DB error(기존 무시) | `error` | `tracking_number`·`order_id`·count·**err 객체** |
| 13 | `storeTrackingEvents` | `:119` | 상태 update DB error(기존 무시) | `error` | `tracking_number`·**err 객체** |
| 14 | `storeTrackingEvents` | `:128` | is_active update DB error(기존 무시) | `error` | `tracking_number`·**err 객체** |

- `callShxk`의 네트워크/HTTP 예외는 **기존에 `logShxkCall`로 기록+throw** → 중복 try/catch 추가하지 않음(제외 근거).
- `success!==1`은 예상 가능한 업무 실패 → `warn`(지시 규칙), 나머지 예상 밖 → `error` + 객체 동반(`client.ts` 패턴).

### 작업2 — 동작 불변 근거

- **return/throw 문장 원본 무변경**: `data: res.data ? assertData<...>(res.data) : null` 등 반환 구문 원본 유지(`order.ts` 반환부 grep으로 확인), `return null`2곳·`storeTrackingEvents` 제어흐름 무변경 — 로그 삽입만 수행.
- `message`는 `res.enmessage || res.cnmessage || ''` 원문을 **상수로 승격**만(값 동일), 응답 원문은 로그·반환 양쪽에 그대로.
- tsc **정정(리뷰 반영)**: 최초 기재("신규0·212 동일")는 신규 테스트 파일의 **TS2339 4건**(Jaison 리뷰에서 발견 — `logger.warn.mock.calls` 직접 접근)을 포함하지 않은 잘못된 측정이었다. 수정(`vi.mocked(logger.warn/error).mock.calls` 경유) 후 **실제 재측**:
  - `npx tsc --noEmit | grep task-b357` → **(빈 출력)**
  - 전체 tsc: **base(origin/TeamB_Dev 실측) 212 = 내 변경 후 212 → 신규0** (내3개 파일 `shxk/order`·`shxk/tracking`·`task-b357` 오류0건 grep으로 동시 확인)
  - (참고: 임시 측정 중216이 나온 경우는 base 스캔에 미수정 테스트4건이 섞인 값 = 212+4)

### 작업3 — 로그 필드(민감정보 통제) 표

| 포함 (진단 최소) | 제외 (금지) |
|:--|:--|
| 함수 식별 메시지(`[SHXK] <함수> …`) | `params`/`configInfo` **전체 객체** |
| SHXK `method`(createorder/gettrack/…) | `APP_KEY`/`APP_TOKEN` 등 인증키 |
| `success`, `message`(응답 원문 en/cn) | 수취인/송하인 개인정보(이름·전화·주소) |
| 식별자: `reference_no`·`order_id`·`tracking_number`·`reference_nos[]` | — |
| `count`(insert 건수), `dataType`(assertData), **err 객체**(DB/예외) | — |

→ TC-357-5 sentinel 테스트로 검증(개인정보·키 미출, 식별자 유지).

### 작업4 — 알림 4기준 판정표 + IMP

| 지점 | ①금전 | ②고객접점 | ③침묵성 | ④과거 사사 | 판정 |
|:--|:--|:--|:--|:--|:--|
| `createorder` 실패 | 간접(발송 지연) | **해당**(SHXK 접수 실패=오더 접수 지연) | 미해당(호출자 토스트, 이번 warn로 서버로그 확보) | **해당**(DEF-B-142·SHXK 실패 다수 DEF) | **알림 필요**(②+④) |
| `getnewlabel` 실패 | 라벨 미발급 | **해당**(라벨 발급 접점) | 미해당(호출자 기존 `ups-labels.ts:534` logger) | **해당**(B-145/146 등 라벨 실패 이력) | **알림 필요**(②+④) |
| `pollTracking` 실패(**cron 경로**) | 해당 없음 | 간접(추적 지연) | **해당** — `cron/route.ts:62` `if (!trackData) continue` **무음 skip**(이전엔 로그조차 없음) | **해당**(DEF-B-142: 무음 장애 장기간 방치) | **알림 필요**(③+④) |

- 신규 알림 구성은 범위 밖 → **IMP-196** 등록(`scratch/post_launch_improvements.md:2222`, 등록 직전 `origin/TeamB_Dev` 최대값 **195** 확인 후 +1, 우선순위 High).
- (참고: `tracking.ts` 액션 경로는 기존 `logger.error('…poll returned no data')` 보유 → 침묵성은 cron 한정.)

### 테스트

**신규 `tests/unit/shxk/task-b357-shxk-lib-logging.test.ts` — 23/23 PASS**
- TC-357-1(a) warn5건 인자 정확(`toHaveBeenCalledWith`) — cnmessage 폴백·`reference_nos[]` 포함
- TC-357-2(b) error6건 — 성공 빈 data(warn 미호출 동반)·`assertData` Error 객체 동반 throw·storeTrackingEvents DB 실패3종(객체·예외 없이 진행=동작 불변)
- TC-357-3(c) 반환 불변 — `toEqual` 정확 형태 + `not.toHaveProperty('data')`(removeorder)
- TC-357-4(d) 성공 경로 warn/error `not.toHaveBeenCalled()`
- TC-357-5(e) 민감정보 — 수취인명/전화/주소·APP_KEY/TOKEN sentinel `not.toContain`, 식별자 `toContain`

**기존 테스트**: `tests/unit/shxk`+`tests/unit/ups` **51 files/518 tests 전부 PASS**(단언 약화0).
**되돌리기 검증**: `createorder` warn 분기 임시 제거 → **1 failed/22 passed**(TC-357-1 createorder) → 복구 **23/23 PASS**, logger8 복원 확인.

### 회귀·빌드 (R-08)

- `npm ci` exit0 · `check-db-freshness` OK
- `npm run test:regression` → **Test Files 262 passed (262) / Tests 1946 passed (1946)**
- `npm run build` → **EXIT=0**

### R-20 호출처 grep (GitNexus: 세션 도구 목록에 없어 **불가**)

| 함수 | 호출처 |
|:--|:--|
| `createorder` | `ups-labels.ts:300` |
| `getnewlabel` | `ups-labels.ts:362`, `:532`(실패 시 기존 logger `:534`) |
| `gettrackingnumber` | **src 내 호출처 없음**(미사용 — 참고) |
| `removeorder` | `ups-labels.ts:641`, `:801` |
| `pollTracking` | `operations/tracking.ts:347`(액션·기존 로그 보유), `api/cron/ups-tracking-poll/route.ts:62`(**무음 continue**) |
| `storeTrackingEvents` | `operations/tracking.ts:355`, `cron/route.ts:65` |

### check-R17-DoD 실행 결과

- **환경에 명령 없음**(OpenCode 커맨드=프롬프트 템플릿) — "없으면 없다고 기재" 조항 적용, **수동 대조 완료**: 코드 커밋 → task file[작업 결과]+해시 → `status:review` → 문서 커밋 → PR(리뷰 요청 코멘트) 순서, DoD 전 항목 근거(파일:줄·테스트명), 플레이스홀더/미체크0건.

### 재작업 (Jaison 리뷰 — head `00899ee46`, "경미 수정1건 후 승인")

| 구분 | 내용 | 조치 |
|:--|:--|:--|
| **필수** | 신규 테스트 tsc **TS2339 4건**(`task-b357-…test.ts:261,277`의 `logger.*.mock.calls` 직접 접근) + "tsc 신규0" 기재가 사실과 다름 | `vi.mocked(logger.warn/error).mock.calls` 경유로 교체(런타임 동일) — `npx tsc --noEmit \| grep task-b357` **빈 출력** 확인, 위 tsc 근거를 실제 재측치로 정정 |
| 경미 | IMP-196 오탈자 "과거 **사사**"→"**사고**", "4기준 중2개" 띄어쓰기 | `scratch/post_launch_improvements.md:2227,2230` 수정 |
| 재검증 | — | 신규 **23/23 PASS**, `tests/unit/shxk`+`ups`+`operations` **549 tests PASS**(Jaison 재현치 동일) |

### 질문2건 — Jaison 답변 (2026-11-1705:58)

1. **develop 동기화5커밋**: 본 PR에서는 **요구 없음**(대상 파일 무관), Aiden 동기화 PR로 해소. 다음 Task 착수 전 `rev-list`≠0이면 동일하게 보고.
2. **IMP 기록 방식**: **(B) 승인** — base GOV 구 R-15로 직접 기록 허용. v3.8 동기화 후 Aiden 소유 항목임을 PR 본문에 명시한 점 적절, 답변 지연에 대한 위반 아님.

### 비고 (원래 질문 — 위2건으로 해소)

1. **develop 동기화(5커밋·기대0 불일치)**: 전부 문서/거버넌스성(231 가이드·GOV R-15 v3.8·imp.yml)이고 대상 파일과 무관 → 보고·동기화 요청 완료, 답변 없이 진행(base는 지시대로 `origin/TeamB_Dev`).
2. **IMP 기록 방식 충돌**: 지시(scratch 직접·최대값+1) vs GOV R-15 v3.8(develop에만 존재, Aiden 전속) — **본 Task의 TeamB_Dev base GOV는 구(R-15 직접 기록)**이므로 지시대로 **IMP-196을 scratch에 직접 등록**했고, v3.8 동기화 후엔 Aiden 소유 항목으로 남는다(v3.8 "기존 항목 변경·이관 없음" 조항) — 답변 시 지시 반영.

## [발견 이슈]

없음 (범위 내 결함 미발견 — `gettrackingnumber` 호출처 부재는 미사용 함수일 뿐 결함 아님, 비고에 기재)

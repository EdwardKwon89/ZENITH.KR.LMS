# [TASK-B-357] 로그 커버리지 ② — lib/shxk order·tracking 실패 분기 logger 도입 (Issue #1351 / TASK-B-357, 관련 #1182)

> 구 단일 맵 §91에서 이관(2026-11-20 develop 동기화, R-09 v3.10 — 내용 변경 없음).

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-357 / [#1351](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1351) |
| **팀** | Team B |

**2026-11-17, Mike** — `logger` import조차 없던 `lib/shxk/order.ts`·`tracking.ts`의 실패 분기에 **logger 14건 추가**(warn: `success!==1` 업무 실패5 / error: 성공 응답 빈 데이터4·DB 실패4·assertData 예외1). **동작 불변**(return/throw 문장 원본 그대로 — 분기 로그만 삽입), `callShxk`의 네트워크/HTTP 예외는 기존 `logShxkCall`이 기록하므로 중복 없음.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-357-1 | (a) `success!==1` → `logger.warn` 인자 | 함수·SHXK method·success·응답 원문 message(en→cn 폴백)·식별자(reference_no/order_id/reference_nos/tracking_number)가 `toHaveBeenCalledWith`로 정확 — createorder·gettrackingnumber·getnewlabel·removeorder·pollTracking5건 | `tests/unit/shxk/task-b357-shxk-lib-logging.test.ts` |
| TC-357-2 | (b) 빈 데이터/DB 실패/예외 → `logger.error` **객체 동반** | 성공 응답 빈 data(error, warn 미호출)·`assertData` 예외 시 Error 객체 + 기존 message 그대로 throw·storeTrackingEvents select/insert/update 실패3종(객체·count·예외 없이 진행) | 동일 |
| TC-357-3 | (c) **반환값 불변** | `toEqual`으로 기존 형태 정확 고정(createorder 성공/실패·getnewlabel 매핑·removeorder `not.toHaveProperty('data')`·pollTracking null·gettrackingnumber) | 동일 |
| TC-357-4 | (d) 성공 경로 `warn/error` 미호출 | `not.toHaveBeenCalled()` (createorder·pollTracking·storeTrackingEvents) | 동일 |
| TC-357-5 | (e) **인증키·개인정보 미포함** | params 전체(수취인명/전화/주소 sentinel)·configInfo(APP_KEY/TOKEN sentinel)가 로그 인자에 미출 — `not.toContain` + 식별자는 유지 `toContain` | 동일 |

**회귀 검증 (2026-11-17)**: `npm run test:regression` **262 test files / 1,946 tests 전부 PASS** · `npm run build` **EXIT=0** · `check-db-freshness` OK.
**되돌리기 검증 (테스트 유효성)**: `createorder`의 warn 분기 임시 제거 → **1 failed / 22 passed** (TC-357-1 createorder FAIL) → 복구 후 **23/23 PASS**.
**기존 테스트**: `tests/unit/shxk` + `tests/unit/ups` **51 files / 518 tests 전부 PASS** (단언 약화 없음).
**알림 4기준 판정**: `createorder`(②고객접점+④DEF-B-142 등 사고이력)·`getnewlabel`(②+④)·`pollTracking` cron 경로(③침묵성 — `route.ts`의 `if (!trackData) continue` 무음 skip + ④) → **알림 필요3지점 → IMP-196 등록**(알림 신규 구성은 범위 밖).

---

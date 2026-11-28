# [TASK-B-395] ups-labels.ts 실패 지점 로그 커버리지 (Issue #1181)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-395 / [#1181](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1181) |
| **팀 / 작성일** | Team B / 2026-11-26 |
| **대상 모듈 (231 연동)** | `src/app/actions/operations/ups-labels.ts` |
| **검증 차원 (231 D1~D9)** | D1, D8 |

**2026-11-26, Mike** — 재측정(직접 전수 읽기)으로 확정한 잔여 무로깅 지점 7곳(인라인 매핑 누락 4 + 헬퍼 DB 오류 흡수 3)에 `logger.warn`/`logger.error`를 **반환 이전에** 추가했습니다. 반환 로직(메시지·구조)은 변경하지 않았습니다(순수 로깅 추가). 각 케이스는 로거 **레벨(warn/error)과 인자(오류 객체·원문 포함 문자열)** 를 단언하며, 반환값은 키 기대값(`trError`)과 `toEqual`로 불변을 증명합니다.

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-395-01 | previewShxkPayload 도착국 미확인 분기 | `logger.warn`(인자에 함수명·order), `logger.error` 미호출, 반환 `{success:false}` = `trError('destination_country_not_found')` | `tests/unit/ups/task-b395-ups-labels-logging.test.ts` | CI (vitest) |
| TC-395-02 | previewShxkPayload 운송방법 미매핑 분기 | `warn`(product·incoterms 인자), `error` 미호출, 반환 = `trError('shipping_method_not_found')` | 동일 | CI (vitest) |
| TC-395-03 | triggerCreateOrderTest 도착국 미확인 분기 | `warn`(함수명·order), `error` 미호출, 반환 불변 | 동일 | CI (vitest) |
| TC-395-04 | triggerCreateOrderTest 운송방법 미매핑 분기 | `warn`, `error` 미호출, 반환 불변 | 동일 | CI (vitest) |
| TC-395-05 | resolveCountryCode DB 오류 흡수 | `logger.error`(문자 + **오류 객체 동일성**), 호출부 `warn`, 반환 불변 | 동일 | CI (vitest) |
| TC-395-06 | resolveShxkCode DB 오류 흡수 | `logger.error`(문자 + 오류 객체), 호출부 `warn`, 반환 불변 | 동일 | CI (vitest) |
| TC-395-07 | fetchActiveLabelByOrder DB 오류 흡수 | `logger.error`(문자 + 오류 객체), voidUpsLabel `warn`, 반환 = `trError('label_not_found')` | 동일 | CI (vitest) |
| TC-395-11 | resolveCountryCode `PGRST116`(행 없음) → 정상 업무 실패 | `logger.error` **미호출**, 호출부 `warn` 단독, 반환 불변 | 동일 | CI (vitest) |
| TC-395-12 | resolveShxkCode `PGRST116`(행 없음) → 정상 업무 실패 | `logger.error` **미호출**, 호출부 `warn` 단독, 반환 불변 | 동일 | CI (vitest) |
| TC-395-08 | SHXK createorder 실패(외부 API) | `logger.error` 인자에 함수명 + **원문 포함 문자열**, 반환은 로케일 문장에 원문 미포함 | 동일 | CI (vitest) |
| TC-395-09 | catch 예상밖 예외 | `logger.error('registerUpsOrder error:', 원본 Error 동일성)`, 반환에 원문 미노출 | 동일 | CI (vitest) |
| TC-395-10 | zen_ups_labels 쓰기 실패(DB) | `logger.error`(문자 + 오류 메시지 인자), 반환 = `trError('generic',{code:'LABEL_RECORD_SAVE'})` | 동일 | CI (vitest) |

**반환값 불변**: 10개 케이스 전부 `expect(result).toEqual({success:false, error: <동일 키의 trError 결과>})` 단언 — 메시지 키·구조 변경 시 실패합니다. **diff 검증**: 소스 추가/변경은 `logger.*` 호출 7개 + `error` 디스스트럭처링 3줄 + 블록 전환뿐이며, 반환 표현식의 문자열은 변경 전과 동일합니다(`git diff`로 확인).

**회귀**: `npx vitest run tests/unit/ups/task-b395-ups-labels-logging.test.ts` — **12/12 PASS**(TC-395-01~12).

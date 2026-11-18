# [TASK-1158] 번호 채번 스크립트(`next-task-number`·`next-def-number`) Issue 제목 스캔 (Issue #1344)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-1158 / [#1344](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1344) |
| **팀 / 작성일** | Team A / 2026-11-18 |
| **대상 모듈 (231 연동)** | `scripts/next-task-number.sh`, `scripts/next-def-number.sh` |
| **검증 차원 (231 D1~D9)** | D1, D6 |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-1158-01 | `next-task-number` Issue 전용 큰 번호 + 팀 격리 | Issue `TASK-1200`·`TASK-B-9999`·`TASK-C-8888` 스텁 시 `A`=`TASK-1201`, `B`=`TASK-B-10000` | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |
| TC-1158-02 | `next-task-number` 파일 전용 큰 번호 | 로컬 파일 `TASK-1350`·`ACTIVE_TASK.md` `TASK-B-400` 시 `A`=`TASK-1351`, `B`=`TASK-B-401` | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |
| TC-1158-03 | `next-task-number` Issue+파일 합집합 최댓값 | 파일·Issue 병존 시 합집합 최댓값 + 1 반환 | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |
| TC-1158-04 | `next-task-number` `gh` 실패·미설치 폴백 | `stderr` 경고 출력 + 파일 기준 결과 반환 + `exit 0` | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |
| TC-1158-05 | `next-def-number` Issue 전용 큰 번호 + 팀 격리 | Issue `DEF-210`·`DEF-B-045` 스텁 시 `A`=`DEF-211`, `B`=`DEF-B-046` | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |
| TC-1158-06 | `next-def-number` 파일 전용 큰 번호 (`migrations` 포함) | `def250` 마이그레이션·`DEF-B-080` 파일 시 `A`=`DEF-251`, `B`=`DEF-B-081` | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |
| TC-1158-07 | `next-def-number` Issue+파일 합집합 최댓값 | 파일·Issue 병존 시 합집합 최댓값 + 1 반환 | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |
| TC-1158-08 | `next-def-number` `gh` 실패·미설치 폴백 | `stderr` 경고 출력 + 파일 기준 결과(`DEF-B-001` 포함) 반환 + `exit 0` | `tests/unit/scripts/next-number-scripts.test.ts` | CI (vitest) |

# [TASK-1150] 회귀맵 구조 이전 · 인덱스 생성 · 정합성 점검 검증 (Issue #1309)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-1150 / [#1309](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1309) |
| **팀 / 작성일** | Team A / 2026-11-18 |
| **대상 모듈 (231 연동)** | `scripts/lib/lrtm-parser.mjs`, `scripts/build-lrtm-index.mjs`, `scripts/check-lrtm-sync.mjs` |
| **검증 차원 (231 D1~D9)** | D1, D6 |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-1150-01 | `parseRegressionItem` 메타데이터·케이스 파싱 | `taskId`·`modules`·`dimensions`·`testFiles`·`caseIds` 정확 추출 | `tests/unit/scripts/lrtm-sync.test.ts` | CI (vitest) |
| TC-1150-02 | `check-lrtm-sync` 유령 경로(Dead Path) 검출 | 존재하지 않는 `tests/...` 경로 시 경고 및 `--strict` exit 1 | `tests/unit/scripts/lrtm-sync.test.ts` | CI (vitest) |
| TC-1150-03 | `check-lrtm-sync` 미등재 파일 래칫 및 `--allow-grow` 차단 | 신규 미등재 파일 `--strict` exit 1, `--allow-grow` exit 2 거부 | `tests/unit/scripts/lrtm-sync.test.ts` | CI (vitest) |
| TC-1150-04 | `check-lrtm-sync` `tests/e2e/` 수동 표기 검증 및 `tests/poc-*` 제외 | `CI 미실행`/`수동` 누락 시 `--strict` exit 1, `tests/poc-*` 스캔 제외 | `tests/unit/scripts/lrtm-sync.test.ts` | CI (vitest) |
| TC-1150-05 | `build-lrtm-index` 자동 인덱스 생성 및 파일/케이스 수 집계 | `LIVE_REGRESSION_TEST_MAP.md`에 아카이브·항목·실측 집계 반영 | `tests/unit/scripts/lrtm-sync.test.ts` | CI (vitest) |

# [TASK-NNN] <작업 요약> (Issue #<이슈번호>)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-NNN / #<이슈번호> |
| **팀 / 작성일** | Team A (또는 Team B) / YYYY-MM-DD |
| **대상 모듈 (231 연동)** | `<src/app/actions/... 또는 scripts/...>` |
| **검증 차원 (231 D1~D9)** | `<D1, D5 등 — 문서 231 §4 참조>` |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-NNN-01 | `<검증 내용>` | `<기대 결과>` | `tests/unit/<path>.test.ts` | CI (vitest) |
| TC-NNN-02 | `<E2E 검증 시>` | `<기대 결과>` | `tests/e2e/<path>.spec.ts` (CI 미실행 — 수동 E2E) | CI 미실행 (수동 E2E) |

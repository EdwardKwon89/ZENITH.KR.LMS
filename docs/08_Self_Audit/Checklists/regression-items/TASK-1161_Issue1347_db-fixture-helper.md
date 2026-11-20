# [TASK-1161] 실DB 테스트 공용 fixture 헬퍼 신설 (Issue #1347)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-1161 / [#1347](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1347) |
| **팀 / 작성일** | Team A / 2026-11-18 |
| **대상 모듈 (231 연동)** | `tests/integration/helpers/db.ts`, `tests/integration/p6-transport-policy.test.ts`, `tests/integration/tracking-business-qa.test.ts` |
| **검증 차원 (231 D1~D9)** | D1, D5, D6 |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-HELPER-01 | `selectDbContainer` — DB 컨테이너 0개/2개 매칭 거부, 1개만 반환, env override 우선 | 추측 실행 없이 0/2개 시 throw, 지정 시 해당 컨테이너 반환 | `tests/integration/helpers/db.test.ts` | CI (vitest) |
| TC-HELPER-02 | `makeJwt` — `app_metadata.org_id` 클레임 포함, 누락 시 throw, 음성 테스트만 null 허용 | orgId 기본 강제, `allowMissingOrgId`일 때만 null | `tests/integration/helpers/db.test.ts` | CI (vitest) |
| TC-HELPER-03 | `assertOrgIdClaim` — JWT 클레임과 DB 프로필 `org_id` 일치 검증 | 일치 통과, 불일치·null 거부 | `tests/integration/helpers/db.test.ts` | CI (vitest) |
| TC-HELPER-04 | 로컬 전용 가드(R-14) — 원격 URL은 `getServiceClient`에서 즉시 throw | `127.0.0.1`/`localhost`만 허용, 원격·유효하지 않은 URL 거부 | `tests/integration/helpers/db.test.ts` | CI (vitest) |
| TC-HELPER-05 | `createTestOrg` — 트리거가 만든 프로필과 JWT org_id 일치 + LIFO 멱등 정리 | 프로필 org_id·역할 일치, 시드 의존 0, cleanup 2회 호출 무해, 3종 행 전량 제거 | `tests/integration/helpers/db.test.ts` | CI (vitest) |
| TC-POLICY-01~07 | 파일럿 이전 — transport policy 셋업/정리만 헬퍼로 대체, 단언 변경 없음 | 이전 전/후 결과 동일(9/9), 연속 5회 flaky 0 | `tests/integration/p6-transport-policy.test.ts` | CI (vitest, 로컬 DB) |
| TC-QA-02-01~02 | 파일럿 이전 — tracking QA 수동 env 파싱·고정 order ID를 헬퍼로 대체, 단언 변경 없음 | 이전 전/후 결과 동일, 로컬 가드로 원격 DB 삭제 사고 차단 | `tests/integration/tracking-business-qa.test.ts` | CI (vitest, 로컬 DB) |

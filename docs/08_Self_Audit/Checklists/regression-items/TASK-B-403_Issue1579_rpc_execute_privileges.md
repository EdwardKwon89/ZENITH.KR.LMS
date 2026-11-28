# [TASK-B-403] RPC 호출 권한·호출자 검증 정렬 (Issue #1579)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-403 / [#1579](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1579) |
| **팀 / 작성일** | Team B / 2026-11-28 |
| **대상 모듈 (231 연동)** | `supabase/migrations/20261128090000_task_b403_rpc_execute_privileges.sql` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-28, Dave** — 대상 RPC 7개(비공개 목록 기준)의 실행 권한·호출자 검증을 목표 상태로 정렬했습니다. 기존 마이그레이션 수정은 없습니다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-B403-01 | 카탈로그 | anon/PUBLIC 실행 불가, authenticated/service_role 실행 가능 | `tests/integration/task-b403-rpc-execute-privileges.test.ts` |
| TC-B403-02 | 비인증 호출 | 대상 RPC 7개 모두 거부 | 동일 |
| TC-B403-03 | 비허용 역할 호출 | 역할 확인 대상 4개 거부 | 동일 |
| TC-B403-04 | 허용 역할 호출 | 역할 확인 대상 4개 정상 | 동일 |
| TC-B403-05 | 역할 미확인 호출 | 역할 확인 대상 4개 거부 | 동일 |
| TC-B403-06 | 인증 세션 오더 계열 | 대상 3개 정상 | 동일 |
| TC-B403-07 | 서버 내부 키 호출 | 역할 확인 대상 4개 정상 | 동일 |

**가드 비활성 확인**: 권한 복원 시 TC-01·02 FAIL, 역할 검사 비활성 시 TC-03·05 FAIL, `COALESCE` 제거 시 TC-05 FAIL, 서버 내부 키 예외 제거 시 TC-07 FAIL(각 단독 실행). TC-04·06은 양성 대조로 PASS.

**회귀**: `npm run test:regression` — **314 files passed · 1 skipped / 2,377 passed · 1 expected fail · 16 skipped**, build SUCCESS.

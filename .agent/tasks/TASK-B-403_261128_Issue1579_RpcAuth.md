# TASK-B-403 — RPC 호출 권한·호출자 검증 정렬

| 항목 | 내용 |
|:--|:--|
| **Issue** | #1579 (IMP-221 1단계, p1) |
| **브랜치** | `feature/teamb-task-b403-iss1579-rpc-auth` |
| **PR** | #PR (base `TeamB_Dev`, `Refs #1579`) |
| **성격** | 신규 마이그레이션 1건 + 롤백 SQL, 기존 마이그레이션 수정 0 |

## 1. 범위
- 대상 RPC **7개(비공개 목록 기준)**의 실행 권한을 **인증된 호출자만 실행**하도록 정렬했습니다.
- 역할 확인 대상 4개는 역할을 확인할 수 없는 호출도 거부하도록 `COALESCE(get_my_role(), '')` 기준으로 정렬했습니다. `service_role`(서버 내부 신뢰 키)과 DB 슈퍼유저 세션은 기존 서버 내부 호출 동작 유지 목적으로 예외 처리했습니다.
- 호출자가 사용자·조직 식별자를 인자로 넘기는 3개는 **이번 단계에서 비인증 호출 거부까지만** 적용했습니다(인자 신원 검증은 IMP-221 후속).
- 로그인 전 흐름·트리거·RLS 헬퍼는 변경하지 않았습니다.

## 2. 산출물
- `supabase/migrations/20261128090000_task_b403_rpc_execute_privileges.sql` (신규)
  - 역할 확인 대상 4개 `CREATE OR REPLACE` + `COALESCE`
  - 7개 `REVOKE EXECUTE ... FROM PUBLIC, anon` / `GRANT EXECUTE ... TO authenticated, service_role`
  - 파일 하단 롤백 SQL 주석 블록
- `tests/integration/task-b403-rpc-execute-privileges.test.ts` (자기완결형, 6건)
- Ds-11: `docs/02_Analysis/ds11/Ds_11_07_RPC_Wallet_Schedule_Stats.md` §7.1 권한 칸, `Ds_11_03` 저장 경로 권한 표기
- 회귀 항목: `docs/08_Self_Audit/Checklists/regression-items/TASK-B-403_Issue1579_rpc_execute_privileges.md`

## 3. 실행 결과 (로컬)
- 신규 **6/6 PASS**, `check-db-freshness` OK(마이그레이션 적용 후 pending 0).
- **가드 비활성 테스트별 실패 확인**:

| # | 테스트 | 대응 가드 | 가드 비활성 시 |
|:-:|:--|:--|:--|
| 1 | 카탈로그 — anon/PUBLIC 불가, authenticated/service_role 가능 | PUBLIC·anon 실행 회수 | **FAIL** (권한 복원 시) |
| 2 | 비인증 호출 7개 거부 | PUBLIC·anon 실행 회수 | **FAIL** (권한 복원 시) |
| 3 | 비허용 역할 호출 4개 거부 | 역할 검사 | **FAIL** (역할 검사 비활성 시) |
| 4 | 허용 역할 호출 4개 정상 | 양성 대조 | PASS |
| 5 | 역할 미확인 호출 4개 거부 | `COALESCE(get_my_role(), '')` | **FAIL** (COALESCE 제거 시) |
| 6 | 인증 세션 오더 계열 3개 정상 | 양성 대조 | PASS |

- 권한 복원 시 1·2 FAIL, 역할 검사 비활성 시 3 FAIL, `COALESCE` 제거 시 5 FAIL을 각각 단독 실행으로 확인했습니다. 프로덕션 코드·기존 마이그레이션 변경은 없습니다.
- 관련 기존 실DB 테스트(오더 생성·서비스·수정 이력) **31/31 PASS**(서버 내부 호출 예외 반영 후).
- R-10: 조직 승인 화면·신규 오더 화면·오더 서비스 섹션 smoke PASS, 마스터 오더 해산 E2E-15 PASS. 대상 기능 관련 신규 ERROR 0(로그인 실패 1건은 초기 테스트 계정 문제로 확인).
- `npm run test:regression` — **314 files passed · 1 skipped / 2,376 passed · 1 expected fail · 16 skipped** (skip 16은 B-373, expected fail 1은 B-400 DEF-162).
- `npm run build` SUCCESS, `tsc --noEmit` src 오류 0, `check:lrtm`·`check:doc-links` OK.

## 4. R-10 / R-12 / R-21
- R-10: 조직 승인 화면·신규 오더 화면·오더 서비스 섹션 smoke PASS, 마스터 오더 해산 E2E-15 PASS. 대상 기능 관련 신규 ERROR 0.
- R-12: Ds-11 권한 칸 갱신 완료.
- R-21 §2: 현재 권한 상태·역할별 결과·함수별 취약 서술을 쓰지 않고, 목표 상태와 목표 일치/불일치만 기록.

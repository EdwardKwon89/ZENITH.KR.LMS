# TASK-1142: Issue #1211 — zen_error_logs RLS Admin 조회 복구 (DEF-137, High)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1211](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1211) |
| **DEF** | [DEF-137](.agent/defects/DEF-137_zen_error_logs_RLS_Admin_조회불가.md) (`.agent/defects/DEF-137_zen_error_logs_RLS_Admin_조회불가.md`) |
| **담당** | B_Kai (Team A, Test Engineer — TASK-1138/1140/1141 error-logs 소관) |
| **생성일** | 2026-10-02 |
| **우선순위** | P1 (defect) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1142-zen-error-logs-rls-admin-fix` (origin/develop `b0656c141` 기준) |

> 워크트리 노트: 전용 워크트리(`b_kai`)에서 `origin/develop` 기준 브랜치 직접 생성.
> `develop` 로컬 체크아웃은 메인 디렉토리(`ZENITH_LMS_001`)가 점유 중이라 `checkout develop` 불가 —
> R-17 §0 취지(물리 격리 + 최신 기준)에 따라 `git checkout -b <신규> origin/develop`으로 동등 효과 확보.
> `agent-worktree-init.sh b_kai` 실행 시 중첩 경로(`.../ZENITH_LMS-worktrees/ZENITH_LMS-worktrees/b_kai`,
> detached HEAD) 워크트리가 부산물로 생성됨 — 스크립트 경로 버그로 보이며 본 작업은 기존 전용 워크트리 사용.
> DB freshness OK (pending 없음) 확인.

## 원인 (구현 중 정밀 확인 — DEF-137 이론 보강)

- DEF-137은 "`profiles`→뷰 교체 후 EXISTS 서브쿼리가 뷰 경유 평가 실패"로 추정했으나,
  로컬 DB 실측(`pg_policies`) 결과 **"Admin full access" 정책 자체가 존재하지 않음**
  (남은 정책은 `Users can insert` INSERT 1건のみ).
- 메커니즘: `20260521200000_imp049_merge_dual_profiles.sql` M6의
  `DROP TABLE IF EXISTS public.profiles CASCADE`가 `profiles`를 참조하던 해당 정책을
  **CASCADE로 함께 삭제**. 즉 "깨진 정책"이 아니라 "사라진 정책" — RLS default-deny로
  authenticated SELECT/UPDATE 전면 차단 (증상: admin 세션 `[]` 0건).
- 추가 발견: `authenticated` 롤에 `zen_error_logs` 테이블 GRANT 자체가 없음
  (postgres/service_role/anonのみ). 정책 복구와 함께 `GRANT SELECT, INSERT, UPDATE`
  필요 — INSERT grant 부재 시 브라우저 `logClientError` 서버액션 경로의 INSERT도 차단됨.
  DELETE grant는 의도적으로 제외 (삭제 UI/API 없음 — defense in depth).

## 설계

### ① 마이그레이션 `20261002000000_task1142_zen_error_logs_admin_rls.sql`

- `DROP POLICY IF EXISTS "Admin full access on zen_error_logs"` (멱등 — fresh-DB 리플레이에서도 안전)
- `CREATE POLICY ... FOR ALL TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN','ZENITH_SUPER_ADMIN')) WITH CHECK (동일)`
  — `20260507110000_fix_rls_recursion.sql` 선례와 동일 패턴 (테이블 조회 없음, 재귀·뷰 문제 원천 차단)
- `GRANT SELECT, INSERT, UPDATE ON public.zen_error_logs TO authenticated`
  (def117 선례 — CI fresh-DB에서도 PostgREST 경로 동작 보장)

### ② 재현 검증 (로컬, admin 세션 시뮬레이션)

- 마커 행 insert (service-role/postgres, user_id/org NULL) 후
  `SET LOCAL role authenticated + request.jwt.claims(app_metadata.role=ADMIN)` 으로
  SELECT 1건 확인·UPDATE resolved=true 성공 확인,非-ADMIN 클레임은 SELECT 0건·UPDATE 0행 확인

### ③ 회귀 테스트 `tests/unit/migrations/def137-zen-error-logs-admin-rls.test.ts`

- behavioral (docker psql 세션 시뮬레이션, `def117-agency-rls-v2.test.ts` 패턴) —
  구조 문자열 검사(toContain) 없이 DB 동작으로만 검증 (DoD vacuous 금지 준수)
- TC-DEF137-01: ADMIN SELECT 가시성 / TC-DEF137-02: ADMIN UPDATE(resolved) 성공 /
  TC-DEF137-03: 非-ADMIN SELECT 차단 / TC-DEF137-04: 非-ADMIN UPDATE 차단 /
  TC-DEF137-05: INSERT 정책 유지 (authenticated INSERT 성공)

## 착수 체크리스트

- [x] `git fetch origin` + `origin/develop` 기준 브랜치 생성 (전용 워크트리 `b_kai`)
- [x] `./scripts/next-task-number.sh A` → TASK-1142 확인
- [x] `gh issue edit 1211 --add-label status:in-progress`
- [x] DEF-137·원인 마이그레이션·선례 패턴 파악
- [x] ① RLS 교체 마이그레이션 작성
- [x] ② 로컬 재현 검증 (SELECT·UPDATE, ADMIN/非-ADMIN)
- [x] ③ RLS 회귀 테스트 신설 (behavioral)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1211 원문 대비)

- [x] Admin full-access 정책을 `auth.jwt() app_metadata role` 방식으로 교체
- [x] 교체 후 admin 세션으로 SELECT·UPDATE 재현 검증
- [x] RLS 세션 시뮬레이션 회귀 테스트 (vacuous 금지)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [ ] 원격 production 마이그레이션 적용은 배포 시 Aiden 확인 (본 Task 범위 밖 — PR 비고로 전달)

## [작업 결과]

- 코드 커밋: `e7b60f1e36a7040de7378bb8ec269b41d9718187`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 216 passed (216), Tests 1514 passed (1514)
- DoD 항목별 증거:
  - 정책 교체: `20261002000000_task1142_zen_error_logs_admin_rls.sql` — DROP IF EXISTS + FOR ALL 재생성
    (`auth.jwt() app_metadata role` IN ADMIN/ZENITH_SUPER_ADMIN, USING+WITH CHECK) + GRANT SELECT,INSERT,UPDATE TO authenticated.
    적용 후 `pg_policies`에서 `Admin full access on zen_error_logs|ALL` 확인.
  - 재현 검증(로컬 psql 세션 시뮬): ADMIN SELECT 1건 / 非-ADMIN(SELECT USER) 0건 /
    非-ADMIN UPDATE 0행 / ADMIN UPDATE 1행(resolved=true) / USER INSERT 성공 /
    ZENITH_SUPER_ADMIN SELECT 1건. 마커 행 정리 완료.
  - 회귀 테스트: `tests/unit/migrations/def137-zen-error-logs-admin-rls.test.ts`
    TC-DEF137-01~06 전량 behavioral (docker psql, toContain 없음) — 단독 6/6 PASS, 전체 1514 PASS에 포함.
  - 맵 갱신: `LIVE_REGRESSION_TEST_MAP.md` §21에 TC-DEF137-01~06 6행 추가.
  - 화면·쿼리 무수정: error-logs 화면과 `getErrorLogs` 변경 없음 (RLS만으로 해결).

## [발견 이슈] (R-18)

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | 원인 정밀화: DEF-137의 "뷰 경유 평가 실패" 추정이 아니라, imp049 M6의 `DROP TABLE profiles CASCADE`가 정책을 함께 삭제한 것이 직접 원인 (로컬 `pg_policies` 실측 — 정책 자체가 부재). 동일 CASCADE로 소실된 다른 `profiles` 참조 정책이 있는지 전수 점검 필요 (본 Task 범위 밖, Aiden 판단 필요) | Medium | 없음 (본 섹션 기재로 갈음) |
| — | `agent-worktree-init.sh b_kai` 실행 시 중첩 경로(`.../ZENITH_LMS-worktrees/ZENITH_LMS-worktrees/b_kai`, detached HEAD) 워크트리 부산물 생성 — 스크립트 경로 버그 의심 (본 Task 범위 밖) | Low | 없음 (본 섹션 기재로 갈음) |

## [Aiden 검토]

- (반려 시 사유 기재)

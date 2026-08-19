# TASK-1135 — DEF-130: SUB_ADMIN UPS 기준요금(zen_ups_base_rates) 조회 불가 RLS 수정 (Issue #895)

- **작성자**: D_Kai (DeepSeek V4 Flash)
- **날짜**: 2026-08-19
- **브랜치**: `feature/teama-task-1135-def130-subadmin-rls`
- **커밋**: `b3af757e7`(1차) / `5557116fe`(PR#1174 반려 대응 2차 — 아래 §9)
- **이슈**: https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/895
- **PR**: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1174
- **결함 보고서**: `.agent/defects/DEF-130_SNTL_SUB_ADMIN_UPS기준요금_조회불가.md`

---

## 1. 목표 / 전제조건

**목표**: `sntl@zenith.kr`(SUB_ADMIN, SNTL Master Agency)가 `/admin/ups-rates` "기준요금" 탭에서
실제 존재하는 `zen_ups_base_rates` 데이터를 조회할 수 있도록 RLS SELECT 정책을 추가한다.

**전제조건**: 없음(단독 처리 가능한 단순~중간 복잡도 Task로 판단 — 설계 결정은 Aiden이
이슈 발령 시점에 이미 A안으로 확정하여 전달했으므로 별도 `[설계 의견]` 절차 생략).

## 2. [설계 확정] (Aiden 사전 확정 — 발령 시 지시)

- **채택안**: A안 — `zen_ups_base_rates`에 SUB_ADMIN 조회 정책 추가(판매가 SELECT만 허용,
  수정은 기존 `zen_agency_pricing_policies`(cost_price) 경로 유지).
- **근거**: TASK-192(Issue #618)가 이미 이 화면을 SUB_ADMIN 모드로 열어준 것 자체가
  "판매가 참고 후 원가 관리" 실제 업무 필요성을 반영한 설계 의도로 판단. B안(화면 재설계)은
  범위 과대, C안(권한없음 안내)은 화면을 만든 목적 자체를 무의미하게 함.

## 3. 작업 요약

1. `20260719000400_sub_admin_master_agency_scoped_pricing.sql`의 `is_managing_agency(uid, target_org_id)`
   패턴을 검토 — `zen_agency_pricing_policies`는 `agency_org_id` 컬럼이 있어 "그 특정 하위
   대리점 단위"까지 스코프를 걸 수 있었음.
2. **[스코프 설계 노트]** `zen_ups_base_rates`는 상품×구간×중량 단위 플랫폼 공용 판매가
   카탈로그로, 특정 조직에 귀속되는 컬럼이 원천적으로 없음(기존 `ups_base_rates_agency_select`도
   AGENCY 역할에 동일하게 전역 활성 요율 전체를 보여줌 — 행 단위 조직 스코프가 처음부터
   존재하지 않는 테이블). 따라서 `is_managing_agency`를 그대로 재사용할 수 없고, 대신
   "이 SUB_ADMIN이 실제로 하나 이상의 Sub-Agency를 관리하는 상태인가"(고아 SUB_ADMIN
   방지) 수준에서 동일 관계(`zen_organizations.parent_id`)를 재사용하는
   `has_managed_sub_agency(uid)` 헬퍼를 신설함. 이 설계상 서로 다른 Master Agency 소속
   SUB_ADMIN들도 (AGENCY 역할과 동일하게) 같은 공용 카탈로그를 보게 되며, 이는 테이블
   구조상 불가피하고 의도된 동작임을 회귀 테스트(TC-DEF130-04)로 명시적으로 확인·기록함.
3. 마이그레이션 `supabase/migrations/20260819130000_def130_sub_admin_base_rates_select.sql` 작성.
4. `supabase db reset --yes` 후 로컬 Supabase에서 authenticated 롤 + JWT `sub` 시뮬레이션으로
   실제 RLS 재현 검증(psql `SET ROLE authenticated` + `request.jwt.claims`).
5. 회귀 테스트 6건 추가.
6. `npm run build`, `npm run test:regression` 전체 PASS 확인.
7. `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` §9(UPS 요율 관리) 갱신.

## 4. 변경 파일

| 파일 | 상태 | 내용 |
| :--- | :--- | :--- |
| `supabase/migrations/20260819130000_def130_sub_admin_base_rates_select.sql` | 신규 | `has_managed_sub_agency(uid)` SECURITY DEFINER 헬퍼 + `ups_base_rates_sub_admin_select` SELECT 정책 |
| `tests/unit/db/def130-ups-base-rates-sub-admin-select-rls.test.ts` | 신규 | TC-DEF130-01~06 (조회 허용/비활성 미노출/고아 SUB_ADMIN 차단/타 Master Agency 조회 확인/수정 미부여/되돌리기) |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | M | §9 UPS 요율 관리 섹션에 TC-DEF130-01~06 등재 |
| `.agent/defects/DEF-130_SNTL_SUB_ADMIN_UPS기준요금_조회불가.md` | M | "조치 결과" 섹션 추가(A안 채택, 스코프 설계 노트, 본 Task 참조) |

## 5. 검증 결과

### 5.1 RLS 실제 재현 검증 (로컬 Supabase, `supabase db reset --yes` 이후)

- authenticated 롤 + `request.jwt.claims`(sub) 시뮬레이션으로 실제 정책 평가 확인
- 하위 Sub-Agency를 관리하는 SUB_ADMIN → 활성 기준요금 SELECT 1행 확인
- 고아 SUB_ADMIN(관리 중인 Sub-Agency 없음) → 0행 확인
- SUB_ADMIN의 UPDATE 시도 → 0행 영향(RLS로 차단), service_role로 재조회하여 값 불변 확인
- 정책 제거 → 0행 재현, 정책 복원 → 1행 재현(되돌리기 검증)

### 5.2 회귀 테스트

- **`npm run build`**: 성공(사전 존재 warning 외 신규 에러 없음)
- **`npm run test:regression`**: **Test Files 202 passed (202) · Tests 1426 passed (1426)** — 전체 PASS
  (로컬 Supabase `db reset --yes` 후, `.env.local`은 이 워크트리에 최초 부재하여
  메인 체크아웃의 값을 그대로 복사해 생성함 — 동일 로컬 Supabase 인스턴스 접속 정보이므로
  안전. R-08-2 관련: 착수 전 `check-db-freshness.sh`로 pending 마이그레이션 없음 확인함)

## 6. DoD 체크

- [x] `zen_ups_base_rates`에 SUB_ADMIN SELECT RLS 정책 추가(A안)
- [x] 기존 `is_managing_agency` 스코프 패턴 검토 후, 테이블 구조 차이를 반영한 `has_managed_sub_agency` 헬퍼로 재설계
- [x] 수정(INSERT/UPDATE/DELETE) 권한은 부여하지 않음 — 실제 RLS 시뮬레이션으로 확인
- [x] 로컬 Supabase `db reset --yes` 후 SUB_ADMIN 세션 조회 재현 확인
- [x] 신규 회귀 테스트 6건 추가 + `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` 성공
- [x] `npm run test:regression` 전체 PASS (202 파일 · 1426 테스트)
- [x] `gitnexus_detect_changes()` 확인 — risk_level: low, affected_processes: 0 (RLS 정책/신규 SQL·테스트 파일은 GitNexus 코드 심볼 그래프 대상 외, 문서 변경만 감지됨)

## 7. [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

## 8. 리뷰 요청 (1차)

- 리뷰어: Aiden (ZEN_CEO)
- 라벨: `status:review` 요청됨
- PR: `feature/teama-task-1135-def130-subadmin-rls` → `develop`, `Closes #895`

## 9. PR#1174 1차 반려 및 재수정 (2026-08-19)

### 9.1 반려 사유 (Aiden 전달)

CI(fresh DB, `supabase db reset` 기준)에서 TC-DEF130-05가 아래 에러로 실패:

```
ERROR:  permission denied for table zen_ups_base_rates
HINT:  Grant the required privileges to the current role with: GRANT UPDATE ON public.zen_ups_base_rates TO authenticated;
```

RLS와 별개로 `authenticated` 롤 자체에 테이블 단위 UPDATE GRANT가 없어 CI(진짜 fresh DB)에서
UPDATE 시도 자체가 psql 에러로 죽어 테스트가 예외를 던짐. 로컬은 통과했으나 이는 DEF-128과
동일한 "로컬 DB가 fresh CI와 다르다" 패턴으로 의심됨.

### 9.2 원인 조사

1. **마이그레이션 이력 확인** — `zen_ups_base_rates`에 `authenticated`용 UPDATE GRANT를 주는
   마이그레이션은 전무함을 확인(`grep -rn "GRANT" supabase/migrations/*.sql | grep base_rates` →
   `service_role` 대상 GRANT 1건만 존재, `20260728110000_imp153_authenticated_grant_일괄.sql`은
   `authenticated`에 **SELECT만** 일괄 부여). 즉 마이그레이션만 재생하는 진짜 fresh DB에서는
   `authenticated`가 이 테이블에 UPDATE 권한이 없는 것이 **올바른 기대 동작**이며, CI가 맞고
   제 최초 로컬 테스트가 우연히 통과한 것이 이상 상태였음.
2. **로컬 DB가 통과했던 이유** — 로컬 Docker Postgres 클러스터(`supabase_db_ZENITH_LMS_001`)를
   직접 조회(`pg_default_acl`)한 결과, `defaclrole = postgres`(우리 마이그레이션을 실행하는
   역할)에 대해 `IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated,
   service_role`에 해당하는 default-privilege 규칙이 이미 걸려 있었음. 이 규칙은 현재
   추적되는 어떤 마이그레이션 파일에도 없음 — 이 프로젝트의 로컬 개발용 Docker 컨테이너가
   장기간(프로젝트 초기부터) 재사용되며 언젠가 마이그레이션 외부에서(수동 `ALTER DEFAULT
   PRIVILEGES` 또는 당시 Supabase CLI/이미지 버전의 부트스트랩 방식) 설정된 것으로 추정됨.
   `supabase db reset`은 스키마 객체를 마이그레이션 재생으로 복원하지만 이 컨테이너에 걸린
   role-level default-privilege 규칙까지는 지우지 않아, 로컬에서는 새로 생성되는 모든 테이블이
   항상 `authenticated`에 전체 권한을 자동으로 받는 상태가 되어 있었음 — IMP-153 커밋 메시지가
   설명하는 "로컬 개발 DB는 오랜 기간 누적 GRANT로 인해 정상 동작" 패턴과 정확히 동일한
   현상이 SELECT가 아닌 UPDATE에서도 재현된 것.
3. **로컬에서 실제 재현** — `REVOKE UPDATE ON public.zen_ups_base_rates FROM authenticated;`로
   위 default-privilege 효과를 해당 테이블에서만 일시적으로 제거해 CI와 동일한 GRANT 상태를
   만든 뒤 재현: `psql -c "SET ROLE authenticated; ... UPDATE ...;"` → 동일하게
   `ERROR: permission denied for table zen_ups_base_rates` + exit code 1 확인. CI 실패를
   로컬에서 정확히 재현함.

### 9.3 수정 내용

- `tests/unit/db/def130-ups-base-rates-sub-admin-select-rls.test.ts`의
  `updateAttemptAsAuthenticated()`를 try/catch로 감싸 `permission denied` 에러 메시지를
  "UPDATE 차단 확인"으로 인정하도록 수정. "0행 갱신"(RLS 필터링)과 "permission denied"(GRANT
  자체 부재)는 둘 다 "SUB_ADMIN이 판매가를 수정할 수 없다"는 동일한 결론이므로 둘 다 pass 처리.
  RLS 정책 자체(마이그레이션 SQL)는 변경 없음 — 애초에 SUB_ADMIN에게 UPDATE 정책을 부여한
  적이 없으므로 수정 범위는 테스트 코드에 한정됨.
- 위 §9.2-3 재현 절차로 수정된 catch 분기가 실제로 `permission denied` 케이스를 타는 것을
  직접 확인(REVOKE 후 재실행 → PASS, 원상복구 후 재실행 → PASS 둘 다 확인).

### 9.4 재검증 (진짜 fresh 로컬 DB 기준)

- `supabase db reset --yes` 재실행 후 `tests/unit/db/def130-ups-base-rates-sub-admin-select-rls.test.ts`
  단독 실행: PASS (6/6)
- `supabase db reset --yes` 1회 더 재실행 후 `npm run test:regression` 전체 실행:
  **Test Files 202 passed (202) · Tests 1426 passed (1426)** — 전체 PASS
- **로컬 환경의 근본적 한계 기재**: 위 9.2-2에서 확인했듯 이 로컬 컨테이너는 `db reset`으로도
  지워지지 않는 레거시 default-privilege 규칙을 갖고 있어, "진짜 fresh"를 완전히 재현하려면
  9.2-3처럼 수동 REVOKE로 특정 GRANT를 임시로 제거해 시뮬레이션해야 한다는 점을 확인함.
  이번 §9.4 회귀 전체 실행에서는 REVOKE를 되돌린(=로컬 기본 상태) 채로 돌렸으므로 TC-DEF130-05는
  "0행 갱신" 경로로 통과했고, "permission denied" 경로는 9.2-3에서 별도로 명시적 재현·확인함 —
  두 경로 모두 실제로 검증되었음을 기록.

### 9.5 재리뷰 요청

- 코드 커밋: `5557116fe`
- 라벨: `status:review` 재요청 (PR#1174에 push, `gh pr checks`로 CI 확인 예정)

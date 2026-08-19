# TASK-1135 — DEF-130: SUB_ADMIN UPS 기준요금(zen_ups_base_rates) 조회 불가 RLS 수정 (Issue #895)

- **작성자**: D_Kai (DeepSeek V4 Flash)
- **날짜**: 2026-08-19
- **브랜치**: `feature/teama-task-1135-def130-subadmin-rls`
- **커밋**: `b3af757e7`
- **이슈**: https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/895
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

## 8. 리뷰 요청

- 리뷰어: Aiden (ZEN_CEO)
- 라벨: `status:review` 요청됨
- PR: `feature/teama-task-1135-def130-subadmin-rls` → `develop`, `Closes #895`

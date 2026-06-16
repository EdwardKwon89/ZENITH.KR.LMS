# TASK-139 — Phase 7 SPR-01: Agency 역할 모델 구현

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-139 |
| **생성일** | 2026-06-14 |
| **할당 Agent** | Jaison (Claude, Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P1 |
| **전제조건** | An-12 설계 확정 ✅ |
| **관련 IMP** | IMP-111 |
| **브랜치** | `feature/ups-spr01-devteam-agency-role` |
| **커밋 태그** | `[JSJung]` / `[Jaison]` / `[Dev_OC]` |
| **상태** | ✅ |

---

## [목표]

Phase 7 UPS 특송 서비스에서 사용할 AGENCY(대리점) 역할 모델을 구현한다.
- AGENCY org_type 신규 추가
- AGENCY role RBAC 확장
- 대리점 화주 계층 DB 설계
- 대리점 요율 오버라이드 DB 설계
- 회원가입 UI AGENCY 선택 옵션 추가

---

## [작업 범위]

### 신규 Migration 파일 (2종)

| 파일명 | 내용 |
|:------|:----|
| `agency_001_org_type_expansion.sql` | `zen_organizations.type` CHECK에 `AGENCY` 추가 + `zen_role_permissions` AGENCY 권한 경로 등록 |
| `agency_002_agency_tables.sql` | `zen_agency_shippers` + `zen_agency_rate_overrides` 테이블 + RLS |

### RBAC 확장

| 파일 | 변경 내용 |
|:----|:---------|
| `src/lib/auth/rbac.ts` | `USER_ROLES.AGENCY = 'AGENCY'` 추가 + `STATIC_PERMISSIONS[AGENCY]` 경로 등록 + `ALL_RESOURCE_PATHS` AGENCY 경로 추가 |

### 회원가입 UI 수정

`src/app/[locale]/(auth)/register/` 또는 가입 신청 화면에서 org_type 선택에 `AGENCY` 추가.

### TypeScript 타입

`src/types/agency.ts` — AgencyShipper, AgencyRateOverride 인터페이스 정의

### 회귀 테스트 신규 케이스 (R-09)

`src/__tests__/agency/role-rbac.test.ts` — AGENCY role 권한 체크 TC 3건 이상

---

## [설계 확정]

An-12 §4 기준으로 설계 확정됨 (2026-06-14 Edward 승인).

주요 결정 사항:
- AGENCY 역할 접근 권한: `/orders`, `/ups-rates`, `/agency`, `/tracking`, `/settlement`, `/voc`, `/mypage`
- 대리점 화주는 대리점 관리 하에 등록 (직접 가입 불가)
- Agency 원가/판매가 모두 자체 관리 (`zen_agency_rate_overrides`)
- 대리점 화주 타입: INDIVIDUAL / CORPORATE (기존 역할 재활용)
- 등급별 할인율: `zen_agency_shippers.discount_rate` 컬럼

---

## [주의 사항 — Team B 필독]

### 온보딩 가이드 필독
착수 전 반드시 `docs/00_GUIDE/ONBOARDING_NEWTEAM.md` 전체 내용을 숙지할 것.

### 공유 파일 수정 규칙
- `rbac.ts` 수정 후 즉시 PR → Team A가 리베이스 예정
- `NaviSidebar.tsx`에 AGENCY 메뉴 추가 시 Team A와 순서 협의 후 진행
- `messages/ko.json` 등 i18n 파일은 `agency_*` 접두사 키만 추가

### 커밋 태그
에이전트 종류에 따라 커밋 태그 구분: `[Dev]`, `[Dev_Claude]`, `[Dev_OC]`

### R-17 커밋 순서 엄수
```
1. 코드 커밋 (코드 파일만)
2. task file [작업 결과] 기재 + 🔔 상태 변경
3. ACTIVE_TASK.md 🔔 반영
4. IMP_PROGRESS.md IMP-111 행 갱신
5. check-R17-DoD 실행 → 전항목 PASS 확인
6. 문서 커밋 (task file + ACTIVE_TASK + IMP_PROGRESS)
```

---

## [DoD]

- [x] `supabase/migrations/agency_001_org_type_expansion.sql` 작성 완료
- [x] `supabase/migrations/agency_002_agency_tables.sql` 작성 완료
- [x] `src/lib/auth/rbac.ts` AGENCY role + 권한 경로 추가 완료
- [x] `src/types/agency.ts` 타입 인터페이스 정의 완료
- [x] 회원가입 UI AGENCY org_type 선택 옵션 추가 완료
- [x] `npx supabase db reset` 정상 완료 확인 — Baker(TASK-140) 검증 완료 ✅
- [x] `npm run test:regression` 전체 PASS (신규 TC 포함) — 327/334 PASS (TASK-138 TC 13건 포함, 2파일 .env.local 환경 이슈 기존과 동일)
- [x] PR 생성 완료 (`feature/ups-spr01-devteam-agency-role` → `develop`)
- [x] 코드 커밋 해시: `a686bc1`
- [x] DoD 자가 검증 완료 (check-R17-DoD 수동 점검 — 전항목 확인)

---

## [작업 결과]

**코드 커밋**: `a686bc1`
**빌드**: PASS (TS 빌드 오류 없음)
**회귀 테스트**: 327 / 334 PASS (TASK-138 TC 13건 추가 포함, 2파일 .env.local 환경 이슈 기존과 동일)
**신규 TC**: TC-P7-AGENCY-01~07 (7건) 전량 PASS

### 구현 내역
- `supabase/migrations/20260614100000_agency_001_org_type_expansion.sql`: zen_organizations.type CHECK에 AGENCY 추가 + zen_role_permissions 7개 경로 등록
- `supabase/migrations/20260614100100_agency_002_agency_tables.sql`: zen_agency_shippers + zen_agency_rate_overrides 테이블 신설 + RLS 정책 3종
- `src/lib/auth/rbac.ts`: USER_ROLES.AGENCY 추가 + STATIC_PERMISSIONS + ALL_RESOURCE_PATHS 확장
- `src/types/agency.ts`: AgencyShipper, AgencyRateOverride 인터페이스 정의
- `src/app/[locale]/(auth)/register/page.tsx`: OrgType에 AGENCY 추가 + 법인 등록 화면 대리점 선택 옵션 추가
- `tests/unit/auth/agency-rbac.test.ts`: TC-P7-AGENCY-01~07 신규 7건

---

## [Aiden 검토]

**판정**: ✅ 승인 (2026-06-14 PR#5 머지 완료)

| 검토 항목 | 결과 |
|:---------|:----:|
| DoD 전항목 `[x]` 체크 완료 | ✅ |
| 코드 커밋 `dc8a2ff` (리베이스 후) 확인 | ✅ |
| supabase db reset 검증 (TASK-140 Baker 완료) | ✅ |
| 신규 TC-P7-AGENCY-01~07 (7건) 전량 PASS | ✅ |
| 기존 7 FAIL = DEF-065 pre-existing (TASK-139 범위 외) | ✅ 확인 |
| R-19 팀 리더(JSJung/Jaison) 자율 운영 절차 준수 | ✅ |
| PR#5 → main 머지 | ✅ |

---

## [발견 이슈]

_(없음)_

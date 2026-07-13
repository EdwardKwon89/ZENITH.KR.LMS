# TASK-B-056: Issue #180 DEF 화주 계정 발급 — 기반 구축 (DB · RBAC · Validation · Types)

> **태스크 ID**: TASK-B-056
> **생성일**: 2026-07-05
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Jaison
> **우선순위**: P1
> **상태**: 🔔
> **선행 Task**: 없음
> **후속 Task**: TASK-B-057 (Dave) · TASK-B-058 (Baker) 의 전제조건

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-056-def180-foundation-jaison
```

> **Jaison 전용 주의**: git·npm·rtk CLI 명령은 JSJung에게 실행 요청.
> 파일 작성(Write/Edit 툴)은 Jaison 직접 수행 가능.

완료 보고: **① 코드 커밋(JSJung 실행) → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성(JSJung 실행)** (`develop` 대상)

---

## 배경

Issue #180 ([DEF] Agency 화주 로그인 계정 미발급) 수정을 위한 기반 레이어 구축.
DB 마이그레이션 · RBAC · 유효성 검사 스키마 · TypeScript 타입을 선행 확정하여
TASK-B-057(Dave 백엔드)·TASK-B-058(Baker 프론트엔드)의 의존성을 해소.

설계 근거: Issue #180 코멘트 (Jaison, 2026-07-05) — 두 번째 코멘트(보완) 포함.

---

## 구현 범위

### §1 — DB 마이그레이션 신규 작성

**파일**: `supabase/migrations/20260705000001_agency_004_org_address_columns.sql`

```sql
-- Issue #180: zen_organizations 주소 컬럼 추가
-- Agency 화주 등록 시 국내/국외 주소 입력 지원

ALTER TABLE public.zen_organizations
  ADD COLUMN IF NOT EXISTS country_code    VARCHAR(2)   DEFAULT 'KR',
  ADD COLUMN IF NOT EXISTS state_province  TEXT,
  ADD COLUMN IF NOT EXISTS city            TEXT,
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS address_detail  TEXT,
  ADD COLUMN IF NOT EXISTS zipcode         VARCHAR(20);
```

### §2 — RBAC `AGENCY_SHIPPER` role 추가

**파일**: `src/lib/auth/rbac.ts`

```typescript
// USER_ROLES 객체에 추가
AGENCY_SHIPPER: 'AGENCY_SHIPPER',

// STATIC_PERMISSIONS에 추가
[USER_ROLES.AGENCY_SHIPPER]: [
  '/orders', '/ups-rates', '/tracking', '/voc', '/support', '/mypage'
],
```

### §3 — Validation Schema 확장

**파일**: `src/lib/validations/agency.ts`

`CreateAgencyShipperSchema`에 추가:

```typescript
// 신규 필수: 로그인 ID
login_email: z.string()
  .email('유효한 이메일 형식이 아닙니다.')
  .min(1, '로그인 ID를 입력해주세요.'),

// 신규 선택: 주소 정보
country_code: z.string().length(2).default('KR'),
state_province: z.string().max(100).optional(),
city: z.string().max(100).optional(),
address: z.string().max(200).optional(),
address_detail: z.string().max(100).optional(),
zipcode: z.string().max(20).optional().or(z.literal('')),
```

### §4 — TypeScript 타입 반영

**파일**: `src/types/agency.ts`

`CreateAgencyShipperInput` 타입에 §3 신규 필드 반영 (Zod infer 방식이면 자동 반영 확인, 별도 정의 방식이면 수동 추가).

---

## DoD (Definition of Done)

- [x] `supabase/migrations/20260705000001_agency_004_org_address_columns.sql` 생성 — 6개 컬럼 정의 포함
- [x] `src/lib/auth/rbac.ts` — `AGENCY_SHIPPER` `USER_ROLES` 추가 + `STATIC_PERMISSIONS` 6개 경로 정의
- [x] `src/lib/validations/agency.ts` — `login_email` 필수 + 주소 6개 필드 추가
- [x] `src/types/agency.ts` — 신규 필드 타입 반영 확인 (`UpdateAgencyShipperInput` Omit 분리 포함)
- [x] TypeScript 빌드 오류 없음 — 신규 오류 0건 (e2e-19/20 기존 오류 제외 확인)
- [x] `npm run test:regression` — **391/391 PASS**
- [x] 코드 커밋 해시 기재: `d2e3b98`
- [ ] PR 생성 (`feature/teamb-task-b-056-... → develop`, `Closes #180 (부분)`) 완료

---

## [설계 의견]

_Jaison 작성 불필요 (Jaison = 발령자 겸 담당자)_

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

| 항목 | 상태 |
|:-----|:----|
| `supabase/migrations/20260705000001_agency_004_org_address_columns.sql` | zen_organizations 주소 6컬럼 추가 ✅ |
| `src/lib/auth/rbac.ts` | `AGENCY_SHIPPER` USER_ROLES + STATIC_PERMISSIONS 6경로 추가 ✅ |
| `src/lib/validations/agency.ts` | `login_email` 필수 + 주소 6필드 추가 ✅ |
| `src/types/agency.ts` | `CreateAgencyShipperInput` 신규 필드 + `UpdateAgencyShipperInput` Omit 분리 ✅ |
| `shipper-form.tsx` | `login_email` 임시 플레이스홀더 (Baker B-058 교체 예정) ✅ |
| `shipper-actions.test.ts` | 기존 TC login_email 보완 + TC-P7-SHIPPER-05 신규 3건 (R-09) ✅ |
| TypeScript | 신규 오류 0건 ✅ |
| Regression | **391/391 PASS** ✅ |

**코드 커밋**: `d2e3b98`
**브랜치**: `feature/teamb-task-b-056-def180-foundation-jaison`

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-05 | Jaison | TASK-B-056 발령 — Issue #180 DEF 기반 구축 (Jaison 담당) · DB migration · RBAC · Validation · Types |
| 2026-07-05 | Jaison | TASK-B-056 🔔 완료 보고 — 코드 커밋 `d2e3b98` · 391/391 PASS · PR 생성 대기 |

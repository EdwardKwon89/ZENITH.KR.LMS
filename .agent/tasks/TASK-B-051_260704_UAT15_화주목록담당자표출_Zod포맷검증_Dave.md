# TASK-B-051: UAT-15 피드백 — 화주목록 담당자 정보 조회 + Zod 포맷 유효성 강화

> **태스크 ID**: TASK-B-051
> **생성일**: 2026-07-04
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (DeepSeek)
> **우선순위**: P1
> **상태**: 🔔
> **관련 Task**: TASK-B-052 (Baker — UI 표출, 후행)
> **선행 Task**: 없음

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-051-uat15-backend-dave
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상)

---

## 배경

UAT-15-01 수행 중 JSJung이 다음 3가지 개선 사항을 요구함:
1. 화주목록에서 담당자 정보(담당자명·이메일·연락처) 표출
2. 화주 입력 폼에서 사업자번호·연락처 포맷 자동 적용 및 유효성 검사
3. (UI는 TASK-B-052 Baker 담당)

---

## 구현 범위

### §1 — `getAgencyShippers` 쿼리 contact 필드 추가

**파일**: `src/app/actions/agency/shippers.ts`

현재 쿼리의 `shipper:shipper_org_id` select 절에 contact 3개 필드 추가:

```typescript
shipper:shipper_org_id (
  id,
  name,
  biz_no,
  status,
  contact_name,      // 추가
  contact_email,     // 추가
  contact_phone      // 추가
)
```

### §2 — `AgencyShipperRow` 타입 contact 필드 추가

**파일**: `src/types/agency.ts`

```typescript
export interface AgencyShipperRow extends AgencyShipper {
  shipper: {
    id: string;
    name: string;
    biz_no: string | null;
    status: string;
    contact_name: string | null;   // 추가
    contact_email: string | null;  // 추가
    contact_phone: string | null;  // 추가
  } | null;
}
```

### §3 — `CreateAgencyShipperSchema` Zod regex 강화

**파일**: `src/lib/validations/agency.ts`

```typescript
export const CreateAgencyShipperSchema = z.object({
  // ... 기존 필드 유지
  biz_no: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '사업자번호 형식이 올바르지 않습니다. (예: 123-45-67890)')
    .optional()
    .or(z.literal('')),
  contact_phone: z
    .string()
    .regex(/^0\d{1,2}-\d{3,4}-\d{4}$/, '연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)')
    .optional()
    .or(z.literal('')),
  contact_email: z
    .string()
    .email('유효한 이메일 형식이 아닙니다.')
    .optional()
    .or(z.literal('')),   // Update schema와 동일하게 빈값 허용 통일
  // ...
});
```

### §4 — `UpdateAgencyShipperSchema` 동일 regex 적용

**파일**: `src/lib/validations/agency.ts`

`UpdateAgencyShipperSchema`의 `biz_no`, `contact_phone` 필드에 §3와 동일한 regex 적용.

---

## DoD (Definition of Done)

- [x] `getAgencyShippers` 쿼리: `contact_name`, `contact_email`, `contact_phone` 포함 확인
- [x] `AgencyShipperRow` 타입: contact 3필드 추가 확인
- [x] `CreateAgencyShipperSchema`: `biz_no` regex `/^\d{3}-\d{2}-\d{5}$/` 적용
- [x] `CreateAgencyShipperSchema`: `contact_phone` regex `/^0\d{1,2}-\d{3,4}-\d{4}$/` 적용
- [x] `CreateAgencyShipperSchema`: `contact_email` `.or(z.literal(''))` 추가
- [x] `UpdateAgencyShipperSchema`: 위 3개 필드 동일 regex 적용
- [x] TypeScript 빌드 오류 없음 (`npx tsc --noEmit --skipLibCheck` PASS — pre-existing only)
- [x] `npm run test:regression` — **388/388 PASS**
- [x] 코드 커밋 해시: `8c8b463`
- [x] PR 생성 완료

---

## [설계 의견]

_(Dave 기재)_

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

### §1 — `getAgencyShippers` 쿼리 contact 필드 추가
- `src/app/actions/agency/shippers.ts`: `shipper:shipper_org_id` select 절에 `contact_name`, `contact_email`, `contact_phone` 추가

### §2 — `AgencyShipperRow` 타입 contact 필드 추가
- `src/types/agency.ts`: `shipper` 객체 타입에 `contact_name`, `contact_email`, `contact_phone` (`string | null`) 추가

### §3 — `CreateAgencyShipperSchema` Zod regex 강화
- `src/lib/validations/agency.ts`:
  - `biz_no`: `z.string().optional()` → regex `/^\d{3}-\d{2}-\d{5}$/` + `.or(z.literal(''))`
  - `contact_phone`: `z.string().optional()` → regex `/^0\d{1,2}-\d{3,4}-\d{4}$/` + `.or(z.literal(''))`
  - `contact_email`: `.optional()` → `.optional().or(z.literal(''))`

### §4 — `UpdateAgencyShipperSchema` 동일 regex 적용
- 동일한 3개 필드 regex + `.or(z.literal(''))` 적용

### 검증
- **커밋**: `8c8b463` (3 files, +18/−7)
- **TypeScript**: PASS (pre-existing errors only)
- **회귀**: **388/388 PASS**

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-04 | Jaison | TASK-B-051 발령 — UAT-15 피드백 Backend 파트 (Dave 담당) |
| 2026-07-04 | Dave | TASK-B-051 구현 완료 🔔 — 코드 `8c8b463` · 388/388 PASS · PR#176 |

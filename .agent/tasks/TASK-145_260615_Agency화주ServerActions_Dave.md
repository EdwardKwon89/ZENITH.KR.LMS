# TASK-145 — SPR-02 Agency 화주 Server Actions 구현

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-145 |
| **생성일** | 2026-06-15 |
| **할당 Agent** | Dave (OpenCode DeepSeek) |
| **지시자** | Jaison (Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P1 |
| **전제조건** | TASK-139 ✅ (zen_agency_shippers 테이블 존재) |
| **관련 IMP** | IMP-114 |
| **브랜치** | `feature/ups-spr02-devteam-agency-ui` (신규 생성) |
| **커밋 태그** | `[Dave]` |
| **상태** | ⬜ |

---

## [목표]

An-12 §5-2 명세 기준으로 Agency 화주 관리 Server Actions 3종을 구현한다.
TASK-146(Baker), TASK-147(Gale) UI 구현의 선행 의존 Task.

---

## [작업 범위]

### 1. 브랜치 생성

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/ups-spr02-devteam-agency-ui
```

> ⚠️ `develop` 브랜치를 기준으로 신규 브랜치 생성. main 기준 금지.

### 2. Server Actions 구현

**파일**: `src/app/actions/agency/shippers.ts`

```typescript
// An-12 §5-2 명세 기준

// 대리점 하위 화주 목록 조회
getAgencyShippers(agencyOrgId: string): Promise<AgencyShipper[]>

// 대리점 화주 신규 등록
// - zen_organizations INSERT (type='SHIPPER')
// - zen_agency_shippers 연결 레코드 생성
createAgencyShipper(
  agencyOrgId: string,
  shipperData: CreateAgencyShipperInput
): Promise<{ success: boolean; shipperId?: string; error?: string }>

// 화주 등급 및 할인율 수정
updateAgencyShipperGrade(
  id: string,
  grade: string,
  discountRate: number
): Promise<{ success: boolean; error?: string }>
```

### 3. Zod 스키마 정의

**파일**: `src/lib/validations/agency.ts`

```typescript
export const CreateAgencyShipperSchema = z.object({
  name: z.string().min(1).max(100),
  shipper_type: z.enum(['INDIVIDUAL', 'CORPORATE']),
  discount_rate: z.number().min(0).max(0.9999),
  grade: z.string().max(20).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
})

export const UpdateAgencyShipperGradeSchema = z.object({
  grade: z.string().max(20),
  discount_rate: z.number().min(0).max(0.9999),
})
```

### 4. 타입 보완

`src/types/agency.ts`에 `CreateAgencyShipperInput` 타입 추가 (기존 파일 수정).

### 5. 회귀 테스트 케이스 (R-09)

**파일**: `tests/unit/agency/shipper-actions.test.ts`

- TC-P7-SHIPPER-01: `getAgencyShippers` — 빈 배열 반환 (초기 상태)
- TC-P7-SHIPPER-02: `CreateAgencyShipperSchema` — 유효 입력 검증 PASS
- TC-P7-SHIPPER-03: `CreateAgencyShipperSchema` — `discount_rate > 1` 입력 시 실패
- TC-P7-SHIPPER-04: `UpdateAgencyShipperGradeSchema` — 유효 등급/할인율 검증 PASS

---

## [주의 사항]

- `src/types/agency.ts`는 TASK-139에서 생성됨 — 추가만 가능, 기존 인터페이스 수정 금지
- Server Action 내 권한 체크: `checkPermission(role, '/agency')` 사용
- `zen_agency_shippers` FK: `agency_org_id`, `shipper_org_id` 모두 필수
- 함수 50줄 이하 엄수 (ZEN_A4)
- Supabase 클라이언트: `createServerSupabaseClient()` 사용 (Server Action 내)

---

## [R-17 커밋 순서]

```
1. 코드 커밋: [Dave] feat: TASK-145 Agency 화주 Server Actions 3종 구현
2. task file [작업 결과] + 🔔 상태 변경
3. ACTIVE_TASK.md 🔔 반영
4. scratch/IMP_PROGRESS.md IMP-114 행 갱신
5. check-R17-DoD 실행 → 전항목 PASS 확인
6. 문서 커밋: [Dave] docs: TASK-145 완료 보고 — task file 🔔
```

---

## [DoD]

- [ ] `feature/ups-spr02-devteam-agency-ui` 브랜치 생성 확인 (`develop` 기준)
- [ ] `src/app/actions/agency/shippers.ts` — 3개 Server Actions 구현 완료
- [ ] `src/lib/validations/agency.ts` — Zod 스키마 2종 정의 완료
- [ ] `src/types/agency.ts` — `CreateAgencyShipperInput` 타입 추가 완료
- [ ] 함수별 50줄 이하 준수 확인
- [ ] `tests/unit/agency/shipper-actions.test.ts` — TC-P7-SHIPPER-01~04 (4건) 전량 PASS
- [ ] `npm run test:regression` 전체 PASS (신규 TC 포함)
- [ ] 코드 커밋 해시: _(작업 후 기재)_
- [ ] DoD 자가 검증 (`check-R17-DoD`) 완료

---

## [작업 결과]

_(Dave 작업 완료 후 기재)_

---

## [발견 이슈]

_(없음)_

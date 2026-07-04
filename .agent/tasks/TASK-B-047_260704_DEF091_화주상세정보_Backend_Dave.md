# TASK-B-047: DEF-091 화주 상세 정보 Backend — contact 컬럼 마이그레이션 + updateAgencyShipper 액션

> **태스크 ID**: TASK-B-047
> **생성일**: 2026-07-04
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (DeepSeek)
> **우선순위**: P1
> **상태**: 🔔
> **관련 Issue**: [#159](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/159)
> **관련 DEF**: DEF-091
> **선행 Task**: 없음
> **후행 Task**: TASK-B-048 (Baker — 편집 UI)

---

## ⚠️ 착수 전 필독 — R-17 브랜치/PR 절차

1. `git fetch origin && git checkout develop && git pull origin develop` (완료)
2. `git checkout -b feature/teamb-task-b-047-def091-backend-dave` (완료)
3. 완료 보고 순서: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`Closes #159`)
4. **develop 직접 커밋 절대 금지 — 위반 즉시 기록됨**

---

## 개요

DEF-091 결함 B: `zen_organizations` 테이블에 contact 컬럼 미존재 + `updateAgencyShipper` 액션 미구현.
Dave는 DB 마이그레이션, createAgencyShipper 수정, 신규 Server Actions 2종을 구현한다.

---

## 구현 범위

### §1 — DB 마이그레이션

**파일**: `supabase/migrations/YYYYMMDDHHMMSS_agency_003_org_contact_columns.sql`

```sql
-- zen_organizations에 contact 컬럼 추가
ALTER TABLE public.zen_organizations
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;
```

- 로컬 Supabase에 `rtk supabase db push` 또는 `rtk supabase migration up` 적용 필수
- `src/types/supabase.ts` 업데이트 필요 (`rtk supabase gen types`)

### §2 — `_createShipperOrg` 수정

**파일**: `src/app/actions/agency/shippers.ts`

`_createShipperOrg` 함수 시그니처 및 insert 쿼리에 contact 필드 추가:

```typescript
async function _createShipperOrg(
  supabase: SupabaseClient,
  name: string,
  bizNo?: string | null,
  repName?: string | null,
  contactName?: string | null,
  contactEmail?: string | null,
  contactPhone?: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from('zen_organizations')
    .insert({
      name,
      type: 'SHIPPER',
      status: 'ACTIVE',
      biz_no: bizNo ?? null,
      rep_name: repName ?? null,
      contact_name: contactName ?? null,
      contact_email: contactEmail ?? null,
      contact_phone: contactPhone ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create shipper org: ${error.message}`);
  return data.id;
}
```

`createAgencyShipper` 내에서 `_createShipperOrg` 호출 시 contact 인자 전달:
```typescript
const orgId = await _createShipperOrg(
  supabase,
  parsed.data.name,
  parsed.data.biz_no,
  parsed.data.rep_name,
  parsed.data.contact_name,
  parsed.data.contact_email,
  parsed.data.contact_phone,
);
```

### §3 — `getAgencyShipperById` Server Action 신규

**파일**: `src/app/actions/agency/shippers.ts`에 추가

편집 폼 초기값 로드용. zen_agency_shippers + zen_organizations 조인하여 반환.

```typescript
export async function getAgencyShipperById(shipperId: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('zen_agency_shippers')
    .select(`
      id,
      agency_org_id,
      shipper_org_id,
      shipper_type,
      discount_rate,
      grade,
      is_active,
      created_at,
      org:shipper_org_id (
        id,
        name,
        biz_no,
        rep_name,
        contact_name,
        contact_email,
        contact_phone
      )
    `)
    .eq('id', shipperId)
    .single();

  if (error) {
    logger.error('[getAgencyShipperById] Failed:', error.message);
    throw new Error(`Failed to fetch shipper: ${error.message}`);
  }

  return { shipper: data };
}
```

### §4 — `updateAgencyShipper` Server Action 신규

**파일**: `src/app/actions/agency/shippers.ts`에 추가

```typescript
export type UpdateAgencyShipperResult =
  | { success: true }
  | { success: false; fieldErrors: Record<string, string> };

export async function updateAgencyShipper(
  shipperId: string,
  data: UpdateAgencyShipperInput
): Promise<UpdateAgencyShipperResult> {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    return { success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } };
  }

  const parsed = UpdateAgencyShipperSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((e) => {
      const field = String(e.path[0] ?? '_form');
      if (!fieldErrors[field]) fieldErrors[field] = e.message;
    });
    return { success: false, fieldErrors };
  }

  const supabase = await createAdminClient();

  // 1. zen_agency_shippers의 shipper_org_id 조회
  const { data: link, error: linkError } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('id', shipperId)
    .single();
  if (linkError || !link) throw new Error('Shipper not found');

  // 2. zen_organizations 업데이트
  const { error: orgError } = await supabase
    .from('zen_organizations')
    .update({
      name: parsed.data.name,
      biz_no: parsed.data.biz_no ?? null,
      rep_name: parsed.data.rep_name ?? null,
      contact_name: parsed.data.contact_name ?? null,
      contact_email: parsed.data.contact_email ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
    })
    .eq('id', link.shipper_org_id);
  if (orgError) throw new Error(`Failed to update org: ${orgError.message}`);

  // 3. zen_agency_shippers 업데이트
  const { error: shipperError } = await supabase
    .from('zen_agency_shippers')
    .update({
      shipper_type: parsed.data.shipper_type,
      discount_rate: parsed.data.discount_rate,
      grade: parsed.data.grade ?? null,
    })
    .eq('id', shipperId);
  if (shipperError) throw new Error(`Failed to update shipper: ${shipperError.message}`);

  logger.info(`[updateAgencyShipper] Shipper ${shipperId} updated`);
  revalidatePath('/agency/shippers');
  return { success: true };
}
```

### §5 — Zod 스키마 + 타입 추가

**파일**: `src/lib/validations/agency.ts`

```typescript
export const UpdateAgencyShipperSchema = z.object({
  name: z.string().min(1, '화주명을 입력해주세요.').max(100, '화주명은 100자 이하여야 합니다.'),
  shipper_type: z.enum(['INDIVIDUAL', 'CORPORATE'], { message: '화주 유형을 선택해주세요.' }),
  discount_rate: z.number({ message: '할인율을 입력해주세요.' })
    .min(0, '할인율은 0 이상이어야 합니다.')
    .max(0.9999, '할인율은 99.99% 이하여야 합니다.'),
  grade: z.string().max(20).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('유효한 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  biz_no: z.string().optional(),
  rep_name: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.shipper_type === 'CORPORATE' && !data.biz_no) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['biz_no'],
      message: '법인 화주는 사업자번호를 필수로 입력해야 합니다.',
    });
  }
});
```

**파일**: `src/types/agency.ts`

```typescript
export interface UpdateAgencyShipperInput {
  name: string;
  shipper_type: 'INDIVIDUAL' | 'CORPORATE';
  discount_rate: number;
  grade?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  biz_no?: string;
  rep_name?: string;
}
```

---

## DoD (Definition of Done)

- [x] DB 마이그레이션 파일 생성 (`contact_name` / `contact_email` / `contact_phone` ADD COLUMN)
- [x] 로컬 Supabase 마이그레이션 적용 확인 (`supabase db push`)
- [x] `_createShipperOrg` — contact 3개 필드 저장 포함
- [x] `createAgencyShipper` — contact 인자 전달 업데이트
- [x] `getAgencyShipperById` Server Action 구현 (org 상세 조인 포함)
- [x] `updateAgencyShipper` Server Action 구현 (org + agency_shipper 동시 업데이트)
- [x] `UpdateAgencyShipperSchema` Zod 스키마 추가 (validations/agency.ts)
- [x] `UpdateAgencyShipperInput` 타입 추가 (types/agency.ts)
- [x] `UpdateAgencyShipperResult` 유니온 타입 export (shippers.ts)
- [x] TypeScript 빌드 오류 없음 (`npx tsc --noEmit --skipLibCheck` PASS — pre-existing errors only)
- [x] `npm run test:regression` — **388/388 PASS**
- [x] R-17 커밋 순서 준수 (feature 브랜치 → 코드 커밋 → task file 🔔 → PR)
- [x] 코드 커밋 해시 기재: `d8efa7f`
- [ ] 문서 커밋 해시 기재: (TBD)
- [ ] PR 생성 (`Closes #159`) 완료

---

## [설계 의견]

_(Dave 기재)_

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

### §1 — DB 마이그레이션
| 항목 | 내역 |
|:-----|:------|
| 파일 | `supabase/migrations/20260704101500_agency_003_org_contact_columns.sql` |
| 내용 | `zen_organizations`에 `contact_name`/`contact_email`/`contact_phone` **ADD COLUMN** |
| 적용 | `supabase db push` → 로컬 DB 반영 완료 |

### §2 — `_createShipperOrg` 수정
| 항목 | 변경 |
|:-----|:------|
| 시그니처 | `contactName?`, `contactEmail?`, `contactPhone?` 파라미터 추가 |
| INSERT | `contact_name`/`contact_email`/`contact_phone` 컬럼 포함 |
| `createAgencyShipper` | `parsed.data.contact_name` 등 인자 전달 라인 업데이트 |

### §3 — `getAgencyShipperById` 신규
- `zen_agency_shippers` + `zen_organizations`(as `org`) 조인
- 반환: `{ shipper: { id, agency_org_id, shipper_org_id, shipper_type, discount_rate, grade, is_active, created_at, org: { id, name, biz_no, rep_name, contact_name, contact_email, contact_phone } } }`
- 권한 체크: `checkPermission(profile.role, '/agency')`

### §4 — `updateAgencyShipper` 신규
- 반환 타입: `UpdateAgencyShipperResult` = `{ success: true } | { success: false; fieldErrors }`
- ① `zen_agency_shippers`→`shipper_org_id` 조회 → ② org 업데이트(name, biz_no, rep_name, contact*) → ③ shipper 업데이트(shipper_type, discount_rate, grade)
- Zod 오류/권한 오류 → `fieldErrors` 구조체

### §5 — Zod 스키마 + 타입
| 파일 | 추가 내역 |
|:-----|:----------|
| `src/lib/validations/agency.ts` | `UpdateAgencyShipperSchema` (기존 `CreateAgencyShipperSchema`와 동일 조건 + `contact_email` `.or(z.literal(''))`) |
| `src/types/agency.ts` | `UpdateAgencyShipperInput` (alias of `CreateAgencyShipperInput`) |
| `src/app/actions/agency/shippers.ts` | `UpdateAgencyShipperResult` export |

### 검증
- TypeScript: pre-existing errors only (rates/orders/warehouse test files)
- 회귀: **388/388 PASS** (69 files)

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-04 | Jaison | TASK-B-047 신규 발령 — DEF-091 Backend 파트 (Dave 담당) |

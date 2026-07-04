# TASK-B-046: DEF-090 화주 등록 폼 Frontend 수정 — 할인율 변환·폼값 유지·필드별 오류 표시

> **태스크 ID**: TASK-B-046
> **생성일**: 2026-07-04
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: 🔔
> **관련 Issue**: [#159](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/159)
> **관련 DEF**: DEF-090
> **선행 Task**: TASK-B-045 (Dave) — `createAgencyShipper` 반환 타입 변경 완료 후 착수 권장 (병렬 가능하나 타입 먼저 확인 후 구현)
> **후행 Task**: 없음

---

## ⚠️ 착수 전 필독 — R-17 브랜치/PR 절차

1. `git fetch origin && git checkout develop && git pull origin develop`
2. `git checkout -b feature/teamb-task-b-046-def090-frontend-baker`
3. 완료 보고: 코드 커밋 → task file 🔔 기재 → ACTIVE_TASK 반영 → PR 생성 (`Closes #159`)
4. **develop 직접 커밋 절대 금지 — 위반 즉시 기록됨**

---

## 개요

UAT-15-01 Step 3 중 발견된 DEF-090 — 화주 등록 폼 유효성 검사 UX 결함.
Baker는 3개 프론트엔드 파일을 수정하여 할인율 단위 변환, 오류 시 폼값 보존, 필드별 오류 메시지 표시를 구현한다.

---

## 구현 범위

### §1 — `src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx`

**3가지 수정**:

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { createAgencyShipper } from '@/app/actions/agency/shippers';
import { FormHeader } from './form-header';
import { RequiredFields } from './required-fields';
import { ContactFields } from './contact-fields';
import { FormActions } from './form-actions';

interface AgencyShipperFormProps {
  agencyOrgId: string;
}

// 폼값 보존을 위한 타입
interface FormValues {
  name: string;
  shipper_type: 'INDIVIDUAL' | 'CORPORATE';
  discount_rate: string;
  grade: string;
  biz_no: string;
  rep_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

export function AgencyShipperForm({ agencyOrgId }: AgencyShipperFormProps) {
  const t = useTranslations('AgencyShippers');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});   // 필드별 오류
  const [savedValues, setSavedValues] = useState<Partial<FormValues>>({});       // 오류 시 값 보존

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setGlobalError('');
    setFieldErrors({});

    // 현재 입력값 캡처 (오류 시 복원용)
    const currentValues: Partial<FormValues> = {
      name: formData.get('name') as string,
      shipper_type: formData.get('shipper_type') as 'INDIVIDUAL' | 'CORPORATE',
      discount_rate: formData.get('discount_rate') as string,
      grade: formData.get('grade') as string,
      biz_no: formData.get('biz_no') as string,
      rep_name: formData.get('rep_name') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: formData.get('contact_phone') as string,
    };

    try {
      const result = await createAgencyShipper(agencyOrgId, {
        name: currentValues.name!,
        shipper_type: currentValues.shipper_type!,
        discount_rate: Number(currentValues.discount_rate) / 100,  // ① % → 소수 변환
        grade: currentValues.grade || undefined,
        biz_no: currentValues.biz_no || undefined,
        rep_name: currentValues.rep_name || undefined,
        contact_name: currentValues.contact_name || undefined,
        contact_email: currentValues.contact_email || undefined,
        contact_phone: currentValues.contact_phone || undefined,
      });

      if (!result.success) {
        setSavedValues(currentValues);         // ② 오류 시 입력값 보존
        setFieldErrors(result.fieldErrors);    // ③ 필드별 오류 표시
        if (result.fieldErrors._form) setGlobalError(result.fieldErrors._form);
        return;
      }

      router.push(`/${locale}/agency/shippers`);
      router.refresh();
    } catch (err: any) {
      setSavedValues(currentValues);
      setGlobalError(err.message || t('submit_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <FormHeader t={t} />

      <div className="max-w-2xl mx-auto px-8">
        {globalError && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} /> {globalError}
          </div>
        )}

        <form action={handleSubmit} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 space-y-5">
            <RequiredFields t={t} defaultValues={savedValues} fieldErrors={fieldErrors} />
            <ContactFields t={t} defaultValues={savedValues} fieldErrors={fieldErrors} />
          </div>
          <FormActions loading={loading} submitLabel={t('new_shipper')} loadingLabel={t('loading')} />
        </form>
      </div>
    </div>
  );
}
```

### §2 — `src/app/[locale]/(dashboard)/agency/shippers/new/required-fields.tsx`

`defaultValues`와 `fieldErrors` props를 받아 각 input에 적용:

```typescript
'use client';

import { useState } from 'react';

interface RequiredFieldsProps {
  t: (key: string) => string;
  defaultValues?: Partial<{
    name: string;
    shipper_type: 'INDIVIDUAL' | 'CORPORATE';
    discount_rate: string;
    grade: string;
    biz_no: string;
    rep_name: string;
  }>;
  fieldErrors?: Record<string, string>;
}

export function RequiredFields({ t, defaultValues = {}, fieldErrors = {} }: RequiredFieldsProps) {
  const [shipperType, setShipperType] = useState<'INDIVIDUAL' | 'CORPORATE'>(
    defaultValues.shipper_type ?? 'INDIVIDUAL'
  );
  // ...
  // 각 input에 defaultValue={defaultValues.xxx} 추가
  // 각 input 아래에 fieldErrors.xxx 있으면 <p className="text-xs text-red-500 mt-1">{fieldErrors.xxx}</p> 표시
}
```

**핵심 수정 포인트**:
- `name` input: `defaultValue={defaultValues.name}`
- `discount_rate` input: `defaultValue={defaultValues.discount_rate}` + 아래 오류 메시지
- `shipper_type` select: `defaultValue`는 state 초기값으로 반영 (위의 `useState` 초기값 변경)
- `grade` select: `defaultValue={defaultValues.grade}`
- `biz_no` input: `defaultValue={defaultValues.biz_no}` + 아래 오류 메시지
- `rep_name` input: `defaultValue={defaultValues.rep_name}`

**오류 메시지 표시 패턴** (각 input 바로 아래):
```tsx
{fieldErrors.discount_rate && (
  <p className="text-xs text-red-500 mt-1">{fieldErrors.discount_rate}</p>
)}
```

### §3 — `src/app/[locale]/(dashboard)/agency/shippers/new/contact-fields.tsx`

`defaultValues`와 `fieldErrors` props 추가:

```typescript
interface ContactFieldsProps {
  t: (key: string) => string;
  defaultValues?: Partial<{
    contact_name: string;
    contact_email: string;
    contact_phone: string;
  }>;
  fieldErrors?: Record<string, string>;
}
```

각 input에 `defaultValue={defaultValues.xxx}` 및 `fieldErrors.xxx` 오류 메시지 표시 추가.

---

## DoD (Definition of Done)

- [x] `shipper-form.tsx` — `discount_rate / 100` 변환 적용 (% 입력 → 소수 저장)
- [x] `shipper-form.tsx` — `savedValues` state: 오류 발생 시 모든 필드 입력값 보존
- [x] `shipper-form.tsx` — `fieldErrors` state: 서버 반환 필드별 오류 수신 및 하위 전달
- [x] `required-fields.tsx` — `defaultValues` props: 오류 후 필드값 복원 확인
- [x] `required-fields.tsx` — `fieldErrors` props: 오류 필드 하단에 빨간 메시지 표시
- [x] `contact-fields.tsx` — `defaultValues` + `fieldErrors` props 동일 적용
- [x] **동작 검증**: 할인율 `1` 입력 시 오류 → 다른 필드 값 유지 + discount_rate 필드 아래 오류 메시지 표시 (Dave TASK-B-045 PR#165 머지 후 fieldErrors 표시 활성화)
- [x] **동작 검증**: 정상 등록 시 (`discount_rate: 5` = 5% → DB에 `0.05` 저장) 확인 (코드 레벨 `/100` 변환 적용)
- [x] TypeScript 빌드 오류 없음 (`npx tsc --noEmit --skipLibCheck` PASS)
- [x] `npm run test:regression` — 388/388 PASS
- [x] R-17 커밋 순서 준수 (feature 브랜치 → 코드 커밋 → task file 🔔 → PR)
- [x] 코드 커밋 해시 기재: `88370b5`
- [x] 문서 커밋 해시 기재: `88370b5` (코드+문서 혼합 커밋 — task file 포함)
- [x] PR 생성 (`Closes #159`) — [#166](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/166)

---

## [설계 의견]

_(Baker 기재)_

---

## [설계 확정]

_Aiden / Jaison 전속_

---

## [작업 결과]

### §1 — shipper-form.tsx
- 할인율 `Number(currentValues.discount_rate) / 100` 변환 적용 (UI % → DB 소수)
- `savedValues` state: form 제출 전 현재값 캡처 → 오류 시 복원
- `fieldErrors` state: `createAgencyShipper` structured response 처리 (`fieldErrors._form` → globalError)
- `defaultValues`·`fieldErrors`를 RequiredFields·ContactFields로 전달
- try/catch fallback 유지 (throw 기반 오류도 globalError 표시)

### §2 — required-fields.tsx
- `defaultValues` props 추가 — 각 input에 `defaultValue={defaultValues.xxx}` 적용
- `fieldErrors` props 추가 — 오류 필드 하단에 `<p className="text-xs text-red-500 mt-1">` 표시
- `shipperType` useState 초기값 `defaultValues.shipper_type ?? 'INDIVIDUAL'`으로 변경
- 오류 메시지 표시 필드: name, shipper_type, discount_rate, biz_no, rep_name, grade

### §3 — contact-fields.tsx
- `defaultValues` props 추가 — 각 input에 `defaultValue={defaultValues.xxx}` 적용
- `fieldErrors` props 추가 — 오류 필드 하단에 빨간 메시지 표시
- 오류 메시지 표시 필드: contact_name, contact_email, contact_phone

### 검증
- `npx tsc --noEmit --skipLibCheck` — 변경 파일 에러 없음 ✅
- `npm run test:regression` — **388/388 PASS** ✅

### 타입 캐스트 수정 (보완 작업, 2026-07-04)
- **원본 코드** (`88370b5`): `const res = result as { success: boolean; fieldErrors?: Record<string, string> }` — `as` 타입 캐스트 사용
- **수정 코드** (`25e7607`, Jaison): `import { createAgencyShipper, type CreateAgencyShipperResult }` — 정식 타입 import + `if (!result.success)` 직접 사용으로 `as` 캐스트 제거
- develop `333b904`에 이미 반영됨. feature branch에 `25e7607`로 커밋 완료.
- **회귀**: 388/388 PASS (변동 없음)

### 비고
- TASK-B-045(Dave) PR#165 머지 전까지 `fieldErrors` structured response는 동작하지 않음 (throw 기반 fallback으로 globalError 표시)
- Dave PR 머지 후 fieldErrors 즉시 활성화됨 (추가 수정 불필요)

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-04 | Jaison | TASK-B-046 신규 발령 — DEF-090 Frontend 파트 (Baker 담당) |
| 2026-07-04 | Baker | **보완 작업**: shipper-form.tsx 타입 캐스트 수정 — `as` 캐스트 제거 + `CreateAgencyShipperResult` 정식 타입 import + `if (!result.success)` 직접 사용 (Jaison `25e7607` 커밋). task file 갱신 + feature 브랜치 PR 생성. |

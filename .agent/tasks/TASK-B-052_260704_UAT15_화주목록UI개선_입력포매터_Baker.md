# TASK-B-052: UAT-15 피드백 — 화주목록 담당자 컬럼 + 헤더 정렬 + 입력 포매터

> **태스크 ID**: TASK-B-052
> **생성일**: 2026-07-04
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: ⬜
> **선행 Task**: TASK-B-051 (Dave — 쿼리/타입 수정) 완료 후 착수
> **후행 Task**: 없음

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-052-uat15-frontend-baker
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상)

> ⚠️ **TASK-B-051 (Dave) 머지 후 착수** — `AgencyShipperRow` 타입에 contact 필드가 있어야 TypeScript 오류 없이 구현 가능.

---

## 배경

UAT-15-01 수행 중 JSJung 요구사항 3가지 중 Frontend 파트:
1. 화주목록 테이블에 담당자명·이메일·연락처 컬럼 추가
2. 화주목록 컬럼 헤더 가운데 정렬
3. 화주 등록/상세편집 폼에서 사업자번호·연락처 자동 하이픈 포매터

---

## 구현 범위

### §1 — `shipper-table.tsx` 컬럼 추가 + 헤더 가운데 정렬

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/shipper-table.tsx`

컬럼 배열에 contact 3개 추가, 헤더 정렬을 `text-left` → `text-center`:

```typescript
{['name', 'type', 'grade', 'discount_rate', 'contact_name', 'contact_email', 'contact_phone', 'status', 'created_at', 'actions'].map((col) => (
  <th key={col} className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
    {t(`col_${col}`)}
  </th>
))}
```

> 컬럼 순서는 위 예시 기준. 테이블 가독성에 따라 조정 가능.

### §2 — `shipper-table-row.tsx` contact 데이터 표출

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/shipper-table-row.tsx`

기존 `<td>` 들 사이에 contact 3개 td 추가. 각 `<td>` 정렬은 헤더와 맞춰 `text-center`:

```tsx
<td className="px-4 py-3 text-center text-slate-600 text-xs">
  {shipper.shipper?.contact_name || '-'}
</td>
<td className="px-4 py-3 text-center text-slate-600 text-xs">
  {shipper.shipper?.contact_email || '-'}
</td>
<td className="px-4 py-3 text-center text-slate-600 text-xs">
  {shipper.shipper?.contact_phone || '-'}
</td>
```

### §3 — `required-fields.tsx` 사업자번호 자동 하이픈 포매터

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/required-fields.tsx`

`biz_no` input에 `onChange` 핸들러 추가 — 숫자만 허용, `XXX-XX-XXXXX` 자동 포매팅:

```typescript
function formatBizNo(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
```

input:
```tsx
<input
  name="biz_no"
  defaultValue={defaultValues?.biz_no}
  onChange={(e) => { e.target.value = formatBizNo(e.target.value); }}
  placeholder="000-00-00000"
  maxLength={12}
  // ... 기존 className 유지
/>
```

### §4 — `contact-fields.tsx` 연락처 자동 하이픈 포매터

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/contact-fields.tsx`

`contact_phone` input에 `onChange` 핸들러 추가 — 숫자만 허용, `0XX-XXXX-XXXX` 자동 포매팅:

```typescript
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.startsWith('02')) {
    // 서울 지역번호: 02-XXXX-XXXX
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // 010, 031 등: 0XX-XXX(X)-XXXX
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
```

input:
```tsx
<input
  name="contact_phone"
  defaultValue={defaultValues?.contact_phone}
  onChange={(e) => { e.target.value = formatPhone(e.target.value); }}
  placeholder="010-1234-5678"
  maxLength={13}
  // ... 기존 className 유지
/>
```

### §5 — `edit-form.tsx` 상세편집 포매터 적용

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form.tsx`

`RequiredFields`와 `ContactFields` 컴포넌트를 재사용하므로 §3·§4 수정이 자동 반영됨.  
단, `edit-form.tsx`에서 직접 input을 렌더링하는 필드가 있다면 동일하게 포매터 적용.

### §6 — i18n 4개국어 키 추가

**파일**: `messages/ko.json`, `messages/en.json`, `messages/ja.json`, `messages/zh.json`

각 파일의 `AgencyShippers` 섹션에 추가:

| 키 | ko | en |
|:---|:---|:---|
| `col_contact_name` | 담당자명 | Contact Name |
| `col_contact_email` | 이메일 | Email |
| `col_contact_phone` | 연락처 | Phone |

---

## DoD (Definition of Done)

- [ ] `shipper-table.tsx`: `contact_name`·`contact_email`·`contact_phone` 컬럼 헤더 추가
- [ ] `shipper-table.tsx`: 전체 `<th>` `text-center` 정렬 적용
- [ ] `shipper-table-row.tsx`: contact 3개 `<td>` 추가, `text-center` 정렬
- [ ] `required-fields.tsx`: `biz_no` 자동 하이픈 포매터 (`XXX-XX-XXXXX`)
- [ ] `contact-fields.tsx`: `contact_phone` 자동 하이픈 포매터 (`0XX-XXXX-XXXX`)
- [ ] i18n 4개국어 `col_contact_name`·`col_contact_email`·`col_contact_phone` 키 추가
- [ ] TypeScript 빌드 오류 없음 (`npx tsc --noEmit --skipLibCheck` PASS)
- [ ] `npm run test:regression` — **전체 PASS**
- [ ] 코드 커밋 해시 기재: _(작업 완료 후 기재)_
- [ ] PR 생성 (`feature/teamb-task-b-052-... → develop`) 완료

---

## [설계 의견]

_(Baker 기재)_

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

_(Baker 작업 완료 후 기재)_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-04 | Jaison | TASK-B-052 발령 — UAT-15 피드백 Frontend 파트 (Baker 담당) |

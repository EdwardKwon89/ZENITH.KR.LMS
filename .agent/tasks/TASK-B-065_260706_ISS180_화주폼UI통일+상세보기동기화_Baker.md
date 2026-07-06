# TASK-B-065 — Issue #180 화주 폼 UI 통일 + 상세보기 동기화

> **발령일**: 2026-07-06
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Kimi)
> **우선순위**: P1
> **상태**: 🔔 검토 요청
> **선행 Task**: §1·§2는 즉시 착수 가능 / §3은 TASK-B-064 완료 후 착수
> **연관 이슈**: [Issue #180](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/180)

---

## 배경

JSJung 요구사항 분석 결과 화주 등록 화면 UI 보완 3가지 + 상세보기 동기화 필요:

1. **높이 불일치**: `<select>`와 `<input>` 컨트롤 높이가 브라우저에 따라 달라 보임
2. **주소 검색 버튼 레이아웃**: 버튼이 화면 밖/비좁은 위치에 배치됨
3. **상세보기 동기화**: 등록 화면과 동일한 필드 구성 + 필수항목 수정 불가

§3은 TASK-B-064(Dave)의 `RequiredFields readOnly prop` 및 `getAgencyShipperById` 주소 필드 추가에 의존합니다.

---

## 작업 범위

### §1 — 컨트롤 높이 통일 (즉시 착수 가능)

**파일**: `required-fields.tsx`, `address-input.tsx`

`<select>`와 `<input>` 모두에 `h-10` 클래스를 추가하여 브라우저 간 일관된 높이를 보장합니다.

```tsx
// Before (select)
className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl ..."

// After (select)
className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl ..."

// Before (input)
className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl ..."

// After (input)
className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl ..."
```

> `h-10` = 40px 고정. `py-2.5` -> `py-2`로 조정 (h-10 내 수직 중앙 유지).
> 주소 검색 버튼도 `h-10`으로 통일.

적용 파일:
- `required-fields.tsx`: shipper_type select, grade select, name/discount_rate/biz_no/rep_name input
- `address-input.tsx`: country select, zipcode input, search button

---

### §2 — 주소 검색 버튼 레이아웃 재배치 (즉시 착수 가능)

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/address-input.tsx`

현재: `grid grid-cols-2` 우측 컬럼 안에 zipcode input + 검색 버튼이 함께 들어가 공간 부족.

```tsx
// Before: 국가 select + zipcode+버튼이 같은 grid row
<div className="grid grid-cols-2 gap-4 mb-4">
  <div>{/* 국가 */}</div>
  {countryCode === 'KR' && (
    <div>
      <div className="flex gap-2">
        <input name="zipcode" ... />   // 너무 좁음
        <button>Search</button>        // 비좁음
      </div>
    </div>
  )}
</div>

// After: 국가 단독 행, KR일 때 zipcode+버튼을 전체 폭 독립 행으로 분리
<div className="mb-4">
  <label>Country</label>
  <select className="w-full h-10 ..." />
</div>

{countryCode === 'KR' && (
  <div className="mb-4">
    <label>Zip Code</label>
    <div className="flex gap-2">
      <input name="zipcode" className="flex-1 h-10 ..." />
      <button type="button" onClick={() => setShowPostcode(true)}
        className="h-10 px-4 text-xs font-bold text-white bg-blue-600 rounded-xl ...">
        {t('form_address_search')}
      </button>
    </div>
  </div>
)}
```

---

### §3 — 상세보기(edit-form.tsx) 동기화 (전제조건: TASK-B-064 완료)

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form.tsx`

#### 3-A. EditShipperFormProps에 주소 필드 추가

```tsx
interface EditShipperFormProps {
  shipper: {
    id: string;
    shipper_type: string;
    discount_rate: number;
    grade: string | null;
    is_active: boolean;
    org: {
      id: string;
      name: string;
      biz_no: string | null;
      rep_name: string | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      // B-064에서 추가된 필드
      country_code: string | null;
      state_province: string | null;
      city: string | null;
      address: string | null;
      address_detail: string | null;
      zipcode: string | null;
    };
  };
}
```

#### 3-B. RequiredFields에 readOnly prop 전달

```tsx
// Before
<RequiredFields t={t} defaultValues={initialValues} fieldErrors={fieldErrors} />

// After
<RequiredFields t={t} defaultValues={initialValues} fieldErrors={fieldErrors} readOnly />
```

> B-064에서 구현된 `readOnly` prop. name·shipper_type·biz_no가 disabled 처리됨.

#### 3-C. 주소 섹션 readonly 표시 추가

ContactFields 아래에 주소 표시 섹션 추가 (모든 필드 readOnly):

```tsx
<div className="border-t border-slate-100 pt-5">
  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
    {t('form_address')}
  </p>
  <div className="grid grid-cols-2 gap-4 mb-4">
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {t('form_country')}
      </label>
      <input readOnly value={shipper.org.country_code ?? ''}
        className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50" />
    </div>
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {t('form_zipcode')}
      </label>
      <input readOnly value={shipper.org.zipcode ?? ''}
        className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50" />
    </div>
  </div>
  <div className="mb-4">
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
      {t('form_address')}
    </label>
    <input readOnly value={shipper.org.address ?? ''}
      className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50" />
  </div>
  {shipper.org.address_detail && (
    <div className="mb-4">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {t('form_address_detail')}
      </label>
      <input readOnly value={shipper.org.address_detail}
        className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50" />
    </div>
  )}
</div>
```

---

### §4 — TC 업데이트

**파일**: `tests/unit/agency/edit-form.test.tsx` (신규)

| TC ID | 설명 |
|:------|:-----|
| TC-P7-UI-EDIT-01 | edit-form: name, shipper_type input disabled 확인 |
| TC-P7-UI-EDIT-02 | CORPORATE인 경우 biz_no disabled 확인 |
| TC-P7-UI-EDIT-03 | 주소 섹션 표시 + readOnly 확인 (address, zipcode) |

---

## DoD (완료 기준)

- [x] select/input `h-10` 높이 통일 (required-fields.tsx, address-input.tsx)
- [x] 주소 검색 버튼: zipcode+버튼 전체 폭 독립 행으로 재배치
- [x] edit-form.tsx: name·shipper_type·biz_no disabled (readOnly prop 활용)
- [x] edit-form.tsx: 주소 섹션 readonly 표시 추가
- [x] EditShipperFormProps에 주소 6개 필드 추가
- [x] TC-P7-UI-EDIT-01/02/03 PASS
- [x] LIVE_REGRESSION_TEST_MAP.md 갱신
- [x] 전체 회귀 PASS (rtk npm run test:regression) — 483/483
- [x] R-17 커밋 분리: 코드 커밋 / 문서 커밋
- [ ] PR 생성 (References #180, develop 대상)

---

## [설계 의견]

_(필요 시 기재)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

### §1 — required-fields.tsx: select/input 높이 h-10 통일 ✅
- `name`, `shipper_type`, `discount_rate`, `biz_no`, `rep_name`, `grade` 컨트롤에 `h-10` + `py-2` 적용
- 브라우저 간 일관된 40px 높이 보장

### §2 — address-input.tsx: 높이 통일 + 주소검색버튼 재배치 ✅
- `country` select, `zipcode` input, 주소검색 button에 `h-10` + `py-2` 적용
- KR 우편번호+검색버튼을 grid 우측 컬럼에서 전체 폭 독립 행으로 분리
- 국외 주소 입력 컨트롤(state, city, address, address_detail, zipcode)도 h-10 통일

### §3 — edit-form.tsx: 상세보기 동기화 ✅
- `EditShipperFormProps.org`에 주소 6개 필드(`country_code`, `state_province`, `city`, `address`, `address_detail`, `zipcode`) 추가
- `<RequiredFields readOnly />` 전달 → name·shipper_type·biz_no disabled
- ContactFields 아래에 readOnly 주소 섹션 추가 (country/zipcode 2열, address 1열, address_detail 조걶� 표시)

### §4 — TC 업데이트 ✅
- `tests/unit/agency/edit-form.test.tsx` 신규 (4 tests)
  - TC-P7-UI-EDIT-01: name, shipper_type disabled
  - TC-P7-UI-EDIT-02: CORPORATE biz_no disabled
  - TC-P7-UI-EDIT-03: 주소 섹션 readOnly (address, zipcode, address_detail)

### 회귀 테스트
- **80 files, 483/483 PASS** (기존 479 → 4 tests 신규)

### 커밋
- 코드: `[Baker] feat: TASK-B-065 Issue #180 화주 폼 UI 통일 + 상세보기 동기화`
- 문서: `[Baker] docs: TASK-B-065 완료 보고 — task file + LIVE_REGRESSION_TEST_MAP.md`

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | 없음 | — | — |

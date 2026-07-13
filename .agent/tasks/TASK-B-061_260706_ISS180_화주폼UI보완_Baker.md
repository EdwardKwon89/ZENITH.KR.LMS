# TASK-B-061: Issue #180 — 화주 등록 폼 UI 보완 (로그인 ID 최상단 배치 · 이메일 유효성 · BRONZE 기본 선택)

> **태스크 ID**: TASK-B-061
> **생성일**: 2026-07-06
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: 🔔
> **선행 Task**: TASK-B-058 ✅ (PR#185 머지 완료)
> **연관 이슈**: [Issue #180](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/180)

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-061-iss180-shipper-form-ui-baker
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상, `References #180`)

---

## 배경

Issue #180 로컬 테스트(2026-07-06) 과정에서 발견된 화주 등록 폼 UI 개선 3건 중 Baker 담당 2건.  
- [Issue #180 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/180#issuecomment-4888233376) 참조.

---

## 구현 범위

### §1 — 로그인 계정 섹션 폼 최상단 이동

파일: `src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx`

**현재 순서**:
```tsx
<RequiredFields ... />
<LoginAccountFields ... />   ← 2번째
<ContactFields ... />
<AddressInput ... />
```

**변경 후 순서**:
```tsx
<LoginAccountFields ... />   ← 1번째 (최상단)
<RequiredFields ... />
<ContactFields ... />
<AddressInput ... />
```

> 로그인 계정은 화주 등록의 핵심 식별자 — 입력 흐름 최우선으로 위치.

### §2 — 로그인 이메일 유효성 검사 추가

파일: `src/app/[locale]/(dashboard)/agency/shippers/new/login-account-fields.tsx`

- 이메일 형식 클라이언트 사이드 유효성 검사 추가
- HTML5 `type="email"` 이미 적용 중 — 추가로 `pattern` 속성 또는 `onChange` 핸들러에서 정규식 검증
- 유효하지 않은 이메일 입력 시 즉시 오류 메시지 표시 (blur 이벤트 또는 onChange)
- 오류 메시지: 기존 `fieldErrors.login_email` 패턴과 동일한 스타일 적용

```typescript
// 참조: 이메일 정규식 (기존 src/lib/validation 패턴 따름)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### §3 — 등급 기본값 BRONZE 설정

파일: `src/app/[locale]/(dashboard)/agency/shippers/new/required-fields.tsx`

현재 (line 107):
```tsx
<select name="grade" defaultValue={defaultValues.grade} ...>
  <option value="">{t('grade_placeholder')}</option>
```

변경 후:
```tsx
<select name="grade" defaultValue={defaultValues.grade ?? 'BRONZE'} ...>
  <option value="">{t('grade_placeholder')}</option>
```

> `defaultValues.grade`가 없는 경우(신규 등록 시) BRONZE가 자동 선택됨. 오류 재시도 시에는 기존 값 유지.

---

## TC 추가 (R-09)

| TC ID | 항목 | 목적 | 파일 |
|:------|:-----|:-----|:-----|
| TC-P7-UI-SHIPPER-01 | 화주 등록 폼 초기 로드 시 LoginAccountFields가 RequiredFields 앞에 위치 | 섹션 순서 검증 | `tests/unit/agency/shipper-form-ui.test.ts` |
| TC-P7-UI-SHIPPER-02 | 잘못된 이메일 형식 입력 시 유효성 오류 메시지 표시 | 클라이언트 유효성 검사 | `tests/unit/agency/shipper-form-ui.test.ts` |
| TC-P7-UI-SHIPPER-03 | 신규 등록 폼 초기 로드 시 grade 기본값 = BRONZE | 기본값 설정 | `tests/unit/agency/shipper-form-ui.test.ts` |

---

## DoD (완료 기준)

- [ ] `LoginAccountFields` 컴포넌트를 `shipper-form.tsx`에서 `RequiredFields` 앞으로 이동
- [ ] `login-account-fields.tsx` 이메일 유효성 검사 추가 (blur 또는 onChange)
- [ ] `required-fields.tsx` grade `defaultValue` → `BRONZE` 기본 설정
- [ ] TC-P7-UI-SHIPPER-01 / SHIPPER-02 / SHIPPER-03 신규 작성 및 PASS
- [ ] `LIVE_REGRESSION_TEST_MAP.md` § 추가
- [ ] 전체 회귀 PASS (`rtk npm run test:regression`)
- [ ] ZEN_A4 준수: 수정 파일 함수/줄 제한 확인
- [ ] R-17 커밋 분리 (코드 커밋 / 문서 커밋)
- [ ] PR 생성 (`References #180`, develop 대상)

---

## [설계 의견]

_(해당 없음 — Jaison 착수 승인 포함하여 발령)_

## [설계 확정]

_(Jaison 착수 승인: 2026-07-06 발령 시 포함)_

## [작업 결과]

### §1 — 로그인 계정 섹션 폼 최상단 이동 ✅
- `shipper-form.tsx`: `<LoginAccountFields>`를 `<RequiredFields>` 앞으로 이동

### §2 — 로그인 이메일 유효성 검사 추가 ✅
- `login-account-fields.tsx`: `EMAIL_REGEX` 기반 blur 검증 추가
- i18n 4개국어: `form_login_email_invalid` 키 신규 등록

### §3 — 등급 기본값 BRONZE 설정 ✅
- `required-fields.tsx`: `defaultValue={defaultValues.grade ?? 'BRONZE'}`

### TC 3종 신규 작성 + 회귀 PASS ✅
- `tests/unit/agency/shipper-form-ui.test.tsx`: 6개 테스트 (3종 × 각 2건)
- 회귀: 76 files / 460 PASS

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-06 | Jaison | TASK-B-061 발령 — Issue #180 화주 등록 폼 UI 보완 (로그인ID 최상단 · 이메일 유효성 · BRONZE 기본값) |
| 2026-07-06 | Baker | 🔄 착수 — develop `9f89948` 기준 브랜치 생성 (`feature/teamb-task-b-061-iss180-shipper-form-ui-baker`) |
| 2026-07-06 | Baker | 🔔 구현 완료 — §1~§3 코드 수정 · TC 3종 6 tests · 회귀 460/460 PASS · 코드 \`c146495\` · PR#?? |

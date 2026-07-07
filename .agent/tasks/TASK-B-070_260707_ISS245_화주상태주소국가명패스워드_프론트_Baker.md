# TASK-B-070: Issue #245 — 화주 상태·주소·국가명·비밀번호 재인증 프론트엔드 (Baker)

> **태스크 ID**: TASK-B-070
> **생성일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: 🔔 검토 요청
> **선행 Task**: TASK-B-069 완료 (PR#247 Aiden 머지 `73c35ddb`)
> **연관 이슈**: [Issue #245](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/245)

---

## 배경

Issue #245의 프론트엔드 파트. TASK-B-069에서 백엔드(`updateAgencyShipper`)가 `is_active` 및 주소 6개 필드를 수신할 수 있게 되었으므로, 편집 화면에서 해당 필드를 수정 가능하도록 연동한다. 또한 국가 코드를 Full Text 국가명으로 표시하고, 마이페이지 비밀번호 변경 시 현재 비밀번호 재인증을 요구한다.

---

## 구현 범위

### §1 — 화주 상태 토글 UI

- 파일: `src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form.tsx`
- `is_active` 상태 토글 스위치 추가
- 토글 상태를 `updateAgencyShipper` payload에 포함

### §2 — 주소 필드 편집 가능 전환

- `AddressInput` 컴포넌트에 `defaultValues` prop 추가
- edit-form의 readOnly 주소 섹션을 `AddressInput`으로 교체
- `country_code`, `state_province`, `city`, `address`, `address_detail`, `zipcode` submit 반영

### §3 — 국가명 Full Text 표시

- 파일: `src/lib/utils/country.ts` (신규)
- `getCountryName(code, locale)` — `Intl.DisplayNames` 활용
- edit-form 국가 코드 아래 Full Text 국가명 표시
- shipper-table-row 국가 컬럼에 getCountryName 적용
- shipper-table.tsx에 `country` 컬럼 추가
- `getAgencyShippers` 쿼리에 `country_code` 추가

### §4 — 마이페이지 비밀번호 재인증

- 파일: `src/app/actions/admin/auth.ts`
- `changePasswordWithReauth(currentPassword, newPassword)` 신규
- `signInWithPassword`로 재인증 후 `updateUser`로 비밀번호 변경
- 파일: `src/app/[locale]/(dashboard)/mypage/security/page.tsx`
- 현재 비밀번호 입력 필드 추가 및 `changePasswordWithReauth` 연동

### §5 — i18n

- `messages/ko.json`, `en.json`, `ja.json`, `zh.json`
- `Auth.current_password_label` 등 재인증 관련 키 추가
- `AgencyShippers.form_status`, `col_country` 추가

---

## DoD (완료 기준)

- [x] edit-form에 `is_active` 토글 UI 추가 및 submit 반영
- [x] edit-form 주소 섹션 `AddressInput` 교체 (readOnly 제거)
- [x] `getCountryName` 유틸리티 신규
- [x] edit-form 국가명 Full Text 표시
- [x] shipper-table에 국가 컬럼 추가 및 `getCountryName` 적용
- [x] `changePasswordWithReauth` Server Action 신규
- [x] 마이페이지 보안 설정에 현재 비밀번호 입력 추가
- [x] 4개 locale i18n 키 추가
- [x] 전체 회귀 PASS (`npm run test:regression`)
- [x] R-17 커밋 분리 (코드 / 문서)
- [x] PR 생성 (`References #245`, develop 대상)

---

## [작업 결과]

### §1 — 화주 상태 토글 ✅
- edit-form에 `isActive` 상태 및 토글 스위치 UI 추가
- submit 시 `is_active` 포함

### §2 — 주소 편집 ✅
- `AddressInput`에 `defaultValues` prop 추가
- edit-form의 readOnly 주소 섹션을 `AddressInput`으로 교체
- 주소 6개 필드 `updateAgencyShipper` payload에 포함

### §3 — 국가명 Full Text ✅
- `src/lib/utils/country.ts` 신규
- edit-form에 국가명 표시
- shipper-table에 `country` 컬럼 추가, `getCountryName` 적용
- `AgencyShipperRow.shipper.country_code` 타입 추가
- `getAgencyShippers` 쿼리에 `country_code` 추가

### §4 — 비밀번호 재인증 ✅
- `changePasswordWithReauth` Server Action 신규
- security page에 현재 비밀번호 입력 추가

### §5 — i18n ✅
- 4개 locale에 필요한 키 추가

### 검증
- `npm run test:regression` **81 files, 489/489 PASS**

### 커밋
- 코드: `1e28eb0` — `[Baker] feat: TASK-B-070 Issue #245 화주 상태·주소·국가명·비밀번호 재인증 프론트엔드`
- 문서: `f55f549` — `[Baker] docs: TASK-B-070 완료 보고 — task file + ACTIVE_TASK.md + LIVE_REGRESSION_TEST_MAP.md`

### PR
- PR#248: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/248 (`feature/teamb-task-b-070-iss245-shipper-frontend-baker` → `develop`)

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Baker | TASK-B-070 구현 완료 — Issue #245 프론트엔드 |

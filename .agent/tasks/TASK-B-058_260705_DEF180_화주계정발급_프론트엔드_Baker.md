# TASK-B-058: Issue #180 DEF 화주 계정 발급 — 프론트엔드 (UI · i18n · 패키지)

> **태스크 ID**: TASK-B-058
> **생성일**: 2026-07-05
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: 🚫
> **선행 Task**: TASK-B-056 ✅ (타입 확정 필요) · TASK-B-057 ✅ 권장 (Action 인터페이스 확정 후 통합)

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-058-def180-frontend-baker
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상)

---

## 배경

Issue #180 ([DEF] Agency 화주 로그인 계정 미발급) 프론트엔드 구현.
화주 등록 폼(`/agency/shippers/new`)을 재구성:
1. 로그인 ID 전용 섹션 신규 추가
2. 국내/국외 통합 주소 입력 컴포넌트 신규 추가
3. contact_email ↔ login_email 자동 연동
4. 등록 성공 후 초대 이메일 발송 안내 UI

설계 근거: Issue #180 코멘트 (Jaison, 2026-07-05) — 보완 코멘트 포함.

---

## 신규 패키지 설치

```bash
npm install react-daum-postcode country-state-city
```

- `react-daum-postcode`: 카카오 우편번호 서비스 (국내, 무료)
- `country-state-city`: 국가/주/도시 드롭다운 데이터 (국외, 무료)

---

## 구현 범위

### §1 — `LoginAccountFields` 컴포넌트 신규

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/login-account-fields.tsx`

```
┌──────────────────────────────────────────────────────┐
│  로그인 ID (이메일 형식) *                              │
│  [example@company.com                    ]           │
│  💬 입력한 이메일로 초대 이메일이 발송됩니다.            │
│     화주가 링크를 클릭하면 비밀번호 설정 후 로그인 가능  │
└──────────────────────────────────────────────────────┘
```

Props:
- `t: (key: string) => string`
- `onLoginEmailChange: (email: string) => void` — contact_email 연동용 콜백
- `fieldErrors?: Record<string, string>`

### §2 — `AddressInput` 컴포넌트 신규

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/address-input.tsx`

국가 선택 드롭다운(기본값 KR)으로 국내/국외 분기:

**국내 (KR)**:
- 우편번호 [검색 🔍] 버튼 → 카카오 우편번호 팝업 (`react-daum-postcode`)
- 도로명주소: 자동 완성(읽기 전용)
- 상세주소: 직접 입력

**국외**:
- 국가(`country-state-city` getCountries()) → 주/State(getStatesOfCountry()) → 도시(getCitiesOfState()) 드롭다운 연동
- Street Address: 직접 입력
- Postal Code: 직접 입력

숨김 input으로 `country_code`, `state_province`, `city`, `address`, `address_detail`, `zipcode` 폼 제출.

### §3 — `ContactFields` 수정

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/contact-fields.tsx`

- `loginEmail` prop 추가
- `loginEmail` 값이 변경될 때 `contact_email` 자동 동기화
- 사용자가 `contact_email` 직접 수정 시 동기화 해제 (`touched` 상태로 관리)

### §4 — `AgencyShipperForm` 수정

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx`

변경 내용:
- `LoginAccountFields` 섹션 삽입 (①기본정보 다음, ②담당자 앞)
- `AddressInput` 섹션 삽입 (③담당자 다음)
- `login_email` state 관리 + `ContactFields`에 전달
- `handleSubmit`: `login_email`, 주소 6개 필드 FormData에서 추출하여 `createAgencyShipper`에 전달
- 성공 시 즉시 이동 대신 안내 메시지 표시 후 이동:

```
✅ 화주가 등록되었습니다.
   {login_email}로 초대 이메일을 발송했습니다.
   [목록으로 이동]
```

### §5 — i18n 키 추가 (4개국어)

**파일**: `messages/ko.json`, `messages/en.json`, `messages/ja.json`, `messages/zh.json`

`AgencyShippers` 네임스페이스에 추가:

| 키 | ko | en | ja | zh |
|:---|:---|:---|:---|:---|
| `form_login_email` | 로그인 ID | Login ID | ログインID | 登录ID |
| `form_login_email_hint` | 입력한 이메일로 초대 이메일이 발송됩니다. 화주가 링크를 클릭하면 비밀번호 설정 후 로그인할 수 있습니다. | An invitation email will be sent to the entered email. | ご入力のメールへ招待メールが送信されます。 | 将向输入的邮箱发送邀请邮件。 |
| `form_country` | 국가 | Country | 国 | 国家 |
| `form_state_province` | 시/도 | State/Province | 州/省 | 州/省 |
| `form_city` | 시/군/구 | City | 市/区 | 城市 |
| `form_address` | 주소 | Address | 住所 | 地址 |
| `form_address_detail` | 상세주소 | Address Detail | 詳細住所 | 详细地址 |
| `form_zipcode` | 우편번호 | Postal Code | 郵便番号 | 邮政编码 |
| `form_address_search` | 주소 검색 | Search Address | 住所検索 | 搜索地址 |
| `submit_invite_sent` | {name}님의 화주 계정이 등록되었습니다. {email}로 초대 이메일을 발송했습니다. | Shipper account registered. Invitation email sent to {email}. | 化主アカウントが登録されました。{email}へ招待メールを送信しました。 | 货主账户已注册。邀请邮件已发送至 {email}。 |

---

## DoD (Definition of Done)

- [ ] `react-daum-postcode`, `country-state-city` 패키지 설치 완료
- [ ] `login-account-fields.tsx` 신규 — login_email 필수 입력 + 안내 문구 표시
- [ ] `address-input.tsx` 신규 — 국가 선택 + KR(카카오 팝업+자동완성) / 국외(드롭다운 계층 선택) 분기 정상 동작
- [ ] `contact-fields.tsx` 수정 — login_email 자동 연동 (touched 상태로 독립 수정 시 동기화 해제)
- [ ] `shipper-form.tsx` 수정 — LoginAccountFields + AddressInput 통합, 성공 안내 UI 포함
- [ ] 4개국어 i18n 키 전량 추가 (ko/en/ja/zh)
- [ ] `/ko/agency/shippers/new` 폼 전체 플로우 수동 확인 (로그인ID 입력 → 주소 입력 → 제출)
- [ ] TypeScript 빌드 오류 없음 — 신규 오류 0건
- [ ] `npm run test:regression` — 전체 PASS
- [ ] 코드 커밋 해시 기재
- [ ] PR 생성 (`feature/teamb-task-b-058-... → develop`, `Closes #180`) 완료

---

## [설계 의견]

_(Baker 기재)_

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

_(완료 후 기재)_

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-05 | Jaison | TASK-B-058 발령 — Issue #180 DEF 프론트엔드 구현 (Baker 담당) · LoginAccountFields 신규·AddressInput 신규·ContactFields 수정·i18n |

# TASK-B-271: Issue #1041 — 법인정보 관리(/mypage/corporate) 주소 입력을 오더 화주/수하인 방식과 통일

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1041](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1041) |
| **배경** | JSJung 요청 — `/mypage/corporate` 주소 입력을 오더 등록 시 화주/수하인 주소 입력(`AddressInput`)과 동일하게 통일 |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 현황 분석 (Jaison, 코드 직접 확인 완료)

### 1. corporate 페이지 현재 상태
`src/app/[locale]/(dashboard)/mypage/corporate/page.tsx:237-243`:
```tsx
<div className="md:col-span-2 space-y-2.5">
  <label ...>{t('label_address')}</label>
  <div className="relative group">
    <MapPin ... />
    <ZenInput name="address" defaultValue={org?.address || ''} ... />
  </div>
</div>
```
단일 플랫 텍스트 인풋 하나뿐 — 국가/시도/시군구/우편번호/영문주소 필드 자체가 화면에 없음.

`handleUpdateOrg`(58-82행)가 FormData에서 `representative, bizNo, address, contact, email`만 읽어 payload 구성 → `updateOrganizationInfo` 호출.

### 2. 백엔드 현재 상태
`src/app/actions/admin/corporate.ts`:
- `getOrganizationInfo()`(27-46행): `address, address_detail, city, state_province, zipcode, country_code` 전부 select — **DB 컬럼은 이미 준비됨**(`zen_organizations` 테이블, 마이그레이션 `20260705000001_agency_004_org_address_columns.sql` + `20260716180000_iss554_address_english_columns.sql`로 `address_english`/`address_detail_english`까지 존재).
- `updateOrganizationInfo()`(51-88행): payload 타입 자체가 `representative?/bizNo?/address?/contact?/email?`뿐 — `address` 외 나머지 주소 필드는 **애초에 받을 수도, 저장할 수도 없는 상태**로 코드에 고정되어 있음.

### 3. 오더 화주/수하인 주소 입력(`AddressInput`) 구조
`src/components/common/AddressInput.tsx` (351줄) — `OrderRegistrationForm.tsx`(화주/수하인 주소), `agency/shippers/new`·`agency/shippers/[id]/edit`에서 공용 사용:
- `country-state-city` 라이브러리로 국가 select → KR/해외 UI 분기
- **KR 분기**: 우편번호 읽기전용 + "주소 검색" 버튼 → `DaumPostcodeEmbed`(다음 우편번호 API) 모달 → 도로명주소·우편번호·영문주소·시/도(ISO 코드 매핑)·시/군/구 자동 채움
- **해외 분기**: 시/도·시/군/구 select(country-state-city 데이터) + 주소/상세주소/우편번호 자유입력
- `mode="form-action"`(기본값, plain `name=` hidden/visible input — FormData로 그대로 읽힘) / `mode="rhf"`(react-hook-form) 양쪽 지원
- Props: `defaultValues: { country_code, state_province, city, address, address_detail, address_english, address_detail_english, zipcode }`, `t`, `fieldErrors?`, `readOnly?`, `required?`

## 재사용 가능성 확인 (Jaison 검증 완료)

- `AddressInput`의 `defaultValues` shape이 `zen_organizations` 컬럼(`country_code, state_province, city, address, address_detail, zipcode, address_english, address_detail_english`)과 **정확히 1:1 일치** — 별도 타입 변환/매핑 레이어 불필요.
- corporate 페이지는 이미 순수 `<form onSubmit>` + `new FormData(e.currentTarget)` 패턴이라 `mode="form-action"`(기본값)이 그대로 맞음. `prefix`/`register`/`setValue` 불필요.
- i18n: `Dashboard` 네임스페이스(현재 페이지가 쓰는 `useTranslations('Dashboard')`)에 `AddressInput`이 요구하는 키(`form_address`, `form_address_search`, `form_country`, `form_state_province`, `form_city`, `form_zipcode`, `form_address_detail`) 이미 존재 확인(ko/en/ja/zh) — 신규 번역 작업 불필요.
- **RLS 확인 완료**: `zen_organizations` UPDATE 정책("Allow org members to update their organization")은 row-level 체크만 있고 컬럼 제한 없음(`CORPORATE/ADMIN/AGENCY/SHIPPER` role + 본인 org_id) — 신규 주소 필드 저장에 RLS 추가 변경 불필요.

## 수정 방향 (설계 확정 — 착수 승인, 2곳 동시 필수)

**[중요] TASK-B-241/DEF-943와 동일한 "저장 성공 토스트만 뜨고 DB 미반영" 재발 위험** — 프론트만 바꾸고 백엔드 매핑을 빠뜨리면 사용자는 성공 토스트를 보지만 country_code/state_province/city/zipcode/영문주소는 저장되지 않음. 반드시 아래 1·2를 **함께** 완료할 것.

1. **프론트 (`corporate/page.tsx`)**:
   - line 237-243의 단일 "주소" `ZenInput` 블록을 `<AddressInput>`으로 교체:
     ```tsx
     <AddressInput
       t={t}
       defaultValues={{
         country_code: org?.country_code,
         state_province: org?.state_province,
         city: org?.city,
         address: org?.address,
         address_detail: org?.address_detail,
         address_english: org?.address_english,
         address_detail_english: org?.address_detail_english,
         zipcode: org?.zipcode,
       }}
     />
     ```
   - `handleUpdateOrg`의 FormData 읽기 부분에 `country_code, state_province, city, address_detail, address_english, address_detail_english, zipcode`를 추가로 읽어 payload에 포함
   - 레이아웃: 기존 2열 그리드(`md:grid-cols-2`) 안에서 주소 블록이 `md:col-span-2`였던 것처럼, `AddressInput`도 전체 폭 차지하도록 배치(컴포넌트 내부에 이미 자체 grid가 있으므로 wrapper `div`만 `md:col-span-2`로 감싸면 됨)

2. **백엔드 (`admin/corporate.ts`)**:
   - `updateOrganizationInfo`의 payload 타입에 `countryCode?/stateProvince?/city?/addressDetail?/addressEnglish?/addressDetailEnglish?/zipcode?` 추가(camelCase 프론트 payload 네이밍 컨벤션 유지 — 기존 `bizNo`/`representative` 패턴과 일관되게)
   - `updateData` 매핑에 `country_code, state_province, city, address_detail, address_english, address_detail_english, zipcode` 추가

3. **화면 구조 확대 없음** — RLS/권한체크(`canManageCorporateInfo`)는 기존 그대로, 신규 필드 저장 경로만 추가.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-271-corporate-address-input` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/mike` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-271 확인
- [ ] `corporate/page.tsx`에 `AddressInput` 적용 + `handleUpdateOrg` payload 확장
- [ ] `admin/corporate.ts`의 `updateOrganizationInfo` payload 타입·`updateData` 매핑 확장
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `updateOrganizationInfo`에 country_code/state_province/city/address_detail/zipcode/영문주소 포함 payload 호출 시 실제 DB update 대상 컬럼에 전부 반영되는지(behavioral, mock 또는 실 DB)
  - **되돌리기 검증 필수** — 백엔드 매핑 확장을 되돌렸을 때 신규 필드가 저장 안 되는 회귀가 실제로 재현되는지 확인(TASK-B-241/DEF-943 패턴과 동일하게 "토스트 성공 + DB 미반영" 조합으로 실측)
  - AddressInput의 KR 분기(우편번호 검색 자동채움)는 기존 `OrderRegistrationForm` 테스트에서 이미 검증된 컴포넌트 자체 로직이므로 재검증 불필요 — corporate 페이지 통합 지점(defaultValues 매핑, payload 전달)만 신규 검증
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) `/mypage/corporate`에서 AGENCY 역할(예: MASTER AIR)로 실제 우편번호 검색 → 필드 자동 채움 → 저장 → **DB 직접 조회로 country_code/state_province/city/zipcode/영문주소까지 실제 반영 확인**(토스트만으로 판단 금지), 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] feat: TASK-B-271 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1041 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1041`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-266은 v1(로직버그)→v2(그림자테스트)→v3(공용 유틸 분리 후 통과) 3차 시도 끝에 완료 — **이번 Task는 신규 회귀 테스트가 실제 DB 저장 여부(그림자 테스트 아님)를 검증해야 함을 명확히 인지할 것**. 되돌리기 검증 시 mock만으로 끝내지 말고 실 DB 반영 여부까지 확인 권장(R-10 체크리스트 참조).

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

# TASK-B-083 — Issue #290 오더 등록 폼 REQ-09/10

| 항목 | 내용 |
|:-----|:------|
| **Issue** | #290 `feat` 오더 등록 폼 보완 2차 |
| **담당** | Dave |
| **생성일** | 2026-07-09 |
| **상태** | 🔔 검토 요청 |
| **브랜치** | `feature/teamb-issue-290-order-form-enhance` |

---

## 작업 내용

### REQ-09 — HSCode 자동조회 결과 확인 UX

**변경 사항:**
- `handleItemNameBlur`에서 silent auto-fill 제거 → API 결과(HS Code + confidence)를 **필드 아래 badge로 표시**
- 사용자가 **"적용" 버튼**을 클릭해야 HS Code가 입력창에 반영
- confidence 레벨에 따른 컬러 배지: `High`(emerald), `Medium`(amber), `Low`(slate)
- 기존 HS Code가 있더라도 재조회 가능하도록 `currentHsCode` 체크 제거

**변경 파일:** `src/components/orders/OrderRegistrationForm.tsx`
- `hsLookupResultMap` state 추가
- `setHsLookupResult` / `handleAcceptHsLookup` 핸들러 추가
- `NestedItems`에 `hsLookupResultMap` / `onAcceptHsLookup` props 전달
- HS Code 필드 아래 confidence badge + 적용 버튼 UI 렌더링

### REQ-10 — 수하인 정보 주소록 저장 버튼

**변경 사항:**
- 수하인 정보 섹션 Address Book 라벨 우측에 **"+ 주소록에 저장"** 버튼 추가
- 클릭 시 현재 입력된 `recipient_name`/`recipient_address`/`recipient_address_local`/`recipient_phone`을 수집
- `window.prompt`로 저장할 display_name 입력
- 기존 `createAddressBookEntry` Server Action 재사용
- 저장 완료 후 `AddressBookSelector` 리마운트(refetch)하여 최신 목록 반영
- 필수값 미입력 시 toast 에러 표시

**변경 파일:** `src/components/orders/OrderRegistrationForm.tsx`
- `createAddressBookEntry` import 추가
- `savingToAddressBook` / `refetchAddressBook` state 추가
- `handleSaveToAddressBook` 핸들러 추가
- Address Book 섹션에 저장 버튼 + AddressBookSelector key 리프레시

---

## 영향 파일

| 파일 | 변경 성격 |
|:-----|:---------|
| `src/components/orders/OrderRegistrationForm.tsx` | REQ-09 + REQ-10 전체 구현 |

## 테스트

- TypeScript 컴파일: 기존 오류 외新增 없음
- 회귀 테스트: `npm test` 진행 예정

## PR

- **PR:** [#297](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/297)
- **재작업 (Jaison 반려):** ① hs_code 강제 초기화 버그 수정 (setValue 제거) ② window.prompt → 인라인 입력창 ③ develop 기준 신규 브랜치 ④ 회귀 테스트 489/489 PASS

## 커밋

```
[Dave] feat: TASK-B-083 Issue #290 REQ-09/10 HSCode 확인 UX + 주소록 저장 버튼
[Dave] fix: TASK-B-083 반려 수정 — hs_code 초기화 버그 제거 + window.prompt→인라인 입력 교체
```

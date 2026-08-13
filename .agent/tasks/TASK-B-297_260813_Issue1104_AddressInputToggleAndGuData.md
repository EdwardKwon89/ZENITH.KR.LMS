# TASK-B-297: Issue #1104 — AddressInput 시/도·시/군/구 결함 2건 (DEF-B-062, DEF-B-063)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1104](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1104) |
| **배경** | JSJung이 오더 등록 화면 주소 관련 버그 2건 보고 — ①"내 정보 사용" 전환 시 시/도·시/군/구 미로드 ②"대왕판교로" 검색 시 시/군/구 선택 불가. Jaison이 원인 분석 후 설계 확정 |
| **담당** | Dave (Team B) — TASK-B-295/296 직접 구현자, `OrderRegistrationForm.tsx`·화주 정보 UI 최신 숙지 |
| **생성일** | 2026-08-13 |
| **우선순위** | P2 |
| **상태** | 🔄 진행중 |

## 관련 결함 보고서

- [DEF-B-062](../defects/DEF-B-062_AddressInput_토글전환시_주소필드_미갱신.md) — `AddressInput`이 "내 정보 사용/수기입력" 토글 전환에 반응하지 않음
- [DEF-B-063](../defects/DEF-B-063_AddressInput_구단위_시군구데이터_누락.md) — `country-state-city` 라이브러리 구(區) 단위 데이터 누락으로 시/군/구 자동 매칭 실패

## 수정 방향 (설계 확정 — 착수 승인)

### ① DEF-B-062 — `OrderRegistrationForm.tsx`의 shipper `AddressInput` 호출부만 수정
컴포넌트 자체 아키텍처는 변경하지 않고, 기존 key-리마운트 패턴을 토글 모드까지 확장:
```tsx
key={`${affiliation?.orgId || 'no-org'}-${shipperNameMode}`}
defaultValues={
  shipperNameMode === 'manual'
    ? { country_code: '', state_province: '', city: '', address: '', address_detail: '', zipcode: '' }
    : {
        country_code: affiliation?.orgCountryCode ?? 'KR',
        state_province: affiliation?.orgStateProvince ?? '',
        city: affiliation?.orgCity ?? '',
        address: affiliation?.orgAddressStreet ?? affiliation?.orgAddress ?? '',
        address_detail: affiliation?.orgAddressDetail ?? '',
        zipcode: affiliation?.orgZipcode ?? '',
      }
}
```
`readOnly` prop은 기존 그대로 `shipperNameMode === 'auto'` 유지. 다른 3개 호출부(`agency/shippers/new`, `agency/shippers/[id]/edit`, `mypage/corporate`)는 토글이 없는 화면이라 **변경 대상 아님**.

### ② DEF-B-063 — `AddressInput.tsx`의 Daum `onComplete` 콜백만 수정
(2026-08-13 설계 수정 — JSJung 제안: 정확일치 대신 부분매칭. 라이브러리에 없는 값을 동적으로 옵션 추가하던 최초안은 폐기 — 기존 시/도 매칭 방식(`data.sido?.startsWith(key)`)과 동일하게 부분매칭으로 통일)

`City.getCitiesOfState`로 얻은 실제 라이브러리 옵션 중 Daum 응답값과 **가장 길게 일치하는(prefix) 항목**을 선택:
```js
const cityList = City.getCitiesOfState('KR', matchedIso) ?? [];
const sigunguEn = (data as any).sigunguEnglish ?? '';
const matched = cityList
  .filter(c => sigunguEn.startsWith(c.name))
  .sort((a, b) => b.name.length - a.name.length)[0]; // 가장 긴 일치 우선
const finalCityName = matched?.name ?? sigunguEn;
setSelectedCity(finalCityName);
```
`cities` state 자체는 라이브러리 원본 목록 그대로 유지(합성 옵션 추가 없음).

**"가장 긴 일치" 정렬 필수 — 실측 확인된 이유**: 경기도(41) 목록에 `Gwangju`와 `Gwangju-si`가 **별개 항목으로 둘 다 존재**하고 배열상 `Gwangju`가 먼저 나온다. 단순 `.find()`(첫 매치)를 쓰면 "Gwangju-si OO구" 응답이 더 짧고 부정확한 `Gwangju`에 매칭되는 새 버그가 생긴다 — 반드시 일치 길이 내림차순 정렬 후 최장 일치를 선택할 것.

과설계 금지 — ①은 `AddressInput` 컴포넌트 리팩터링 없이 호출부 prop만 변경. ②는 전체 한국 행정구역 데이터 자체 구축이 아니라 라이브러리에 이미 있는 옵션 중 최선의 것을 고르는 최소 수정만.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-297-addressinput-fixes` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-297 확인
- [ ] DEF-B-062 수정(①) — `OrderRegistrationForm.tsx` 호출부만
- [ ] DEF-B-063 수정(②) — `AddressInput.tsx` `onComplete` 콜백만
- [ ] **회귀 테스트 신설 (필수, R-09, 실제 컴포넌트 렌더링 기반 — 그림자/toContain 금지, `AddressInput` mock 금지)**:
  - (DEF-B-062) "수기입력" 클릭 시 실제 `AddressInput`의 시/도·시/군/구·도로명주소·상세주소·우편번호가 빈 값이 되는지(mock 없이 실제 렌더링)
  - (DEF-B-062) "내 정보 사용" 재전환 시 위 필드들이 조직 주소값으로 실제 복원되는지
  - (DEF-B-063) Daum `onComplete` mock 응답의 `sigunguEnglish`가 라이브러리에 정확 매칭되지 않는 값(예: "Seongnam-si Bundang-gu")일 때 완료 후 `selectedCity`가 실제 라이브러리 옵션("Seongnam-si")으로 선택되는지
  - (DEF-B-063, 핵심) `sigunguEnglish`가 "Gwangju-si XXX-gu"일 때 `selectedCity`가 "Gwangju"가 아니라 "Gwangju-si"로 선택되는지(짧은 접두 오매칭 회귀 방지)
  - (DEF-B-063) 기존에 정상 매칭되던 값(예: 서울 강남구)이 회귀 없이 그대로 동작하는지
- [ ] **독립 되돌리기 검증**: 각 수정 부분을 실제로 되돌려서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 브라우저에서 실제로: ①"수기입력"↔"내 정보 사용" 토글 시 주소 필드가 실제로 초기화/복원되는지 ②"대왕판교로"를 검색해 시/군/구가 실제로 선택되는지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-297 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1104 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1104`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 커밋 누락 유형 누적 이력(13회, 최다) 있음. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). **가장 중요**: TASK-B-296에서 `AddressInput`을 mock 처리해서 이번 결함(DEF-B-062)을 못 잡았던 것이 이 Task의 발단 — 이번엔 반드시 실제 `AddressInput`을 렌더링하는 테스트를 작성할 것(mock 금지). PR 리뷰 시 `AddressInput` mock 여부를 최우선으로 확인함.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

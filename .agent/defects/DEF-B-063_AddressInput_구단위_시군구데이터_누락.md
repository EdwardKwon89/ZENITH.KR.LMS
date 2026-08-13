# DEF-B-063 — `country-state-city` 라이브러리의 시/군/구(구) 데이터 누락으로 Daum 주소검색 후 시/군/구 자동 매칭 실패

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 오더 등록 화면 주소 검색에서 "대왕판교로"를 검색했더니 시/군/구가 선택되지 않는 현상을 보고. Jaison이 코드 분석으로 원인 확인 |
| **긴급도** | Medium — 구(區)가 있는 도시(성남시/수원시/용인시/고양시/안양시 등) 주소는 시/군/구 자동 매칭이 항상 실패, 사용자가 정확한 값을 선택할 방법 자체가 없음(수동 대체 불가) |
| **현재 상태** | 미수정 |

## 원인

`AddressInput.tsx`는 국가/시도/시군구 드롭다운 데이터를 `country-state-city` npm 패키지에서 가져오는데, 이 라이브러리의 한국 데이터가 **시(-si) 단위까지만 있고 그 하위 구(-gu) 단위가 없다.**

직접 확인:
```
경기도(isoCode 41) City 목록(43개): Ansan-si, Anseong, Anyang-si, ... Seongnam-si, Suwon, Yongin-si ...
```
"성남시(Seongnam-si)"만 있고 "분당구/수정구/중원구" 같은 하위 구 데이터가 없음. (참고: 서울은 반대로 최상위가 구 단위(강남구·강동구 등)라 이 문제가 없음 — 시 아래에 구가 있는 도(道) 지역만 영향받음.)

**실패 지점** ([AddressInput.tsx:319-345](../../src/components/common/AddressInput.tsx#L319-L345)):
```js
const matchedCity = City.getCitiesOfState('KR', matchedIso)
  .find(c => c.name === (data as any).sigunguEnglish)?.name
  ?? (data as any).sigunguEnglish ?? '';
setSelectedCity(matchedCity);
```
Daum 우편번호 API가 반환하는 `sigunguEnglish`(예: "Seongnam-si Bundang-gu")는 라이브러리의 "Seongnam-si"와 정확히 일치하지 않아 매칭 실패 → `matchedCity`가 드롭다운 옵션에 없는 문자열(또는 빈 값)로 세팅됨 → `<select>`가 아무것도 선택되지 않은 것처럼 보이고, 사용자가 직접 고르려 해도 "분당구"라는 선택지 자체가 목록에 없음.

## 영향 범위

성남시/수원시/용인시/고양시/안양시/안산시 등 구가 있는 경기도(및 유사 구조를 가진 타 도) 도시 주소 전체. `AddressInput`을 쓰는 모든 화면에 공통 영향(오더 등록/수정, 대리점 화주 등록/수정, 마이페이지 법인정보 등 4곳).

## 수정 방향 (TASK-B-297에 배정, DEF-B-062와 함께 처리 — 같은 파일)

과설계 방지를 위해 **완전한 행정구역 데이터셋 자체 구축(대안 A)은 이번 범위에서 제외**. 대신 Daum 응답값을 최대한 살리는 방향으로 최소 수정:

1. `City.getCitiesOfState`에서 정확히 일치하는 항목이 없을 경우, **`cities` state에 Daum이 반환한 실제 `sigunguEnglish`(또는 `sigungu`) 값을 동적으로 옵션에 추가**해서 최소한 화면에 표시·선택 가능하게 만든다(라이브러리 데이터를 신뢰할 수 없는 지역은 "그 주소에서 실제로 검색된 값"을 그대로 옵션화).
   ```js
   const cityList = City.getCitiesOfState('KR', matchedIso) ?? [];
   const exactMatch = cityList.find(c => c.name === data.sigunguEnglish);
   const finalCityName = exactMatch?.name ?? data.sigunguEnglish ?? '';
   if (!exactMatch && finalCityName) {
     setCities([...cityList, { name: finalCityName, countryCode: 'KR', stateCode: matchedIso } as ICity]);
   } else {
     setCities(cityList);
   }
   setSelectedCity(finalCityName);
   ```
2. 위 로직을 정확히 어디(useEffect vs onComplete 콜백 내부)에 넣을지는 기존 `cities` state 갱신 흐름(시/도 변경 시 자동 갱신되는 `useEffect`, [L80-84](../../src/components/common/AddressInput.tsx#L80-L84))과 충돌하지 않도록 구현자가 판단 — 특히 `selectedState` 변경에 반응하는 별도 `useEffect`가 있어 `onComplete` 콜백에서 수동으로 `setCities`한 값이 이후 그 `useEffect`에 의해 다시 덮어써지지 않는지 확인 필요.

과설계 금지 — 전체 한국 행정구역 데이터 자체 구축, 다른 나라 데이터 보강 등은 범위 밖. 이번엔 "검색된 주소가 화면에서 사라지지 않고 선택 가능하게" 만드는 최소 수정만.

## 회귀 테스트 방향

- Daum `onComplete` mock 응답에 `sigunguEnglish`가 라이브러리에 없는 값(예: "Seongnam-si Bundang-gu")일 때, 완료 후 `selectedCity`/화면에 해당 값이 실제로 선택 표시되는지(드롭다운에 해당 옵션이 존재하고 선택된 상태인지)
- 기존에 정상 매칭되던 값(예: 서울 강남구)은 회귀 없이 그대로 동작하는지
- 되돌리기 검증: 동적 옵션 추가 로직 제거 시 위 테스트가 정확히 FAIL하는지

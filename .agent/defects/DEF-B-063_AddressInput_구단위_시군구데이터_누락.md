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

(2026-08-13 설계 수정 — JSJung 제안: 정확일치 대신 부분매칭 사용. 최초안이었던 "라이브러리에 없는 값을 동적으로 옵션에 추가"하는 방식은 폐기 — 목록에 실제로 존재하지 않는 합성 옵션을 끼워넣는 것보다, 이미 코드에 있는 시/도 매칭 방식(`data.sido?.startsWith(key)`, [L336](../../src/components/common/AddressInput.tsx#L336))과 동일하게 **부분매칭**을 쓰는 게 더 일관되고 안전함)

과설계 방지를 위해 **완전한 행정구역 데이터셋 자체 구축은 이번 범위에서 제외**. 라이브러리에 이미 존재하는 시/군/구 옵션 중 Daum 응답값과 **가장 길게 일치하는(prefix) 항목**을 선택하도록 수정:

```js
const cityList = City.getCitiesOfState('KR', matchedIso) ?? [];
const sigunguEn = (data as any).sigunguEnglish ?? '';
const matched = cityList
  .filter(c => sigunguEn.startsWith(c.name))
  .sort((a, b) => b.name.length - a.name.length)[0]; // 가장 긴 일치 우선
const finalCityName = matched?.name ?? sigunguEn;
setSelectedCity(finalCityName);
```

**"가장 긴 일치" 정렬이 반드시 필요한 이유(실측 확인)**: 경기도(41) 목록에 `Gwangju`와 `Gwangju-si`가 **별개 항목으로 둘 다 존재**하며 배열 순서상 `Gwangju`가 먼저 나온다. 단순 `.find(c => sigunguEn.startsWith(c.name))`(첫 매치 채택)를 쓰면 "Gwangju-si OO구" 응답이 더 짧고 부정확한 `Gwangju`에 매칭되는 새로운 버그가 생긴다 — 반드시 일치 길이 기준 내림차순 정렬 후 첫 번째(최장 일치)를 선택할 것.

`cities` state 자체는 라이브러리 원본 목록(`cityList`) 그대로 유지 — 합성 옵션을 추가하지 않으므로 드롭다운에는 항상 실제 존재하는 값만 노출된다(단, 시/군/구 세부 단위(예: 분당구)까지는 못 담고 상위 시 단위(성남시)까지만 선택됨 — 정확한 상세 주소는 도로명주소 필드에 이미 포함되어 있으므로 허용 가능한 손실로 판단).

과설계 금지 — 전체 한국 행정구역 데이터 자체 구축, 다른 나라 데이터 보강 등은 범위 밖.

## 회귀 테스트 방향

- Daum `onComplete` mock 응답에 `sigunguEnglish`가 라이브러리에 정확 매칭되지 않는 값(예: "Seongnam-si Bundang-gu")일 때, 완료 후 `selectedCity`가 실제 라이브러리 옵션("Seongnam-si")으로 선택되는지
- **최장 일치 검증**: `sigunguEnglish`가 "Gwangju-si XXX-gu"일 때 `selectedCity`가 "Gwangju"가 아니라 "Gwangju-si"로 선택되는지(짧은 접두 오매칭 회귀 방지 — 이번 결함의 핵심 검증 포인트)
- 기존에 정상 매칭되던 값(예: 서울 강남구, 이미 라이브러리에 구 단위로 존재)은 회귀 없이 그대로 동작하는지
- 되돌리기 검증: 정렬 로직(`sort`) 제거 시 "Gwangju-si" 테스트가 정확히 FAIL하는지

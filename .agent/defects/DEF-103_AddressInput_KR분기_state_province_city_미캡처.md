# DEF-103: `AddressInput.tsx` KR 분기(다음 우편번호 검색)가 시/도·시/군/구를 전혀 캡처하지 않음 — 실제 SHXK API 필수값 검증 실패로 발견

## 발견 경위
JSJung이 `SHXK_TEST_MOCK=false`로 전환해 실제 SHXK UPS API 연계 테스트 중 오더 등록 실패:
```
zen_ups_label_errors.error_message: 发件人州/省不能为空
(→ "발신인의 주/성(State/Province)이 비어있으면 안 됩니다")
```
Mock 모드에서는 이 필수값 검증을 전혀 하지 않아 지금까지 드러나지 않았음.

## 근본 원인
`src/components/common/AddressInput.tsx`의 KR 분기(다음 우편번호 검색 UI, 122~172행)가 `state_province`(시/도)·`city`(시/군/구)를 전혀 캡처하지 않는다:

```tsx
// 169~171행 — 항상 빈 문자열
{mode === 'form-action' && <input name="state_province" type="hidden" value="" />}
{mode === 'form-action' && <input name="city" type="hidden" value="" />}
{mode === 'form-action' && <input name="address_english" type="hidden" value={addressEnglish} />}
```

`onComplete` 핸들러(270~283행)도 `roadAddress`/`zonecode`/`roadAddressEnglish`만 캡처하고 `sido`/`sigungu`는 전혀 다루지 않는다. 그런데 Daum Postcode API는 이미 `sido`/`sidoEnglish`/`sigungu`/`sigunguEnglish` 필드를 응답에 포함해서 준다(PR#557 조사 시 이미 확인된 `react-daum-postcode` 타입 정의 — `node_modules/react-daum-postcode/lib/loadPostcode.d.ts`).

비KR 분기(174~257행)는 `country-state-city` 라이브러리로 select UI를 만들어 `selectedState`/`selectedCity`를 제대로 채우는데, **KR 분기만 이 값들이 완전히 누락되어 있음** — `address_english`를 캡처하도록 고친 PR#557과 정확히 동일한 유형의 문제가 `state_province`/`city`에도 그대로 남아있었던 것.

## 영향 범위
`AddressInput`을 사용하는 모든 폼에서, **한국 주소(다음 검색)를 입력하면 시/도·시/군/구가 항상 공란으로 저장됨**:
- Agency Shipper 등록/수정(`agency/shippers/new`, `agency/shippers/[id]/edit`)
- `OrderRegistrationForm.tsx`의 화주/수하인 주소 섹션(rhf 모드)
- 결과적으로 SHXK `createorder`의 `shipper_province`가 항상 빈 문자열 → **실제 SHXK 서버가 모든 한국발 오더 등록을 거부함(mock 모드에서는 은폐되어 있었음)**

## 긴급도
**High** — UPS 실연동의 전제조건이 깨져 있어 실제 라벨 발급이 원천적으로 불가능한 상태였음. 오늘 실제 API 테스트로 처음 발견됨.

## 권장 조치
KR 분기 `onComplete`에서 `data.sidoEnglish || data.sido || ''`를 `state_province`로, `data.sigunguEnglish || data.sigungu || ''`를 `city`로 캡처(기존 `selectedState`/`selectedCity` state를 그대로 재사용 — 이미 선언되어 있고 비KR 분기에서 쓰는 것과 동일 변수). KR 분기의 169~170행 하드코딩된 `value=""`를 각각 `value={selectedState}`/`value={selectedCity}`로 교체.

## 관련 파일
`src/components/common/AddressInput.tsx`

## 보고
JSJung 직접 발견·즉시 수정 지시.

# DEF-B-062 — `AddressInput`이 "내 정보 사용/수기입력" 토글 전환에 반응하지 않음

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 오더 등록 화면에서 "내 정보 사용" 모드로 전환했을 때 시/도·시/군/구 데이터가 로드되지 않는 현상을 보고. Jaison이 코드 분석으로 원인 확인 |
| **긴급도** | Medium — 데이터 손실/보안 이슈는 아니나 TASK-B-296(화주 정보 UI 단순화)에서 방금 구현한 핵심 기능(수기입력 시 전체 초기화/내 정보 사용 시 전체 복원)이 주소 필드에서는 동작하지 않음 |
| **현재 상태** | 미수정 |

## 원인

`OrderRegistrationForm.tsx`의 "내 정보 사용/수기입력" 토글(TASK-B-295/296)은 클릭 시 `restoreAutoShipperInfo()`/`clearShipperInfoFields()`를 호출하는데, 이 함수들은 오직 react-hook-form의 `setValue()`만 호출한다.

- 이름/담당자명/연락처/이메일/사업자번호 입력란은 `{...register('shipper_xxx')}`로 RHF 상태에 직접 바인딩돼 있어 `setValue()` 한 번으로 화면이 정확히 갱신됨.
- 반면 주소(`AddressInput`)는 **RHF를 구독하지 않고 자체 내부 `useState`로 시/도·시/군/구·도로명주소·상세주소·우편번호를 관리**([AddressInput.tsx:44-56](../../src/components/common/AddressInput.tsx#L44-L56)). 이 내부 state는 오직 `defaultValues` prop이 실제로 바뀔 때만(정확히는 `key`가 바뀌어 컴포넌트가 통째로 리마운트될 때만) 갱신됨.
- `OrderRegistrationForm.tsx`에서 shipper용 `AddressInput`에 전달되는 `defaultValues`/`key`는 **오직 `affiliation` 객체에서만** 파생됨([L1119-1133](../../src/components/orders/OrderRegistrationForm.tsx#L1119-L1133)):
  ```tsx
  key={affiliation?.orgId || 'no-org'}
  defaultValues={{
    country_code: affiliation?.orgCountryCode ?? 'KR',
    state_province: affiliation?.orgStateProvince ?? '',
    city: affiliation?.orgCity ?? '',
    address: affiliation?.orgAddressStreet ?? affiliation?.orgAddress ?? '',
    address_detail: affiliation?.orgAddressDetail ?? '',
    zipcode: affiliation?.orgZipcode ?? '',
  }}
  ```
  토글 버튼을 클릭해도 `affiliation` 자체는 바뀌지 않으므로(같은 로그인 사용자) `key`도, `defaultValues`도 안 바뀜 → **`AddressInput`은 토글 클릭에 전혀 반응하지 않고 이전 화면 그대로 멈춰 있음.**

### 부수 결함 (동일 원인)

TASK-B-296 요구사항 "수기입력 클릭 시 화주 정보 전체 필드 초기화"도 주소 필드에서는 적용되지 않는다 — `defaultValues`가 토글 모드와 무관하게 항상 affiliation 값 고정이라, 수기입력으로 전환해도 주소 입력란은 지워지지 않고 이전(조직) 주소가 그대로 표시/편집 가능 상태로 남음.

### 왜 회귀 테스트가 못 잡았나

TASK-B-296 테스트(`tests/unit/orders/iss1102-shipper-info-ui-simplify.test.tsx`)가 `AddressInput`을 전부 mock 처리(`vi.mock('@/components/common/AddressInput', () => ({ AddressInput: ... }))`)해서 실제 컴포넌트와 토글의 상호작용이 테스트되지 않음.

## 재현

1. UPS 오더 등록 화면 진입 (법인 화주 계정)
2. "내 정보 사용"(기본값) 상태에서 주소가 비어있거나 안 뜨는 채로 시작(초기 로딩 타이밍에 따라 다름) 또는 정상 표시됨
3. "수기입력" 클릭 → 주소 필드가 지워지지 않음(부수 결함)
4. 다시 "내 정보 사용" 클릭 → 주소 필드가 조직 주소로 복원되지 않고 이전 상태 그대로 유지(주보고 현상)

## 수정 방향 (TASK-B-297에 배정)

`OrderRegistrationForm.tsx`의 shipper용 `AddressInput` 호출부만 수정(컴포넌트 자체 아키텍처 변경 불필요, 기존 key-리마운트 패턴 재사용):

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
`key`에 `shipperNameMode`를 포함시켜 토글 전환 시 `AddressInput`이 새 `defaultValues`로 강제 리마운트되도록 함. `readOnly` prop은 기존 그대로 `shipperNameMode === 'auto'` 유지.

과설계 금지 — `AddressInput` 컴포넌트 자체를 RHF-구독형으로 리팩터링하지 않는다(다른 3곳 호출부(`agency/shippers/*`, `mypage/corporate`)에 영향 없어야 함, 이번 수정은 `OrderRegistrationForm.tsx`의 호출부 prop만 변경).

## 회귀 테스트 방향

기존 TASK-B-296 테스트처럼 `AddressInput`을 mock하면 이 결함을 검증할 수 없음 — **실제 `AddressInput` 컴포넌트를 렌더링**(mock 해제)해 다음을 확인해야 함:
- "수기입력" 클릭 시 주소 관련 select/input(시/도, 시/군/구, 도로명주소, 상세주소, 우편번호)이 실제로 빈 값이 되는지
- "내 정보 사용" 재전환 시 조직 주소값으로 실제 복원되는지
- 되돌리기 검증: `key`에서 `shipperNameMode` 제거 시 위 테스트가 정확히 FAIL하는지

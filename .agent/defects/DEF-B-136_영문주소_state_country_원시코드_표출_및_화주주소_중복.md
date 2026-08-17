# DEF-B-136: 영문 주소 표출 시 state/country 원시 코드 노출 + 화주(국내) 주소 중복 표시

**발견일**: 2026-08-16
**발견자**: JSJung (실사용 확인) → Jaison 원인 분석
**긴급도**: Medium

## 현상

JSJung 실사용 확인: UPS 상세페이지 "배송 기본 정보" 카드에서 화주 주소가 아래처럼 표출됨.
```
461-5 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea
Gangseo-gu, 11, 07570 KR
```
2번째 줄이 1번째 줄과 내용이 중복(Gangseo-gu 두 번, 국가 표기 두 번 다른 형식)되고, 주(州) 자리에 사람이 읽을 수 없는 원시 코드(`11`)가 그대로 노출됨.

## 원인

### 1. state_province 원시 코드 노출
`AddressInput.tsx`의 Daum 우편번호 연동 로직이 `country-state-city` 라이브러리의 `isoCode`를 `state_province`에 저장한다(폼 드롭다운 매칭용 내부 키). 한국의 ISO 3166-2:KR 코드는 숫자(`11`=Seoul, `26`=Busan 등)라 사람이 읽을 수 없는데, TASK-B-306(PR#1136)이 이 값을 변환 없이 그대로 화면에 출력했다.

실증:
```js
State.getStatesOfCountry('KR').find(s => s.isoCode === '11')
// { name: 'Seoul', isoCode: '11', ... }
```

### 2. 화주(국내) 주소 중복
화주는 이 시스템에서 항상 국내(한국) 소재이며, Daum 우편번호가 제공하는 `address_english`(예: `resolveShipperStreet()` 결과)는 이미 구/시/국가까지 포함된 완전한 문자열이다. TASK-B-306이 여기에 city/state/zipcode/country를 별도 줄로 추가하면서 내용이 중복됨.

### 3. 동일 패턴이 CI/PL/UPS Invoice PDF에도 존재
TASK-B-305(PR#1134)가 추가한 CI/PL PDF의 shipper/consignee city/state/zipcode/country 표출부(`CommercialInvoicePDF.tsx`, `PackingListPDF.tsx`)도 country를 raw country_code(`CN`, `KR` 등)로 그대로 출력한다. `UpsInvoicePDF.tsx`의 consignee country도 `dest_port.country_code`를 그대로 사용(사실상 항상 코드 표출). 통관서류라 오히려 더 중요한 위치.

## 영향 범위

- `ups-detail/page.tsx` "배송 기본 정보" 카드 (화주/수령인)
- `CommercialInvoicePDF.tsx` / `PackingListPDF.tsx` (화주/수령인)
- `UpsInvoicePDF.tsx` (수령인 country)

## 권장 조치

TASK-B-307로 처리.

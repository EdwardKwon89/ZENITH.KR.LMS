# DEF-B-059 (High) — 오더 화주 주소 영문 저장 컬럼 부재로 SHXK/UPS 라벨에 한글 주소가 그대로 전달됨

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-12 |
| **발견 경위** | JSJung — UPS 등록 시 화주 주소가 한글로 전달되어 라벨에 글자가 제대로 표출되지 않는다고 보고 |
| **긴급도** | High |
| **영향 범위** | KR 화주 조직 프로필에 `address_english`가 비어있는 모든 UPS 오더의 SHXK 등록(`registerUpsOrder`) — 특히 신규/직접생성 조직(영문주소 입력을 놓치기 쉬움)에서 발생 가능성 높음 |

## 근본 원인 (확정 완료)

**오더(`zen_orders`) 레벨에는 화주 주소 영문 저장 컬럼이 아예 없음:**

```
\d zen_orders 확인 결과:
  shipper_address          | text
  shipper_address_detail   | text
  (shipper_address_english, shipper_address_detail_english 컬럼 자체가 존재하지 않음)
```

반면 `zen_organizations`(조직 프로필)에는 `address_english`/`address_detail_english` 컬럼이 이미 존재함(기존 corporate 관리 기능에서 사용).

**흐름 추적:**

1. 오더 등록 화면(`OrderRegistrationForm.tsx`)의 화주 주소 입력은 `AddressInput` 컴포넌트(`prefix="shipper"`, `mode="rhf"`) 사용. 사용자가 Daum 우편번호 검색으로 한글 주소를 선택하면, Daum API가 함께 내려주는 `roadAddressEnglish`를 `AddressInput.tsx:324-340`에서 `setValue('shipper_address_english', englishAddr)`로 저장 시도함.
2. **`src/lib/validation/order.ts`의 `orderRegistrationSchema`에 `shipper_address_english`/`shipper_address_detail_english` 필드가 정의되어 있지 않음** — `orderRegistrationSchema.parse(payload)` 시점에 Zod가 스키마에 없는 키를 제거, 서버로 전달되는 순간 영문 주소가 소실됨.
3. 설사 스키마에 살아남더라도 **`zen_orders` 테이블 자체에 저장할 컬럼이 없음.**
4. SHXK 전송 시(`resolveShipperStreet()`, `src/lib/ups/label-mapping.ts:50-57`)는 `shipperOrg.address_english → shipperOrg.address → order.shipper_address` 순으로 폴백:
   ```ts
   const shipperAddr = (shipperOrg?.address_english as string) || (shipperOrg?.address as string) || (order.shipper_address as string) || '';
   ```
   화주 조직 프로필에 영문주소가 채워져 있지 않으면(신규/직접생성 조직 다수 해당 — 예: MASTER AIR) 최종적으로 오더에 저장된 **한글** `shipper_address`가 그대로 SHXK `shipper.shipper_street`에 실려 전송됨.

대조군: 수취인(consignee) 쪽은 `recipient_address_local`이라는 별도 컬럼으로 로컬스크립트 주소를 다루는 패턴이 이미 존재하는데, 화주 쪽은 이 대응이 애초에 빠져 있음.

## 재현 절차

1. 화주 조직 프로필에 `address_english`가 비어있는 상태에서(신규 조직 대부분 해당) UPS 오더 등록
2. 오더 등록 화면에서 Daum 우편번호로 한글 주소 선택(영문 주소 자동 조회됨 — 화면상으로는 정상 동작해 보임)
3. 저장 후 `zen_orders.shipper_address` 확인 → 한글 텍스트만 저장되어 있음(영문 버전 어디에도 없음)
4. SHXK `createorder` payload의 `shipper.shipper_street` → 한글 텍스트 그대로 전송 확인 가능(`resolveShipperStreet()` 로직상 필연적)

## 수정 방향 (설계안 — 과설계 금지, 최소 범위)

1. **신규 마이그레이션**: `zen_orders`에 `shipper_address_english`/`shipper_address_detail_english` 컬럼 추가(nullable text, `zen_organizations`와 동일 네이밍)
2. **`orderRegistrationSchema`**: `shipper_address_english`/`shipper_address_detail_english` optional 필드 추가(이미 `AddressInput.tsx`가 `setValue`로 채워주고 있으므로 스키마만 열어주면 폼→서버 전달은 자동으로 됨)
3. **`createOrder()`/`updateOrder()`**: 헤더 데이터에 두 필드 포함해 저장
4. **`resolveShipperStreet()`**(`label-mapping.ts`): 폴백 우선순위에 `order.shipper_address_english`/`order.shipper_address_detail_english` 추가 — 가장 구체적인(이 오더 특정) 값이므로 최우선으로 두는 것을 권장(`order.shipper_address_english → shipperOrg.address_english → shipperOrg.address → order.shipper_address` 순), 단 최종 우선순위는 구현자가 기존 조직 프로필 우선 정책과의 정합성을 확인해 결정
5. **영문주소 미입력 시 방어**: Daum 우편번호로 선택했는데도 `roadAddressEnglish`가 빈 값으로 오는 예외 케이스(일부 오래된 지번주소 등) — 이 경우 최종 폴백은 기존처럼 한글 유지(완전 차단은 과설계, 현재보다 개선되면 충분)

**범위 밖(이번 Task에서 손대지 말 것)**: 수취인 쪽 `recipient_address_local` 로직, 조직 프로필(`zen_organizations`) 관리 화면 자체는 이미 정상 동작 중이므로 미변경.

# DEF-109: 오더 등록 후 수정할 수 있는 UI가 없음 (백엔드는 존재하나 미연결 + 필드 누락)

## 발견 경위
JSJung이 2026-07-18 보고: "현재 오더 정보를 입력하고 나면 수정할 수 있는 방법이 없음".

## 조사 결과

### UI 경로 자체가 없음
`OrderRegistrationForm`은 `src/app/[locale]/(dashboard)/orders/new/page.tsx`(신규 등록)에서만 쓰이고, `orders/[orderId]/edit/page.tsx` 같은 수정 페이지가 아예 존재하지 않음(`find` 결과 0건).

### 백엔드 액션(`updateOrder`)은 존재하지만 아무도 호출하지 않음
`src/app/actions/operations/orders.ts:146`의 `updateOrder(orderId, payload)`가 이미 구현되어 있고 `isOrderEditable(order.status)`로 상태 가드까지 되어 있음(REGISTERED/SCHEDULED/HELD만 수정 가능) — 그런데 `grep` 결과 이 함수를 호출하는 UI 컴포넌트가 프로젝트 어디에도 없음.

### `updateOrder`가 실제로는 필드 누락 상태
`createOrder`는 `createOrderViaRpc`(DB RPC, 전체 필드 INSERT)를 쓰지만, `updateOrder`는 `orderRepo.updateHeader()`로 수동 필드 목록을 나열하는데(162~183행) 아래 필드들이 빠져 있음:
- `shipper_address`, `shipper_country_code`, `shipper_state_province`, `shipper_city`, `shipper_address_detail`, `shipper_zipcode`, `shipper_biz_no`
- `recipient_country_code`, `recipient_state_province`, `recipient_city`, `recipient_address_local`
- `ups_product_code`, `incoterms`, `ups_service_family`

즉 **UI를 지금 당장 연결해도, 화주/수취인 주소 상세나 UPS 상품코드를 고치면 조용히 무시되고 저장 안 됨** — RPC(`createOrderViaRpc`)가 여러 필드를 한 번에 처리하도록 확장된 이후(DEF-099/Issue #551 전후 시점 추정) `updateOrder`가 함께 갱신되지 않은 것으로 보임.

## 영향 범위
모든 오더의 등록 후 정보 수정 — 화주가 주소를 잘못 입력했거나 UPS 상품코드를 바꿔야 하는 경우 등, REGISTERED/SCHEDULED/HELD 상태에서도 고칠 방법이 UI상 전혀 없음.

## 긴급도
High — 실사용에 필수적인 기본 CRUD 기능 부재.

## 권장 조치
1. `src/app/[locale]/(dashboard)/orders/[orderId]/edit/page.tsx` 신규 생성 — 기존 `OrderRegistrationForm`을 "edit 모드"로 재사용(defaultValues에 기존 오더 데이터 주입, submit 시 `createOrder` 대신 `updateOrder` 호출). `isOrderEditable(order.status)`가 false면 수정 페이지 접근 자체를 차단(또는 읽기 전용으로 표시).
2. `updateOrder`의 `updateHeader` 호출에 누락된 필드 전부 추가(위 목록).
3. 오더 상세 페이지에 "수정" 버튼 추가(REGISTERED/SCHEDULED/HELD 상태에서만 노출).

## 관련 파일
`src/app/actions/operations/orders.ts`, `src/components/orders/OrderRegistrationForm.tsx`, 신규 `orders/[orderId]/edit/page.tsx`

## 보고
JSJung 직접 보고(2026-07-18).

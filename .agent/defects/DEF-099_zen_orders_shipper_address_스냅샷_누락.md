# DEF-099: `zen_orders.shipper_address` 등 화주 주소 스냅샷 필드가 실제 오더 생성 흐름에서 전혀 채워지지 않음

## 발견 경위
사용자 요청으로 "createorder 매핑에서 화주(shipper) 주소를 영문주소로 매핑" 설계 작업을 진행하던 중, `placeShxkOrder`(`src/app/actions/operations/ups-labels.ts`)가 `order.shipper_address`/`shipper_address_detail`/`shipper_state_province`/`shipper_city`/`shipper_zipcode`를 `zen_orders` 컬럼에서 직접 읽는 구조임을 확인. 그런데 `createOrder`/`updateOrder`(`src/app/actions/operations/orders.ts`) 두 곳 모두 INSERT/UPDATE 페이로드에 `shipper_contact_name`/`shipper_contact_phone`만 포함하고 있고, `shipper_address`/`shipper_address_detail`/`shipper_state_province`/`shipper_city`/`shipper_zipcode`/`shipper_country_code`는 어디에도 쓰지 않음을 확인. 실제 DB 조회로 재확인:

```sql
SELECT order_no, shipper_address, shipper_address_detail, shipper_contact_name, shipper_contact_phone
FROM zen_orders ORDER BY created_at DESC LIMIT 15;
```
→ 최근 오더 8건 중 `ZEN-2026-000001` 1건만 값이 채워져 있고(수동 세팅된 테스트 데이터로 추정), 나머지 전부(`TRK-QA-TEST-001`, `E2E-SEED-001~005`, `Z-FIN-E2E05-01`)는 공란.

## 현상
실제 오더 등록 화면을 통해 생성되는 모든 오더는 `zen_orders.shipper_address` 등 화주 주소 컬럼이 항상 빈 값으로 저장됨. 이 상태로 UPS 라벨을 발급하면 `placeShxkOrder`가 만드는 `createorder` payload의 `shipper.shipper_street`/`shipper_city`/`shipper_province`/`shipper_postcode`/`shipper_telephone`가 전부 빈 문자열로 SHXK에 전송됨(`shipper_name`/`shipper_countrycode`만 `SHXK_SHIPPER_NAME`/`SHXK_SHIPPER_COUNTRY` 상수 fallback으로 채워짐).

## 영향 범위
- UPS 라벨 발급 기능 전체(`issueUpsLabel` → `placeShxkOrder`) — 화주 주소가 실린 배송 라벨이 정상적으로 발급되지 않거나, SHXK 측에서 필수값 누락으로 거부될 가능성 있음.
- 현재 세션에서 진행 중인 "Agency/Shipper 영문주소 관리" 설계(Issue 등록 예정)의 전제조건 — 영문 주소 컬럼을 추가해도 애초에 한글 주소조차 스냅샷되지 않으면 영문 매핑도 무의미함.

## 긴급도
**High** — UPS 서비스 자체가 최근 안정화 작업(Issue #545/#546/#547/#549) 대상이었고, 다음 단계 작업(영문주소 매핑)의 전제조건이 깨져 있는 상태라 조기 확인 필요. (다만 UPS 라벨 발급이 아직 실사용 트래픽이 없는 것으로 보여 "즉시"는 아님)

## 권장 조치
`createOrder`/`updateOrder`의 INSERT/UPDATE 페이로드에 `shipper_id`로 조회한 `zen_organizations`의 주소 필드(`address`, `address_detail`, `state_province`, `city`, `zipcode`, `country_code`)를 `shipper_address`/`shipper_address_detail`/`shipper_state_province`/`shipper_city`/`shipper_zipcode`/`shipper_country_code`로 스냅샷 저장하도록 추가. (기존 `recipient_*` 필드는 폼에서 직접 입력받아 저장되고 있어 동일한 문제 없음 — `shipper_*`만 누락)

## 관련 파일
- `src/app/actions/operations/orders.ts` (`createOrder`, `updateOrder`)
- `src/app/actions/operations/ups-labels.ts` (`placeShxkOrder`)

## 보고
Aiden에게 R-18 절차에 따라 보고 필요 (긴급도 High).

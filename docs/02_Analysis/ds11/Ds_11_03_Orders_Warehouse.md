## 3. 오더 관리 (Order Management)
물류 오더(House Order) 및 집행 오더(Master Order)의 생명주기를 관리합니다.
- **Path**: `src/app/actions/orders.ts`

### createOrder(payload)
- **설명**: 신규 하우스 오더 등록 (Header + Packages + Items 동시 처리)
- **Input**: `OrderRegistrationInput` (Zod Schema 검증)
- **Output**: `Promise<Order>`
- **저장 경로**: `create_order_atomic` RPC (v7, `20261113090100_task_b346_create_order_atomic_v7.sql`) — 실행 권한은 TASK-B-403(#1579)에서 `authenticated`·`service_role`로 정렬
- **주요 Input 필드 — 수하인(Consignee)**: `buildCreateOrderPayload()`가 SHXK createorder `consignee.*`로 매핑하는 필드. 제약은 SHXK 명세(`docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 130~147행) 기준이며, 앱이 명세보다 엄격한 필드는 별도 표기한다.

  | 필드 | 타입 | 필수 | 제약 | SHXK 매핑 | 비고 |
  | :--- | :--- | :-- | :--- | :--- | :--- |
  | `recipient_name` | string | Y | 1~200자 | `consignee.consignee_name` | 수취인 성명. 기본값(폴백) 없음 — 빈 값은 `validateShxkPayload()`가 차단 (TASK-B-346 PR①). 200자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_company` | string | N | 최대 200자 | `consignee.consignee_company` | 수취인 회사명. 빈 값·공백만이면 payload에서 미전송 (TASK-B-346 PR②·PR③) |
  | `recipient_phone` | string | Y | 숫자 15자리 이하 | `consignee.consignee_telephone` | 앱 한도(15)가 SHXK 명세(100)보다 엄격 — UPS E.164 기준 |
  | `recipient_email` | string | N | 이메일 형식, 최대 100자 | `consignee.consignee_email` | 100자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_pccc` | string | N | 최대 50자 | `consignee.consignee_tariff` | 50자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_country_code` | string | N | 최대 2자 (ISO 3166-1 alpha-2) | `consignee.consignee_countrycode` | 2자 초과는 사전검증이 차단 (PR③) |
  | `recipient_state_province` | string | N | 최대 300자 | `consignee.consignee_province` | 300자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_city` | string | N | 최대 300자 | `consignee.consignee_city` | 300자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_address` / `recipient_address_local` | string | N | 전송 street 기준 최대 105자 | `consignee.consignee_street` | 도로명 추출 + 상세주소 결합. 앱 한도(105)가 SHXK 명세(300)보다 엄격 — UPS AddressLine 기준 |
  | `recipient_zipcode` | string | N | 최대 100자 | `consignee.consignee_postcode` | 100자 초과는 폼(zod)·사전검증이 차단 (PR③) |

- **SHXK 명세상 미전송 수하인 필드 (TASK-B-346 PR③ 감사)**: `consignee_district`(300)·`consignee_doorplate`(300)·`consignee_areacode`(10)·`consignee_mobile`(100)·`consignee_fax`(100)·`consignee_certificatetype`·`consignee_certificatecode`(50)·`consignee_credentials_period`(50) 8개는 현재 입력 UI·payload 매핑이 없다. 신규 DB 컬럼·UI가 필요할 수 있는 항목으로, 구현 전 결정 요청 대상 — `scratch/post_launch_improvements.md` IMP-191 참조.

- **주요 Input 필드 — 발송인(Shipper)**: `buildCreateOrderPayload()`가 SHXK createorder `shipper.*`로 매핑하는 필드. `shipper_company`는 TASK-B-345에서 한 번 제거됐으나, 실제 SHXK 서버가 `FXUPS` 경로에서 필수 검증한다는 실측(DEF-B-054)에 따라 TASK-B-397(#1552)로 전 경로 재전송한다.

  | 필드 | 타입 | 필수 | SHXK 매핑 | 값 출처·비고 |
  | :--- | :--- | :-- | :--- | :--- |
  | `shipper_name` | string | Y | `shipper.shipper_name` | 화면 화주명(`zen_orders.shipper_name`) → `shipper_org.name` → 기본값 폴백 (TASK-B-341) |
  | `shipper_company` | string | Y(실서버) | `shipper.shipper_company` | 환경변수 `SHXK_SHIPPER_COMPANY`에서 주입. 미설정 시 `SHXK_SHIPPER_NAME` 값으로 대체하고 `logger.warn` 기록(`src/lib/shxk/config.ts`). 값 자체는 저장소에 두지 않는다(R-21) |
  | `shipper_country_code` / `shipper_state_province` / `shipper_city` / `shipper_zipcode` / `shipper_contact_phone` | string | N | `shipper.shipper_countrycode` / `shipper_province` / `shipper_city` / `shipper_postcode` / `shipper_telephone` | 오더 값 우선, 없으면 발송인 기본값. 전화번호는 숫자만 추출 |

  - 적용 경로: `placeShxkOrder()`(실제 `createorder`)·`previewShxkPayload()`(CREATEORDER 미리보기) 모두 동일 계약(`src/app/actions/operations/ups-labels.ts`).
  - 값은 운영 환경변수로 주입하므로 코드·문서·로그에 실제 회사명을 기재하지 않는다(R-21). 사전검증(`validateShxkPayload`)은 현행 `shipper_company` 누락을 검사하지 않는다 — 감사 항목은 IMP 건의로 분리.

- **DB 컬럼**: `zen_orders.recipient_company` (text, nullable) — 마이그레이션 `20261113090000_task_b346_recipient_company.sql`로 추가. `create_order_atomic` v7이 `p_payload->>'recipient_company'`를 저장.
- **레거시 참고**: `zen_orders.recipient_contact` 컬럼은 조회 전용 레거시로, 본 명세의 수하인 입력/전송 경로에서는 사용하지 않는다.

### getOrders(filters)
- **설명**: 필터 조건에 따른 오더 리스트 조회 (Pagination 지원)
- **Input**: `{ status?, query?, page?, pageSize? }`

### getOrderDetails(orderId)
- **설명**: 특정 오더의 상세 정보 및 패킹/아이템 리스트 조회

### updateOrder(orderId, payload)
- **Path**: `src/app/actions/operations/orders.ts:241` (`src/app/actions/orders.ts`는 re-export 한 줄)
- **설명**: 기존 오더를 수정하고 인벤토리를 재조정합니다. **TASK-B-367(#1377)부터 오더정산 완료(`cost_settlement_status='SETTLED'`) 오더는 중량·치수(패키지별 `length`·`width`·`height`·`gross_weight`, 패키지 수) 수정이 `cost_settled_locked`로 차단됩니다.** 비중량 필드(화주·수하인·배송정보 등)만 수정하면 통과합니다.
- **가드 위치·근거**: `getOrderEditScope`가 상태를 제한하지만 DELIVERED에서 도달 가능한 `RETURNED`/`CLAIMED`/`HELD`/`REGISTERED`/`SCHEDULED`/`WAREHOUSED(UPS)`는 `editable=true`이므로 상태 가드만으로는 SETTLED 오더의 화물 수정이 가능합니다. `src/lib/orders/settled-cargo-guard.ts`의 `assertSettledCargoEditAllowed`를 오더 조회 직후·모든 쓰기 전에 호출(1~3줄)해 차단합니다(상태 전이표 전수 결과는 TASK-B-367 task file §1-2 참조).
- **권한**: `validateUserAction()` (로그인 세션). 기존 서버 가드(`getOrderEditScope`, UPS 활성 라벨, 실측 낙관적 동시성)는 그대로 유지됩니다.
- **오류**: 상태 부적합(`order_edit_status_invalid`), **정산 완료 오더의 화물 수정(`cost_settled_locked`, `src/lib/orders/settled-cargo-guard.ts:29`)**, UPS 활성 라벨 존재, 실측값 stale(`measurements_stale`) 등 기존 오류 유지.

### updateOrderStatus(orderId, newStatus)
- **설명**: 상태 머신(Status Machine) 규칙에 따른 오더 상태 변경
- **Validation**: `canChangeStatus` 로직 통과 필수

### createMasterOrder(payload) / dissolveMasterOrder(masterId)
- **설명**: 여러 하우스 오더를 하나의 마스터 오더로 묶거나(Binding) 해제(Dissolve)

### getMasterOrders() / getMasterOrderWithHouses(masterId)
- **설명**: 마스터 오더 목록 및 포함된 하우스 오더 상세 조회

---


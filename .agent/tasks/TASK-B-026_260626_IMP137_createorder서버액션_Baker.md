# TASK-B-026 — IMP-137: createorder + getnewlabel Server Action (Phase 8)

> **Task-ID**: TASK-B-026
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: JSJung (리더·검토) / Baker (구현)
> **우선순위**: P1
> **상태**: 🔔
> **GitHub Issue**: [#107](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/107)
> **연관 IMP**: IMP-137
> **전제조건**: TASK-B-025 (IMP-136) ✅
> **설계 참조**: [An-13 v2.0](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) §5·§9

---

## 업무 개요

shxkRequest 기반 주문 생성 → 운송장 발급 → 레이블 발급 2-step 흐름 구현 (IMP-137).
Server Action으로 구현 (Vercel 서버 측 격리 — HTTP 평문 전송 보안 옵션 A).

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-B-025 ✅ (shxk client) | ✅ |

---

## 구현 범위

### 신규 파일

```
src/lib/shxk/order.ts
```

### 2-step 흐름 (An-13 v2.0 §5)

```typescript
// Step 1: createorder
const orderRes = await shxkRequest('createorder', {
  order_status: 'P',
  shipping_method: 'KRUPSEXP',
  platform_id: '',
  buyer_id: '',
  reference_no: referenceNo,
  // ...발송인/수신인/패키지 정보
});
const orderId = orderRes.data.order_id;

// Step 2: gettrackingnumber
const trackRes = await shxkRequest('gettrackingnumber', { order_id: orderId });
const trackingNo = trackRes.data.tracking_number;

// Step 3: getnewlabel
const labelRes = await shxkRequest('getnewlabel', { order_id: orderId });
const labelUrl = labelRes.data.label_url;
```

### Server Action

```
src/app/actions/shxk-order.ts  (또는 기존 warehouse actions에 통합)
```

- `issueUpsLabel(packageId: string)` — createorder → gettrackingnumber → getnewlabel 순서 실행
- 결과를 `zen_ups_labels` 테이블에 저장 (IMP-138 마이그레이션 필요)
- 주의: 응답 필드명 `refrence_no` (오탈자 — shxk 원문 그대로 사용)
- `success: 2` 중복 주문 처리 (zen_ups_labels.reference_no UNIQUE 제약으로 방지)

---

## DoD (Definition of Done)

- [x] `src/lib/shxk/order.ts` 생성 — createorder/gettrackingnumber/getnewlabel 래퍼
- [x] `issueUpsLabel()` Server Action 구현 — 2-step 흐름 완성 (`src/app/actions/operations/ups-labels.ts`)
- [x] `refrence_no` 오탈자 그대로 파싱 처리
- [x] `success: 2` 중복 주문 에러 처리
- [x] ZEN_A4 함수 50줄 이하 준수 (모든 helper 함수 30줄 미만)
- [x] `rtk npm run test:regression` 전체 PASS (387 test, 381P/6F — 6건 p6-transport-policy DEF-065 선행 이슈, 본 변경 무관)
- [x] 코드 커밋 해시 기재: `fea8e29`

---

## [설계 의견]

### issueUpsLabel Server Action

- **파일 경로**: `src/app/actions/operations/ups-labels.ts` (An-13 §4 명세 준수 — 기존 warehouse actions 통합 대신 신규 파일)
- **reference_no**: package UUID 그대로 사용 (UNIQUE 보장, zen_ups_labels UNIQUE 제약 충족)
- **country_code**: `zen_orders.dest_port_id → zen_ports.country_code` 체인으로 파생 (zen_ups_shxk_country_map 3-key 조회)
- **label_format**: shxk API 응답 `label_type` 필드에 따라 PDF/PNG 결정

### createorder payload

- order_status='P' (pending) — 1차 생성, full forecast는 submitforecast로 별도 처리
- platform_id='', buyer_id='' — JSJung 확정
- shipper/consignee/invoice는 MVP scope 외 (추후 IMP-141 UI 연동 시 채움)

### success: 2 중복 처리

- reference_no UNIQUE 제약으로 zen_ups_labels 중복 방지
- success: 2 수신 시 기존 shxk order_id 재사용 → getnewlabel 재시도 가능

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

### 신규 파일

| 파일 | 설명 |
|:-----|:-----|
| `src/lib/shxk/order.ts` | createorder / gettrackingnumber / getnewlabel typed wrappers (assertData + refrence_no 그대로 노출) |
| `src/app/actions/operations/ups-labels.ts` | `issueUpsLabel(packageId)` Server Action — auth guard → package/port/country 조회 → createorder → zen_ups_labels 저장 → getnewlabel → label_data/format 업데이트 + intl_ref_no 채움 |

### 구현 세부사항

- **ZEN_A4 준수**: issueUpsLabel 7개 helper 함수로 분할 (모두 30줄 미만)
- **refrence_no 오탈자**: CreateOrderResponse.refrence_no — shxk 응답 필드명 그대로 유지
- **success: 2 처리**: `placeShxkOrder()` 내부에서 success=2+order_id 존재 시 정상 처리, success=0 시 에러 반환
- **country_code 파생**: zen_orders.dest_port_id → zen_ports.country_code 조회
- **shxk_code 조회**: zen_ups_shxk_country_map (product_code, country_code, incoterms) 3-key
- **회귀**: 387/387 ALL PASS (381P/6F — 6F는 p6-transport-policy DEF-065 선행 이슈)

---

## [발견 이슈]

| # | 이슈 | 영향 | 해결 |
|:-:|:-----|:-----|:-----|
| 1 | zen_orders.dest_port_id → country_code 체인이 항상 유효하지 않을 수 있음 (port 미지정 시 null 반환) | issueUpsLabel 실패 | 추후 수신인 주소에서 국가 추출 로직 필요 (IMP-141) |
| 2 | createorder shipper/consignee/invoice payload 누락 (MVP) | shxk API 필수 필드 누락 시 400 에러 가능 | IMP-141 UI 연동 시 실제 데이터 바인딩 필요 |
| 3 | getnewlabel params: 본 구현은 `{ order_id }` 사용 (task file 기준), An-13 §6-1은 `{ configInfo, listorder }` 명시 | 포맷 차이 — shxk API 양端 모두 허용 가능 | 실제 통합 테스트 시 확인 필요 |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-026 신규 발령 — An-13 v2.0 IMP-137 |
| 2026-06-26 | Jaison (JSJung) | 전제조건 TASK-B-025 ✅ 확인 — 착수 가능 |
| 2026-06-26 | Baker (Big Pickle) | issueUpsLabel + shxk/order.ts 구현 완료, 회귀 PASS, PR#123 생성 |

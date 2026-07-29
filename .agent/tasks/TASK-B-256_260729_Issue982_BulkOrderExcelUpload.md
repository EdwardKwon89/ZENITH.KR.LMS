# TASK-B-256: Issue #982 — 오더 일괄 등록 기능 (엑셀 업로드)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#982](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/982) |
| **배경** | Issue #718(2026.07.22 회의록) "오더관리 — 일괄등록기능 필요(엑셀 업로드)" 요구사항 |
| **담당** | 미배정(설계 확정 후 배정) |
| **생성일** | 2026-07-29 |
| **우선순위** | P2 |
| **상태** | 📝 (설계 의견 — JSJung 확정 대기) |

## 개요

현재 오더 등록은 `/orders/new`(`OrderRegistrationForm.tsx` → `createOrder()`, `src/app/actions/operations/orders.ts`)를 통한 단건 등록만 가능. 엑셀 업로드로 여러 오더를 한 번에 등록하는 기능이 없음. R-11(API 설계 우선 원칙)에 따라 구현 전 설계 확정 필요 — 아래는 Jaison 초안이며, 확정 전까지 구현 착수 금지.

## [설계 의견]

### 1. v1 스코프 — "1행 = 1오더 = 1패키지 = 1아이템"

`orderRegistrationSchema`(`src/lib/validation/order.ts`)는 오더 1건에 패키지 N개, 패키지마다 아이템 N개가 중첩되는 구조라 엑셀 평면 구조와 그대로 맞지 않음. v1은 **1행 = 1오더 = 1패키지 = 1아이템**으로 단순화하고, 다중 패키지/아이템 오더는 등록 후 UI에서 수동으로 패키지/아이템 추가하는 것을 권장(범위 밖 — 후속 IMP로 기록).

기존 `createOrder()`를 그대로 재사용(중복 로직 작성 안 함) — 파싱된 각 행을 `OrderRegistrationInput`으로 매핑해 기존 함수를 호출하는 얇은 래퍼로 구현.

### 2. 대상 역할 및 화주 지정 방식

- **SHIPPER/AGENCY_SHIPPER/CORPORATE/INDIVIDUAL**: 본인 명의로만 등록(`shipper_id`는 서버에서 `profile.org_id`로 강제, 엑셀 컬럼값 무시)
- **ADMIN/MANAGER/AGENCY**: 엑셀의 `shipper_id`(또는 화주명 검색) 컬럼으로 화주 지정 가능. AGENCY는 본인 소속 화주만 지정 가능(서버에서 `zen_agency_shippers` 대조 검증)
- 페이지 자체는 `/orders/new`와 동일하게 `requireAuth()`만 적용, 세부 권한은 서버 액션 내부에서 role 분기

### 3. 엑셀 템플릿 컬럼 (v1)

`orderRegistrationSchema` 기준 필수(*)/선택 필드를 평면화:

| 컬럼 | 필수 | 비고 |
|---|:---:|---|
| order_type | * | B2B/B2C_ECOM/B2C_EXPRESS |
| shipper_id | - | ADMIN/MANAGER/AGENCY만 사용, 화주 본인은 무시됨 |
| transport_mode | * | AIR/SEA/EXP/LAND/UPS |
| ups_product_code, incoterms | UPS 시 필수 | transport_mode=UPS일 때만 |
| recipient_name, recipient_address, recipient_phone | * | |
| recipient_address_local/detail/zipcode/country_code/state_province/city | - | |
| recipient_pccc, recipient_email | - | |
| description, delivery_notes | - | |
| delivery_method | - | DIRECT(기본)/PICKUP |
| pickup_location/contact_name/contact_tel/country_code/state_province/city/address/detail/zipcode | PICKUP 시 필수 | |
| packing_unit, gross_weight | * | 패키지(1개) |
| length, width, height, special_cargo_type, content_type | - | |
| item_name, quantity | * | 아이템(1개) |
| unit_price, currency, hs_code, item_packing_unit | - | |

템플릿 파일은 `xlsx`(SheetJS, 이미 `src/lib/actions/agency-settlement.ts`/`ExportButton.tsx`에서 사용 중인 라이브러리) 재사용 — 신규 의존성 추가 없음.

### 4. API 설계 (신규 파일 `src/app/actions/operations/bulk-orders.ts`)

```ts
export interface BulkOrderRowResult {
  rowIndex: number;   // 엑셀 행 번호(헤더=1행 기준, 첫 데이터 행=2)
  success: boolean;
  orderId?: string;
  orderNo?: string;
  error?: string;
}

export async function bulkCreateOrders(rows: Record<string, unknown>[]): Promise<{ results: BulkOrderRowResult[] }> {
  const { profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');
  if (rows.length > 200) throw new Error('한 번에 최대 200건까지 등록할 수 있습니다.');

  const results: BulkOrderRowResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2;
    try {
      const payload = mapExcelRowToOrderInput(rows[i], profile); // 컬럼→schema 매핑 + role별 shipper_id 처리
      const order = await createOrder(payload); // 기존 단건 로직 그대로 재사용
      results.push({ rowIndex, success: true, orderId: order.id, orderNo: order.order_no });
    } catch (err: any) {
      results.push({ rowIndex, success: false, error: err.message ?? String(err) });
    }
  }
  return { results };
}
```

- 행마다 `createOrder()`를 개별 호출 — 기존 `createOrderViaRpc` RPC가 오더 1건 단위로 원자적이므로 **한 행 실패가 다른 행에 영향 없음**(부분 실패 자연 지원, 별도 트랜잭션 설계 불필요)
- 최대 200행/1회 제한(순차 처리 타임아웃 방지) — 필요 시 조정

### 5. UI 설계

- `/orders` 목록 화면 상단에 "엑셀 일괄등록" 버튼 → 별도 페이지 `/orders/bulk-new` 또는 모달
- 구성: ① 템플릿 다운로드 ② 파일 업로드 ③ 클라이언트 파싱 후 미리보기 테이블(행별로 `orderRegistrationSchema` 사전 검증 결과 표시 — 서버 호출 전 1차 필터) ④ "등록" 클릭 시 `bulkCreateOrders()` 호출 ⑤ 결과 리포트(성공 N/실패 M, 실패 행은 사유 포함 엑셀 재다운로드 가능)

### 6. 범위 밖(후속 IMP로 기록)

- 다중 패키지/다중 아이템 오더의 엑셀 일괄등록(v1은 1오더=1패키지=1아이템)
- 비동기 대량 처리(200행 초과, 백그라운드 잡큐)
- 엑셀 업로드 이력 조회 화면

## 확정 대기 사항 (JSJung 확인 필요)

1. v1 스코프(1행=1오더=1패키지=1아이템) 동의 여부
2. 대상 역할 범위(화주 본인 + ADMIN/MANAGER/AGENCY 대리 등록) 동의 여부
3. UI 위치(`/orders/bulk-new` 별도 페이지 vs `/orders` 모달) 선호

위 3가지 확정되면 🔄로 전환 후 Team B 배정합니다.

## [작업 결과]

_(설계 확정 전 — 미착수)_

## [발견 이슈]

_(없음)_

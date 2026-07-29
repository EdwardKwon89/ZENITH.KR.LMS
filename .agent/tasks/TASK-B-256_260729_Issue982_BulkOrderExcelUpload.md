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

### 1. v1 스코프 — 오더/패키지/아이템 3개 시트 + 순번(seq) 참조 구조 (JSJung 지시 반영, 2026-07-29 수정)

~~기존 초안(1행=1오더=1패키지=1아이템 단순화)은 폐기~~ — JSJung 지시에 따라 `orderRegistrationSchema`의 실제 중첩 구조(오더 1 : 패키지 N : 아이템 N)를 **엑셀 3개 시트 + 임의 순번 컬럼으로 표현**하는 구조로 변경:

- **오더 시트**: 1행 = 1오더. `order_seq`(엑셀 파일 내에서만 유효한 임의 식별자, 예: 1, 2, 3...)를 PK로 가짐
- **패키지 시트**: 1행 = 1패키지. `package_seq`(임의 식별자)를 PK로, `order_seq`로 어느 오더에 속하는지 참조(FK) — 같은 `order_seq`를 가진 행이 여러 개면 그 오더에 패키지가 여러 개라는 뜻
- **아이템 시트**: 1행 = 1아이템. `item_seq`(임의 식별자, 사용자 가독성용 — 기능적으로 참조되진 않음)와 `package_seq`(FK, 어느 패키지에 속하는지 참조)를 가짐 — 같은 `package_seq`를 가진 행이 여러 개면 그 패키지에 아이템이 여러 개라는 뜻

이렇게 하면 다중 패키지/다중 아이템 오더도 v1부터 그대로 지원됨(별도 후속 확장 불필요 — 기존 "범위 밖" 항목에서 제거).

기존 `createOrder()`를 그대로 재사용(중복 로직 작성 안 함) — 3개 시트를 `order_seq`/`package_seq`로 조인해 중첩된 `OrderRegistrationInput`(패키지 배열, 각 패키지에 아이템 배열)으로 조립한 뒤 기존 함수를 호출하는 얇은 래퍼로 구현.

### 2. 대상 역할 및 화주 지정 방식

- **SHIPPER/AGENCY_SHIPPER/CORPORATE/INDIVIDUAL**: 본인 명의로만 등록(`shipper_id`는 서버에서 `profile.org_id`로 강제, 엑셀 컬럼값 무시)
- **ADMIN/MANAGER/AGENCY**: 엑셀의 `shipper_id`(또는 화주명 검색) 컬럼으로 화주 지정 가능. AGENCY는 본인 소속 화주만 지정 가능(서버에서 `zen_agency_shippers` 대조 검증)
- 페이지 자체는 `/orders/new`와 동일하게 `requireAuth()`만 적용, 세부 권한은 서버 액션 내부에서 role 분기

### 3. 엑셀 템플릿 — 3개 시트 컬럼 정의

**시트1. 오더(Order)** — `orderRegistrationSchema`의 오더 레벨 필드:

| 컬럼 | 필수 | 비고 |
|---|:---:|---|
| order_seq | * | 이 파일 내에서만 유효한 임의 식별자(PK) — 패키지 시트가 이 값으로 참조 |
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

**시트2. 패키지(Package)** — `orderPackageSchema` 필드:

| 컬럼 | 필수 | 비고 |
|---|:---:|---|
| package_seq | * | 이 파일 내에서만 유효한 임의 식별자(PK) — 아이템 시트가 이 값으로 참조 |
| order_seq | * | 오더 시트의 `order_seq` 참조(FK) — 오더 시트에 없는 값이면 검증 오류 |
| packing_unit, gross_weight | * | |
| packing_count, physical_box_count | - | 기본값 1 |
| length, width, height | - | |
| special_cargo_type, content_type | - | |
| domestic_ref_no | - | |

**시트3. 아이템(Item)** — `orderItemSchema` 필드:

| 컬럼 | 필수 | 비고 |
|---|:---:|---|
| item_seq | - | 이 파일 내에서만 유효한 임의 식별자(가독성용 — 다른 시트가 참조하지는 않음) |
| package_seq | * | 패키지 시트의 `package_seq` 참조(FK) — 패키지 시트에 없는 값이면 검증 오류 |
| item_name, quantity | * | |
| unit_price, currency, hs_code, item_packing_unit, sku_code | - | |

**조립 규칙**: 오더 시트 각 행마다 → 같은 `order_seq`를 가진 패키지 시트 행들을 패키지 배열로 묶고 → 각 패키지 행마다 같은 `package_seq`를 가진 아이템 시트 행들을 아이템 배열로 묶어 `OrderRegistrationInput`을 조립. 오더는 패키지 1개 이상, 패키지는 아이템 1개 이상 필수(스키마 `min(1)` 제약과 동일) — 미충족 시 해당 `order_seq` 전체를 실패 처리.

템플릿 파일은 `xlsx`(SheetJS, 이미 `src/lib/actions/agency-settlement.ts`/`ExportButton.tsx`에서 사용 중인 라이브러리) 재사용 — 신규 의존성 추가 없음. 3개 시트 모두 포함한 워크북 1개로 배포.

### 4. API 설계 (신규 파일 `src/app/actions/operations/bulk-orders.ts`)

```ts
export interface BulkOrderResult {
  orderSeq: string | number;  // 오더 시트의 order_seq(엑셀 내 임의 식별자) — 실행 결과를 오더 단위로 리포트
  success: boolean;
  orderId?: string;
  orderNo?: string;
  error?: string;
}

interface BulkOrderSheets {
  orders: Record<string, unknown>[];
  packages: Record<string, unknown>[];
  items: Record<string, unknown>[];
}

export async function bulkCreateOrders(sheets: BulkOrderSheets): Promise<{ results: BulkOrderResult[] }> {
  const { profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');
  if (sheets.orders.length > 200) throw new Error('한 번에 최대 200건까지 등록할 수 있습니다.');

  const results: BulkOrderResult[] = [];
  for (const orderRow of sheets.orders) {
    const orderSeq = orderRow.order_seq as string | number;
    try {
      // order_seq로 패키지 그룹핑, 각 패키지의 package_seq로 아이템 그룹핑
      const packageRows = sheets.packages.filter(p => p.order_seq === orderSeq);
      if (packageRows.length === 0) throw new Error(`order_seq=${orderSeq}에 연결된 패키지가 없습니다.`);

      const packages = packageRows.map(pkgRow => {
        const packageSeq = pkgRow.package_seq;
        const itemRows = sheets.items.filter(it => it.package_seq === packageSeq);
        if (itemRows.length === 0) throw new Error(`package_seq=${packageSeq}에 연결된 아이템이 없습니다.`);
        return mapExcelRowToPackageInput(pkgRow, itemRows); // orderPackageSchema 형태로 조립(items 배열 포함)
      });

      const payload = mapExcelRowToOrderInput(orderRow, packages, profile); // 컬럼→schema 매핑 + role별 shipper_id 처리
      const order = await createOrder(payload); // 기존 단건 로직 그대로 재사용(중첩 구조 그대로 통과)
      results.push({ orderSeq, success: true, orderId: order.id, orderNo: order.order_no });
    } catch (err: any) {
      results.push({ orderSeq, success: false, error: err.message ?? String(err) });
    }
  }
  return { results };
}
```

- 오더(=`order_seq`)마다 `createOrder()`를 개별 호출 — 기존 `createOrderViaRpc` RPC가 오더 1건 단위로 원자적이므로 **한 오더 실패가 다른 오더에 영향 없음**(부분 실패 자연 지원, 별도 트랜잭션 설계 불필요)
- 최대 200오더/1회 제한(순차 처리 타임아웃 방지) — 필요 시 조정
- 참조 무결성 오류(패키지 시트에 있는데 오더 시트에 없는 `order_seq`, 아이템 시트에 있는데 패키지 시트에 없는 `package_seq`)는 업로드 즉시 클라이언트 사전검증 단계에서 잡아 서버 호출 전에 사용자에게 보여줌(§5 참조)

### 5. UI 설계

- `/orders` 목록 화면 상단에 "엑셀 일괄등록" 버튼 → 별도 페이지 `/orders/bulk-new` 또는 모달
- 구성: ① 템플릿(3개 시트 워크북) 다운로드 ② 파일 업로드 ③ 클라이언트에서 3개 시트 파싱 → `order_seq`/`package_seq` 조인 → 미리보기 테이블(오더 단위로 묶어서 표시, 참조 무결성 오류·`orderRegistrationSchema` 검증 오류를 오더별로 표시 — 서버 호출 전 1차 필터) ④ "등록" 클릭 시 `bulkCreateOrders()` 호출 ⑤ 결과 리포트(성공 N오더/실패 M오더, 실패 건은 사유 포함 엑셀 재다운로드 가능)

### 6. 범위 밖(후속 IMP로 기록)

- 비동기 대량 처리(200오더 초과, 백그라운드 잡큐)
- 엑셀 업로드 이력 조회 화면

## 확정 대기 사항 (JSJung 확인 필요)

1. ~~v1 스코프~~ → **확정**: 오더/패키지/아이템 3개 시트 + seq 참조 구조로 진행(2026-07-29 JSJung 지시 반영)
2. 대상 역할 범위(화주 본인 + ADMIN/MANAGER/AGENCY 대리 등록) 동의 여부
3. UI 위치(`/orders/bulk-new` 별도 페이지 vs `/orders` 모달) 선호

2·3번 확정되면 🔄로 전환 후 Team B 배정합니다.

## [작업 결과]

_(설계 확정 전 — 미착수)_

## [발견 이슈]

_(없음)_

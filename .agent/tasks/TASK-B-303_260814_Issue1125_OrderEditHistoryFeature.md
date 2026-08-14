# TASK-B-303 — 오더 등록/수정 이력 관리 기능 신설 (zen_order_edit_log 확장)

| 항목 | 내용 |
|:-----|:------|
| **생성일** | 2026-08-14 |
| **담당** | Baker (구현) · Jaison (검토) |
| **우선순위** | P2 |
| **GitHub Issue** | [#1125](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1125) |
| **관련 결함** | 없음(JSJung 신규 기능 요청) |
| **상태** | 🔄 착수 |

## 배경

JSJung 요청: "오더 등록 및 수정 이력을 관리했으면 해." Jaison 사전 조사 결과, 현재 오더에 대한 진짜 "무엇이 바뀌었는지" 이력 기능이 전혀 없음을 확인(상세: 사전 분석 보고 참조). 설계 방향 3가지 확정(JSJung 답변):
1. **테이블**: 기존 `zen_order_edit_log` **확장**(신규 테이블 아님)
2. **기록 범위**: **핵심 필드만**(패키지/아이템 전체 diff 아님)
3. **표시 위치**: **UPS 오더 상세 화면(`ups-detail`)만**

**Jaison 판단(명시적 결정 — 확인 필요 시 재조정 가능)**: "UPS만"은 화면 표시 위치에 대한 답변으로 해석. **기록(저장) 자체는 AIR/SEA/UPS 등 전체 오더에 대해 동일하게 수행**하고(어차피 `createOrder`/`updateOrder`가 모든 운송수단 공용 함수라 분리 비용이 오히려 더 큼, 저장 자체는 저렴함), **화면 노출만 UPS 상세 페이지로 한정**. 추후 일반 오더 상세 화면에도 노출하고 싶어지면 백엔드 재작업 없이 UI만 추가하면 됨.

## 조사 결과 — 현재 상태

| 장치 | 기록 내용 | 한계 |
|---|---|---|
| `order_status_history` | 상태 전이만 | 필드 값 변경 기록 없음 |
| `zen_order_edit_log` | `order_id`/`edited_by`/`edited_at`/`order_status_at_edit` 4개 컬럼뿐 | **WAREHOUSED+UPS 부분수정일 때만**(`getOrderEditScope().auditEdit`) 기록 — 가장 흔한 REGISTERED/SCHEDULED 자유수정 구간은 전혀 기록 안 됨. 무엇이 바뀌었는지 정보 없음 |
| `zen_orders.updated_at` | 마지막 수정 시각만 | 이전 값 소실 |

**재사용 가능한 기존 패턴 발견**: `rate_card_logs` 테이블 + `getPricingAuditLog()` 액션 + `ZoneDiscountForm.tsx`의 "변경 이력" 패널이 이미 완전하게 작동 중 — `action`(CREATE/UPDATE/CANCEL/APPLY) + `old_data`/`new_data`(JSONB, **핵심 필드만 담은 부분 스냅샷** — 전체 row 아님, `pricing-schedule.ts:241-242` 확인) + `changed_at`. 이 구조를 그대로 이식.

## 작업 범위

### ① DB 마이그레이션 — `zen_order_edit_log` 확장

```sql
ALTER TABLE public.zen_order_edit_log
  ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'UPDATE',
  ADD COLUMN IF NOT EXISTS old_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB;

-- 기존 행(과거 WAREHOUSED+UPS 부분수정 기록)은 전부 UPDATE로 백필된 뒤, 이후 신규 insert는 action 명시 강제
ALTER TABLE public.zen_order_edit_log ALTER COLUMN action DROP DEFAULT;
```
RLS(`Allow authenticated insert/read for edit log`)는 기존 정책 그대로 재사용 — 컬럼 추가만이라 정책 변경 불필요.

### ② 핵심 필드 화이트리스트 확정

`src/app/actions/operations/orders.ts` 상단 또는 신설 `src/lib/orders/edit-log-fields.ts`에 상수로 선언(재사용):

```ts
export const ORDER_EDIT_LOG_CORE_FIELDS = [
  // 화주
  'shipper_id', 'shipper_name', 'shipper_contact_name', 'shipper_contact_phone', 'shipper_contact_email',
  'shipper_address', 'shipper_address_detail', 'shipper_country_code', 'shipper_state_province', 'shipper_city', 'shipper_zipcode', 'shipper_biz_no',
  // 수하인
  'recipient_name', 'recipient_phone', 'recipient_email', 'recipient_address', 'recipient_address_detail',
  'recipient_country_code', 'recipient_state_province', 'recipient_city', 'recipient_zipcode', 'recipient_pccc',
  // 배송
  'transport_mode', 'delivery_method', 'incoterms', 'ups_product_code', 'ups_service_family',
  'pickup_location', 'pickup_contact_name', 'pickup_contact_tel', 'pickup_address',
  // 기타
  'description', 'delivery_notes',
] as const;
```

**명시적 제외 항목**(과설계 방지):
- `packages`/`items`(패키지·품목 배열) — 별도 관심사, 이번 범위 밖. 창고 실측/포장 흐름에서 이미 자체 변경 이력 성격의 흐름을 갖고 있음.
- `estimated_cost` — 사용자가 직접 수정하는 값이 아니라 요율 재계산 시 **자동으로** 바뀌는 파생값. 포함하면 사용자가 아무것도 안 바꿔도 재계산될 때마다 로그가 쌓여 이력이 오염됨 — 반드시 제외.
- `origin_port_id`/`dest_port_id` — 이번 1차 범위에서는 제외(핵심 필드 최소 셋 우선, 필요시 후속 추가 가능).

### ③ 기록 로직 — `orders.ts::createOrder()` (CREATE 이벤트)

`orderId` 확보 직후(L105-106 이후, 다른 후속 로직 이전 또는 이후 아무 위치나 — 트랜잭션 성격 아니므로 순서 무관):
```ts
const newDataSnapshot = Object.fromEntries(
  ORDER_EDIT_LOG_CORE_FIELDS.map((f) => [f, (validated as any)[f] ?? null])
);
await supabase.from('zen_order_edit_log').insert({
  order_id: orderId,
  edited_by: profile.id,
  edited_at: new Date().toISOString(),
  order_status_at_edit: 'REGISTERED',
  action: 'CREATE',
  old_data: null,
  new_data: newDataSnapshot,
});
```

### ④ 기록 로직 — `orders.ts::updateOrder()` (UPDATE 이벤트)

**현재**: L298-306의 `if (editScope.auditEdit) { ... }` 블록이 WAREHOUSED+UPS 부분수정일 때만 실행되며 old_data/new_data 없이 3개 필드만 기록.

**변경**: 이 조건문을 제거하고 **모든 수정에서 항상** 기록하되, old_data/new_data를 채운다. `order`(L164에서 `orderRepo.findById` — `select('*')`라 전체 구컬럼 보유)가 수정 전 값, `headerData`(L177-221에서 조립된 신규 값)가 수정 후 값이므로:

```ts
const oldDataSnapshot = Object.fromEntries(
  ORDER_EDIT_LOG_CORE_FIELDS.map((f) => [f, (order as any)[f] ?? null])
);
const newDataSnapshot = Object.fromEntries(
  ORDER_EDIT_LOG_CORE_FIELDS.map((f) => [f, (headerData as any)[f] ?? null])
);
// 변경사항이 실제로 있을 때만 기록 (동일 값 재제출 시 로그 오염 방지)
const hasChanges = ORDER_EDIT_LOG_CORE_FIELDS.some(
  (f) => JSON.stringify(oldDataSnapshot[f]) !== JSON.stringify(newDataSnapshot[f])
);
if (hasChanges) {
  await supabase.from('zen_order_edit_log').insert({
    order_id: orderId,
    edited_by: profile.id,
    edited_at: new Date().toISOString(),
    order_status_at_edit: order.status,
    action: 'UPDATE',
    old_data: oldDataSnapshot,
    new_data: newDataSnapshot,
  });
}
```
`orderRepo.updateHeader(orderId, headerData)` 호출 **전에** old snapshot을 떠 두어야 함(호출 후에는 DB가 이미 새 값으로 바뀌어 `order` 변수 자체는 여전히 구 값을 들고 있으니 실제로는 순서 무관하지만, 명확성을 위해 `updateHeader` 호출 앞에 old/new snapshot 계산 코드를 배치 권장).

`hasChanges` 가드는 필수 — 없으면 값 변경 없이 그냥 저장 버튼만 눌러도 로그가 쌓여 이력의 신호 대 잡음비가 나빠짐.

### ⑤ 조회 액션 신설

`src/app/actions/operations/orders.ts`에 신규 함수(기존 `attachOperatorNames` 헬퍼 재사용):
```ts
export async function getOrderEditHistory(orderId: string) {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_order_edit_log')
    .select('id, action, old_data, new_data, order_status_at_edit, edited_by, edited_at')
    .eq('order_id', orderId)
    .order('edited_at', { ascending: false });
  if (error) throw new Error(error.message);
  return attachOperatorNames(supabase, (data ?? []).map((r) => ({ ...r, changed_by: r.edited_by })));
}
```
`attachOperatorNames`가 `changed_by` 필드명을 기대하므로 위처럼 매핑해서 전달(또는 헬퍼 시그니처를 범용화 — Baker 판단).

### ⑥ UI — `ups-detail/page.tsx`에 "등록/수정 이력" 패널 추가

`ZoneDiscountForm.tsx`의 기존 "변경 이력" 패널(L203-211 부근) 스타일을 그대로 참고해 신규 컴포넌트(예: `src/components/ups/UpsOrderEditHistoryPanel.tsx`) 작성:
- `getOrderEditHistory(orderId)` 결과를 받아 시간 역순으로 리스트
- 각 행: `action` 뱃지(CREATE=초록/UPDATE=파랑, `ZoneDiscountForm` 색상 컨벤션과 동일) + 담당자명(`operator.full_name`) + `edited_at`(`toLocaleString('ko-KR')`) + 변경된 필드만 선별해 "필드명: 이전값 → 이후값" 표시(전체 24개 필드를 다 나열하지 않고, `old_data`와 `new_data`를 비교해 **실제로 다른 필드만** 표시 — CREATE는 old_data가 null이므로 new_data 전체를 "등록값"으로 표시)
- `ups-detail/page.tsx`에서 `getOrderEditHistory(orderId)` 호출 후 패널에 전달(다른 카드들과 동일한 서버 컴포넌트 데이터 페칭 패턴)
- 일반 오더 상세 화면(`orders/[orderId]/page.tsx`)은 **이번 범위에서 건드리지 않음**(추후 요청 시 별도 작업)

과설계 금지 — 필드명 한글 라벨 매핑(i18n)은 최소 커버리지로(신규 배열 상수 하나로 field key → 한글 라벨 매핑, 새 i18n 네임스페이스 만들지 않음). 페이지네이션/필터링 등 부가 기능은 범위 밖(오더 하나당 이력 건수가 많지 않을 것으로 예상 — 필요해지면 후속 작업).

## 회귀 테스트 방향

- CREATE: 오더 생성 시 `zen_order_edit_log`에 `action='CREATE'`, `old_data=null`, `new_data`에 핵심 필드 값이 정확히 채워지는지
- UPDATE(변경 있음): 핵심 필드 중 하나(예: `recipient_phone`)만 바꿔서 수정 시 `old_data`/`new_data`에 정확한 전/후 값이 기록되는지
- UPDATE(변경 없음): 아무것도 안 바꾸고 재저장 시 **로그가 추가되지 않는지**(`hasChanges` 가드 검증 — 이번 결함의 핵심 회귀 포인트)
- `estimated_cost`/`packages`/`items` 변경은 로그에 영향 없는지(화이트리스트 제외 검증)
- WAREHOUSED+UPS 부분수정 케이스도 여전히(기존 TASK-B-284 로직과 함께) 정상 기록되는지 — 기존 3개 컬럼(`edited_by`/`edited_at`/`order_status_at_edit`) 채우던 로직이 회귀 없이 유지되는지
- UI: `ups-detail` 페이지에 이력 패널이 시간 역순으로 표시되고, 변경된 필드만 diff로 보이는지 / 일반 오더 상세 화면에는 패널이 없는지(범위 확인)
- 전체 회귀 PASS + `LIVE_REGRESSION_TEST_MAP.md` 갱신(R-09)
- **독립 되돌리기 검증 필수**

## R-10 (실 UI 검증)

- 신규 UPS 오더 등록 → 상세 화면에서 "CREATE" 이력 1건 확인
- 해당 오더 수정(예: 수하인 전화번호 변경) → 이력에 "UPDATE" 항목 추가 + 변경된 필드만 diff로 표시되는지 확인
- 변경 없이 재저장 → 이력 건수 그대로인지 확인
- 일반 오더 상세 화면에는 이력 패널이 없는지 확인(범위 밖 회귀 방지)

## [작업 결과]

**완료일:** 2026-08-14 (Baker) — Issue #1125 해결

### 구현
1. **마이그레이션** `supabase/migrations/20260814010000_iss1125_order_edit_log_action.sql`
   - `zen_order_edit_log` 확장: `action VARCHAR(20) NOT NULL DEFAULT 'UPDATE'`(기존 행 백필 후 DEFAULT 제거) + `old_data`/`new_data` JSONB + COMMENT 3건. 로컬 DB(docker) 적용 완료.
2. **화이트리스트** `src/lib/orders/edit-log-fields.ts` (신규)
   - `ORDER_EDIT_LOG_CORE_FIELDS`(32필드) + `ORDER_EDIT_LOG_FIELD_LABELS`(한글 라벨) + `extractOrderEditLogSnapshot()`
   - `estimated_cost`/`packages`/`items`/`origin_port_id`/`dest_port_id`는 **명시 제외** — 요율 재계산·포장 흐름에 의한 로그 오염 방지.
3. **기록 로직** `src/app/actions/operations/orders.ts`
   - `createOrder`: 등록 시 `action='CREATE'`, `old_data=null`, `new_data=스냅샷`, `order_status_at_edit='REGISTERED'` 기록.
   - `updateOrder`: `hasChanges` 가드(JSON.stringify 화이트리스트 비교) → 변경 있을 때만 UPDATE 기록. 기존 WAREHOUSED+UPS 한정 `auditEdit` 블록은 전체 오더 기록으로 일반화(기존 TASK-B-284 동작 유지).
   - `getOrderEditHistory(orderId)` 신설 — edited_at desc + 편집자명 attach.
4. **UI 패널** `src/components/ups/UpsOrderEditHistoryPanel.tsx` (신규) + `ups-detail/page.tsx` 연동
   - CREATE: new_data 전체 검정 표시 / UPDATE: 변경 필드만 `old(취소선)→new(굵게)` diff. 편집자(`?? '시스템'`), 시각 `toLocaleString('ko-KR')`. 이력 0건 시 패널 미렌더. **UPS 오더 상세 한정**(일반 오더 회귀 방지).

### 검증
- **단위 테스트** `tests/unit/orders/order-edit-log-b303.test.tsx` 7건 PASS(TC-B303-01~07)
- **통합 테스트(실 DB)** `tests/integration/iss1125-order-edit-log.test.ts` 5건 PASS(TC-B303-08~12) — createOrder 실DB CASE(TC-B303-12) 포함
- **독립 되돌리기 검증** 4종(hasChanges 가드 제거/CREATE insert 제거/estimated_cost 포함/UPDATE 블록 제거) 각각 정확히 FAIL 재현 후 원복, 5/5 PASS 복귀 확인
- **전체 회귀** 198 files / **1364/1364 PASS** (3회차) + `npm run build` SUCCESS + tsc --noEmit src 에러 0건
- **R-10 실UI** `scratch/task-b-303-r10.spec.ts` 4/4 PASS — ①CREATE 이력 1건+등록값 표시 ②연락처 변경→UPDATE diff ③무변경 재저장→건수 유지 ④일반 오더 패널 없음 (스크린샷 `scratch/task-b-303-r10/`)
- **회귀 맵** `LIVE_REGRESSION_TEST_MAP.md` 9번 섹션에 TC-B303-01~12 등재 완료

### 산출물
- `supabase/migrations/20260814010000_iss1125_order_edit_log_action.sql`
- `src/lib/orders/edit-log-fields.ts`, `src/components/ups/UpsOrderEditHistoryPanel.tsx`
- `src/app/actions/operations/orders.ts`(createOrder/updateOrder/getOrderEditHistory), `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`
- `tests/unit/orders/order-edit-log-b303.test.tsx`, `tests/integration/iss1125-order-edit-log.test.ts`
- 기존 mock 갱신: `ups-detail-b300.test.tsx`·`b301.test.tsx`(getOrderEditHistory), `delivery-method.test.ts`(insert)

## [Jaison 최종 검토]

_(PR 제출 후 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

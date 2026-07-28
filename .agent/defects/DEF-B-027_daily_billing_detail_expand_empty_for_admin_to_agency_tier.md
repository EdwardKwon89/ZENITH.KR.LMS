# DEF-B-027: 화주별 일별 청구 "상세" 펼침이 ADMIN_TO_AGENCY 티어에서 항상 빈 목록

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `/finance/daily-billing`을 Jaison이 직접 재현·근본원인 확인 |
| **긴급도** | High |
| **영향 범위** | `src/app/actions/finance/daily-billing.ts`(`getShipperDailyOrdersDetails()`), `src/components/finance/ShipperDailyBillingClient.tsx` |

## 현상 (실측 재현)

`/finance/daily-billing`(ADMIN 계정)에서 "Zenith Agency Partners" 그룹(7건, ADMIN_TO_AGENCY 티어 인보이스)의 "상세"를 펼치면 "소속 개별 오더 목록 (7건)" 제목만 뜨고 **표 본문이 완전히 비어있음**(Playwright로 직접 재현·캡처 확인).

## 근본 원인

`getShipperDailyBillingSummary()`(`daily-billing.ts:203`)가 집계 그룹 키를 `shipperId: inv.billed_org_id`로 설정하는데, **`ADMIN_TO_AGENCY` 티어 인보이스의 `billed_org_id`는 실제 화주가 아니라 대리점 자신의 org_id**입니다(화면에 "조직명"이 화주명이 아니라 대리점명 "Zenith Agency Partners"로 뜨는 게 그 증거).

그런데 "상세" 클릭 시 호출되는 `getShipperDailyOrdersDetails(shipperId, ...)`(같은 파일 262행)는 무조건 `zen_orders.shipper_id = shipperId`로 오더를 조회합니다 — `zen_orders.shipper_id`에는 대리점 org_id가 절대 들어가지 않으므로(오더의 화주는 항상 실제 화주 조직), **ADMIN_TO_AGENCY 티어 그룹은 상세 조회 시 항상 0건**입니다. AGENCY role이 자기 "매입" 항목(동일 티어)을 펼칠 때도 같은 함수 275~284행의 `zen_agency_shippers` 소속 검사에서 자기 자신이 그 목록에 없어 조기 차단되어 동일 증상이 발생합니다.

**부수 발견 — 별개의 버그**: `group.orderIds.push(inv.id)`(227행)가 실제로는 **인보이스 id를 넣고 있음**(변수명은 `orderIds`인데 값은 invoice id) — 이 필드는 어디서도 읽히지 않는 죽은 코드이자 이름과 내용이 불일치하는 버그.

**AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER 티어**는 `billed_org_id`가 실제 화주 org_id라 상세 조회가 정상 동작합니다 — 이 버그는 **ADMIN_TO_AGENCY 티어에만** 해당.

## 권장 조치

`getShipperDailyOrdersDetails()`를 "화주 org_id로 오더를 역추적"하는 방식 대신, **이미 정확한 `group.invoiceIds`로 인보이스를 먼저 조회 → 각 인보이스의 `metadata.source_order_id`(모든 티어 인보이스에 공통으로 저장되는 필드, `invoice-generator.ts:93-95`/`144` 확인 완료)로 실제 오더를 역추적**하는 방식으로 재설계 — 티어별 `shipperId` 의미 차이 자체를 우회하는 근본적 해결.

인가 재검증은 추가 구현 불필요 — `zen_invoices`의 기존 RLS 정책(Admin 전체, Agency는 `billed_org_id=본인` 또는 `zen_agency_shippers`로 연결된 화주, Shipper는 본인)이 이미 `supabase`(RLS 적용 클라이언트, service role 아님)를 통해 자동으로 걸러주므로 클라이언트가 임의의 invoiceIds를 보내도 안전함(직접 확인 완료).

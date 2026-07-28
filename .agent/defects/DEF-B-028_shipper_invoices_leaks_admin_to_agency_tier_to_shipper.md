# DEF-B-028: 청구서 조회 화면이 화주에게 대리점의 ADMIN_TO_AGENCY(원가) 인보이스까지 노출

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | PR#959(TASK-B-247, `/shipper/invoices` role 차단 수정) R-10 스크린샷을 Jaison이 직접 확인하던 중 발견 |
| **긴급도** | High |
| **영향 범위** | `src/app/actions/finance/shipper-invoices.ts`(`getShipperInvoices()`) |

## 현상 (실측 확인)

`jungjs72@gmail.com`(CORPORATE, 대리점 Zenith Agency Partners 소속 화주)으로 `/shipper/invoices`에 접속한 스크린샷(`docs/99_Manual/E2E_28_Result/01_shipper_invoices.png`)에서, 본인에게 청구된 인보이스(AGENCY_TO_SHIPPER)뿐 아니라 **본인 소속 대리점이 관리자(Admin)에게 지불하는 원가성 인보이스(ADMIN_TO_AGENCY, 예: `INV-20260728-6441` ₩263,070)까지 함께 노출**됨을 확인.

## 근본 원인

`getShipperInvoices()`의 화주 계열 role 분기가 `query.eq('shipper_id', profile.org_id)`로 필터링하는데, `zen_invoices.shipper_id`는 **인보이스 티어와 무관하게 항상 원본 화주의 org_id로 동일하게 저장**됩니다(`src/lib/finance/settlement/invoice-generator.ts` 확인 — ADMIN_TO_AGENCY 인보이스도 `shipper_id: shipperIdStr`로 동일). 실제로 "누구에게 청구되는가"를 나타내는 컬럼은 `billed_org_id`인데(ADMIN_TO_AGENCY는 `billed_org_id`=대리점 org_id, AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER는 `billed_org_id`=화주 org_id), 현재 쿼리는 `shipper_id` 기준으로 필터링해 티어 구분 없이 다 걸러져 버림.

이로 인해 화주가 자기 소속 대리점이 관리자로부터 받는 원가(마진 구조)를 볼 수 있게 되어, 대리점의 민감한 가격 정보가 화주에게 노출되는 비즈니스 리스크가 있음.

**참고(범위 밖)**: `zen_invoices`의 RLS 정책("Shippers can view their own invoices")도 동일하게 `shipper_id` 기준이라 근본적으로는 더 넓게 허용하고 있음 — 이번 Task는 이 페이지의 애플리케이션 쿼리 필터만 좁혀서 실제 노출을 막는 것이 목표이며, RLS 정책 자체의 재설계는 다른 곳에서의 영향 범위가 더 넓어 별도 검토 필요(이번 범위 아님).

## 권장 조치

`getShipperInvoices()`의 화주 계열 role 필터를 `shipper_id` 대신 **`billed_org_id`** 기준으로 변경 — 자기 자신에게 실제로 청구된 인보이스만 보이도록.

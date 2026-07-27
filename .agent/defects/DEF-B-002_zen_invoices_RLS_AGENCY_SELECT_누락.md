# DEF-B-002: zen_invoices RLS에 AGENCY SELECT 정책 없음 — 화주용 청구서 조회 화면에서 AGENCY 항상 빈 목록

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — PR#840(TASK-B-205) 검토 중 발견 |
| **긴급도** | High |
| **우선순위** | P2 |

## 현상

AGENCY 세션으로 청구서 조회 시 실제 관리 화주의 청구서가 존재함에도 항상 빈 목록만 반환됨.

## 근본 원인

`zen_invoices` 테이블의 RLS 정책이 SELECT 기준 아래 2개뿐:
```sql
"Admins can manage all invoices" (ALL) — ADMIN/ZENITH_SUPER_ADMIN만
"Shippers can view their own invoices" (SELECT) — shipper_id 매칭 + ADMIN
```
**AGENCY 역할용 정책이 존재하지 않음.**

DEF-114(`zen_orders`)·DEF-116(`checkLabelPermission`)·DEF-117(`zen_order_packages`/`zen_ups_labels`)·DEF-120(`zen_tracking_configs`)에 이은 **동일 패턴의 5번째 재발**(is_org_member/agency_org_id 미고려).

## 실측 확인

- `agency@zenith.kr`(agency_org_id `48bfa40d-5314-4a9d-9c61-ded32ad0251a`) 실 JWT로 `GET /rest/v1/zen_invoices` 직접 호출 → `[]` 빈 배열
- service role로 확인 시 이 agency가 관리하는 화주(`shipper_org_id: 7e4068a7-...`, `zen_agency_shippers.is_active=true`)의 실제 청구서 2건(`INV-20260722-9595`, `INV-20260722-5974`) 존재 확인
- 앱 코드(`getShipperInvoices()`, TASK-B-205)는 AGENCY의 소속 화주 목록을 정확히 계산해 필터링하지만, RLS가 그 이전 단계에서 전부 차단

## 영향 범위

- `/shipper/invoices` 화면(TASK-B-205)에서 AGENCY 역할은 항상 빈 목록만 보임
- `getShipperInvoices()`(`src/app/actions/finance/shipper-invoices.ts`)

## 조치안

기존 5회 검증된 패턴 그대로 적용:
```sql
CREATE POLICY "Agency can view shipper invoices"
ON public.zen_invoices FOR SELECT
TO authenticated
USING (
  shipper_id IN (
    SELECT shipper_org_id FROM public.zen_agency_shippers
    WHERE agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      AND is_active = true
  )
);
```
CI fresh reset 대응 GRANT도 함께 확인(IMP-153 참고).

## 관련 파일
- `src/app/actions/finance/shipper-invoices.ts` (`getShipperInvoices()`)
- 참고: DEF-114/116/117/120(동일 패턴 선례)

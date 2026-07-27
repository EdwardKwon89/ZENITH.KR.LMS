# DEF-B-017: `/admin/ups-actual-charges` 페이지 네비게이션 진입점 누락

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | jungjs (Jaison) — 부가요금 신규 등록 기능 존재 여부 확인 중 지적 |
| **긴급도** | Medium |
| **우선순위** | P2 |

## 현상

`/admin/ups-actual-charges`("UPS 사후 청구 및 차액 정산 관리") 페이지는 실제로 존재하고 서버 액션(`recordUpsActualCharges()`)도 정상 동작하며, `page.tsx`의 역할 가드도 ZENITH_SUPER_ADMIN/ADMIN/MANAGER/AGENCY를 모두 허용하도록 구현되어 있음(TASK-B-204/PR#835로 IN_TRANSIT까지 확장 완료). 그러나 **이 페이지로 이동하는 메뉴 링크가 어디에도 없어**, URL을 직접 입력하지 않는 한 정상적인 방법으로는 접근할 수 없음.

## 원인 (확인 완료)

- `src/components/layout/NaviSidebar.tsx` 전체에 `ups-actual-charges` 관련 항목이 없음(grep 확인)
- `src/app/[locale]/(dashboard)/agency/AgencyQuickLinks.tsx`(AGENCY용 퀵링크)에도 없음
- 참고로 오더 단위 실제 청구 조정(`UpsActualAdjustmentForm` 컴포넌트)은 오더 상세 페이지(`/orders/[orderId]`, `/orders/[orderId]/ups-detail`)에 내장되어 있어 "오더 목록 → 오더 클릭"으로 정상 진입 가능 — 이건 문제 없음. **문제는 오더 단위가 아닌 관리자용 일괄 조회/등록 페이지(`/admin/ups-actual-charges`) 쪽임.**

## 조치안 (Jaison 확정 설계, 2026-07-27)

### 추가 발견: 나비게이션 노출 여부는 `NaviSidebar.tsx` 배열 편집만으로 해결되지 않음

`NaviSidebar.tsx`의 메뉴 항목 노출은 `checkPermission(profile.role, href, allowedPaths)` 결과에 좌우되며, `allowedPaths`는 **DB 테이블 `zen_role_permissions`가 우선**(비어있을 때만 `STATIC_PERMISSIONS` 폴백 — `src/lib/auth/rbac.ts` `getPermissionsByRole()`). 실측 확인 결과:

- `ADMIN`: DB에 `/admin`(블랭킷 prefix) 행이 이미 있어 **추가 조치 없이 노출됨**
- `MANAGER`: DB 행에 `/admin`류 경로가 전혀 없음(`billing/finance/inventory/logistics/mypage/orders/reports/settlement/support/tracking/voc`만 존재) → **DB 권한 행 추가 필요**
- `AGENCY`: DB 행이 `/orders, /agency, /tracking, /settlement, /voc, /mypage, /warehouse`뿐 → **DB 권한 행 추가 필요**

즉 `page.tsx`의 자체 역할 가드(ADMIN/MANAGER/AGENCY 허용)와 실제 RBAC DB 권한 테이블이 이미 어긋나 있었음(MANAGER·AGENCY는 지금도 URL 직접 입력으로는 접근되지만 — page.tsx 가드만 통과하면 되므로 — 메뉴에 노출은 안 됨). 이번 수정은 메뉴 노출뿐 아니라 이 불일치 자체를 해소.

### 조치 1: `zen_role_permissions`에 권한 행 추가 (마이그레이션)
```sql
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
  ('MANAGER', 'ups_actual_charges', '/admin/ups-actual-charges', true),
  ('AGENCY', 'ups_actual_charges', '/admin/ups-actual-charges', true)
ON CONFLICT (role_code, path) DO NOTHING;
```
(ADMIN은 기존 `/admin` 블랭킷 행으로 이미 커버되어 추가 불요)

### 조치 2: `NaviSidebar.tsx` — `finance_group.children` 배열에 항목 추가
`src/components/layout/NaviSidebar.tsx`의 `finance_group` 하위(기존 `finance_transport_costs` 행 근처)에:
```ts
{ title: t("finance_ups_actual_charges"), href: "/admin/ups-actual-charges" },
```

### 조치 3: i18n 키 추가 (`messages/ko.json`, `en.json`, `ja.json` — `Navigation` 섹션, `finance_transport_costs` 키 근처)
- ko: `"finance_ups_actual_charges": "UPS 사후 청구 관리"`
- en: `"finance_ups_actual_charges": "UPS Actual Charges"`
- ja: `"finance_ups_actual_charges": "UPS事後請求管理"`
(`zh.json`은 `finance_*` 계열 키 자체가 기존에 없는 상태라 이번 Task 범위 밖 — 손대지 않음)

## 관련 파일
- `supabase/migrations/` 신규 (zen_role_permissions INSERT)
- `src/components/layout/NaviSidebar.tsx`
- `messages/ko.json`, `messages/en.json`, `messages/ja.json`
- `src/app/[locale]/(dashboard)/admin/ups-actual-charges/page.tsx` (대상 페이지, 수정 불필요)

## 관련 Task
- `TASK-B-223` (배정 완료)

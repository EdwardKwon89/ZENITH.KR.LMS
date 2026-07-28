# DEF-B-026: 청구서 조회 화면(`/shipper/invoices`)이 실제 화주 role 대부분을 차단하고 메뉴에도 없음

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 "청구서를 조회할 수 있는 기능" 구조를 Jaison이 분석하던 중 발견 |
| **긴급도** | High |
| **영향 범위** | `src/app/actions/finance/shipper-invoices.ts`(`getShipperInvoices()`), `src/app/[locale]/(dashboard)/shipper/invoices/page.tsx`, `src/components/layout/NaviSidebar.tsx` |

## 현상 (실측 확인)

`/shipper/invoices` 페이지(`getShipperInvoices()` 사용)의 `allowedRoles`가 `[SHIPPER, ADMIN, ZENITH_SUPER_ADMIN, AGENCY]`로 하드코딩되어 있는데, **실제 화주 계정 대부분의 role은 `CORPORATE`(예: `jungjs72@gmail.com`) 또는 `AGENCY_SHIPPER`(예: `jungjs@aventusm.com`)** — 즉 오늘 세션에서 다룬 두 테스트 계정 다 이 페이지에 접속하면 "조회 권한이 없습니다" 에러를 만납니다. `INDIVIDUAL` role도 마찬가지로 빠져있습니다.

미들웨어(`proxy.ts`)의 `isAllowedPath`는 `/shipper` 프리픽스가 `orgType !== 'PLATFORM'`이면 role 무관하게 전부 허용하므로 여기서는 막히지 않음 — **서버 액션(`shipper-invoices.ts`)의 role 화이트리스트 하나만이 실제 차단 지점**입니다.

추가로, **사이드바 메뉴 어디에도 이 페이지로 가는 링크가 없어**(`NaviSidebar.tsx` 전체 검색 결과 0건) 실제 사용자가 이 기능의 존재 자체를 알 방법이 없습니다.

(부차) 상태 뱃지(`getStatusBadge()`)가 `PENDING`/`SENT`/`PAID`/`OVERDUE`만 처리하는데, `zen_invoices.status`의 실제 CHECK 제약은 `UNPAID`/`PARTIAL`/`PAID`/`OVERDUE`/`CANCELED`입니다 — `PENDING`/`SENT`는 존재하지 않는 값이라 죽은 코드이고, 기본값인 `UNPAID`·`PARTIAL`은 처리가 안 되어 회색 default 뱃지로만 표시됩니다.

오늘 발견한 `createOrder()`의 role 하드코딩(IMP-157)과 동일 계열 패턴 — 화주 계열 role이 4종류(`SHIPPER`/`CORPORATE`/`AGENCY_SHIPPER`/`INDIVIDUAL`, `src/lib/auth/rbac.ts:18-21`) 있다는 걸 고려하지 않고 일부만 하드코딩.

## 권장 조치

1. `getShipperInvoices()`의 `allowedRoles`에 `CORPORATE`/`AGENCY_SHIPPER`/`INDIVIDUAL` 추가, 소유권 필터 분기(`profile.role === USER_ROLES.SHIPPER`)도 이 4개 role 전부에 동일하게(`shipper_id = profile.org_id`) 적용
2. `NaviSidebar.tsx`에 이 페이지로 가는 메뉴 항목 추가(`shipper_ups_rates_nav`와 동일한 패턴)
3. `getStatusBadge()`를 실제 CHECK 제약 값(`UNPAID`/`PARTIAL`/`PAID`/`OVERDUE`/`CANCELED`) 기준으로 재작성

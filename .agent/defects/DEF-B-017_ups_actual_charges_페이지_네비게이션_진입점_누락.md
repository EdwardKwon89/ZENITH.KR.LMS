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

## 조치안 (설계 필요 — 배정 전 확정 대기)

`NaviSidebar.tsx`에 메뉴 항목 추가 필요. ADMIN/MANAGER 전용 메뉴 그룹(예: "정산/재무" 하위)과 AGENCY 대시보드(퀵링크 또는 사이드바) 양쪽에 노출 필요 — 페이지 자체가 AGENCY 접근을 이미 허용하므로 AGENCY 쪽 진입점도 함께 추가해야 함. 정확한 메뉴 위치·라벨은 배정 시 확정.

## 관련 파일
- `src/components/layout/NaviSidebar.tsx`
- `src/app/[locale]/(dashboard)/agency/AgencyQuickLinks.tsx`
- `src/app/[locale]/(dashboard)/admin/ups-actual-charges/page.tsx` (대상 페이지, 수정 불필요)

## 관련 Task
- 미배정 (이슈만 등록, 배정 대기)

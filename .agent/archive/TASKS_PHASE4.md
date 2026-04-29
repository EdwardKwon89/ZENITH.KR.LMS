# Archive — Phase 3~4 완료 Sprint Task Tables

> **이관일:** 2026-04-27 | **이관 사유:** TASK_BOARD 800줄 제한 준수
> **원본:** TASK_BOARD.md Phase 3.2 ~ Phase 4 Sprint 1-5 완료 섹션

---

## Phase 3.3 — Routing Sprint A (Riley)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| ROU-01 | Riley | Aiden | Routing API 명세 | `Ds_11_DETAIL_ROUTING.md` Section 13, 5개 API | ✅ PASS | BUG-07-A 수정 (UPSERT 정책) |
| ROU-02 | Riley | Aiden | Routing 엔진 구현 | DB 스키마, VirtualMapAdapter, getRouteOptions | ✅ PASS | BUG-08-A/09-A/10-A Aiden 직수정, 99/99 PASS |

---

## Phase 3 UAT — Aiden 병행 작업

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| UAT-01 | Aiden | — | UAT 시나리오 설계 (C안) | TRK/FIN/INV/ROU + E2E 통합 시나리오 | ✅ 완료 | UAT_3.0_Phase3_Integrated.md |
| UAT-02 | Aiden | — | 1차 UAT (TRK/FIN/INV) | TC-UAT-TRK.1~4 / FIN.1~5 / INV.1~4 | ✅ 완료 | BUG-INV-01/02, 102/102 PASS |
| UAT-03 | Aiden | — | 2차 UAT (ROU+E2E) | TC-UAT-ROU.1~4 + E2E.1~3 | ✅ 완료 | BUG-15-A/16-A, 108/108 PASS |
| UAT-04 | Riley | Aiden | 브라우저 UAT 전 그룹 | TRK/FIN/INV/ROU/E2E 런타임 검증 | ✅ PASS | SQL 에러 해결, Sync All API 확인 |

---

## Phase 3.3 — Routing Sprint B (Riley)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| ROU-03 | Riley | Aiden | Routing 옵션 선택 UI | RouteOptimizationSection/Card/SegmentList [WBS 3.3.2.1] | ✅ PASS | SCR-ROU-01 |
| ROU-04 | Riley | Aiden | 경로 타임라인 + 시각화 | RouteMilestoneTimeline + getRouteVisualization Action | ✅ PASS | SCR-ROU-02 |
| ROU-05 | Riley | Aiden | 정합성 모니터링 배지 | RouteConsistencyBadge + getRouteConsistencyStatus (Admin) | ✅ PASS | SCR-ROU-03 |

---

## Phase 3.2 — Finance Sprint A (Riley)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| FIN-03 | Riley | Aiden | 세금계산서 & 메일 발송 | 표준 규격 + SENT/SUCCESS 이력 (2 MD) | ✅ 완료 | 2026-04-24 최종 PASS |
| BUG-05 | Riley | Aiden | FIN-03 API 명세 결함 수정 | 권한 교정 + zen_tax_invoices 스키마 추가 | ✅ 완료 | 2026-04-24 수정 |

---

## Phase 4 Sprint 1 — 착수 게이트 (2026-04-26)

### Track A — Aiden (4.0 UAT Gate)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH4-UAT-01 | Aiden | — | TRK 브라우저 UAT | TC-UAT-TRK.1~4 | ✅ 완료 | BUG-TRK-RLS-01/NOTIF-01, 109/109 |
| PH4-UAT-02 | Aiden | — | FIN 브라우저 UAT | TC-UAT-FIN.1/3/4/5 | ✅ 완료 | BUG-FIN-RLS-01/MW-API-01, 109/109 |
| PH4-UAT-03 | Aiden | — | INV 브라우저 UAT | TC-UAT-INV.1/4 | ✅ 완료 | BUG-INV-HIST-01, 109/109 |

### Track B — Riley (4.8.1 P0 Critical Fixes)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH4-UX-01 | Riley | Aiden | 네비게이션 3종 결함 수정 | useRouter 전환 + /settlement 사이드바 + /logistics 제거 | ✅ 완료 | 2026-04-26 |
| PH4-UX-02 | Riley | Aiden | 사이드바 메뉴 계층 재편 | 물류/재무 그룹 2-depth 계층화 | ✅ 완료 | 2026-04-26 |

---

## Phase 4 Sprint 2 — UI/UX 완성도 강화 (2026-04-26)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH4-UX-03 | Riley | Aiden | P1 디자인 시스템 통일화 | 헤딩/brand-*/보더/다크모드/이모지 표준화 (3 MD) | ✅ 완료 | 2026-04-26, 전 페이지 적용 |
| PH4-UX-04 | Riley | Aiden | P2 Proposal 5 Fancy | Glassmorphism/Hover/recharts/AnimatePresence (3 MD) | ✅ PASS | BUG-SPR2-01 수정, 109/109 |
| BUG-SPR2-01 | Riley | Aiden | Finance 차트 실데이터 연동 | finance/page.tsx 더미→DB 실데이터 교체 | ✅ PASS | getWeeklyRevenueChart 신규 |

---

## Phase 4 Sprint 3 — VOC 관리 (2026-04-26)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH4-VOC-01 | Riley | Aiden | VOC DB & API | zen_voc/zen_voc_answers + 5개 Action | ✅ PASS | BUG-SPR3-01 수정, Migration 이관 |
| PH4-VOC-02 | Riley | Aiden | VOC User UI | /voc 목록·상세 + VocRequestModal + 오더 버튼 | ✅ 완료 | |
| PH4-VOC-03 | Riley | Aiden | VOC Admin UI | /voc/admin + 답변 폼 + CLOSED 처리 | ✅ 완료 | requireAdmin 적용 |
| BUG-SPR3-01 | Riley | Aiden | VOC RLS 역할명 수정 | ZENITH_ADMIN→ADMIN, MANAGER 제거 | ✅ PASS | SAR-016, Migration 이관 |

---

## Phase 4 Sprint 4 — OPS 파라미터 시스템 (2026-04-26)

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH4-OPS-01 | Riley | Aiden | getParam 캐싱 유틸리티 | unstable_cache 300s + revalidateTag + fallback | ✅ PASS | src/lib/params/service.ts |
| PH4-OPS-02 | Riley | Aiden | 공통코드 Admin UI | /admin/common-codes CRUD | ✅ PASS | /admin/codes/page.tsx |
| PH4-OPS-03 | Riley | Aiden | Finance 파라미터화 | applied_exchange_rate + VAT_RATE + /admin/system-params + audit_log | ✅ PASS | Migration 20260427090000 |
| PH4-OPS-04 | Riley | Aiden | Tracking 파라미터화 | TRACKING_DELAY_THRESHOLD_HOURS getNumericParam | ✅ PASS | lib/logistics/tracking.ts:141 |
| PH4-OPS-05 | Riley | Aiden | Routing 파라미터화 | α/β 가중치 getParamsByCategory('ROUTING') | ✅ PASS | scoring.ts:44-45 |
| PH4-OPS-06 | Riley | Aiden | Feature Flag 시스템 | zen_feature_flags + isFeatureEnabled + middleware | ✅ PASS | middleware.ts:66 |
| DoD-2 | Riley | Aiden | OPS 회귀 TC 추가 | TC-OPS-01~05 + TC-FF-01~03 (8건) | ✅ PASS | 120/120 PASS |

---

## Phase 4 Sprint 5 — 선불 지갑 & Finance 연동 (2026-04-27)

> **최종 판정:** ✅ FINAL PASS (2026-04-27 Aiden 검증)
> **REWORK 4건 완료:** REWORK-WAL-01~04 전원 조치 확인

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH5-WAL-01 | Riley | Aiden | 지갑 Server Actions | topUpWallet/getWalletBalance/requestRefund | ✅ PASS | src/app/actions/wallet.ts |
| PH5-WAL-02 | Riley | Aiden | 인보이스 결제 수단 분기 | payment_method 컬럼 + WALLET/BANK_TRANSFER 분기 | ✅ PASS | Migration 20260427100000 |
| PH5-WAL-03 | Riley | Aiden | 지갑 결제 Action | payInvoiceFromWallet + INSUFFICIENT_BALANCE | ✅ PASS | 원자적 처리 |
| PH5-WAL-04 | Riley | Aiden | 마이페이지 지갑 UI | /mypage 잔액·충전·환불·이력 | ✅ PASS | NaviSidebar:90 등록, named import 수정 |
| PH5-WAL-05 | Riley | Aiden | 인보이스 결제 수단 선택 UI | PaymentModal WALLET/BANK_TRANSFER | ✅ PASS | InvoiceTable:183 router.refresh() |

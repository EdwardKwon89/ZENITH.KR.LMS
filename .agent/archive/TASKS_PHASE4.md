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

---

## Phase 4 Sprint 6 — 고객지원 포털 QnA/FAQ/공지사항 ✅ (2026-04-27)

## 📋 Phase 4 Sprint 6 — 고객지원 포털 QnA/FAQ/공지사항 (착수 2026-04-27)

> **목표**: WBS 4.1.4 — 1:1 문의(QnA) / FAQ / 공지사항 3채널 고객지원 포털 구축
> **게이트 조건**: PH6-CS-01~05 DoD 전 충족 → Sprint 7 착수 허가
> **선행 완료**: API 명세 `Ds_11_DETAIL_SUPPORT.md` 섹션 15 완비 ✅ (사전 설계 2026-04-26)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH6-CS-01 | **Riley** | Aiden | DB Migration | `zen_qna` / `zen_qna_answers` / `zen_faq` / `zen_notices` + RLS [WBS 4.1.4] | ✅ 완료 | `20260427200000_zen_support_portal.sql` |
| PH6-CS-02 | **Riley** | Aiden | Support Server Actions | `createQna` / `getQnaList` / `getQnaDetail` / `answerQna` / `upsertFaq` / `getFaqList` / `deleteFaq` / `upsertNotice` / `getNoticeList` 9개 [WBS 4.1.4.1~3] | ✅ 완료 | `src/app/actions/support.ts` |
| PH6-CS-03 | **Riley** | Aiden | QnA UI | `/support/qna` 목록·등록 + `/support/qna/[qnaId]` 상세·답변 이력 [WBS 4.1.4.1] | ✅ 완료 | i18n 적용, 주문번호 연동 |
| PH6-CS-04 | **Riley** | Aiden | FAQ UI | `/support/faq` 카테고리 탭·키워드 검색 + Admin CRUD [WBS 4.1.4.2] | ✅ 완료 | i18n 적용, Admin CRUD 완비 |
| PH6-CS-05 | **Riley** | Aiden | 공지사항 UI | `/support/notices` 목록·상세 + Admin 발행 관리 [WBS 4.1.4.3] | ✅ 완료 | i18n 적용, 중요공지 배지 |

---

---

## Phase 4 Sprint 7 — 재무 조회 확장 + 통계 대시보드 ✅ (2026-04-27)

## 📋 Phase 4 Sprint 7 — 재무 조회 확장 + 통계 대시보드 (착수 2026-04-27)

> **목표**: WBS 4.5 [Finance+] + WBS 4.6 [Statistics] — 수입/비용 조회·운송원가 CRUD·운항스케줄·운송/비용 통계 대시보드 구축
> **게이트 조건**: PH7-FIN-01~04 + PH7-STAT-01~02 DoD 전 충족 → Sprint 8 착수 허가
> **선행 완료**: Sprint 6 FINAL PASS ✅ (2026-04-27)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH7-FIN-01 | **Riley** | Aiden | 수입 현황 조회 UI | 기간·운송수단·거래처별 필터링 + 매출 집계 화면 `/finance/revenue` [WBS 4.5.1.1] | ✅ 완료 | KPI 3종 연동 완료 |
| PH7-FIN-02 | **Riley** | Aiden | 비용 현황 조회 UI | AIR/SEA/CIR 원가별 조회 + 구간별 비용 내역 `/finance/costs` [WBS 4.5.1.2] | ✅ 완료 | 원가 집계 연동 완료 |
| PH7-FIN-03 | **Riley** | Aiden | 운송원가 Admin CRUD | 운송원가 등록·수정·삭제·조회 Admin 화면 `/admin/transport-costs` [WBS 4.5.2.1] | ✅ 완료 | Master CRUD 완비 |
| PH7-FIN-04 | **Riley** | Aiden | 운항스케줄 조회 | ETD/ETA·운항사·노선 기반 필터링 조회 `/schedules` [WBS 4.5.3.1] | ✅ 완료 | Admin 편집 기능 포함 |
| PH7-STAT-01 | **Riley** | Aiden | 운송 통계 대시보드 | 물동량·운송수단·운임 통계 차트 (바·라인 차트) `/admin/statistics` [WBS 4.6.1.1] | ✅ 완료 | Recharts 연동 완료 |
| PH7-STAT-02 | **Riley** | Aiden | 비용 통계 대시보드 | 원가·수익·마진 통계 시각화 (파이차트·매트릭스) [WBS 4.6.2.1] | ✅ 완료 | 수익성 분석 차트 완비 |

---

---

## Phase 4 Sprint 8 — 클레임 처리 & CI/PL 문서 엔진 ✅ (2026-04-29)

## 📋 Phase 4 Sprint 8 — 클레임 처리 & CI/PL 문서 엔진 (착수 2026-04-28)

> **목표**: WBS 4.7.1 [Claims] + WBS 4.7.2 [Documents] — 클레임 워크플로우 및 다국어 CI/PL 문서 엔진 구축
> **게이트 조건**: PH8-CLM-01 + PH8-DOC-01 DoD 전 충족 → Sprint 9 착수 허가
> **선행 완료**: Sprint 7 FINAL PASS ✅ (2026-04-28)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH8-GOV-01 | **Riley** | Aiden | API 명세 업데이트 | Ds_11 Section 18(Claims), 19(Documents) 명세 추가 | ✅ 완료 | R-11 준수 |
| PH8-DB-01 | **Riley** | Aiden | DB 마이그레이션 | zen_claims, zen_incident_fees 테이블 생성 및 RLS 적용 | ✅ 완료 | 20260428100000_zen_claims.sql |
| PH8-CLM-01 | **Riley** | Aiden | 클레임 워크플로우 BE | 클레임 생성, 상태 변경, 사고비 정산 연동 Server Actions | ✅ 완료 | src/app/actions/claims.ts |
| PH8-CLM-02 | **Riley** | Aiden | 클레임 관리 UI | Admin 클레임 목록 및 상세 처리 화면 (/admin/claims) | ✅ 완료 | ZenUI 표준 적용 |
| PH8-DOC-01 | **Riley** | Aiden | CI/PL 문서 엔진 | react-pdf 기반 다국어 템플릿 및 데이터 바인딩 | ✅ 완료 | CommercialInvoice/PackingList |
| PH8-DOC-02 | **Riley** | Aiden | 문서 리스트 UI | 오더별 문서 조회 및 PDF 생성/다운로드 UI (/finance/documents) | ✅ 완료 | locale별 분기 지원 |
| PH8-TST-01 | **Riley** | Aiden | Sprint 8 회귀 테스트 | TC-CLM, TC-DOC 신규 작성 및 전체 147 TC 통과 확인 | ✅ 완료 | 147/147 PASS |
| PH8-PASS | **AuditAgent** | Aiden | Sprint 8 FINAL PASS | 코드 품질, 빌드 오류, 테스트 성공 여부 최종 검증 | ✅ 완료 | Sprint 8 FINAL PASS |

---

---

## Phase 4 Sprint 9 — 오더 연계형 고객 문의 ✅ (2026-04-29)

## 📋 Phase 4 Sprint 9 — 오더 연계형 고객 문의 (착수 2026-04-29)

> **목표**: WBS 4.1.1.2 — 오더 상세 페이지에서 직접 문의 접수 + 해당 오더의 상담 이력 조회
> **게이트 조건**: PH9-BE-01 + PH9-UI-01 + PH9-UI-02 DoD 전 충족 → Aiden 검증 후 FINAL PASS
> **선행 완료**: Sprint 8 FINAL PASS ✅ (2026-04-29)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH9-BE-01 | **Riley** | Aiden | 오더 연계 QnA BE 확장 | `getOrderQnaList(orderId)` Action 추가 + `createQna` order_id 자동 주입 검증 | ✅ 완료 | support.ts L454 |
| PH9-UI-01 | **Riley** | Aiden | 오더 상세 — 문의 탭 | 오더 상세 페이지에 "문의 이력" 탭 + "문의하기" 버튼 추가 | ✅ 완료 | URL 파라미터 자동 주입 수정 |
| PH9-UI-02 | **Riley** | Aiden | Admin 오더 상세 — 문의 이력 | Admin 오더 상세에 연계 문의 목록 + 바로 답변 기능 | ✅ 완료 | isAdmin 분기 구현 |
| PH9-TST-01 | **Riley** | Aiden | Sprint 9 회귀 테스트 | TC-ORD-QNA-01~03 작성 + REGRESSION MAP 섹션 20 등록 | ✅ 완료 | 151/151 PASS |
| PH9-PASS | **AuditAgent** | Aiden | Sprint 9 FINAL PASS | 코드 품질·빌드·테스트 최종 검증 | ✅ 완료 | FINAL PASS (2026-04-29) |

---

---

## Phase 4 Sprint 10 — Sentry 에러 로깅 연동 ✅ (2026-04-29)

## 📋 Phase 4 Sprint 10 — Sentry 에러 로깅 연동 (착수 2026-04-29)

> **목표**: WBS 4.1.2.1 — Sentry SDK 연동 + 에러 바운더리 캡처 + Admin 알림 체계 구축
> **게이트 조건**: PH10-SENTRY-01~03 DoD 전 충족 → Aiden 검증 후 FINAL PASS
> **선행 완료**: Sprint 9 FINAL PASS ✅ (2026-04-29)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH10-SENTRY-01 | **Riley** | Aiden | Sentry SDK 설치·초기화 | @sentry/nextjs 설치, instrumentation.ts, sentry config 3종 | ✅ 완료 | SENTRY_DSN env var |
| PH10-SENTRY-02 | **Riley** | Aiden | 에러 바운더리 연동 | error.tsx + global-error.tsx → captureException 연동 | ✅ 완료 | console.error 대체 |
| PH10-SENTRY-03 | **Riley** | Aiden | Admin 알림 + 에러 로그 UI | zen_error_logs 테이블 + /admin/error-logs 페이지 | ✅ 완료 | 기존 zen_notifications 재활용 |
| PH10-TST-01 | **Riley** | Aiden | Sprint 10 회귀 테스트 | TC-ERR-01~04 작성 (명세 대비 +2) | ✅ 완료 | REGRESSION MAP 섹션 21 등록 완료 |
| PH10-PASS | **AuditAgent** | Aiden | Sprint 10 FINAL PASS | 코드 품질·빌드·테스트 최종 검증 | ✅ 완료 | 155/155 PASS, Ds-11 동기화 완료 |

---

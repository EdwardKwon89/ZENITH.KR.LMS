# Phase 4 Sprint 계획 전체 보고서

> **프로젝트**: ZENITH_LMS
> **작성일**: 2026-04-26
> **작성자**: Aiden (ZEN_CEO)
> **참조 WBS**: v4.8 (79 MD 총 공수)
> **Phase 4 목표**: 고객 편의성 강화 및 통계 기반 경영 의사결정 지원 (v1.3.0)

---

## 📊 Phase 4 전체 진척 현황

| 항목 | 수치 |
|:---|:---:|
| Phase 4 총 공수 | 79 MD |
| 완료 공수 | 24 MD (SPR1~4 + 병행A~D) |
| **잔여 공수** | **55 MD** |
| Phase 4 진행률 | 약 30% |
| Phase 전체 진행률 | 약 74% (Phase 1~3 완료 기준) |

---

## ✅ 완료된 Sprint

### SPR 1 — UAT Gate & P0 결함 수정 (5 MD) ✅ 완료
> 2026-04-26 완료

| Task | WBS | MD | 결과 |
|:---|:---|:---:|:---:|
| 4.0 UAT Gate (TRK/FIN/INV 브라우저 검증) | 4.0.1~4.0.3 | 3 | ✅ PASS |
| P0 네비게이션 결함 수정 (window.location.href → router) | 4.8.1.1~1.3 | 1 | ✅ PASS |
| 사이드바 메뉴 계층 재편 (Logistics/Finance 2-depth) | 4.8.1.4 | 1 | ✅ PASS |

---

### SPR 2 — UI/UX 디자인 완성도 강화 (6 MD) ✅ 완료
> 2026-04-26 완료 (BUG-SPR2-01 수정 포함)

| Task | WBS | MD | 결과 |
|:---|:---|:---:|:---:|
| P1 디자인 시스템 통일화 (헤딩·brand-*·다크모드·이모지) | 4.8.2.1~2.5 | 3 | ✅ PASS |
| P2 Fancy 완성도 (Glassmorphism·HoverElev·recharts·AnimatePresence) | 4.8.3.1~3.4 | 3 | ✅ PASS |
| BUG-SPR2-01: Finance 차트 실데이터 미연동 수정 | — | — | ✅ PASS |

---

### SPR 3 — VOC 관리 (5 MD) ✅ 완료
> 2026-04-26 완료 (BUG-SPR3-01 수정 포함)

| Task | WBS | MD | 결과 |
|:---|:---|:---:|:---:|
| VOC DB 스키마 & Actions 5종 | 4.1.3.1 | 2 | ✅ PASS |
| VOC User UI (/voc, /voc/[id], OrderVocTrigger) | 4.1.3.2 | 1.5 | ✅ PASS |
| VOC Admin UI (/voc/admin, 답변·CLOSED) | 4.1.3.3 | 1.5 | ✅ PASS |
| BUG-SPR3-01: RLS 역할명 불일치 수정 (ZENITH_ADMIN → ADMIN) | — | — | ✅ PASS |

---

### 병행 A~D — 인프라 사전 작업 ✅ 완료
> 2026-04-26 완료 (Aiden 수행)

| 작업 | WBS | 비고 |
|:---|:---|:---|
| 병행 A: zen_system_params DB Migration | 4.3.1.1 | `metadata JSONB`, `effective_from/to`, `param_value_numeric` |
| 병행 B: zen_common_codes DB Migration | 4.3.1.1 (공통코드) | `display_order`, `metadata JSONB` 포함 |
| 병행 C: zen_wallet DB Migration | 4.4.1.1 | `balance >= 0` CHECK, TOP_UP/DEDUCT/REFUND 상태 머신 |
| 병행 D: TRK-01/TEST-01 설계 정책 확정 | DECISIONS.md #11/#12 | 서버사이드 페이지네이션 + MSW 모킹 Playwright 확정 |

---

## 🔵 대기 중인 Sprint (착수 가능 → 대기 순)

### SPR 4 — OPS 파라미터 시스템 구축 (8 MD) 🔵 착수 가능
> **담당**: Riley | **선행 완료**: 병행A~B (DB Migration)

| Task | WBS | MD |
|:---|:---|:---:|
| getParam()/getParamsByCategory() 캐싱 유틸리티 | 4.3.1.2 | 1 |
| 공통 코드 Admin CRUD UI (/admin/common-codes) | 4.3.1.3 | 1 |
| Finance 파라미터화 + VAT_RATE + Admin UI (/admin/system-params) | 4.3.2.1 | 2 |
| Tracking 파라미터화 (ORD_STAT, TRACKING_DELAY_THRESHOLD) | 4.3.2.2 | 1.5 |
| Routing 파라미터화 (스코어링 가중치 α/β) | 4.3.2.3 | 1.5 |
| Feature Flag 시스템 (zen_feature_flags + 미들웨어) | 4.3.2.4 | 1 |
| **합계** | | **8 MD** |

---

### SPR 5 — 선불 지갑 & Finance 연동 (6.5 MD) ⏸ 대기
> **담당**: Riley | **선행 완료**: 병행C (zen_wallet Migration)

| Task | WBS | MD |
|:---|:---|:---:|
| topUpWallet/getWalletBalance/requestRefund Server Actions | 4.4.1.2 | 1.5 |
| 인보이스 결제 수단 분기 (WALLET\|BANK_TRANSFER) | 4.4.2.1 | 2 |
| payInvoiceFromWallet + 잔액 부족 예외 처리 | 4.4.2.2 | 1 |
| 마이페이지 잔액 조회·충전·환불 UI | 4.4.3.1 | 1 |
| 인보이스 지급 시 결제 수단 선택 UI | 4.4.3.2 | 1 |
| **합계** | | **6.5 MD** |

---

### SPR 6 — 고객지원 포털 (6 MD) ⏸ 대기
> **담당**: Riley

| Task | WBS | MD |
|:---|:---|:---:|
| 1:1 문의(QnA) 등록·답변·이력 조회 | 4.1.4.1 | 3 |
| FAQ 관리 Admin (등록·수정·카테고리·검색) | 4.1.4.2 | 1.5 |
| 공지사항 등록·열람 (Admin 발행, User 수신) | 4.1.4.3 | 1.5 |
| **합계** | | **6 MD** |

---

### SPR 7 — 재무 조회 확장 + 통계 (10 MD) ⏸ 대기
> **담당**: Riley

| Task | WBS | MD |
|:---|:---|:---:|
| 수입 현황 조회 화면 (기간·운송수단·거래처 필터) | 4.5.1.1 | 1.5 |
| 비용 현황 조회 화면 (AIR/SEA/CIR 원가별) | 4.5.1.2 | 1.5 |
| 운송원가 Admin CRUD (/admin/transport-costs) | 4.5.2.1 | 2 |
| 운항스케줄 조회 화면 (ETD/ETA·운항사·노선) | 4.5.3.1 | 1 |
| 물동량·운임 통계 대시보드 (/admin/statistics) | 4.6.1.1 | 2 |
| 원가·수익·마진 통계 시각화 | 4.6.2.1 | 2 |
| **합계** | | **10 MD** |

---

### SPR 8 — 클레임 처리 & 표준 문서 엔진 (8 MD) ⏸ 대기
> **담당**: Riley

| Task | WBS | MD |
|:---|:---|:---:|
| 오더 상태 CLAIMED 추가 + 사유 코드 마스터 | 4.7.1.1 | 2 |
| 클레임 발생 시 Finance 정산 차감 로직 (zen_incident_fees) | 4.7.1.2 | 3 |
| CI/PL 다국어 자동 생성 엔진 (React-PDF 재활용) | 4.7.2.1 | 3 |
| **합계** | | **8 MD** |

---

### SPR 9 — 고객 고도화 & 시스템 모니터링 (12 MD) ⏸ 대기
> **담당**: Riley

| Task | WBS | MD |
|:---|:---|:---:|
| 개인회원 승급 심사 및 관리 UI | 4.1.1.1 | 2 |
| 오더 연계형 고객 문의 접수 및 상담 이력 | 4.1.1.2 | 3 |
| 에러 로깅(Sentry) 연동 및 관리자 알림 | 4.1.2.1 | 3 |
| Adaptive Polling (VIP 화주 우선순위 폴링) | 4.1.5.1 | 4 |
| **합계** | | **12 MD** |

---

### SPR 10 — 백로그 및 검증 (5 MD) ⏸ 대기
> **담당**: Riley | **설계 확정**: DECISIONS.md #11/#12

| Task | WBS | MD |
|:---|:---|:---:|
| TrackingDashboard 서버사이드 페이지네이션 (PH4-TRK-01) | 4.1.5 연계 | 1.5 |
| Playwright E2E MSW 모킹 기반 환경 구축 (PH4-TEST-01) | 4.3.3 연계 | 1.5 |
| 알림 관리 Admin UI (/admin/notifications) | 4.3.2.5 | 1 |
| 파라미터 동적 변경 Playwright 검증 | 4.3.3.1 | 1 |
| **합계** | | **5 MD** |

---

### SPR 11 — 프로젝트 클로징 (7 MD) ⏸ 대기
> **담당**: Riley

| Task | WBS | MD |
|:---|:---|:---:|
| 전 구간 End-to-End 시나리오 검증 | 4.2.1.1 | 5 |
| 역할별 사용자 매뉴얼 작성 (Manager/Oper/User) | 4.2.2.1 | 2 |
| **합계** | | **7 MD** |

---

## 📅 Sprint 타임라인 요약

| Sprint | 내용 요약 | MD | 담당 | 상태 |
|:---:|:---|:---:|:---:|:---:|
| SPR 1 | UAT Gate + P0 결함 수정 | 5 | Aiden + Riley | ✅ 완료 |
| SPR 2 | UI/UX 디자인 완성도 | 6 | Riley | ✅ 완료 |
| SPR 3 | VOC 관리 전체 | 5 | Riley | ✅ 완료 |
| 병행 A~D | 인프라 사전 작업 | — | Aiden | ✅ 완료 |
| **SPR 4** | **OPS 파라미터 시스템** | **8** | **Riley** | **✅ 완료** |
| SPR 5 | 선불 지갑 & Finance 연동 | 6.5 | Riley | ⏸ 대기 |
| SPR 6 | 고객지원 포털 (QnA/FAQ/공지) | 6 | Riley | ⏸ 대기 |
| SPR 7 | 재무 확장 + 통계 대시보드 | 10 | Riley | ⏸ 대기 |
| SPR 8 | 클레임 + 문서 엔진 | 8 | Riley | ⏸ 대기 |
| SPR 9 | 고객 고도화 + Sentry | 12 | Riley | ⏸ 대기 |
| SPR 10 | 백로그 (TRK/TEST/알림) | 5 | Riley | ⏸ 대기 |
| SPR 11 | E2E 클로징 + 매뉴얼 | 7 | Riley | ⏸ 대기 |
| **잔여 합계** | | **62.5 MD** | | |

---

## 🗒️ 주요 의존성 및 전제 조건

| Sprint | 선행 조건 |
|:---:|:---|
| SPR 4 | 병행A/B 완료 ✅ (zen_system_params + zen_common_codes Migration) |
| SPR 5 | 병행C 완료 ✅ (zen_wallet Migration) |
| SPR 6 | SPR 3 완료 ✅ (VOC 인프라 기반 공유) |
| SPR 7 | SPR 5 완료 (Finance 확장 연계) |
| SPR 8 | SPR 3 완료 ✅ (VOC → CLAIMED 연계) |
| SPR 9 | SPR 6 완료 권장 (QnA 인프라 공유) |
| SPR 10 | 병행D 완료 ✅ (설계 정책 확정) |
| SPR 11 | SPR 9 이전 전체 완료 |

---

> **문서 기준일**: 2026-04-26 | **다음 갱신 시점**: SPR 4 완료 후

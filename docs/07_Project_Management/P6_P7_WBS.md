# ZENITH_LMS Phase 6 & Phase 7 WBS (Work Breakdown Structure) — Level 4

> **최종 갱신일**: 2026-06-19
> **담당**: B_Kai (TASK-159)
> **관련 이슈**: [#40](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/40)

---

## 상태 범례

| 심볼 | 의미 |
|:----:|:----|
| ✅ | 완료 (Aiden 승인) |
| 🔄 | 구현 중 |
| 🔔 | 검토 요청 (Aiden 대기) |
| ❌ | 반려 (재작업 필요) |
| ⬜ | 미착수 |
| 🚫 | 블로커 |
| ➖ | 취소/병합 |

---

## Phase 6: 신규 서비스 역할 모델 + 멀티 서비스 배정 구조 (v1.5.0)

> **설계 확정**: 2026-06-06 | **기간**: 2026-06-06 ~ 2026-06-09 | **전체 진행률**: 100% ✅

### P6-SPR-01: DB Schema Foundation (P1) — D_Kai

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-097 DB 스키마 기반 구축 | `org_type` 컬럼 추가 (zen_orgs, zen_profiles) | D_Kai | ✅ | `bb9a3fc` | TASK-113 |
| | 요율테이블 3종 생성 (customs_rates, delivery_rates, order_services) | D_Kai | ✅ | `bb9a3fc` | |
| | Migration 스크립트 작성 | D_Kai | ✅ | `bb9a3fc` | |
| | 검증: 248/248 PASS | D_Kai | ✅ | — | Aiden ✅ 260606 |

### P6-SPR-02: Customs Service Rate Management (P1) — D_Kai

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-098 통관 서비스 요율 관리 | customs_rates CRUD Server Actions | D_Kai | ✅ | `a64f970` | TASK-114 |
| | 통관 요율 Admin UI | D_Kai | ✅ | `a64f970` | |
| | 유효기간·Slab 검증 로직 | D_Kai | ✅ | `a64f970` | |
| | 검증: 251/251 PASS | D_Kai | ✅ | — | Aiden ✅ 260606 |

### P6-SPR-03: Delivery Service Rate Management (P1) — D_Kai

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-099 배송 서비스 요율 관리 | delivery_rates CRUD Server Actions (LOCAL+TOTAL) | D_Kai | ✅ | `c745fa0` | TASK-115 |
| | 배송 요율 Admin UI | D_Kai | ✅ | `c745fa0` | |
| | 검증: 254/254 PASS | D_Kai | ✅ | — | Aiden ✅ 260606 |

### P6-SPR-04: Unified Service Rate Query API (P1) — D_Kai

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-100 통합 서비스 요율 조회 API | `getServiceRates` 통합 조회 함수 | D_Kai | ✅ | `154ea5d` | TASK-116 |
| | 오더-서비스 배정 Actions (`assignOrderServices`) | D_Kai | ✅ | `154ea5d` | |
| | 검증: 267/267 PASS | D_Kai | ✅ | — | Aiden ✅ 260606 · 초기 ❌ 반려(org_id bug) |

### P6-SPR-05: Order Registration UI Improvement (P1) — Riley

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-101 서비스 조합 선택 Step | OrderRegistrationForm 서비스 선택 UI | Riley | ✅ | `5ff2982` | TASK-117 |
| | 요율 확인 Step 추가 | Riley | ✅ | `5ff2982` | |
| | 검증: 270/270 PASS | Riley | ✅ | — | Aiden ✅ 260607 · Advisory: 1140줄 분리 권고 |

### P6-SPR-06: Order List Role-Based Isolation (P2) — D_Kai

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-102 CUSTOMS_BROKER 격리 | `zen_orders` RLS CUSTOMS_BROKER 정책 | D_Kai | ✅ | `270146e` | TASK-118 |
| | DELIVERY_AGENT 격리 | D_Kai | ✅ | `270146e` | |
| | 검증: 259/259 PASS | D_Kai | ✅ | — | Aiden ✅ 260606 |

### P6-SPR-07: Carrier Direct Rate Registration (P2) — D_Kai

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-103 CARRIER 직접 등록 | `updateRateCard` CARRIER 권한 확장 | D_Kai | ✅ | `154ea5d` | TASK-119 |
| | `platform_fee_rate` 격리 로직 | D_Kai | ✅ | `154ea5d` | |
| | 검증: 267/267 PASS | D_Kai | ✅ | — | Aiden ✅ 260606 · 초기 ❌ 반려(CARRIER 미구현) |

### P6-SPR-08: Phase 6 Regression + E2E + UAT (P2) — D_Kai + B_Kai

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-104 회귀 테스트 | Phase 6 전체 회귀 검증 | D_Kai | ✅ | `ef6e1e6` | TASK-120 |
| | E2E 시나리오 5종 자동화 | B_Kai | ✅ | `710fd60` | |
| | UAT 절차서 보완 | D_Kai | ✅ | `e0e1c41` | |
| | 검증: 309/309 PASS | D_Kai+B_Kai | ✅ | — | Aiden ✅ 260608 · B_Kai ❌ 1회 반려(DoD 허위체크) |

### P6 Post-SPR Extensions (IMP-105~108)

| IMP | Task | Description | 담당 | 상태 | 코드 | 검증 |
|:---:|:----:|:-----------|:----:|:----:|:----:|:----:|
| IMP-105 | 121 | 운송수단별 요금 정책 설정 (정책 테이블 + Admin UI + 엔진) | D_Kai+B_Kai | ✅ | `bb81021`+`5171675`+`723db3e` | 314/314 |
| IMP-106 | 122 | 요율 Slab 구조 개편 (무게 Slab / 부피 Slab 분리) | D_Kai+B_Kai | ✅ | `2cb5927`+`a9c4f3e` | 314/314 |
| IMP-108 §2 | 123 | TS 빌드 오류 50파일 수정 + `platform_fee_amount` 재정의 | D_Kai | ✅ | `c049bef` | build PASS + 314/314 |
| IMP-108 §1+§3 | 124 | `max_charge` 상한선 구현 (WM Cap + UI) | B_Kai(D)+D_Kai(§3) | ✅ | `ce17476`+`9d70d87` | 315/315 |
| IMP-107 | 125 | TISA 요율 스냅샷 강화 (WM slab 이력 + `pricing_basis` 저장) | D_Kai | ✅ | `ab6f493`+`ef3ece7`+`3d95e90` | 316/316 |
| UAT 보완 | 126 | Phase 6 + IMP-107/108 UAT 시나리오 보완 (UAT-10-08~11) | B_Kai | ✅ | — | 316/316 |

### P6 DEF Fixes

| Task | DEF | Description | 담당 | 상태 | 코드 | 비고 |
|:----:|:---:|:-----------|:----:|:----:|:----:|:-----|
| 127 | DEF-054 | Rate Card Supersede 조건 port 추가 (A안) | D_Kai | ✅ | `0183c4e` | 316/316 |
| 128 | DEF-048/049 | Schedule 매칭 실패 + 미배정 표시 수정 | D_Kai | ✅ | `830184c` | 316/316 |
| 129 | DEF-018/009/010 | CARRIER role + UI 소규모 버그 수정 | B_Kai | ✅ | — | 316/316 |
| 130 | DEF-053 | 요율 UI 개선 5종 커밋 | D_Kai | ✅ | `2c30146` | 316/316 · R-17 페널티 |
| 131 | — | ADMIN/MANAGER 조직 정보 관리 화면 구축 (P1) | B_Kai | ✅ | `c1b0bc8` | 316/316 |
| 132 | — | D_Kai 재교육 세션 3차 | D_Kai | ✅ | — | DoD 6/6 |
| 133 | — | E2E-20 Order 등록 서비스 조합 선택 자동화 (Phase 6 통합) | B_Kai | ✅ | `2dac510`+`61caaee` | 316/316 |
| 134 | — | UAT-12 Admin 조직 관리 화면 시나리오 | D_Kai | ✅ | `c7fe3d9` | UAT_MASTER 93개 |
| 135 | DEF-056 | 실물 요율 시드 SQL 커밋 | B_Kai | ✅ | `1ebc9e6` | 316/316 |
| 136 | DEF-059 §1~3 | PKG 레벨 `special_cargo_type` 전환 (DB·Zod·RPC·Action) | D_Kai | ✅ | `ad22883` | 316/316 |
| 137 | DEF-059 §4 | PKG 카드 `special_cargo_type` 선택 UI 전환 | B_Kai | ✅ | `ec0fa5a`+`dabde76`(Aiden) | 316/316 |

---

## Phase 7: UPS 특송 + Agency 역할 모델 (Phase 6 후속)

> **설계 확정**: 2026-06-06 (An-12) | **기간**: 2026-06-14 ~ 진행 중 | **전체 진행률**: ~95%

### P7-SPR-01: UPS DB Schema (P1)

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| **Team A — IMP-110 UPS DB 스키마** | | | | | |
| TASK-138 | `zen_ups_*` 테이블 6종 신설 (zones, products, base_rates, fuel, accessorials, invoices) | Aiden | ✅ | `aca457e` | TASK-138 · 323/329 |
| | 기존 테이블 확장 (zen_orders UPS 필드) | Aiden | ✅ | `aca457e` | |
| **Team B — IMP-111 Agency 역할 모델 DB** | | | | | |
| TASK-139 | `org_type` 확장 (CARRIER·CUSTOMS_BROKER·DELIVERY_AGENT) | Jaison | ✅ | `dc8a2ff` | PR#5 · 327/334 |
| | RBAC DB 정책 + 대리점 화주 계층 | Jaison | ✅ | `dc8a2ff` | |
| TASK-140 | `supabase db reset` 검증 | Baker | ✅ | `59da68f` | TASK-139 DoD 보완 |

### P7-SPR-02: UPS Pricing Engine + Agency Shipper Management (P1)

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| **Team A — IMP-112 UPS 요금 계산 엔진** | | | | | |
| TASK-141 | UPS Pricing Engine 코어 (`pricing-engine.ts`) | Aiden | ✅ | `e60fff0` | TC-UPS-P 12/12 |
| | 타입 정의 + `pricing.ts` 래퍼 | Aiden | ✅ | `e60fff0` | |
| TASK-143 | UPS 요율 조회 Server Actions 5종 (Zone/Product/BaseRate/Fuel/OC) | D_Kai | ✅ | `fee7bf1` | TC-UPS-R 5/5 · DoD 8/8 |
| TASK-144 | 창고 입고 화면 REF_NO 입력 UI (domestic/intl + locked) | B_Kai | ✅ | `b315d49`+`6870271` | TC-WH-REF 4/4 |
| TASK-145 | D_Kai 재교육 세션 4차 (TASK-143 반려 2회) | D_Kai | ✅ | `0192648` | — |
| **Team B — IMP-114 Agency 화주 관리** | | | | | |
| TASK-B-001 | Agency 화주 Server Actions 3종 | Dave | ✅ | `7977e97`+`4c2cb91` | 340/347 |
| TASK-B-002 | Agency 화주 목록/등록 UI (`/agency/shippers`) | Baker | ✅ | `ec4d7f5`+`0976c21` | 340/340 |
| TASK-B-003 | Agency 대시보드 + NaviSidebar AGENCY 메뉴 | Dave | ✅ | `97e9126` | 340/347 |
| TASK-B-004 | PR#7 반려 수정 (Baker — locale·RBAC·null·타입) | Baker | ✅ | `57b5df8` | 345/345 |
| TASK-B-005 | PR#7 반려 수정 (Dave — 컬럼지정·i18n·TC) | Dave | ✅ | `31bfa4d` | 345/352 |
| TASK-142 | Agency 화주 관리 UI 통합 (PR#7 → develop 머지) | Jaison | ✅ | PR#7 | IMP-114 완료 |

### P7-SPR-03: UPS Rate Admin UI + Overrides (P2)

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| **Team A — IMP-113 UPS 요율 Admin UI** | | | | | |
| TASK-146 | Zone 관리 UI (dialog/table) | B_Kai | ✅ | `0578fb7` | 65 test files PASS |
| | 제품 관리 UI | B_Kai | ✅ | `0578fb7` | |
| | 기본요금/유류할증/OC 관리 UI (tabs) | B_Kai | ✅ | `0578fb7` | |
| IMP-109 | 환율 설정 화면 (기준통화 + USD/CNY/JPY) | Riley | ✅ | `1c67c35` | TASK-147 · 366/366 |
| IMP-117 | 간이 UPS 인보이스 PDF 출력 | B_Kai | ✅ | PR #22 | TASK-148 · CI PASS |
| **Team B — IMP-116 Agency 요율 오버라이드** | | | | | |
| TASK-B-006 | Agency 요율 오버라이드 Server Actions 3종 | Dave | ✅ | PR#8 | 345/352 |
| TASK-B-007 | Agency 요율 오버라이드 UI + NaviSidebar 메뉴 + i18n 10종 | Baker | ✅ | PR#8 | 345/345 |

### P7-SPR-04: Order Direct Delivery / Pickup + Warehouse UPS Link (P1)

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-118 오더 직접배송/픽업 선택 UI | 직접배송 radio 버튼 + 픽업 주소 입력 폼 | Riley | ✅ | PR #21 | TASK-149 · CI PASS |
| IMP-119 창고 출고 UPS 발송 연계 | 창고 출고 시 UPS 연동 데이터 생성 | D_Kai | ✅ | PR #19 | TASK-150 · CI PASS |
| | UPS 레이블 발급 연동 | D_Kai | ✅ | PR #19 | |

### P7-SPR-05: Address Book + Daily Close (P1)

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| **IMP-120 R5 주소록** | | | | | |
| TASK-151 | `zen_address_book` DB 테이블 + CRUD Server Actions | B_Kai | ✅ | PR #33 | TC-P7-ADDR-01~05 |
| | 오더 폼 주소록 연동 UI | B_Kai | ✅ | PR #33 | |
| TASK-156 | 브랜치 오염 복구 + PR 재제출 | B_Kai | ✅ | PR #33 | Closes #23, #32 |
| **IMP-121 R7 일마감 처리** | | | | | |
| TASK-152 | 당일 출고 집계 + 매출/매입 일별 집계 화면 | D_Kai | ✅ | PR #29 | TC-P7-CLOSE-01~04 · Closes #24 |

### P7-SPR-06: Agency Settlement Inquiry (P1)

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| IMP-122 Agency 정산 조회 | 화주별 UPS 오더 정산 내역 조회 화면 | Riley | ✅ | PR #26 | TASK-153 · Closes #25 |

### P7-SPR-07: E2E/UAT Pre-spec Writing (P2) — Riley

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| E2E-21 주소록 spec 초안 | TC-P7-ADDR-01~05 시나리오 정의 | Riley | ✅ | PR #30 | TASK-155 · 374/374 |
| E2E-22 일마감 spec 초안 | TC-P7-CLOSE-01~04 시나리오 정의 | Riley | ✅ | PR #30 | |
| UAT-13 주소록 절차서 | UAT 시나리오 5종 | Riley | ✅ | PR #30 | |
| UAT-14 일마감 절차서 | UAT 시나리오 5종 | Riley | ✅ | PR #30 | |

### P7-SPR-08: E2E Playwright Automation (P2)

| L3 WP | L4 Activity | 담당 | 상태 | 코드 | 비고 |
|:------|:------------|:----:|:----:|:----:|:-----|
| **IMP-120 E2E — E2E-21 주소록** | | | | | |
| TASK-157 | test.skip 제거 + beforeAll 동적 계정 생성 | B_Kai | ✅ | PR #38 | Closes #35 · 1 passed 17.7s |
| | `buildOwnerFilter` null UUID 버그 수정 | B_Kai | ✅ | PR #38 | `.match()`→`.eq()`+`.is()` |
| | proxy.ts `/address-book` whitelist 추가 | B_Kai | ✅ | PR #38 | |
| **IMP-121 E2E — E2E-22 일마감** | | | | | |
| TASK-158 | E2E-22 Playwright 자동화 | D_Kai | ❌ | Issue #36 | Aiden ❌ 반려 — admin fixture·RELEASED orders·R-18 위반 3건 |
| | 재작업 필요 (블로커 해제 후 재제출) | D_Kai | ⬜ | — | |

### P7 Blockers & Bug Fixes

| Task | Description | 담당 | 상태 | 코드 | 비고 |
|:----:|:-----------|:----:|:----:|:----:|:-----|
| TASK-154 | DEF-067 seed_data.sql 구스키마 수정 + IMP-120 migration fix (CI 블로커) | D_Kai | ✅ | `db63986` | 378/378 · Issue #27 |

### P7 공정관리 (Current)

| Task | Description | 담당 | 상태 | 코드 | 비고 |
|:----:|:-----------|:----:|:----:|:----:|:-----|
| TASK-159 | Phase 6 + Phase 7 WBS Level 4 공정관리 문서 작성 | B_Kai | 🔄 | — | Issue #40 · 본 문서 |

---

## Phase 7 미할당/예비 Task

| Task | Description | 우선순위 | 상태 | 비고 |
|:----:|:-----------|:--------:|:----:|:-----|
| — | UPS 실물 연동 (레이블 발급·트래킹·인보이스) | P1 | ⬜ | Phase 8+ 설계 확정 후 진행 |
| — | IBC/Pactrack Interface (IMP-115) | — | ➖ | Edward 지시 260617 — 영구 제외 |
| — | Carrier Portal (IMP-091) | P3 | ⬜ | Phase M |
| — | 요율 워크플로우 고도화 (IMP-094) | P3 | ⬜ | Phase M |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:----:|:------|:-----|
| 2026-06-19 | B_Kai | WBS Level 4 초안 작성 (Phase 6 + Phase 7) · TASK-159 |

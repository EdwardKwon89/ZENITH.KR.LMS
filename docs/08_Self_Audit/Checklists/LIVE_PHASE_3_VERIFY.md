# ✅ LIVE Phase 3: 검증 및 인도 체크리스트 (Active Verify Tracker)

> **프로젝트:** ZENITH_LMS  
> **상태:** [ACTIVE] - 최종 배포 전 무결성 검증을 위해 축적 중

---

## 📌 목적
구현 완료 후 최종 검증 단계에서 누락될 수 있는 인프라성 오류와 문서 무결성을 보장합니다.

---

## ✅ [Validation] 기본 검증 항목

### 1. 기능 무결성 (UAT)
- [ ] **UAT Scenario Pass**: 해당 기능의 모든 UAT 시나리오가 성공했는가?
- [ ] **Responsive Check**: 모바일/데스크탑 환경에서 UI 깨짐이 없는가?

---

## 🧪 Phase 3 통합 UAT 시나리오 검증 항목 [추가: 2026-04-24] (C안)

> 상세 시나리오: [UAT_3.0_Phase3_Integrated.md](../UAT/UAT_3.0_Phase3_Integrated.md)

### Phase 3.1 — Tracking
- [ ] **TC-UAT-TRK.1**: 외부 트래킹 동기화 (`syncExternalTracking`) — DB 적재 및 Raw 로그 저장 확인
- [ ] **TC-UAT-TRK.2**: 통합 트래킹 대시보드 — 오더 상세 연동 및 RBAC 확인
- [ ] **TC-UAT-TRK.3**: 상태 변경 알림 — 이메일(Resend) + IN_APP 동시 발송 확인
- [ ] **TC-UAT-TRK.4**: RawLogViewer Admin 전용 접근 및 RBAC 차단 확인

### Phase 3.2 — Finance
- [ ] **TC-UAT-FIN.1**: 정산 수식 엔진 — `base_cost + profit - discount = final_amount` 정합 확인
- [x] **TC-UAT-FIN.2**: 인보이스 PDF 발행 (FIN-01) — Signed URL 다운로드 가능 확인 — Claude 검증 완료 2026-04-25 (INV-UAT-001/v1_*.pdf 스토리지 업로드 + zen_invoice_pdf_history 기록 확인)
- [x] **TC-UAT-FIN.3**: 입금 처리 — Partial → Paid 자동 전환 + 초과 입금 Negative 테스트 — Claude 검증 완료 2026-04-26 (INV-UAT-001 UNPAID→PAID 전환, 대시보드 Unpaid 1→0 확인. BUG-FIN-RLS-01 수정: zen_invoices UPDATE RLS 정책 누락 → migration 20260426050000 적용)
- [x] **TC-UAT-FIN.4**: 엑셀 Export (FIN-02) — 기간 필터 + 파일 내용 정합 확인 — Claude 검증 완료 2026-04-26 (settlement_export_20260426.xlsx 다운로드 성공. BUG-MW-API-01 수정: /api 경로 i18n 리다이렉트 → middleware 조기 반환 처리)
- [x] **TC-UAT-FIN.5**: 세금계산서 발행 (FIN-03) — `SENT` 상태 + 이메일 수신 확인 — Conditional PASS (세금계산서 발행 및 DB 기록 ✅, 이메일 발송 ❌: Resend zenith.kr 도메인 미인증 — 인프라 이슈, 코드 결함 아님)

### Phase 3.4 — Inventory
- [x] **TC-UAT-INV.1**: 입출고 연동 자동 재고 증감 확인 — Claude 검증 완료 2026-04-26 (UAT Verification Item SKU-UAT-001 on_hand_qty 수동 조정 ±10 정상 반영, adjustInventory 서버 액션 PASS)
- [x] **TC-UAT-INV.2**: 수동 재고 조정 — 사유 미입력 시 유효성 오류 + 로그 기록 확인 — Claude 검증 완료 2026-04-25 (qty=0 validation, empty reason validation, zen_inventory_history ADJUSTMENT 기록 확인)
- [x] **TC-UAT-INV.3**: 안전재고 미달 시 Warning/Danger 배지 노출 확인 — Claude 검증 완료 2026-04-25 (E2E.2: Healthy→Low Stock→Healthy→Out of Stock 배지 전환 시나리오 PASS)
- [x] **TC-UAT-INV.4**: 기간별 입출고 통계 — SQL 교차 검증 — Claude 검증 완료 2026-04-26 (View History 시트 정상 로드, 이력 항목 생성 확인. BUG-INV-HIST-01 수정: history INSERT org_id FK 위반(23503) + profiles!created_by join 제거)

### Phase 3.3 — Routing (Sprint B 완료 후)
- [x] **TC-UAT-ROU.1**: 경로 옵션 3종 계산 UI — BALANCED 추천 배지 + DB 정합 확인
- [x] **TC-UAT-ROU.2**: 경로 선택 — `appliedRouteId` != `orderId` 검증 (BUG-15-A 수정 완료: selectedOptionId 별도 state 분리)
- [x] **TC-UAT-ROU.3**: 마일스톤 타임라인 — 경유지 렌더링 및 상태 배지 확인 (BUG-16-A 수정 완료: mode 아이콘 렌더링 추가)
- [x] **TC-UAT-ROU.4**: 정합성 배지 (Admin 전용) — 불일치 시 경고 노출 확인

### E2E 시나리오 (Sprint B 완료 후)
- [x] **TC-UAT-E2E.1**: 완전 물류 사이클 (오더→경로→트래킹→정산→세금계산서) — 통합 테스트(`uat-phase3-e2e.test.ts`) PASS
- [x] **TC-UAT-E2E.2**: 재고 관리 사이클 (입고→동기화→부족알림→조정→출고) — Claude 검증 완료 2026-04-26 (on_hand 1→11[Healthy]→5[LowStock]→7[Healthy]→0[OutOfStock] 전 구간 PASS)
- [x] **TC-UAT-E2E.3**: Admin 감시 플로우 (경로 정합성+Raw로그+알림) — Claude 검증 완료 2026-04-26 (Order Detail 오더 #ZEN-2026-000002: Tracking Timeline, Route Optimization+ADMIN badge, AdminTrackingControl, RawLogViewer, TISA Snapshot, Settlement Preview, /notifications 페이지 PASS)
- [x] **TC-UAT-OPS.1**: 시스템 파라미터 UI 연동 (PH4-OPS-03) — `/settings` 페이지 파라미터 수정 및 실시간 반영 확인
- [x] **TC-UAT-OPS.2**: 비즈니스 로직 동적화 (PH4-OPS-04/05) — 부피 계수(`volumeFactor`), 환율, 라우팅 가중치(`α/β`) DB 연동 및 정산/스코어링 반영 확인
- [x] **TC-UAT-OPS.3**: Feature Flag 시스템 (PH4-OPS-06) — `MAINTENANCE_MODE` 미들웨어 차단 및 `AI_RECOMMENDATION` UI 배지 노출 확인

### Phase 4.1.5 — Claims & Documents (Sprint 8)
- [x] **TC-UAT-CLM.1**: 클레임 어드민 대시보드 — 사고비 시각화 및 고밀도 그리드 확인 (Premium UI)
- [x] **TC-UAT-CLM.2**: 사고비-인보이스 연동 — 등록 시 `zen_invoices.total_amount` 차감 및 정합성 확인
- [x] **TC-UAT-DOC.1**: CI/PL PDF 엔진 — `Noto Sans KR` 폰트 적용 및 다국어(CJK) 렌더링 확인
- [x] **TC-UAT-DOC.2**: PDF 다운로드 안정성 — SSR/Hydration 오류 방지 로직 (`isMounted`) 확인

---

## 🐛 UAT 중 발견 및 수정된 버그 [2026-04-26 Playwright UAT]

| BUG ID | 파일 | 증상 | 원인 | 수정 |
|--------|------|------|------|------|
| BUG-INV-01 | `inventory/page.tsx` | 500 Error — params/searchParams | Next.js 16 params가 Promise로 변경됨 | `await params`, `await searchParams` 추가 |
| BUG-INV-02 | `actions/inventory.ts` `getInventoryList` | `invalid input syntax for uuid: "null"` | Admin org_id=null로 `.eq("org_id", null)` 전달 | isAdmin 체크 후 org_id 필터 skip |
| BUG-INV-03 | `InventoryDataTable.tsx` | 수동 조정 버튼 미노출 | `userRole === 'ADMIN'` 조건이 ZENITH_SUPER_ADMIN 배제 | `|| userRole === 'ZENITH_SUPER_ADMIN'` 추가 |
| BUG-INV-04 | `actions/inventory.ts` `adjustInventory` | 재고 이력 미기록 (silent fail) | history insert에 `profile.org_id`(null) 사용 → NOT NULL 위반 | `profile.org_id ?? inventory.org_id` fallback |
| BUG-RLS-01 | Supabase `zen_inventory` | Admin이 전체 재고 조회 불가 | SELECT policy가 org_id 매칭만 허용 | migration `20260425120000` — ZENITH_SUPER_ADMIN bypass 추가 |
| BUG-RLS-02 | Supabase `zen_inventory_history` | 재고 이력 INSERT 완전 차단 | INSERT policy 없음 (RLS enabled) | migration `20260425130000` — INSERT policy 추가 |
| BUG-RLS-03 | Supabase `zen_invoices`, `zen_order_costs` | Admin이 인보이스/비용 조회 불가 | SELECT policy가 role='ADMIN'만 허용 | migration `20260425100000` — ZENITH_SUPER_ADMIN 추가 |
| BUG-RLS-04 | Supabase `invoices` storage | Admin PDF 업로드 실패 (500) | INSERT policy에 ZENITH_SUPER_ADMIN 누락 | migration `20260425110000` — 역할 추가 |
| BUG-FIN-01 | `actions/finance.ts` `issueInvoicePdf` | `column zen_organizations_1.address does not exist` | `shipper:shipper_id(name, address, business_number)` — 컬럼 없음 | `(name, metadata)` 로 변경, metadata JSONB에서 추출 |
| BUG-FIN-02 | `lib/finance/settlement.ts` | 오더 조회 실패 (RLS) | 모듈 레벨 anon Supabase client 사용 | 각 메서드 내 `createClient()` 호출로 교체 |
| BUG-FIN-RLS-01 | `supabase/migrations/` | TC-UAT-FIN.3 완전 차단 — 결제 상태 업데이트 500 | `zen_invoices` RLS 활성화됐으나 UPDATE 정책 누락 → 0행 반환 → `.single()` 실패 | migration `20260426050000` — ADMIN/ZENITH_SUPER_ADMIN UPDATE/INSERT 정책 추가. SAR-013 |
| BUG-MW-API-01 | `src/middleware.ts` | TC-UAT-FIN.4 — `/api/finance/export` 404 | `handleI18nRouting()` 가 `/api/*` 경로를 `/ko/api/*`로 리다이렉트 | `isApi` 체크 후 조기 반환 처리 추가. SAR-015 |
| BUG-INV-HIST-01 | `src/app/actions/inventory.ts` | TC-UAT-INV.4 — 재고 이력 INSERT 실패 (silent) | ① `profile.org_id` (PLATFORM admin) FK 위반(23503) ② `profiles!created_by` join PostgREST 관계 미인식 | ① `org_id: inventory.org_id` 고정 ② `select("*")` 로 join 제거. SAR-014 |

---

## 🛡️ [Vault] 축적된 오류 방지 항목 (Added from SARs)

> [!IMPORTANT]
> **검증은 품질의 마지막 보루입니다.**

- [ ] **[SAR-001] Link Integrity Audit**: 파일명 변경, 폴더 위치 이동 후 프로젝트 내 모든 마크다운(특히 README, An_00)의 상대 경로 링크가 유효한지 전수 검사했는가?
- [ ] **[SAR-2026-04-19-001] Runtime Console Audit**: 브라우저 도구를 통한 UI 흐름 테스트 시, 개발자 도구 콘솔에 `ReferenceError`나 `Variable undefined` 로그가 단 하나라도 존재하는가?
- [ ] **[SAR-2026-04-19-001] Next.js Redirect Loop Test**: 인증 미들웨어 및 리다이렉트 로직이 무한 루프에 빠지지 않고 최종 목적지에 도달하는가?
- [x] **[SAR-008] Routing 경로 선택 후 isSelected 피드백**: `RouteOptimizationSection`에서 경로 선택 직후 카드 선택 상태(isSelected)가 시각적으로 반영되는가? (BUG-15-A) — Aiden 수정 완료 2026-04-25
- [x] **[SAR-009] Routing 마일스톤 운송 수단 아이콘**: `RouteMilestoneTimeline`에서 각 마일스톤의 운송 수단(AIR/SEA/LAND) 아이콘이 표시되는가? (BUG-16-A) — Aiden 수정 완료 2026-04-25
- [ ] **[SAR-2026-04-29-001/002] 거버넌스 프로세스 준수 (R-03)**: `TASK_BOARD`, `ROADMAP`, `WBS` 등 진척 관리 문서를 '완료'로 변경하기 전, 반드시 검증 주체(Auditor)의 명시적 승인 메시지(**"FINAL PASS"**)를 세션 로그에서 직접 확인했는가? (5회 반복 위반에 따른 **필수** 점검 항목)

---

## 🚢 Phase 3.3 Routing 검증 항목 [추가: 2026-04-24]

- [x] **ROU-02 스코어링 알고리즘**: Ds-11 α=0.6/β=0.4, min-max 정규화, COST/TIME/BALANCED 3종 산출 로직 검증 완료 (TC-R.1~3, scoring.test.ts)
- [x] **ROU-02 API 응답 형식**: `getRouteOptions` 반환값 `{ success: true, options: { COST, TIME, BALANCED } }` 명세 일치 검증 (TC-R.4a, BUG-08-A 수정 후)
- [x] **ROU-02 UPSERT 정책**: `zen_route_options` onConflict `order_id, option_type` 검증 (TC-R.4d, BUG-07-A 조치)
- [x] **ROU-02 appliedRouteId**: `selectRoute` 반환값이 `zen_order_routes` 실제 레코드 UUID인지 검증 (TC-R.5b, BUG-10-A 수정 후)
- [x] **ROU-03 옵션 선택 UI**: SCR-ROU-01 RouteOptimizationSection 3종 카드 렌더링 + 선택 기능 UAT 완료
- [x] **ROU-04 마일스톤 타임라인**: SCR-ROU-02 RouteMilestoneTimeline UI 및 getRouteVisualization Action 검증 완료
- [x] **ROU-05 정합성 배지**: SCR-ROU-03 RouteConsistencyBadge UI 및 getRouteConsistencyStatus Action 검증 완료

## 📊 점검 기록 (Audit Summary)

| 점검일 | 검증 대상/버전 | 수행자 | 결과 | 로그 링크 |
|--------|--------------|--------|------|----------|
| 2026-04-23 | QA-02 트래킹 통합 검증 / v2.2 | Claude (Antigravity) | ✅ PASS | [LIVE_REGRESSION_TEST_MAP.md](LIVE_REGRESSION_TEST_MAP.md) |
| 2026-04-24 | Phase 3.3 Sprint A ROU-02 심사 | Aiden | ✅ PASS (BUG-08/09/10-A 수정 후) | 99/99 PASS |
| 2026-04-24 | Phase 3 통합 UAT 시나리오 설계 (C안) | Aiden | ✅ 설계 완료 | [UAT_3.0_Phase3_Integrated.md](../UAT/UAT_3.0_Phase3_Integrated.md) |
| 2026-04-24 | Phase 3.3 Sprint B Routing 최종 통합 | Claude (Antigravity) | ✅ PASS | TC-R.6/7 포함 102/102 PASS |
| 2026-04-25 | UAT-03 BUG-15-A/16-A 수정 (isSelected + mode 아이콘) | Aiden | ✅ PASS | 108/108 회귀 테스트 PASS |
| 2026-04-26 | Playwright UAT: FIN.2 + INV.2 + E2E.2 + E2E.3 브라우저 검증 | Claude (Antigravity) | ✅ PASS | BUG-INV-01~04, BUG-RLS-01~04, BUG-FIN-01~02 수정 (migration 4건 적용) |
| 2026-04-26 | Playwright UAT: FIN.3/4/5 + INV.1/4 브라우저 검증 (PH4-UAT-02/03) | Claude (Antigravity) | ✅ PASS (FIN.5 Conditional) | BUG-FIN-RLS-01(SAR-013), BUG-MW-API-01(SAR-015), BUG-INV-HIST-01(SAR-014) 수정. 109/109 PASS |
| 2026-04-26 | Phase 4 Sprint 4: OPS 파라미터 시스템 최종 검증 (PH4-OPS-01~06) | Claude (Antigravity) | ✅ PASS | 시스템 파라미터 UI + 비즈니스 로직 연동 + Feature Flag 전체 PASS (회귀 테스트 111/111 PASS) |
| 2026-04-29 | Phase 4 Sprint 8: Claims & Document Engine 최종 검증 | Claude (Antigravity) | ✅ PASS | 클레임 UI 고도화 + CJK PDF 엔진 + 사고비 벨리데이션 전체 PASS (회귀 테스트 122/122 PASS) |

---
**작성 가이드:**
1. 커밋/PR 요청 전 이 `LIVE` 문서를 전수 체크하십시오.
2. 구조 변경이 있었다면 반드시 **Link Integrity Audit**을 수행하십시오.

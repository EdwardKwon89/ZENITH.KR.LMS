# IMP 진척 관리 대시보드

> **프로젝트**: ZENITH_LMS
> **근거 문서**: [IMP_EXECUTION_PLAN_BKai_20260514.md](IMP_EXECUTION_PLAN_BKai_20260514.md)
> **최초 작성**: 2026-05-15 (Aiden) / **최근 업데이트**: 2026-05-21 (Riley - TASK-035 완료 보고)
> **업데이트 규칙**:
> - 에이전트는 IMP 완료 커밋 시 해당 행의 `상태`와 `완료일`을 반드시 갱신한다.
> - 갱신은 IMP 완료 커밋과 **같은 커밋**에 포함하거나, 직후 별도 커밋으로 처리한다.
> - Aiden은 검증 PASS 시 상태를 `✅ PASS`로 확정한다.

---

## 상태 범례

| 심볼 | 의미 |
|:---:|:---|
| ⬜ | 미착수 |
| 🔄 | 진행 중 |
| 🔔 | 완료 — Aiden 검토 대기 |
| ✅ | Aiden PASS 확정 |
| ❌ | 반려 — 재작업 필요 |
| 🚫 | 블로커 — 선행 IMP 미완료 |
| ➖ | 해당 없음 (삭제/병합) |

---

## Phase A — Security & Infrastructure (CRITICAL)

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 034a | `.env.local` Git 추적 제거 | Riley | ✅ | 2026-05-15 |
| 034b | API 키 재발급 | Edward | ➖ | — |
| 035 | SECURITY DEFINER 38개 권한 검증 | Aiden+Riley | ✅ PASS | 2026-05-15 |
| 036 | Status Machine MANAGER 역할 추가 | B_Kai | ✅ PASS | 2026-05-15 |
| 037 | Supabase Auth 보안 설정 | Riley | ✅ PASS | 2026-05-15 |
| 026 | RLS 비즈니스 규칙 통합 (SQL 함수화) | Aiden+Riley | ✅ PASS | 2026-05-16 |
| 041 | Storage 정책 조직 멤버십 검증 | Riley | ✅ PASS | 2026-05-16 |
| 057 | `zen_role_permissions` SELECT 제한 | Riley | ✅ PASS | 2026-05-16 |
| 071 | 세션 Idle Timeout (zen_last_activity 쿠키, 30분) | D_Kai | ✅ | 2026-05-23 |
| 072 | SUSPENDED 계정 차단·안내 페이지 | D_Kai | ✅ | 2026-05-23 |
| 077 | SCR-091 회원 관리 전용 화면 (등급·정지) | D_Kai | ✅ | 2026-05-23 |

**Phase A 완료**: 7 / 10 (70.0%)

---

## Phase B — Data Integrity & Transaction Safety

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 019 | `createOrder()` 트랜잭션 도입 | Riley | ✅ PASS | 2026-05-20 |
| 038 | CLAIMED OrderStatus 정식 등록 | B_Kai | ✅ | 2026-05-15 |
| 039 | 정산 이중 실행 방지 | Riley | ✅ PASS | 2026-05-20 |
| 040 | WAREHOUSED→CANCELED 재고 불일치 | Riley | ✅ PASS | 2026-05-20 |
| 042 | `updateOrder()` 수정 차단 누락 | B_Kai | ✅ | 2026-05-15 |
| 043 | MASTERED Lock 액션별 우회 방지 | B_Kai | ✅ | 2026-05-15 |
| 044 | 인보이스 발행 후 비용 변경 차단 | B_Kai | ✅ PASS | 2026-05-16 |
| 047 | 트랜잭션 부재 확장 (status/지갑) | Riley | ✅ | 2026-05-20 |
| 052 | dissolveMasterOrder 부분 실패 | Riley | ✅ PASS | 2026-05-21 |
| 053 | 지갑 결제 롤백 불완전 | Riley | ➖ | 2026-05-21 |

> IMP-047 ✅ 완료 → IMP-052·053 블로커 해제 (Riley 즉시 착수 가능)

**Phase B 완료**: 8 / 10 (80%)

---

## Phase C — Observability & Guardrails

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 013 | console→logger 교체 (53개 파일) | Riley | ✅ | 2026-05-20 |
| 015 | middleware.ts console.log 제거 | Riley | ✅ | 2026-05-21 |
| 025 | Server Actions 에러 래퍼 | Riley | ✅ | 2026-05-20 |
| 045 | 무제한 리스트 페이지네이션 (18곳) | Ring | ✅ PASS | 2026-05-20 |
| 046 | Rate Limiting 도입 | B_Kai | 🚫 | — |
| 051 | 감사 추적 (마스터/인보이스/통관) | Ring | ✅ PASS | 2026-05-21 |
| 056 | 이메일 HTML 인젝션 방지 | Ring | ✅ PASS | 2026-05-21 |

> 🚫 IMP-015: IMP-013 완료 후 착수 가능 / IMP-046: Aiden 인프라 결정 후 착수 가능 (Phase C 착수 전)

**Phase C 완료**: 4 / 7 (57.1%)

---

## Phase D — Architecture Refactoring

### D1 — 선행 분할

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 014 | admin/rates 531줄 분할 | B_Kai | ✅ PASS | 2026-05-20 |
| 033 | Server Actions 도메인 분할 | B_Kai | ✅ PASS | 2026-05-20 |
| 058 | finance.ts 733줄 분할 | B_Kai | ✅ PASS | 2026-05-20 |

### D2 — 패턴 도입

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 016 | Repository 패턴 | B_Kai+D_Kai | ✅ PASS | 2026-05-21 |
| 059 | Supabase 클라이언트 중복 제거 | D_Kai | ✅ PASS | 2026-05-20 |

### D3 — 구조 개선

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 003 | middleware.ts → proxy.ts 마이그레이션 | D_Kai | ✅ PASS | 2026-05-20 |
| 030 | 정산 엔진 SRP | Riley | ✅ | 2026-05-21 |
| 031 | RBAC 이중 상태 정리 | D_Kai | ✅ PASS | 2026-05-20 |

> 🚫 IMP-016: D1(IMP-033·058) 완료 후 착수 가능

**Phase D 완료**: 8 / 8 (100%) ✅

---

## Phase E — Performance Optimization

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 020 | Feature Flags 캐싱 | D_Kai | ✅ | 2026-05-20 |
| 021 | 미들웨어 DB 호출 최적화 | D_Kai | ✅ | 2026-05-21 |
| 022 | NaviSidebar 번들 최적화 | D_Kai | ✅ PASS | 2026-05-21 |
| 048 | Mock 데이터 제거 | B_Kai | ✅ | 2026-05-15 |
| 054 | N+1 쿼리 7곳 | B_Kai | ✅ PASS | 2026-05-20 |
| 055 | 인덱스 누락 4종 | B_Kai | ✅ PASS | 2026-05-16 |
| 062 | SELECT * → 명시적 컬럼 (112곳) | B_Kai | ✅ PASS | 2026-05-20 |

**Phase E 완료**: 7 / 7 (100%) ✅

---

## Phase F — Type/UI/Test Quality

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 012 | Master/Admin 코드 중복 | D_Kai | ✅ PASS | 2026-05-21 |
| 017 | Error Boundary 4개 추가 | B_Kai | ✅ | 2026-05-20 |
| 023 | i18n 번역 키 타입 안정성 | D_Kai | ✅ PASS | 2026-05-21 |
| 024 | 공통 UI 컴포넌트 라이브러리화 | B_Kai | ✅ PASS | 2026-05-21 |
| 027 | 점검 모드 페이지 | B_Kai | ✅ | 2026-05-15 |
| 029 | TS 타입 안전성 (any 퇴출) | D_Kai | ✅ PASS | 2026-05-21 |
| 032 | 다국어 번역 커버리지 감사 + CI 게이트 | B_Kai | ✅ PASS | 2026-05-21 |
| 049 | 이중 프로필 테이블 정리 | D_Kai | ✅ PASS | 2026-05-21 |
| 050 | HELD→이전상태 복구 로직 | Riley | ✅ PASS | 2026-05-21 |
| 060 | RETURNED 상태 전이 확장 | Ring | ✅ PASS | 2026-05-21 |
| 061 | PDF 경로 충돌 방지 | B_Kai | ✅ PASS | 2026-05-21 |

**Phase F 완료**: 11 / 11 (100%) ✅

---

## Phase G — Future (통관 연계)

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 028 | UNI-PASS EDI 연동 | Aiden+Riley | ⬜ | — |
| 069 | IBC 어댑터 구현 (미국 통관) | — | 🚫 | — |

> IMP-069 착수 조건: IBC Sandbox 계정 확보 + shxk 정체 확인 (R_01 §1-1·§1-4). An_08/An_09 분석 완료로 명세 준비됨.

**Phase G 완료**: 0 / 2

---

## Phase H — Security Hardening 2차 (Ring 도출)

> Ring (Qwen3.6) EXP-IMP-RG-FIX (2026-05-16) 도출 — 보안·인증·입력 검증 보완

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 064 | API Route Handler 스택 트레이스 프로덕션 노출 | Ring | ✅ PASS | 2026-05-20 |
| 065 | Excel Export POST 엔드포인트 인증 미적용 | Ring | ✅ PASS | 2026-05-20 |
| 066 | HTTP Security Headers 미설정 (CSP·HSTS·X-Frame) | Ring | ✅ PASS | 2026-05-20 |
| 067 | Server Action 입력 Zod 검증 부재 (6개 액션) | Ring | ✅ PASS | 2026-05-20 |
| 068 | Signup 프로필 생성 Race Condition (setTimeout 500) | Ring | ✅ PASS | 2026-05-20 |

**Phase H 완료**: 5 / 5 (100%) ✅

---

## Phase I — 갭 분석 실 누락 항목 (SCR-040 등)

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 073 | 입고 처리 전용 화면 SCR-040 | Riley | ✅ | 2026-05-23 |
| 074 | 출고·운송장 출력 화면 SCR-041 | B_Kai | ✅ | 2026-05-23 |
| 075 | 오더 패킹 화면 SCR-031 | B_Kai | ✅ | 2026-05-23 |
| 076 | 특수화물 기재 | Riley | ✅ | 2026-05-23 |
| 077 | 회원 관리 전용 화면 SCR-091 | D_Kai | ✅ | 2026-05-23 |

**Phase I 완료**: 5 / 5 ✅

---

## Phase J — 지능형 라우팅 & Composite Pricing Engine

> **전제조건 충족** (2026-05-23) — Phase I 5/5 ✅ 완료. TASK-074 블로커 해제 → D_Kai 즉시 착수 가능.

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 080 | DB 스키마 확장 (zen_carriers·route_network·rate_cards·surcharges) | D_Kai | ✅ | 2026-05-24 |
| 081 | DatabaseRouteAdapter 구현 (MockMapAdapter 교체) | B_Kai | ✅ | 2026-05-24 |
| 082 | Composite Pricing Engine 구현 (DUMMY_RATES 교체, 기본운임+할증) | Riley | ✅ | 2026-05-24 |
| 083 | Admin 요율 카드 관리 UI (zen_rate_cards CRUD) | B_Kai | ✅ | 2026-05-24 |

**Phase J 완료**: 4 / 4 (100%) ✅

---

## Phase K — 멀티레그 Hub Routing 2차 개발

> **착수일**: 2026-05-25 | **목표**: 고객 데모 전 Hub Routing 완성 + P0 Go-Live 조건 해소
> **전제조건**: Phase J 4/4 ✅ 완료 (2026-05-24)

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 084 | Hub Route Discovery (DatabaseRouteAdapter BFS + 시드 데이터) | B_Kai | 🔔 | 5616493 · 226/226 · TC-R.8a·8b ✅ |
| 085 | Order-Route Segment 연결 (zen_orders ↔ 선택 경로) | D_Kai | 🔔 | 0eb5355 · 227/227 · 방안 A' · route_option_id FK + View + selectRoute() |
| 086 | 303 Stage 1+2: Route Decomposer + TISA 캐리어별 요율 매핑 | Riley | 🔔 | 2026-05-25 |
| 087 | 환적 상태 추적 A안 (Transit Tracking per Leg) | B_Kai | 🚫 | — |
| 088 | 개인정보 활용동의 체크박스 (회원가입 Wizard) | D_Kai | 🔔 | 5a21467 · 220/220 · migration+UI+action+i18n 4개국어 ✅ |
| 046 | Rate Limiting 도입 (Phase C 유예 재활성화) | Riley | 🔔 | 2026-05-25 |

> 🚫 IMP-086·087: IMP-084 완료 후 착수 가능
> 🚫 IMP-087: IMP-085 완료 후 착수 가능

**Phase K 완료**: 5 / 6 (83.3%) — IMP-084·085·086·088·046 🔔

---

## 삭제/병합 처리

| IMP | 처리 내용 |
|:---:|:---------|
| 018 | 삭제/병합 처리됨 (Riley 원번 IMP-026과 무관) |

---

## 전체 진척 요약

| Phase | 완료 | 전체 | 진행률 | 비고 |
|:-----:|:----:|:----:|:------:|:-----|
| A | 10 | 10 | 100% ✅ | IMP-071·072·077 ✅ (TASK-068·073 Aiden 승인) |
| B | 9 | 10 | 90% | IMP-053 ➖ (IMP-047 통합) |
| C | 6 | 7 | 85.7% | IMP-046 ⬜ (Phase K 재활성화 — TASK-090) |
| D | 8 | 8 | 100% ✅ | |
| E | 7 | 7 | 100% ✅ | |
| F | 11 | 11 | 100% ✅ | |
| G | 0 | 2 | 0% | IMP-028·069 미착수 (Future — 통관 연계) |
| H | 5 | 5 | 100% ✅ | |
| I | 5 | 5 | 100% ✅ | IMP-073~077 전량 완료 (TASK-069~073 ✅) |
| J | 4 | 4 | 100% ✅ | IMP-080 ✅ · IMP-081 ✅ · IMP-082 ✅ · IMP-083 ✅ |
| K | 1 | 6 | 16.7% | IMP-084·085·086·088·046 🔔 |
| **합계** | **67** | **74** | **90.5%** | Phase K 6건 기준 — IMP-084·085·086·088·046 🔔 |

> 미완료 IMP: IMP-086·087 🚫 블로커 · IMP-028·069(Future — 통관 연계)
> 2026-05-25 기준 업데이트 (Aiden — Phase K 착수, TASK-088~096 발령)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:----:|:------|:-----|
| 2026-05-24 | Aiden (Claude) | IMP-082 ✅ 확정 — TASK-076 ✅ 승인. Phase J 4/4 100% 완료. TASK-077(IMP-083) ⬜ 블로커 해제 |
| 2026-05-24 | Riley (Gemini) | IMP-082 🔔 재작업 완료 — estimateFreightCost 복원, 순환참조 해결 (3d9e915) |
| 2026-05-25 | Aiden (Claude) | Phase K 착수 — IMP-084~088 신규 등록, IMP-046 재활성화. TASK-088~096 발령. IMP-046 Phase C에서 ⬜(Phase K)로 전환 |
| 2026-05-24 | Riley (Gemini) | IMP-082 🔔 완료 보고 — Composite Pricing Engine 구현 (b859677) |
| 2026-05-23 | D_Kai (OpenCode) | IMP-080 🔔 완료 — 지능형 라우팅 DB 스키마 4 테이블 · mig + RLS + seed · 219/219 (TASK-074) |
| 2026-05-23 | B_Kai (OpenCode) | IMP-074 🔔 재작업 완료 — zh/ja i18n + RBAC · 90ca21d · 219/219 (TASK-070 반려 대응) |
| 2026-05-23 | B_Kai (OpenCode) | IMP-075 🔔 완료 보고 — Packing List SCR-031 · ed7dc67 · 219/219 (TASK-071) |
| 2026-05-23 | B_Kai (OpenCode) | IMP-074 🔔 완료 보고 — 출고·운송장 SCR-041 · WAREHOUSED→RELEASED · a746aee · 219/219 PASS (TASK-070) |
| 2026-05-23 | Riley (Gemini) | IMP-073 🔔 완료 보고 — 입고 처리 화면 SCR-040 개발 완료 (TASK-069). 218/218 PASS |
| 2026-05-15 | Aiden (Claude) | 최초 작성 — 52개 IMP 전수 등재, IMP-036 완료 반영, IMP-038 진행 중 표시 |
| 2026-05-15 | B_Kai (GLM Big Pickle) | IMP-038 완료 — CLAIMED Enum 등록 + Status Machine 전이 규칙 + claims.ts canChangeStatus 연동 |
| 2026-05-15 | Aiden (Claude) | IMP-048 ✅ PASS 확정 — 대시보드 MOCK_ORDERS 제거 + getDashboardStats() 실DB 연동 + 통계 쿼리 역할 필터 보완 |
| 2026-05-15 | Aiden (Claude) | IMP-027 ✅ PASS 확정 — /maintenance 페이지 신규 + middleware 루프 방지 + i18n ko/en 완비 / IMP-034a ❌ 반려 — git rm --cached 미실행 |
| 2026-05-15 | Aiden (Claude) | IMP-034a·037 ✅ FULL PASS 확정 — .gitignore 명시 + Auth 설정 강화. (※ .env.local 최초부터 미추적 — Aiden 초기 반려 오류 인정) 194/194 PASS |
| 2026-05-15 | Riley (Gemini) | IMP-034a·037 보완 완료 — .env.local 추적 해제(ls-files 비어있음 확인) + Auth 설정 강화 |
| 2026-05-15 | Riley (Gemini) | IMP-035-RL-FIX-2 완료 — SECURITY DEFINER 복원 migration + MANAGER RBAC 추가. 199/199 PASS. |
| 2026-05-15 | Aiden (Claude) | IMP-035 ✅ PASS 확정 — `20260515235000_fix_security_definer_org_rpcs.sql` 검증 완료. Phase A 4/7. 전체 9/52. |
| 2026-05-16 | B_Kai (GLM Big Pickle) | IMP-055 완료 — 누락 인덱스 4종 추가 (zen_orders shipper_id/status, zen_invoices shipper_id, zen_order_costs order_id) |
| 2026-05-16 | B_Kai (GLM Big Pickle) | IMP-055-BK-SUP — D_Kai 권장 인덱스 보완 4종 추가 (zen_profiles org_id, zen_voc 복합, zen_qna 복합, zen_invoices 복합) |
| 2026-05-16 | Aiden (Claude) | IMP-055 ✅ PASS 확정 — BK 자체 4종 + D_Kai 권장 4종 총 8종 중복 없음 확인. Phase A 집계 보정(4/7→7/7). 전체 14/52(26.9%) |
| 2026-05-16 | Aiden (Claude) | Phase H 신설 — IMP-064~068 (Ring EXP-IMP-RG-FIX 도출 5건) 등재. 전체 52→57개, 진행률 26.9%→24.6% |
| 2026-05-16 | Aiden (Claude) | 역량 평가 목적 Agent 공평 재배분 — Riley 전담→4 Agent 균등 분배. Phase C·D·E·F·H 담당 전면 조정 |
| 2026-05-20 | B_Kai (OpenCode) | IMP-014·058 ✅ PASS / IMP-033 🔔 검토 요청 — Server Actions 4그룹 도메인 분할 완료 (4커밋·206/206 4회) |
| 2026-05-20 | Aiden (Claude) | IMP-033 ✅ PASS — B_Kai TASK-019 승인. Phase D 4/8(50%). IMP-016 블로커 해제(D1 전량 완료). 전체 18/57(31.6%) |
| 2026-05-20 | Aiden (Claude) | IMP-045 ✅ PASS — Ring TASK-014 승인. 세션 전체 IMP_PROGRESS 동기화: B(019·039·040 ✅), C(015 언블록·045 ✅), D(059·031·003 ✅ 6/8), H(064~067 ✅ 4/5). 전체 32/57(56.1%) |
| 2026-05-21 | Riley (Gemini) | IMP-030 완료 보고 — 정산 엔진 SRP 분할 (3개 클래스 SlabRateCalculator·CostAggregator·SettlementValidator + Facade 분리) |
| 2026-05-21 | Aiden (Claude) | Phase G 5차 검토 완료 — IMP-016 ✅ PASS(TASK-029 B_Kai 5차 재작업 최종 승인·38개 함수 전환). IMP-022 ✅ PASS(TASK-037 D_Kai 재작업 승인·Framer Motion→CSS). Phase D 8/8(100%)·Phase E 7/7(100%) 완료 |
| 2026-05-21 | Aiden (Claude) | Phase G 6차 검토 완료 — IMP-056 ✅ PASS(TASK-032 Ring 재작업 승인·escapeHtml 7곳 적용·Ring 5차 위반·신규 할당 중단). TASK-038 발령(B_Kai 재교육 세션). Phase C 4/7(57.1%). 전체 36/57(63.2%) |
| 2026-05-21 | Riley (Gemini) | IMP-050·052 ✅ PASS 승인 반영 및 대시보드 갱신 (TASK-041/043) |
| 2026-05-21 | D_Kai (OpenCode) | IMP-012 🔔 완료 보고 — TASK-045 master/admin codes-client dedup · 211/211 · 커밋 63ce099 |
| 2026-05-21 | B_Kai (OpenCode) | IMP-024 ✅ PASS — TASK-049 공통 도메인 UI 컴포넌트 라이브러리화 완료 · ZenStatusBadge + ZenCurrencyDisplay · Ring 재할당 → B_Kai · 211/211 FULL PASS |
| 2026-05-21 | Aiden (Claude) | IMP-069 신규 등록 — IBC 어댑터 구현 (Phase G 추가). An_08/An_09 분석 완료 기반. 착수 조건: IBC Sandbox 계정 + shxk 정체 확인. Phase G 0/1→0/2, 전체 56→57개 |
| 2026-05-23 | Riley (Gemini) | Phase I 5/5 ✅ 전량 승인 반영 + Phase A 100% 확정 — IMP-073~077 ✅, IMP-071·072·077 ✅, 전체 61/68 89.7%, Phase J IMP-080 ⬜(TASK-074 진행중) |
| 2026-05-24 | B_Kai (OpenCode) | IMP-081 🔔 재작업 완료 — DatabaseRouteAdapter 구현 (d86c6af) + docs 재커밋. Phase J 2/4 50% |
| 2026-05-24 | B_Kai (OpenCode) | IMP-083 🔔 완료 — Admin 요율 카드 관리 UI (27de276 · 220/220 · 10파일). NaviSidebar + i18n + Server Actions + UI 3컴포넌트 |
| 2026-05-24 | Aiden (Claude) | IMP-083 ✅ 확정 — TASK-077 ✅ 승인. Phase J 4/4 100% 완료. TASK-078(UAT_10) ⬜ D_Kai 착수 가능. 전체 65/68 (95.6%) |
| 2026-05-24 | Aiden (Claude) | IMP_PROGRESS 상태 동기화 — IMP-071·072·077·082·083 🔔→✅ 정정 (TASK-068·073·076·077 Aiden 승인 누락 반영). Phase A 100% · Phase J 100% 확정 |
| 2026-05-25 | Riley (Gemini) | IMP-086 🔔 재보고 — 반려 사항 조치 (DoD 문서 커밋 해시 283e1b9 기재) |
| 2026-05-25 | Aiden (Claude) | IMP-086 ❌ 반려 — DoD 문서 커밋 해시 미기재 R-17 위반. 최소 재작업 지시 |
| 2026-05-25 | Riley (Gemini) | IMP-086 🔔 완료 — 303 Stage 1+2 Route Decomposer + TISA 요율 매핑 완료 (a1c76cb) |
| 2026-05-25 | D_Kai (OpenCode) | IMP-088 🔔 완료 — migration·Wizard 체크박스·server action·i18n 4개국어 · 5a21467 · 220/220. Phase K 1/6 16.7%. 전체 66/74 89.2% |
| 2026-05-25 | Riley (Gemini) | IMP-046 🔔 완료 — 하이브리드 Rate Limiting 도입 (DB+InMemory) · 226/226 (TASK-090) |

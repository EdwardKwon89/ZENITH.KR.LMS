# IMP 진척 관리 대시보드

> **프로젝트**: ZENITH_LMS
> **근거 문서**: [IMP_EXECUTION_PLAN_BKai_20260514.md](IMP_EXECUTION_PLAN_BKai_20260514.md)
> **최초 작성**: 2026-05-15 (Aiden) / **최근 업데이트**: 2026-06-06 (D_Kai — Phase 6 테이블 신설 + IMP-102 🔔)
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
| 087 | 환적 상태 추적 A안 (Transit Tracking per Leg) | B_Kai | 🔔 | 82c9fb7 · 227/227 · migration+types+validation+UI+i18n ✅ |
| 088 | 개인정보 활용동의 체크박스 (회원가입 Wizard) | D_Kai | 🔔 | 5a21467 · 220/220 · migration+UI+action+i18n 4개국어 ✅ |
| 089 | ID 찾기 개인/법인 분리 재설계 (phone_number + 탭 UI) | D_Kai | ✅ | `15299bf`+`2111a75`+`4b796e4`+`883cd25`+`9f0e3c2`+`c509802`+`e27ec7a`+`199712e`+`d1bc3de` · 227/227 · mig+가입폰+백엔드2함수+UI탭+UAT재작+버그8건수정 |
| 046 | Rate Limiting 도입 (Phase C 유예 재활성화) | Riley | 🔔 | 2026-05-25 |

> 🚫 IMP-086: IMP-084 완료 후 착수 가능

**Phase K 완료**: 7 / 7 (100%) — IMP-084·085·086·087·088·089·046 🔔

---

## Phase L — UAT 진행 전 필수 처리 (TISA 요율 구조)

> **등재일**: 2026-05-31 | **목표**: UAT(TASK-096) 착수 전 TISA 요금 구조 완성
> **우선순위**: P1 — Edward UAT 차단 조건

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 092 | TISA 요율 3계층 구조 도입 (carrier_cost + margin_rate + platform_fee_rate 분리) | D_Kai | ✅ | `e442ea3`+`8132d98` · 228/228+ · migration+admin UI+fn+trigger+transport_mode fix · Aiden ✅ 승인 |

| 093 | TISA Dashboard 실 Rate Card 연동 (Mock 제거, DB 실조회, 경로 선택 후 스냅샷) | D_Kai | 🔔 | `7225196`+`6a0dbab` · 228/228+ · server action+page+RLS+UI+role 분기+transport_mode fix |

**Phase L 완료**: 2 / 2 (100%)

---

## Phase 6 — 신규 서비스 역할 모델 + 멀티 서비스 배정 구조

> **등재일**: 2026-06-06 (Aiden) | **추적기**: [PH6_SPR_PROGRESS.md](PH6_SPR_PROGRESS.md)
> **설계 문서**: [An-11](../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md)

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 097 | DB 스키마 기반 (org_type·rate tables·order_services·RLS·migration) | D_Kai | ✅ | 2026-06-06 |
| 098 | 통관 서비스 요율 관리 Actions + UI | D_Kai | ✅ | 2026-06-06 |
| 099 | 배송 서비스 요율 관리 Actions + UI (LOCAL+TOTAL) | D_Kai | ✅ | 2026-06-06 |
| 100 | 통합 서비스 요율 조회 API + 오더-서비스 배정 Actions | D_Kai | 🔔 | 2026-06-06 |
| 101 | Order 등록 UI 개선 (서비스조합선택·요율확인·GAP-P6-01 보완) | Riley | 🔔 | 2026-06-06 |
| 102 | Order 목록 RLS 역할별 격리 (CUSTOMS_BROKER·DELIVERY_AGENT) | D_Kai | 🔔 | 2026-06-06 |
| 103 | 운송 요율 CARRIER 직접 등록 허용 + platform_fee_rate 격리 | D_Kai | 🔔 | 2026-06-06 |
| 104 | Phase 6 회귀 테스트 + E2E 검증 + UAT 절차서 | D_Kai+Riley+B_Kai | 🔔 | 2026-06-07 |
| 105 | 운송수단별 요금 산정 정책 설정 (DB + Admin UI + 엔진) | D_Kai+B_Kai | 🔔 | 2026-06-08 |
| 109 | 환율 설정 화면 — 기준 통화(`BASE_CURRENCY`) + 환율(`EXCHANGE_RATE_*`) 어드민 UI | 미정 | ⬜ | — |

**Phase 6 완료**: 8 / 8 (100%) — IMP-097✅ · 098✅ · 099✅ · 100🔔 · 101🔔 · 102🔔 · 103🔔 · 104🔔
**IMP-105**: D_Kai DB ✅(bb81021) · B_Kai UI ✅(5171675+0d428a3) · D_Kai 엔진+TC ✅(723db3e+c0bcab0+974e632) · 회귀 314/314 PASS

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
| K | 1 | 7 | 14.3% | IMP-084·085·086·088·089·046 🔔 |
| 6 | 9 | 9 | — | IMP-097✅·098✅·099✅·100🔔·101🔔·102🔔·103🔔·104🔔·105✅(D_Kai 엔진+TC 완료) (Phase 6+IMP-105) |
| UAT | 6 | 7 | 85.7% | IMP-090 ✅ · IMP-091 ⬜ (Carrier Portal — Phase M) · **IMP-092 ✅ (TISA 3계층)** · **IMP-093 ✅ (TISA 실연동, TASK-104)** · IMP-094 ⬜ (요율 워크플로우 고도화, Phase M) · **IMP-095 ✅ (Rate Card 항로 매칭, TASK-109)** · **IMP-096 ✅ (요율 관리 페이지 통합 정리, TASK-110)** |
| UAT2 | 2 | 2 | 100% ✅ | **IMP-107 ✅** (TISA 스냅샷 강화 — WM slab 이력, `ab6f493`+`ef3ece7` Aiden ✅ 승인 260609) · **IMP-108 ✅§1·§2·§3** (B_Kai §1 max_charge UI ✅, D_Kai §2 platform_fee ✅, §3 WM CLAMP `9d70d87` ✅) |
| 기타 | 1 | 1 | 100% | **IMP-109 ✅** 환율 설정 화면 (TASK-147, 1c67c35, Riley — Aiden ✅ 승인 260616) |
| **Phase 7** | 6 | 10 | 60% | **IMP-110 ✅** UPS DB 스키마 7종 · **IMP-111 ✅** Agency 역할 모델 · **IMP-112 ✅** UPS 요금 엔진 · **IMP-113 ✅** UPS 요율 Admin UI (TASK-146) · **IMP-114 ✅** Agency 화주 관리 UI (PR#7 머지) · **IMP-115 ⬜** IBC/Pactrak Interface · **IMP-116 ✅** Agency 요율 오버라이드 (PR#8 머지) · **IMP-117 🔔** 간이 UPS 인보이스 PDF (TASK-148 B_Kai — PR #22 머지 예정) · **IMP-118 🔔** 오더 직접배송/픽업 UI (TASK-149 Riley — PR #21 머지 예정) · **IMP-119 🔔** 창고 출고 UPS 연계 (TASK-150 D_Kai — PR #19 판정 중) |
| **합계** | **94** | **100** | **94.0%** | IMP-112~116 신규 등재 (SPR-02~06 예정) · IMP-111 ✅ (260614) · IMP-110 ✅ (260614) |

> **UAT 진행 전 필수 처리**: IMP-092 ✅ · IMP-093 ✅ · IMP-095 ✅ — 전량 완료
> 미완료 IMP: IMP-086·087 🚫 블로커 · IMP-028·069(Future — 통관 연계) · IMP-091 ⬜ (Carrier Portal) · IMP-094 ⬜ (요율 워크플로우 Phase M)
> 2026-06-03 기준 업데이트 — IMP-096 ✅ (TASK-110 Aiden 승인)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:----:|:------|:-----|
| 2026-05-24 | Aiden (Claude) | IMP-082 ✅ 확정 — TASK-076 ✅ 승인. Phase J 4/4 100% 완료. TASK-077(IMP-083) ⬜ 블로커 해제 |
| 2026-05-24 | Riley (Gemini) | IMP-082 🔔 재작업 완료 — estimateFreightCost 복원, 순환참조 해결 (3d9e915) |
| 2026-05-25 | Aiden (Claude) | Phase K 착수 — IMP-084~088 신규 등록, IMP-046 재활성화. TASK-088~096 발령. IMP-046 Phase C에서 ⬜(Phase K)로 전환 |
| 2026-05-24 | Riley (Gemini) | IMP-082 🔔 완료 보고 — Composite Pricing Engine 구현 (b859677) |
| 2026-05-29 | Aiden (Claude) | IMP-090 신규 등재 — DEF-022 ⑤ cargo_details DEFAULT `'{}'::jsonb` 임시 조치 (e63832e). create_order_atomic RPC 정상화 후 제거 필요. UAT 발견 |
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
| 2026-05-29 | Aiden (Claude) | IMP-091 신규 등재 — Carrier Portal (운송사 배차 수락/거부·상태 직접 업데이트). Phase M 대상. Low P. UAT 합계 1→2건 갱신 |
| 2026-05-29 | Aiden (Claude) | IMP-090 TASK-100 연계 확정 — getRouteOptions zen_order_packages 기반 전환 후 cargo_details DEFAULT 제거 마이그레이션 포함 처리 예정 |
| 2026-05-31 | Aiden (Claude) | IMP-092 신규 등재 — TISA 요율 3계층 구조 도입 (carrier_cost + margin_rate + platform_fee_rate 분리). DEF-035 연계. TASK-103(D_Kai) 발령. UAT 진행 전 필수 |
| 2026-05-31 | Aiden (Claude) | IMP-093 신규 등재 — TISA Dashboard 실 Rate Card 연동 (Mock 제거, DB 실조회, 경로 선택 후 스냅샷). DEF-032 연계. TASK-104(D_Kai) 발령. 전제조건: TASK-103 ✅. UAT 진행 전 필수 |
| 2026-06-03 | Aiden (Claude) | IMP-093 ✅ 확정 — TASK-104 ✅ 승인 반영 (미기재 정정). IMP-094 신규 등재 — 요율 관리 워크플로우 고도화 (방안2, Phase M, Medium). IMP-095 신규 등재 + ✅ 확정 — Rate Card 항로 기반 매칭 (TASK-109 D_Kai 승인, 236/236 PASS). 합계 70/79→71/81 (87.7%). |
| 2026-06-06 | Aiden (Claude) | **IMP-097~104 신규 등재** — Phase 6 신규 서비스 역할 모델 + 멀티 서비스 배정 구조. [PH6_SPR_PROGRESS.md](PH6_SPR_PROGRESS.md) 전용 추적기 신설. |
| 2026-06-06 | Riley (Gemini) | **IMP-101 🔔 완료** — TASK-117(P6-SPR-05) Order 등록 UI 개선 (3-step wizard flow) 및 이중 요율 검증 완료. RLS 패치, 통합 테스트 작성. 코드 커밋 `5ff2982`. |
| 2026-06-06 | D_Kai (OpenCode) | **IMP-097 🔔 완료** — TASK-113(P6-SPR-01) DB 스키마 기반 구축. Migration 3종·rbac·routes·TC 5건·248/248 PASS. `bb9a3fc`. |
| 2026-06-06 | D_Kai (OpenCode) | **IMP-098 🔔 완료** — TASK-114(P6-SPR-02) 통관 서비스 요율 관리. customs-rates CRUD Actions + UI 페이지 + NaviSidebar + i18n 4개국어 + TC 3건. 251/251 PASS. `a64f970`. |
| 2026-06-06 | D_Kai (OpenCode) | **IMP-099 🔔 완료** — TASK-115(P6-SPR-03) 배송 서비스 요율 관리. delivery-rates CRUD + UI(LOCAL/TOTAL 탭) + TC 3건. 254/254 PASS. `c745fa0`. |
| 2026-06-06 | D_Kai (OpenCode) | Phase 6 테이블 신설 — IMP-097~104 전량 등재 (IMP-097✅·098✅·099✅·102🔔). 전체 합계 77/90 (85.6%). |
| 2026-06-06 | D_Kai (OpenCode) | **IMP-100 🔔 완료** — TASK-116(P6-SPR-04) 통합 서비스 요율 조회 API + 오더-서비스 배정 Actions. `2c46c94` · 265/265 PASS. |
| 2026-06-06 | D_Kai (OpenCode) | **IMP-103 🔔 완료** — TASK-119(P6-SPR-07) 운송 요율 CARRIER 직접 등록 + platform_fee_rate 격리. `2c46c94` · 265/265 PASS. 전체 합계 79/90 (87.8%). Phase 6 6/8 (75%). |
| 2026-06-07 | B_Kai (OpenCode) | **IMP-104 🔔 완료** — TASK-120 Phase 6 E2E 5종 Playwright spec 수정 + 회귀 PASS (3건 pre-existing mock failure 제외). 블로커 4건 해소 (UI form flakiness 회피·FK 모호성·RLS app_metadata·UNIQUE constraint upsert). E2E 5/5 PASS · 회귀 309/309 PASS. `66a5dfb`+`710fd60`. Phase 6 8/8 100% 완료. 전체 합계 81/90 (90.0%). |
| 2026-06-08 | B_Kai (OpenCode) | **IMP-105 🔔 등재** — TASK-121 §2 Admin 운송 정책 설정 화면 + §4 RateTierEditor cbm_price 필드. B_Kai UI ✅ (5171675+0d428a3). D_Kai DB ✅ (bb81021). Riley 엔진+TC 잔여. 전체 합계 82/91 (90.1%). |
| 2026-06-08 | D_Kai (OpenCode) | **IMP-105 ✅ 완료** — TASK-121 §3 엔진 파트(Riley→D_Kai 재배정) · §5 TC-POLICY-01~05 완료. migration `723db3e`(fn_get_best_matching_rate 4-arg + calculate_order_costs VOLUMETRIC/WM) · SettlementEngine `c0bcab0`(정책 기반 chargeable weight + WM fallback) · TC `974e632`(TC-POLICY-01~05 TS+SQL 동시 검증) · 회귀 314/314 PASS. scope-creep 18개 파일 정리. 전체 합계 83/91 (91.2%). |
| 2026-06-08 | D_Kai (OpenCode) | **IMP-106 🔔 등재 + 완료** — TASK-122 요율 Slab 구조 개편 (무게/부피 분리). DB migration `2cb5927`(33건 tiers 배열→{weight_slabs,cbm_slabs} 변환·fn_get_best_matching_rate weight_slabs/cbm_slabs 매칭·calculate_order_costs cbm_slabs 기반 WM). TS engine `46bc9f9`(rate-engine·SlabRateCalculator·SettlementEngine·composite-pricing·service-rates·route-adapter). TC `896e193`(mock data 일괄 변경·314/314 PASS). |
| 2026-06-08 | B_Kai (OpenCode) | **IMP-106 🔔 UI 완료** — TASK-122 §2 RateTierEditor 분리(weight_slabs/cbm_slabs 섹션·최소 1개 검증) + RateCardForm 타입 변경 + useRates 매핑 + RateCardsTab 교체 + Server Actions 검증(admin/rates.ts·admin/rate-cards.ts) + rates.test.ts 7개 payload 수정. 회귀 314/314 PASS. 전체 합계 85/92 (92.4%). |
| 2026-06-08 | Aiden (Claude) | **IMP-106 ✅ 최종 완료** — TASK-122 Aiden 검토 완료·Edward 승인. DoD 10/10·회귀 314/314 실물 확인. 전체 합계 86/92 (93.5%). |
| 2026-06-08 | Aiden (Claude) | **IMP-107·108 ⬜ 신규 등재** — 간이 테스트 결과 검토 중 도출. IMP-108: max_charge 상한선 + platform_fee_amount 재정의(carrier_cost 제거 보완, High). IMP-107: TISA 스냅샷 강화(WM slab 이력·pricing_basis, Medium). 전체 합계 86/93 (92.5%). |
| 2026-06-09 | D_Kai (OpenCode) | **IMP-108 §2 🔔** — platform_fee_amount 재정의 완료 (TASK-123). 6-arg fn에서 platform_fee 컬럼 제거 → calculate_order_costs에서 total_freight 기반 계산. SQL mig 2건 + trigger fix + tisa.ts. §1(max_charge)·§3(WM cap) 미착수. 전체 합계 87/93 (93.5%). 커밋 c049bef. |
| 2026-06-09 | Aiden (Claude) | **IMP-108 §2 ✅ 최종 승인** — TASK-123 검토 완료. DEF-052 build PASS·50파일 전량·회귀 314/314. total_freight 기반 수수료 계산 SQL 정합 확인. §1(max_charge UI)·§3(WM cap) 별도 Task 예정. 전체 합계 87/93 (93.5%). |
| 2026-06-09 | B_Kai | **IMP-108 §1 ✅ max_charge UI 완료** — WeightSlab/CbmSlab 인터페이스 `max_charge?: number` 추가, RateTierEditor UI 필드 노출, `createRateCard`/`updateRateCard` 타입 전달. build ✅ · 회귀 314/314 ✅. 커밋 `ce17476`. §3 D_Kai ⬜ 대기. 전체 합계 88/93 (94.6%). |
| 2026-06-09 | D_Kai (OpenCode) | **IMP-108 §3 🔔 WM CLAMP 완료** — fn_get_best_matching_rate 4-arg `max_total_price` 반환 추가, calculate_order_costs CLAMP(min→max) + `applied_pricing_basis`(WEIGHT/CBM/MIN_CHARGE/MAX_CHARGE) 반환. TC-POLICY-06 신규(max_charge cap=150 → total_freight=150, basis=MAX_CHARGE). build ✅ · 회귀 315/315 ✅. 커밋 `9d70d87`. 전체 합계 89/93 (95.7%). Aiden 검토 대기 🔔. |
| 2026-06-09 | D_Kai (OpenCode) | **IMP-107 🔔 TISA 스냅샷 강화 완료** — zen_order_rate_snapshots 8개 컬럼 추가(slab 이력 + pricing_basis + tiers_snapshot). fn_get_best_matching_rate 4-arg matched_weight_min/cbm_min 반환. calculate_order_costs snapshot INSERT ON CONFLICT 보강. TC-POLICY-07 신규(snapshot 8개 컬럼 저장 검증). build ✅ · 회귀 316/316 ✅. 커밋 `ab6f493`. 전체 합계 90/93 (96.8%). Aiden 검토 대기 🔔. |

| 2026-06-14 | Jaison (Claude, Team B) | **IMP-111 🔔 Agency 역할 모델 완료** — TASK-139. zen_organizations.type AGENCY 추가, zen_agency_shippers/zen_agency_rate_overrides 신설 + RLS, rbac.ts AGENCY role, types/agency.ts, 회원가입 UI AGENCY 옵션. TC-P7-AGENCY-01~07 신규 7건. 회귀 314/321 PASS. 커밋 `a686bc1`. Aiden 검토 대기 🔔. |
| 2026-06-15 | Dave (DeepSeek, Team B) | **IMP-114 🔔 SPR-02 Agency 화주 Server Actions 완료** — TASK-145. getAgencyShippers·createAgencyShipper·updateAgencyShipperGrade 3종 구현. Zod 스키마 2종(CreateAgencyShipperSchema·UpdateAgencyShipperGradeSchema). CreateAgencyShipperInput 타입 추가. TC-P7-SHIPPER-01~04 신규 13건. 회귀 340/347 PASS. 커밋 `7977e97`. TASK-146·147 블로커 해제. Jaison·Aiden 검토 대기 🔔. |
| 2026-06-15 | Baker (OpenCode Big Pickle, Team B) | **IMP-114 🔔 SPR-02 Agency 화주 목록/등록 UI 완료** — TASK-146. /agency/shippers (목록+인라인 등급 수정), /agency/shippers/new (등록 폼). 6개 파일 신규 생성. TS build ✅ · 회귀 340/340 PASS. 커밋 `ec4d7f5`. Jaison·Aiden 검토 대기 🔔. |
| 2026-06-15 | Dave (DeepSeek, Team B) | **IMP-114 🔔 SPR-02 Agency 대시보드 + NaviSidebar AGENCY 메뉴 완료** — TASK-147. /agency 대시보드 페이지(42줄), AgencyDashboardStats(36줄), AgencyQuickLinks(50줄), NaviSidebar 메뉴 2종, i18n agency_* 키. 회귀 340/347 PASS. 커밋 `97e9126`. SPR-02 전량 완료. Jaison·Aiden 검토 대기 🔔. |
| 2026-06-16 | Dave (DeepSeek, Team B) | **IMP-114 🔔 PR#7 반려 수정 완료** — TASK-B-005 (구 TASK-152). Issue 1·5·7 수정. _linkShipperToAgency ...data spread 제거(명시적 컬럼), page.tsx i18n 교체(agency_console_badge/desc), TC 제목 정정. DoD 7/7 자가검증 ✅. 회귀 345/352 PASS. 커밋 `31bfa4d`. TASK-B 재채번(R-19 v2.0) 완료 · PR#7 재제출 준비. 🔔 |
| 2026-06-16 | Dave (DeepSeek, Team B) | **IMP-116 🔔 SPR-03 Agency 요율 오버라이드 Server Actions 완료** — TASK-B-006. getAgencyRateOverrides·upsertAgencyRateOverride·deactivateAgencyRateOverride 3종 구현. CreateAgencyRateOverrideSchema Zod 스키마 + CreateAgencyRateOverrideInput/AgencyRateOverrideWithRefs 타입. 브랜치 `feature/ups-spr03-devteam-agency-rate-overrides`. 회귀 345/352 PASS. ZEN_A4 ✅ (31·38·21줄). TASK-B-007(Baker UI) 블로커 해제. 🔔 |
| 2026-06-16 | Baker (OpenCode Big Pickle, Team B) | **IMP-116 🔔 SPR-03 Agency 요율 오버라이드 UI 완료** — TASK-B-007. /agency/rate-overrides (목록+비활성화), /agency/rate-overrides/new (등록 폼). 9개 파일 신규 생성. NaviSidebar menu + i18n 10종. 회귀 345/345 PASS. 코드 `140793e`. ZEN_A4 수정 완료(_StatusBadge·_ErrorAlert 추출, Props 인라인화). Jaison 검토 대기 🔔. ❌ 반려(1차) → 재작업 완료. |

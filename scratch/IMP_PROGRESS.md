# IMP 진척 관리 대시보드

> **프로젝트**: ZENITH_LMS
> **근거 문서**: [IMP_EXECUTION_PLAN_BKai_20260514.md](IMP_EXECUTION_PLAN_BKai_20260514.md)
> **최초 작성**: 2026-05-15 (Aiden)
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

**Phase A 완료**: 7 / 7 (100%) ✅

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
| 047 | 트랜잭션 부재 확장 (status/지갑) | Riley | 🔔 | 2026-05-20 |
| 052 | dissolveMasterOrder 부분 실패 | Riley | 🚫 | — |
| 053 | 지갑 결제 롤백 불완전 | Riley | 🚫 | — |

> 🚫 IMP-047: IMP-019 완료 후 착수 가능 / IMP-052·053: IMP-047 완료 후 착수 가능

**Phase B 완료**: 7 / 10 (70%)

---

## Phase C — Observability & Guardrails

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 013 | console→logger 교체 (53개 파일) | Riley | ✅ | 2026-05-20 |
| 015 | middleware.ts console.log 제거 | Riley | 🔔 | — |
| 025 | Server Actions 에러 래퍼 | Riley | ✅ | 2026-05-20 |
| 045 | 무제한 리스트 페이지네이션 (18곳) | Ring | ✅ PASS | 2026-05-20 |
| 046 | Rate Limiting 도입 | B_Kai | 🚫 | — |
| 051 | 감사 추적 (마스터/인보이스/통관) | Ring | ⬜ | — |
| 056 | 이메일 HTML 인젝션 방지 | Ring | ⬜ | — |

> 🚫 IMP-015: IMP-013 완료 후 착수 가능 / IMP-046: Aiden 인프라 결정 후 착수 가능 (Phase C 착수 전)

**Phase C 완료**: 3 / 7 (42.9%)

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
| 016 | Repository 패턴 | B_Kai+D_Kai | 🔔 | 2026-05-20 |
| 059 | Supabase 클라이언트 중복 제거 | D_Kai | ✅ PASS | 2026-05-20 |

### D3 — 구조 개선

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 003 | middleware.ts → proxy.ts 마이그레이션 | D_Kai | ✅ PASS | 2026-05-20 |
| 030 | 정산 엔진 SRP | Riley | ⬜ | — |
| 031 | RBAC 이중 상태 정리 | D_Kai | ✅ PASS | 2026-05-20 |

> 🚫 IMP-016: D1(IMP-033·058) 완료 후 착수 가능

**Phase D 완료**: 7 / 8 (87.5%)

---

## Phase E — Performance Optimization

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 020 | Feature Flags 캐싱 | D_Kai | ✅ | 2026-05-20 |
| 021 | 미들웨어 DB 호출 최적화 | D_Kai | ⬜ | — |
| 022 | NaviSidebar 번들 최적화 | D_Kai | ⬜ | — |
| 048 | Mock 데이터 제거 | B_Kai | ✅ | 2026-05-15 |
| 054 | N+1 쿼리 7곳 | B_Kai | ✅ PASS | 2026-05-20 |
| 055 | 인덱스 누락 4종 | B_Kai | ✅ PASS | 2026-05-16 |
| 062 | SELECT * → 명시적 컬럼 (112곳) | B_Kai | ✅ PASS | 2026-05-20 |

**Phase E 완료**: 2 / 7

---

## Phase F — Type/UI/Test Quality

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 012 | Master/Admin 코드 중복 | D_Kai | ⬜ | — |
| 017 | Error Boundary 4개 추가 | B_Kai | ✅ | 2026-05-20 |
| 023 | i18n 번역 키 타입 안정성 | D_Kai | ⬜ | — |
| 024 | 공통 UI 컴포넌트 라이브러리화 | Ring | ⬜ | — |
| 027 | 점검 모드 페이지 | B_Kai | ✅ | 2026-05-15 |
| 029 | TS 타입 안전성 (any 퇴출) | D_Kai | ⬜ | — |
| 032 | 다국어 번역 커버리지 감사 + CI 게이트 | B_Kai | ⬜ | — |
| 049 | 이중 프로필 테이블 정리 | D_Kai | ⬜ | — |
| 050 | HELD→이전상태 복구 로직 | Riley | ⬜ | — |
| 060 | RETURNED 상태 전이 확장 | Ring | ⬜ | — |
| 061 | PDF 경로 충돌 방지 | B_Kai | ⬜ | — |
| 063 | ZenUI.tsx 7개 분할 | B_Kai | ✅ | 2026-05-20 |

**Phase F 완료**: 3 / 12 (25%)

---

## Phase G — Future

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 028 | UNI-PASS EDI 연동 | Aiden+Riley | ⬜ | — |

**Phase G 완료**: 0 / 1

---

## Phase H — Security Hardening 2차 (Ring 도출)

> Ring (Qwen3.6) EXP-IMP-RG-FIX (2026-05-16) 도출 — 보안·인증·입력 검증 보완

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 064 | API Route Handler 스택 트레이스 프로덕션 노출 | Ring | ✅ PASS | 2026-05-20 |
| 065 | Excel Export POST 엔드포인트 인증 미적용 | Ring | ✅ PASS | 2026-05-20 |
| 066 | HTTP Security Headers 미설정 (CSP·HSTS·X-Frame) | Ring | ✅ PASS | 2026-05-20 |
| 067 | Server Action 입력 Zod 검증 부재 (6개 액션) | Ring | ✅ PASS | 2026-05-20 |
| 068 | Signup 프로필 생성 Race Condition (setTimeout 500) | Ring | 🔔 | 2026-05-20 |

**Phase H 완료**: 4 / 5 (80%)

---

## 삭제/병합 처리

| IMP | 처리 내용 |
|:---:|:---------|
| 018 | 삭제/병합 처리됨 (Riley 원번 IMP-026과 무관) |

---

## 전체 진척 요약

| Phase | 완료 | 전체 | 진행률 |
|:-----:|:----:|:----:|:------:|
| A | 7 | 7 | 100% |
| B | 7 | 10 | 70% |
| C | 3 | 7 | 42.9% |
| D | 6 | 8 | 75% |
| E | 4 | 7 | 57.1% |
| F | 3 | 12 | 25% |
| G | 0 | 1 | 0% |
| H | 4 | 5 | 80% |
| **합계** | **35** | **57** | **61.4%** |

> ⚠️ 합계 57개 = 완료 32개 + 검토대기 1개(IMP-068 Ring 재제출 중) + 미착수 24개 (IMP-018·034b 제외) | 이번 세션 일괄 동기화: B(019·039·040) · C(015 언블록·045) · D(059·031·003) · H(064~067)
> Phase H 신설 (2026-05-16): IMP-064~068 Ring(Qwen3.6) EXP-IMP-RG-FIX 도출 5건 추가

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:----:|:------|:-----|
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

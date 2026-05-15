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
| 034a | `.env.local` Git 추적 제거 | Riley | ⬜ | — |
| 034b | API 키 재발급 | Edward | ⬜ | — |
| 035 | SECURITY DEFINER 38개 권한 검증 | Aiden+Riley | ⬜ | — |
| 036 | Status Machine MANAGER 역할 추가 | B_Kai | ✅ | 2026-05-15 |
| 037 | Supabase Auth 보안 설정 | Riley | ⬜ | — |
| 026 | RLS 비즈니스 규칙 통합 (SQL 함수화) | Aiden+Riley | ⬜ | — |
| 041 | Storage 정책 조직 멤버십 검증 | Riley | ⬜ | — |
| 057 | `zen_role_permissions` SELECT 제한 | Riley | ⬜ | — |

**Phase A 완료**: 1 / 8

---

## Phase B — Data Integrity & Transaction Safety

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 019 | `createOrder()` 트랜잭션 도입 | Aiden+Riley | ⬜ | — |
| 038 | CLAIMED OrderStatus 정식 등록 | B_Kai | 🔔 | 2026-05-15 |
| 039 | 정산 이중 실행 방지 | Riley | ⬜ | — |
| 040 | WAREHOUSED→CANCELED 재고 불일치 | Riley | ⬜ | — |
| 042 | `updateOrder()` 수정 차단 누락 | Riley | ⬜ | — |
| 043 | MASTERED Lock 액션별 우회 방지 | Riley | ⬜ | — |
| 044 | 인보이스 발행 후 비용 변경 차단 | Riley | ⬜ | — |
| 047 | 트랜잭션 부재 확장 (status/지갑) | Riley | 🚫 | — |
| 052 | dissolveMasterOrder 부분 실패 | Riley | 🚫 | — |
| 053 | 지갑 결제 롤백 불완전 | Riley | 🚫 | — |

> 🚫 IMP-047: IMP-019 완료 후 착수 가능 / IMP-052·053: IMP-047 완료 후 착수 가능

**Phase B 완료**: 1 / 10

---

## Phase C — Observability & Guardrails

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 013 | console→logger 교체 (53개 파일) | Riley | ⬜ | — |
| 015 | middleware.ts console.log 제거 | Riley | 🚫 | — |
| 025 | Server Actions 에러 래퍼 | Riley | ⬜ | — |
| 045 | 무제한 리스트 페이지네이션 (18곳) | Riley | ⬜ | — |
| 046 | Rate Limiting 도입 | Riley | 🚫 | — |
| 051 | 감사 추적 (마스터/인보이스/통관) | Riley | ⬜ | — |
| 056 | 이메일 HTML 인젝션 방지 | Riley | ⬜ | — |

> 🚫 IMP-015: IMP-013 완료 후 착수 가능 / IMP-046: Aiden 인프라 결정 후 착수 가능 (Phase C 착수 전)

**Phase C 완료**: 0 / 7

---

## Phase D — Architecture Refactoring

### D1 — 선행 분할

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 014 | admin/rates 531줄 분할 | Riley | ⬜ | — |
| 033 | Server Actions 도메인 분할 | Riley | ⬜ | — |
| 058 | finance.ts 733줄 분할 | Riley | ⬜ | — |

### D2 — 패턴 도입

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 016 | Repository 패턴 | Aiden+D_Kai+Riley | 🚫 | — |
| 059 | Supabase 클라이언트 중복 제거 | Riley | ⬜ | — |

### D3 — 구조 개선

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 003 | middleware.ts → proxy.ts 마이그레이션 | Aiden+Riley | ⬜ | — |
| 030 | 정산 엔진 SRP | Aiden+Riley | ⬜ | — |
| 031 | RBAC 이중 상태 정리 | Riley | ⬜ | — |

> 🚫 IMP-016: D1(IMP-033·058) 완료 후 착수 가능

**Phase D 완료**: 0 / 8

---

## Phase E — Performance Optimization

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 020 | Feature Flags 캐싱 | Riley | ⬜ | — |
| 021 | 미들웨어 DB 호출 최적화 | Riley | ⬜ | — |
| 022 | NaviSidebar 번들 최적화 | Riley | ⬜ | — |
| 048 | Mock 데이터 제거 | B_Kai | ⬜ | — |
| 054 | N+1 쿼리 7곳 | Riley | ⬜ | — |
| 055 | 인덱스 누락 4종 | Riley | ⬜ | — |
| 062 | SELECT * → 명시적 컬럼 (112곳) | Riley | ⬜ | — |

**Phase E 완료**: 0 / 7

---

## Phase F — Type/UI/Test Quality

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 012 | Master/Admin 코드 중복 | Riley | ⬜ | — |
| 017 | Error Boundary 4개 추가 | Riley | ⬜ | — |
| 023 | i18n 번역 키 타입 안정성 | Riley | ⬜ | — |
| 024 | 공통 UI 컴포넌트 라이브러리화 | Riley | ⬜ | — |
| 027 | 점검 모드 페이지 | B_Kai | ⬜ | — |
| 029 | TS 타입 안전성 (any 퇴출) | Riley | ⬜ | — |
| 032 | 다국어 번역 커버리지 감사 + CI 게이트 | B_Kai+Riley | ⬜ | — |
| 049 | 이중 프로필 테이블 정리 | Riley | ⬜ | — |
| 050 | HELD→이전상태 복구 로직 | Riley | ⬜ | — |
| 060 | RETURNED 상태 전이 확장 | Riley | ⬜ | — |
| 061 | PDF 경로 충돌 방지 | Riley | ⬜ | — |
| 063 | ZenUI.tsx 7개 분할 | Riley | ⬜ | — |

**Phase F 완료**: 0 / 12

---

## Phase G — Future

| IMP | 내용 | Agent | 상태 | 완료일 |
|:---:|:-----|:-----:|:----:|:------:|
| 028 | UNI-PASS EDI 연동 | Aiden+Riley | ⬜ | — |

**Phase G 완료**: 0 / 1

---

## 삭제/병합 처리

| IMP | 처리 내용 |
|:---:|:---------|
| 018 | 삭제/병합 처리됨 (Riley 원번 IMP-026과 무관) |

---

## 전체 진척 요약

| Phase | 완료 | 전체 | 진행률 |
|:-----:|:----:|:----:|:------:|
| A | 1 | 8 | 12.5% |
| B | 1 | 10 | 10% |
| C | 0 | 7 | 0% |
| D | 0 | 8 | 0% |
| E | 0 | 7 | 0% |
| F | 0 | 12 | 0% |
| G | 0 | 1 | 0% |
| **합계** | **2** | **53** | **3.8%** |

> ⚠️ 합계 53개 = 미착수 52개 + IMP-036 완료 1개 (IMP-018 제외)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:----:|:------|:-----|
| 2026-05-15 | Aiden (Claude) | 최초 작성 — 52개 IMP 전수 등재, IMP-036 완료 반영, IMP-038 진행 중 표시 |
| 2026-05-15 | B_Kai (GLM Big Pickle) | IMP-038 완료 — CLAIMED Enum 등록 + Status Machine 전이 규칙 + claims.ts canChangeStatus 연동 |

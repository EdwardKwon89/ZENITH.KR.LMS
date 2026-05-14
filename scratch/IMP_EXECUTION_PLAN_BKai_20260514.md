# IMP 실행 계획 — B_Kai 제안 (v2.2)

> **작성**: B_Kai (GLM Big Pickle)
> **목적**: `scratch/post_launch_improvements.md` 미착수 52개 항목 단계별 실행 계획
> **오케스트레이션**: Aiden (ZEN_CEO) — R-01 수행·검증 주체 명시 의무
> **평가·감시**: Riley (CPO) — 협업 준수도, 규칙 준수도 기록
> **B_Kai 운영**: 임시 활성화 (Master Edward, 역량 시험 목적)
> **제안일**: 2026-05-14
> **커밋 태그**: `[B_Kai]`
>
> **적용 거버넌스**:
> - GOV_COMMON.md v1.1: R-01~R-16, GitNexus MUST, ZEN_A4
> - AGENTS.md v2.0 (Noah): 파일 소유권 Zone, 완료 보고 절차
> - TASK_BOARD.md: SECTION 1 🔔 검토 대기, ACTIVE_AGENT 충돌 방지
> - SAR-2026-05-13-001: B_Kai 과잉 분석 방지 — 분석 범위 명시적 제한
>
> **버전 이력**:
> - v1.0: 초안 (의존 관계 + Phase 분할)
> - v2.0: 협업 프로토콜 + R-n 규칙 매핑 + B_Kai 경계 + IMP-026/043 누락 보완
> - v2.1: IMP-015 독립 항목 분리 + IMP-003 Phase D3 이동 + IMP-018 존재 확인 (IMP-026으로 재번호)

---

## 0. IMP 미착수 현황

| 구분 | 범위 | 개수 | 상태 |
|:-----|:-----|:----:|:-----|
| IMP-001~011 | 기초 기능 + RBAC 1차 | **1** (IMP-003 Low) | 10 완료 |
| IMP-012~017 | D_Kai 도출 | **6** | Audit PASS만 |
| IMP-019~022 | Ring 도출 | **4** | Audit PASS만 |
| IMP-023~026 | Riley 도출 | **4** | Audit PASS만 |
| IMP-027~033 | B_Kai 도출 | **7** | Audit PASS만 |
| IMP-034~063 | NB Kai 감사 도출 | **30** | Audit PASS만 |
| **합계** | | **52 미착수** | |

---

## 1. 협업 거버넌스

### 1.1 에이전트 간 협업 프로토콜

```
Master (Edward, Human) — 최종 의사결정
    |
Aiden (ZEN_CEO) — Phase Gate 승인/반려, 아키텍처 결정
    |--- Riley (CPO) — 주 실행, Phase A~G 구현, 품질 게이트 감시
    |--- B_Kai (GLM) — 단독 수행(단순·저위험) + Riley 협력(대규모 감사)
    |--- D_Kai (OpenCode) — 아키텍처 분석 (Phase D)
```

### 1.2 Phase 진행 절차 (표준화)

| 단계 | 수행자 | 내용 | 적용 규칙 |
|:----:|:------:|:-----|:----------|
| 0 | B_Kai | Plan 제출 → Aiden 검토 요청 (TASK_BOARD 🔔) | R-01 |
| 1 | Aiden | Phase 승인/반려 | R-01 |
| 2 | B_Kai | ACTIVE_AGENT.md → Status:BUSY | TASK_BOARD 충돌 방지 |
| 2b | B_Kai | **GitNexus impact analysis** (수정 대상 심볼 upstream) | GOV GitNexus MUST |
| 3 | B_Kai | 구현 | |
| 3b | B_Kai | `rtk npm run test:regression` → 전체 PASS 증적 | **R-08** |
| 3c | B_Kai | 신규 테스트 케이스 → `LIVE_REGRESSION_TEST_MAP.md` 업데이트 | **R-09** |
| 3d | B_Kai | UI 변경 시 스크린샷 증적 (지정 폴더) | **R-10**, R-13 |
| 4 | B_Kai | `git commit -m "[B_Kai] <type>: IMP-NNN <설명>"` | Task 단위 원자적 |
| 5 | B_Kai | **GitNexus detect_changes()** → 영향 범위 확인 | GOV GitNexus MUST |
| 6 | B_Kai | ACTIVE_AGENT.md → Status:IDLE (SAR-002 방지) | SAR 절차 |
| 7 | B_Kai | TASK_BOARD.md SECTION 1 🔔 검토 대기 등록 | TASK_BOARD |
| 7b | B_Kai | HANDOFF_BOX.md 상세 인계 메시지 | 협업 채널 |
| 8 | Aiden | 검증 → PASS / 반려 | R-04 체크리스트 |
| 9 | Riley | 협업·규칙 준수도 평가 기록 | 감시 역할 |

### 1.3 B_Kai 경계 조건

| 허용 | 금지 |
|:-----|:-----|
| 단독 수행: IMP-036, 038, 048 등 독립·저위험 | src/lib/auth/, middleware.ts, RLS 단독 수정 |
| Riley 협력: 대규모 audit (IMP-013, 032) | Supabase 마이그레이션 + RPC + UI 풀스택 |
| GitNexus 영향도 분석 후 수정 | 800줄 이상 파일 리팩토링 |
| Aiden 사전 승인 범위 내 구현 | 영향도 분석 중 발견 문제를 무단 수정 |
| **과잉 분석 금지**: 태스크 범위를 벗어난 추가 분석·탐색 | |

> **근거**: Aiden TASK_BOARD 결정 (SAR-2026-05-13-001) + GOV_COMMON.md GitNexus MUST

### 1.4 규칙 준수 체크리스트 (모든 Phase 공통)

| 규칙 | 내용 | 확인 |
|:----:|:-----|:----:|
| R-01 | 수행 주체·검증 주체 명시 | Header |
| R-04 | `LIVE_REGRESSION_TEST_MAP.md` 체크리스트 기반 검증 | Step 8 |
| R-07 | 문서는 한글 작성 | 준수 |
| R-08 | `rtk npm run test:regression` PASS 증적 | Step 3b |
| R-09 | 신규 회귀 테스트 케이스 추가 | Step 3c |
| R-10 | UI 변경 시 스크린샷 증적 | Step 3d |
| R-13 | 결과물 지정 폴더 저장 | Step 3d |
| R-15 | 신규 개선 사항 발견 시 `post_launch_improvements.md` 등록 | 지속 |
| R-16 | 세션 시작 시 ACTIVE_AGENT 일관성 검증 | Step 2 |
| GitNexus | 수정 전 impact analysis | Step 2b |
| GitNexus | 커밋 전 detect_changes() | Step 5 |
| SAR | 과잉 분석 금지 (SAR-002) | 1.3 경계 |

---

## 2. IMP 의존 관계 맵

```
Layer 0 (독립·즉시 — CRITICAL)
  IMP-034 .env.local         IMP-036 MANAGER role
  IMP-035 SECURITY DEFINER   IMP-037 Auth config
  IMP-041 Storage RLS        IMP-057 role_permissions

Layer 1 (독립 — High)
  IMP-026 RLS business rules   IMP-039 settlement double
  IMP-040 inventory bug        IMP-042 updateOrder guard
  IMP-044 invoice cost lock    IMP-048 mock data
  IMP-020 feature flags        IMP-027 maintenance page
  IMP-055 indexes              IMP-056 email XSS
  IMP-061 PDF path collision

Layer 2 (중간 의존)
  IMP-019 createOrder Tx      (→ 047, 052, 053)
  IMP-043 MASTERED lock       (← IMP-042 확장)
  IMP-038 CLAIMED status      (← IMP-019 정합)
  IMP-046 rate limiting       (인프라 결정 필요)
  IMP-045 pagination          (18개 파일 일괄)

Layer 3 (선행 분할)
  IMP-033 actions domain split  → IMP-016
  IMP-058 finance.ts split      → IMP-016
  IMP-014 rates page split      (독립)

Layer 4 (패턴 도입)
  IMP-013 console→logger       → IMP-015/025
  IMP-016 Repository pattern   ← Layer 3
  IMP-059 client singleton     (IMP-016 연계)

Layer 5 (구조 개선)
  IMP-030 settlement SRP      ← Layer 4
  IMP-031 RBAC dual state     (독립)
  IMP-003 middleware→proxy    (독립, 회귀 위험 높음)
  IMP-052 dissolveMaster Tx   ← Layer 2 (047 완료 후)
  IMP-053 wallet rollback     ← Layer 2 (047 완료 후)

Layer 6 (품질·성능)
  IMP-021 middleware DB opt    IMP-022 sidebar bundle
  IMP-054 N+1 queries          IMP-062 SELECT *
  IMP-029 TS types             IMP-023 i18n types → 032
  IMP-024 common UI            IMP-017 error boundary
  IMP-012 code duplication     IMP-063 ZenUI split
  IMP-049 dual profile         IMP-050 HELD restore
  IMP-060 RETURNED states

Layer 7 (장기)
  IMP-028 UNI-PASS EDI
```

### Critical Path 5개

```
C1 (Security, 즉시):   034 → 035 → 037 → 026 → 041 → 057
C2 (Data Integrity):   019 → 047 → 043 → 052 → 053
                               → 039 → 040 → 042
C3 (Architecture):     033 → 016 → 030      003 (병렬)
                         058 ↗       ↘ 059
C4 (Observability):    013 → 015 → 025 → 051 → 046
C5 (Middleware 정비):   003 → 021 (proxy 전환 + 최적화 병행)
```

---

## 3. 단계별 실행 계획 (7 Phases)

---

### Phase A — CRITICAL: Security & Infrastructure

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| CRITICAL | 034 | `.env.local` Git 추적 제거 + 키 재발급 | 0.5 MD | **Riley** | 즉시 git rm --cached |
| CRITICAL | 035 | SECURITY DEFINER 38개 권한 검증 | 2~3 MD | **Aiden+Riley** | get_my_role() 활용. D_Kai 구조 검토 |
| CRITICAL | 036 | Status Machine MANAGER 누락 | 0.1 MD | **B_Kai** | 1라인 추가. 첫 역량 입증용 |
| CRITICAL | 037 | Supabase Auth 보안 설정 | 0.5 MD | **Riley** | config.toml |
| High | 026 | RLS 비즈니스 규칙 통합 (SQL 함수화) | 3 MD | **Aiden+Riley** | DB 레벨 보안. D_Kai 검토 |
| High | 041 | Storage 정책 조직 멤버십 검증 | 0.5 MD | **Riley** | RLS 정책 수정 |
| Medium | 057 | `zen_role_permissions` SELECT 제한 | 0.3 MD | **Riley** | ADMIN/MANAGER 전용 |

**소요 공수**: ~7.9 MD (~7.9 MD 실측)
**검증**: **Aiden 직접 검증** — CRITICAL 4건은 전수 코드 리뷰
**위험**: 키 노출 지속 시 보안 사고. SECURITY DEFINER 함수 오작동 시 서비스 장애
**규칙 준수**: R-01(주체·검증 명시), R-04(LIVE 체크리스트), R-08(test:regression), R-10(UI 증적), GitNexus impact analysis 선행

---

### Phase B — High: Data Integrity & Transaction Safety

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| High | 019 | `createOrder()` 트랜잭션 도입 | 2~3 MD | **Aiden+Riley** | Supabase RPC |
| High | 047 | 트랜잭션 부재 확장 (status/지갑) | 3~5 MD | **Riley** | IMP-019 경험 활용 |
| High | 043 | MASTERED Lock 액션별 우회 방지 | 1 MD | **Riley** | 모든 쓰기 액션 isMastered() |
| High | 039 | 정산 이중 실행 방지 | 0.5 MD | **Riley** | billing_status 활용 |
| High | 040 | WAREHOUSED->CANCELED 재고 불일치 | 0.5 MD | **Riley** | 역연산 로직 |
| High | 042 | `updateOrder()` 수정 차단 누락 | 0.3 MD | **Riley** | isOrderEditable() 호출 |
| High | 044 | 인보이스 발행 후 비용 변경 차단 | 0.5 MD | **Riley** | DB 트리거 |
| Medium | 038 | CLAIMED OrderStatus 정식 등록 | 0.5 MD | **B_Kai** | status-machine.ts |
| Medium | 052 | dissolveMasterOrder 부분 실패 | 1 MD | **Riley** | RPC 트랜잭션 |
| Medium | 053 | 지갑 결제 롤백 불완전 | 1 MD | **Riley** | RPC 트랜잭션 |

**소요 공수**: ~11.3~13.3 MD (RPC 설계 복잡도 고려 상한)
**검증**: Aiden + Riley (IMP-043 Aiden 필수 검증)
**위험**: 트랜잭션 RPC 설계 복잡도. IMP-019/047 순차 진행 필요
**규칙 준수**: R-08(regression), R-09(테스트 케이스 추가), GitNexus impact(orders.ts, claims.ts)

---

### Phase C — High: Observability & Guardrails

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| High | 013 | console->logger 교체 (53개 파일) | 2~3 MD | **Riley** | logger.ts 신규 |
| Medium | 015 | middleware.ts console.log 프로덕션 노출 | 0.1 MD | **Riley** | IMP-013 logger 활용 (MUST after 013) |
| High | 025 | Server Actions 에러 래퍼 | 1.5 MD | **Riley** | Result<T,E> 패턴 |
| High | 046 | Rate Limiting 도입 | 2 MD | **Riley** | @upstash/ratelimit |
| High | 045 | 무제한 리스트 페이지네이션 (18곳) | 2~3 MD | **Riley** | .range() 적용 |
| Medium | 051 | 감사 추적 (마스터/인보이스/통관) | 2 MD | **Riley** | 이력 테이블 신규 |
| Medium | 056 | 이메일 HTML 인젝션 방지 | 0.3 MD | **Riley** | escapeHtml() |

**소요 공수**: ~9.4~11.9 MD (53개 파일 교체 회귀 대비 버퍼 포함)
**검증**: Aiden (IMP-013 B_Kai 사전 audit 병행)
**위험**: 53개 파일 교체 시 회귀. `test:regression` 전면 실행 필수
**규칙 준수**: R-08(전수 테스트), R-09(신규 테스트), R-13(결과물 저장소)
**순서**: IMP-013 → IMP-015 (IMP-013 logger 존재해야 middleware 교체 가능)

---

### Phase D — Architecture Refactoring (3-Stage)

#### D1 — 선행 분할

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| Medium | 033 | Server Actions 도메인 분할 | 2~3 MD | **Riley** | finance/orders |
| Medium | 058 | finance.ts 733줄 분할 | 2 MD | **Riley** | IMP-033 확장 |
| Low | 014 | admin/rates 531줄 분할 | 1~1.5 MD | **Riley** | 3개 컴포넌트 |

#### D2 — 패턴 도입

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| Medium | 016 | Repository 패턴 | 3~5 MD | **Aiden+D_Kai+Riley** | D1 완료 필수 |
| Medium | 059 | Supabase 클라이언트 중복 제거 | 1 MD | **Riley** | React.cache() |

#### D3 — 구조 개선

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| High | 031 | RBAC 이중 상태 정리 | 1 MD | **Riley** | STATIC->DB |
| Medium | 030 | 정산 엔진 SRP | 2~3 MD | **Aiden+Riley** | D2 이후 권장 |
| Low | 003 | middleware.ts -> proxy.ts 마이그레이션 | 1~2 MD | **Aiden+Riley** | Auth Guard·Org Guard·i18n 회귀 필수 |

**소요 공수**: ~18~18.5 MD
**검증**: **Aiden+D_Kai** 필수. D1 완료 전 D2 착수 금지
**위험**: Repository 패턴 도입 시 기존 코드와 충돌 위험 높음
**규칙 준수**: R-01, R-08, GitNexus impact(actions/ 전역)

---

### Phase E — Performance Optimization

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| Medium | 020 | Feature Flags 캐싱 | 0.5 MD | **Riley** | unstable_cache() |
| Medium | 021 | 미들웨어 DB 호출 최적화 | 1~2 MD | **Riley** | JWT-only |
| Medium | 054 | N+1 쿼리 7곳 | 2 MD | **Riley** | 그래프QL 조인 |
| Medium | 055 | 인덱스 누락 4종 | 0.5 MD | **Riley** | 신규 migration |
| Low | 062 | SELECT * -> 명시적 컬럼 (112곳) | 3 MD | **Riley** | 대규모 단순 |
| Low | 022 | NaviSidebar 번들 최적화 | 1 MD | **Riley** | dynamic import |
| Medium | 048 | Mock 데이터 제거 | 0.2 MD | **B_Kai** | dashboard 실제 DB |

**소요 공수**: ~8.2~9.2 MD (SELECT * 112곳 변동 가능)
**검증**: Aiden
**규칙 준수**: R-08, GitNexus impact(middleware.ts 수정 시 Aiden 승인 필수)

---

### Phase F — Type/UI/Test Quality

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| Medium | 029 | TS 타입 안전성 (any 퇴출) | 1 MD | **Riley** | claims.ts 중심 |
| Medium | 023 | I18n 번역 키 타입 안정성 | 1 MD | **Riley** | next-intl |
| High | 032 | 다국어 번역 커버리지 감사 + CI 게이트 | 2 MD | **B_Kai+Riley** | B_Kai audit |
| Medium | 017 | Error Boundary 4개 추가 | 1 MD | **Riley** | 각 경로 세그먼트 |
| Medium | 024 | 공통 UI 컴포넌트 라이브러리화 | 2 MD | **Riley** | ZenStatusBadge |
| Medium | 012 | Master/Admin 코드 중복 | 0.5 MD | **Riley** | 공통 컴포넌트 |
| Low | 063 | ZenUI.tsx 7개 분할 | 1 MD | **Riley** | barrel export |
| Medium | 027 | 점검 모드 페이지 | 0.5 MD | **B_Kai** | /maintenance |
| Medium | 049 | 이중 프로필 테이블 정리 | 2 MD | **Riley** | profiles 통합 |
| Medium | 050 | HELD->이전상태 복구 로직 | 1 MD | **Riley** | history 조회 |
| Low | 060 | RETURNED 상태 전이 확장 | 0.5 MD | **Riley** | DISPOSED/CANCELED |
| Low | 061 | PDF 경로 충돌 방지 | 0.3 MD | **Riley** | UUID 기반 |

**소요 공수**: ~12.8 MD
**검증**: Aiden + B_Kai(IMP-032 only)
**규칙 준수**: R-10(UI 변경 필수 증적), R-09(테스트 케이스)

---

### Phase G — Low Priority: Future

| P | IMP | 내용 | 공수 | Agent | 비고 |
|:-:|:---:|:-----|:----:|:-----|:-----|
| Low | 028 | UNI-PASS EDI 연동 | 3~5 MD | **Aiden+Riley** | 대규모 신규 |

**소요 공수**: ~5.5 MD
**검증**: Aiden

---

## 4. IMP 전수 교차 점검 (Full Inventory Check)

모든 미착수 IMP가 계획에 포함되었는지 검증:

| IMP | Phase | 상태 | IMP | Phase | 상태 | IMP | Phase | 상태 |
|:---:|:-----:|:----:|:---:|:-----:|:----:|:---:|:-----:|:----:|
| 003 | D3 | ✅ | 016 | D2 | ✅ | 048 | E | ✅ |
| 012 | F | ✅ | 017 | F | ✅ | 049 | F | ✅ |
| 013 | C | ✅ | 019 | B | ✅ | 050 | F | ✅ |
| 014 | D1 | ✅ | 020 | E | ✅ | 051 | C | ✅ |
| 015 | C | ✅ | 021 | E | ✅ | 052 | B | ✅ |
| 022 | E | ✅ | 038 | B | ✅ | 053 | B | ✅ |
| 023 | F | ✅ | 039 | B | ✅ | 054 | E | ✅ |
| 024 | F | ✅ | 040 | B | ✅ | 055 | E | ✅ |
| 025 | C | ✅ | 041 | A | ✅ | 056 | C | ✅ |
| 026 | A | ✅ | 042 | B | ✅ | 057 | A | ✅ |
| 027 | F | ✅ | 043 | B | ✅ | 058 | D1 | ✅ |
| 028 | G | ✅ | 044 | B | ✅ | 059 | D2 | ✅ |
| 029 | F | ✅ | 045 | C | ✅ | 060 | F | ✅ |
| 030 | D3 | ✅ | 046 | C | ✅ | 061 | F | ✅ |
| 031 | D3 | ✅ | 047 | B | ✅ | 062 | E | ✅ |
| 032 | F | ✅ | 033 | D1 | ✅ | 063 | F | ✅ |
| 034 | A | ✅ | 035 | A | ✅ | 036 | A | ✅ |
| 037 | A | ✅ |   |   |   |   |   |   |

> **검증**: 52개 미착수 IMP 전 항목 Phase 배정 완료 (IMP-018은 IMP-026으로 재번호되어 존재하지 않음)

---

## 5. B_Kai 단독 수행 범위

B_Kai가 이번 임시 활성화 기간에 **단독 수행 가능한 IMP**:

| IMP | 내용 | 공수 | Phase | 근거 |
|:---:|:-----|:----:|:-----:|:-----|
| 036 | Status Machine MANAGER | 0.1 MD | A | 1라인 추가, 독립 |
| 038 | CLAIMED OrderStatus 등록 | 0.5 MD | B | status-machine.ts + enum |
| 048 | Mock 데이터 제거 | 0.2 MD | E | dashboard 단일 파일 |
| 027 | 점검 모드 페이지 | 0.5 MD | F | 신규 page, 독립 |
| 032 | i18n audit (Riley 협력) | 1 MD (audit) | F | audit만, 구현은 Riley |

> **B_Kai 철칙**: 각 IMP 완료 후 반드시 Aiden 검증 → 다음 IMP 착수
> **IMP-021/042/043/044**: middleware.ts·auth 관련 파일 포함 → B_Kai 단독 수행 불가, Aiden 승인 필수

---

## 6. B_Kai 위반 방지 장치 (SAR-002 근거)

| 위험 행동 | 방지 조치 |
|:---------|:----------|
| 과잉 분석 (태스크 범위 이탈) | Phase별 명시된 IMP만 수행. 추가 발견 시 R-15 등록 후 **Aiden 승인 대기** |
| 무단 수정 (영향도 분석 중 발견) | GitNexus impact analysis 결과 HIGH/CRITICAL 시 **Aiden 보고 후 지시 대기** |
| Phase 건너뛰기 | Step 7 완료(ACTIVE_AGENT IDLE) 전 다음 IMP 미착수 |
| 테스트 생략 | R-08: `test:regression` PASS 없이 커밋 금지 |
| 협업 채널 미사용 | TASK_BOARD 🔔 + HANDOFF_BOX 작성 의무 |

---

## 7. 전체 일정 추정

| Phase | 내용 | 공수 | 병렬 | Min Elapsed |
|:-----:|:-----|:----:|:----:|:-----------:|
| A | Security | 7.9 MD | 일부 | 1 MD |
| B | Data Integrity | 11.3~13.3 MD | 조건부 | 3 MD |
| C | Observability | 9.4~11.9 MD | 일부 | 2 MD |
| D | Architecture | 18~18.5 MD | 순차 | 5 MD |
| E | Performance | 8.2~9.2 MD | 전체 | 1.5 MD |
| F | Quality | 12.8 MD | 전체 | 2 MD |
| G | Future | 5.5 MD | 전체 | 1.5 MD |
| **합계** | | **~73~79 MD** | | **~17 MD** |

---

## 8. 즉시 조치 권고 (CRITICAL)

| IMP | 조치 | 긴급성 | 담당 |
|:---:|:-----|:------:|:----:|
| 034 | `git rm --cached .env.local` + 키 재발급 | **당일** | Riley |
| 036 | `ROLE_PERMISSIONS.MANAGER` 1줄 추가 | **당일** | B_Kai |
| 037 | Supabase Auth 설정 변경 | **당일** | Riley |
| 035 | SECURITY DEFINER 권한 검증 | **1주일** | Aiden+Riley |

> IMP-034: **6개 프로덕션 키가 Git 평문 노출 중**. 1일 지연이 추가 위험.

---

## 9. 개정 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|:----:|:----:|:------|:----------|
| v1.0 | 2026-05-14 | B_Kai | 초안 |
| v2.0 | 2026-05-14 | B_Kai | 협업 프로토콜 + R-n 규칙 매핑 + B_Kai 경계 + IMP-026/043 누락 보완 + B_Kai 단독 수행 범위 명시 |
| v2.1 | 2026-05-14 | B_Kai | IMP-015 독립 항목 분리 + IMP-003 Phase D3 이동 + Critical Path C5 신설 |
| v2.2 | 2026-05-14 | B_Kai | Section 4 IMP-034 누락 자체 수정 + Phase B/C/E 공수 상한 자체 조정 |
| v2.2-R | 2026-05-15 | Aiden (Claude, ZEN_CEO) | §10 Aiden 검토 의견 추가 — CONDITIONAL PASS (W-1~W-3) |

---

> **Next Step**: B_Kai v2.3 제출 (W-1~W-3 수정) + IMP-036 즉시 착수 허가 (병렬)

---

## 10. Aiden 검토 의견

> **검토자:** Aiden (Claude, ZEN_CEO) | **검토일:** 2026-05-15 | **판정:** ⚠️ CONDITIONAL PASS

### 10.1 종합 판정

| 항목 | 판정 | 비고 |
|:---|:---:|:---|
| 52개 IMP 전수 배정 (§4 교차 점검) | ✅ | v2.2 자체 오류 발견·수정 확인 |
| 의존 관계 Layer 0~7 + Critical Path 5개 | ✅ | 선행 조건 명확 |
| 거버넌스 R-01~R-16, GitNexus, SAR-002 매핑 | ✅ | Phase 진행 9단계 규칙 번호 명시 |
| B_Kai 경계 조건 (§5, §6) | ✅ | 단독 5개 + 과잉 분석 방지 §6 명문화 |
| **W-1: IMP-034 수행 주체 분리** | **⚠️ 수정 필요** | Human 개입 작업 미분리 |
| **W-2: C1 Critical Path 병렬 표현** | **⚠️ 수정 필요** | 034/036/037 순차 → 병렬로 수정 |
| **W-3: IMP-046 인프라 결정 주체 미명시** | **⚠️ 수정 필요** | 결정 주체·시점 누락 |

**판정: CONDITIONAL PASS — W-1~W-3 수정 후 v2.3 제출 시 재검토 없이 최종 승인**

---

### 10.2 수정 조건 상세

#### W-1 | IMP-034 수행 주체 분리

Phase A 표 및 §8에서 담당 "Riley" 단일 지정. 실제 작업은 두 레이어로 분리됨:

| 작업 | 수행 주체 |
|:---|:---|
| `git rm --cached .env.local` + `.gitignore` 등록 + 커밋 | Riley |
| API 키 재발급 (Supabase Dashboard, Vercel, Resend, SUPABASE_ACCESS_TOKEN) | **Edward (Human 직접 수행)** |

→ Phase A 표와 §8에 "Riley + Edward(키 재발급)" 분리 명시 필요.

#### W-2 | C1 Critical Path 병렬 가능 항목 순차 표현 오류

현재: `034 → 035 → 037 → 026 → 041 → 057` (전체 순차)

IMP-034(Git 파일 제거), IMP-036(status-machine 1줄), IMP-037(config.toml)은 상호 독립.
순차 표현 시 034 완료까지 036/037 착수 차단 발생.

수정안: `[034 + 036 + 037] (병렬) → 035 → 026 → 041 → 057`

#### W-3 | IMP-046 인프라 결정 주체·시점 미명시

Phase C 표 비고 "인프라 결정 필요"만 기재. 추가 명시 필요:
- 결정 주체: **Aiden**
- 결정 시점: Phase C 착수 전
- 미결정 시 IMP-046 착수 차단

---

### 10.3 확인 사항 (N 등급 — 수정 권고)

#### N-1 | IMP-018 재번호 설명 부정확

§4 주석 "IMP-018은 IMP-026으로 재번호" → 근거 불명확. IMP-026은 Riley 독립 도출 항목. `post_launch_improvements.md` 상 IMP-018 자체가 존재하지 않음 (삭제/병합 처리). "IMP-018: 삭제/병합 처리됨"으로 수정 권고. (52개 합산은 정확 — 검증 통과)

---

### 10.4 B_Kai 역량 1차 평가

| 역량 | 점수 | 근거 |
|:---|:---:|:---|
| 계획 구조화 | ★★★★☆ | Layer 분류, Critical Path, 전수 교차 점검 체계적 |
| 거버넌스 이해 | ★★★★☆ | R-01~R-16, GitNexus, SAR-002 일관성 있게 반영 |
| 자기 제한 | ★★★★☆ | 단독 5개, 경계 조건 §6 명문화. SAR-002 이력 자각 |
| 실행 현실성 | ★★★☆☆ | W-1(Human 개입 미분리), W-2(병렬 분석 부족) |
| **종합** | **★★★★☆** | 설계 완성도 높음. 세부 정밀도 보완 필요 |

---

### 10.5 Next Action

| 우선순위 | 작업 | 담당 |
|:---:|:---|:---|
| 1 | W-1~W-3 + N-1 반영 → v2.3 제출 | B_Kai |
| 2 (병렬) | IMP-036 즉시 착수 (GitNexus impact → 1줄 수정 → 커밋) | B_Kai |
| 3 | IMP-034: Riley(git rm) + Edward(키 재발급) 즉시 처리 | Riley + Edward |
| 4 | Riley 부평가 의견 수렴 후 Phase A Gate 최종 승인 | Aiden |

> Riley에게: 상기 검토 의견 확인 후 Phase A 준수도 관점에서 부평가 의견 TASK_BOARD 경유 제출 요청.

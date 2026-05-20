# ACTIVE_TASK — ZENITH_LMS 작업 인덱스

> **프로젝트**: ZENITH_LMS
> **문서 역할**: 모든 Agent의 단일 작업 인덱스 (Single Source of Truth)
> **참조 규칙**: GOV_COMMON.md R-17
> **아카이브**: 완료 Task는 주 단위로 `.agent/archive/TASK_LOG_YYMMWW.md`로 이관

---

## 운영 규칙

| 규칙 | 내용 |
|:---|:---|
| 착수 선언 | 상세 파일 생성 + 본 인덱스 상태 ⬜→🔄 동시 반영 |
| 완료 선언 | 상세 파일 완료 증적 기록 + 본 인덱스 상태 🔄→🔔 반영 |
| 최종 완료 | Aiden 승인 후 ✅ — Agent 자체 선언 절대 불가 |
| 파일 조작 | 상세 파일은 담당 Agent만 수정 가능 |
| 착수 충돌 방지 | 상세 파일 존재 여부 확인 후 착수 (파일 선점 = 착수권 확보) |
| 상태 동기화 | 본 인덱스 ↔ 상세 파일 상태 불일치 시 즉시 Aiden 보고 |

---

## 상태 범례

| 심볼 | 의미 | 전환 주체 |
|:----:|:---|:---:|
| ⬜ | 미착수 — 착수 대기 | Aiden |
| 🚫 | 블로커 — 전제조건 미충족 | 자동 (전제조건 ✅ 시 해제) |
| 📝 | 설계 의견 — Agent 구현 방안 제출 (복잡도 판단 후 선택 사용) | 담당 Agent |
| 🔍 | 설계 검토 — Aiden 방안 확정 대기 | 자동 (📝 제출 후) |
| 🔄 | 구현 중 — 착수 확정 (설계 검토 완료 또는 단순 Task 직행) | 담당 Agent |
| 🔔 | 검토 요청 — Aiden 검토 대기 | 담당 Agent |
| ❌ | 반려 — 재작업 필요 | Aiden |
| ✅ | 완료 — Aiden 승인 확정 | **Aiden 단독** |
| ➖ | 취소/병합 | Aiden |

> **📝·🔍 단계 사용 기준**: Agent가 복잡도를 판단하여 자율 결정.
> - 구현 방향이 명확하고 단순한 Task → ⬜ → 🔄 직행
> - 대안이 복수이거나 설계 결정이 필요한 Task → ⬜ → 📝 → 🔍(Aiden 확정) → 🔄

---

## 우선순위 기준

| 등급 | 기준 |
|:----:|:---|
| P1 | 시스템 장애 · 보안 · 블로커 해제 |
| P2 | 데이터 정합성 · 트랜잭션 안전성 |
| P3 | 관찰성 · 성능 · 아키텍처 개선 |
| P4 | 품질 · 테스트 · 문서 |

---

## 활성 Task 목록

| Task-ID | 생성일 | 업무개요 | 우선순위 | 전제조건 | 할당Agent | 상태 | 상세파일 | 비고 |
|:-------:|:------:|:--------|:--------:|:--------:|:---------:|:----:|:--------|:-----|
| TASK-001 | 260516 | createOrder() 트랜잭션 도입 | P2 | 없음 | Riley | ✅ | [TASK-001](tasks/TASK-001_260516_createOrder트랜잭션도입_Riley.md) | IMP-019 · IMP-047/052/053 블로커 해제 |
| TASK-002 | 260516 | N+1 쿼리 7곳 수정 | P2 | 없음 | B_Kai | ✅ | [TASK-002](tasks/TASK-002_260516_N+1쿼리7곳수정_BKai.md) | IMP-054 완료 |
| TASK-003 | 260516 | 정산 이중 실행 방지 | P2 | TASK-001 | Riley | ✅ | [TASK-003](tasks/TASK-003_260516_정산이중실행방지_Riley.md) | IMP-039 완료 · 커밋 b9ea28e+3ba3a97 · 199/199 PASS |
| TASK-004 | 260516 | WAREHOUSED→CANCELED 재고 복구 | P2 | TASK-001 | Riley | ✅ | [TASK-004](tasks/TASK-004_260516_WAREHOUSED재고복구_Riley.md) | IMP-040 완료 · 커밋 c777b10+0ccebb9+400a4bd · 202/202 PASS |
| TASK-005 | 260516 | Phase F 사전 GitNexus 분析 | P3 | 없음 | D_Kai | ✅ | [TASK-005](tasks/TASK-005_260516_PhaseF사전GitNexus분析_DKai.md) | ANA-IMP-DK-F 완료 · 커밋 385122c |
| TASK-006 | 260516 | Supabase 클라이언트 중복 제거 | P3 | 없음 | D_Kai | ✅ | [TASK-006](tasks/TASK-006_260516_Supabase클라이언트중복제거_DKai.md) | IMP-059 완료 · 커밋 385122c |
| TASK-007 | 260516 | RBAC 이중 상태 정리 | P3 | 없음 | D_Kai | ✅ | [TASK-007](tasks/TASK-007_260516_RBAC이중상태정리_DKai.md) | IMP-031 완료 · 커밋 385122c |
| TASK-008 | 260516 | middleware→proxy.ts 마이그레이션 | P3 | 없음 | D_Kai | ✅ | [TASK-008](tasks/TASK-008_260516_middleware→proxy마이그레이션_DKai.md) | IMP-003 완료 · 커밋 385122c |
| TASK-009 | 260516 | API Route stack trace 노출 수정 | P2 | 없음 | Ring | ✅ | [TASK-009](tasks/TASK-009_260516_APIRoute스택트레이스수정_Ring.md) | IMP-064 완료 · 커밋 d196e6b |
| TASK-010 | 260516 | Excel Export POST 인증 적용 | P2 | 없음 | Ring | ✅ | [TASK-010](tasks/TASK-010_260516_ExcelExportPOST인증적용_Ring.md) | IMP-065 완료 · 커밋 6255652+4c3a00d · 202/202 PASS |
| TASK-011 | 260516 | HTTP Security Headers 설정 | P2 | 없음 | Ring | ✅ | [TASK-011](tasks/TASK-011_260516_HTTPSecurityHeaders설정_Ring.md) | IMP-066 완료 · 커밋 c620581 · 헤더 6종 확인 |
| TASK-012 | 260516 | Server Action Zod 검증 추가 | P2 | 없음 | Ring | ✅ | [TASK-012](tasks/TASK-012_260516_ServerActionZod검증추가_Ring.md) | IMP-067 완료 · 커밋 1fd899a+6255652 · 198/199 PASS |
| TASK-013 | 260516 | Signup race condition 수정 | P3 | 없음 | Ring | ✅ | [TASK-013](tasks/TASK-013_260516_SignupRaceCondition수정_Ring.md) | IMP-068 완료 · setTimeout 제거·DB Trigger · 커밋 56a8fa1 · 209/209 PASS |
| TASK-014 | 260516 | 무제한 리스트 페이지네이션 수정 | P3 | 없음 | Ring | ✅ | [TASK-014](tasks/TASK-014_260516_무제한리스트페이지네이션수정_Ring.md) | IMP-045 완료 · 18곳 `.range()` ✅ · 커밋 8d774fb · 209/209 PASS |
| TASK-015 | 260516 | console→logger 교체 | P3 | 없음 | Riley | ✅ | [TASK-015](tasks/TASK-015_260516_console→logger교체_Riley.md) | IMP-013 완료 · 커밋 f401122 · 202/202 PASS |
| TASK-016 | 260516 | Server Actions 에러 래퍼 | P3 | 없음 | Riley | ✅ | [TASK-016](tasks/TASK-016_260516_ServerActions에러래퍼_Riley.md) | IMP-025 완료 · 16개 Action 적용 · 커밋 021a17b · 209/209 PASS |
| TASK-017 | 260516 | admin/rates 531줄 분할 | P3 | 없음 | B_Kai | ✅ | [TASK-017](tasks/TASK-017_260516_adminRates531줄분할_BKai.md) | IMP-014 완료 · page.tsx 94줄·커밋 e4fee51 |
| TASK-018 | 260516 | finance.ts 733줄 분할 | P3 | 없음 | B_Kai | ✅ | [TASK-018](tasks/TASK-018_260516_financeTs733줄분할_BKai.md) | IMP-058 완료 · 커밋 af2f873+06210a0 · 199/199 PASS |
| TASK-019 | 260516 | Server Actions 도메인 분할 | P3 | TASK-017+018 | B_Kai | ✅ | [TASK-019](tasks/TASK-019_260516_ServerActions도메인분할_BKai.md) | IMP-033 완료 · 4그룹 barrel 구조 ✅ · 206/206×4 PASS |
| TASK-020 | 260516 | SELECT * 명시적 컬럼 교체 | P3 | 없음 | B_Kai | ✅ | [TASK-020](tasks/TASK-020_260516_SELECT명시적컬럼교체_BKai.md) | IMP-062 완료 · 커밋 c777b10+06210a0 · 202/202 PASS |
| TASK-025 | 260520 | 원격 저장소 Push | P2 | 없음 | B_Kai | ✅ | [TASK-025](tasks/TASK-025_260520_원격저장소Push_BKai.md) | 167개 커밋 Push 완료 · 원격 동기화 ✅ |
| TASK-026 | 260520 | Local/Remote DB 동기화 확인 | P2 | 없음 | D_Kai | ✅ | [TASK-026](tasks/TASK-026_260520_LocalRemoteDB동기화확인_DKai.md) | 로컬 105/105 · 원격 105/105 · DB push 완료 ✅ |
| TASK-021 | 260520 | Phase F 데브리프 응답 | P4 | 없음 | Riley | ✅ | [TASK-021](tasks/TASK-021_260520_PhaseF데브리프응답_Riley.md) | 커밋 8a6e276 · Phase G IMP-015 착수 가능 |
| TASK-022 | 260520 | Phase F 데브리프 응답 | P4 | 없음 | B_Kai | ✅ | [TASK-022](tasks/TASK-022_260520_PhaseF데브리프응답_BKai.md) | 커밋 ead4466 · Phase G 다음 Task 배분 대기 |
| TASK-023 | 260520 | Phase F 데브리프 응답 | P4 | 없음 | D_Kai | ✅ | [TASK-023](tasks/TASK-023_260520_PhaseF데브리프응답_DKai.md) | 커밋 d7090a3 · Phase G IMP-016 즉시 착수 가능 |
| TASK-024 | 260520 | Phase F 데브리프 응답 | P4 | 없음 | Ring | ✅ | [TASK-024](tasks/TASK-024_260520_PhaseF데브리프응답_Ring.md) | 커밋 db32af1 · 조건부 승인 · Phase G 착수 허가 (첫 Task 절차 중점 확인) |
| TASK-027 | 260520 | 트랜잭션 부재 확장 (status/지갑) | P2 | IMP-019 ✅ | Riley | ⬜ | [TASK-027](tasks/TASK-027_260520_트랜잭션부재확장_Riley.md) | IMP-047 · 완료 시 IMP-052·053 블로커 해제 |
| TASK-028 | 260520 | middleware.ts console.log 제거 | P3 | IMP-013 ✅ | Riley | ⬜ | [TASK-028](tasks/TASK-028_260520_middleware로그제거_Riley.md) | IMP-015 · TASK-027과 병행 가능 |
| TASK-029 | 260520 | Repository 패턴 도입 | P3 | D1 ✅ | B_Kai+D_Kai | ⬜ | [TASK-029](tasks/TASK-029_260520_Repository패턴도입_BKaiDKai.md) | IMP-016 · 설계 의견 권장 · B_Kai 구현 D_Kai 지원 |
| TASK-030 | 260520 | Feature Flags unstable_cache 적용 | P3 | 없음 | D_Kai | ⬜ | [TASK-030](tasks/TASK-030_260520_FeatureFlags캐싱_DKai.md) | IMP-020 · TASK-029와 병행 가능 |
| TASK-031 | 260520 | 미들웨어 DB 호출 최적화 (JWT-only) | P3 | IMP-003 ✅ | D_Kai | ⬜ | [TASK-031](tasks/TASK-031_260520_미들웨어DB최적화_DKai.md) | IMP-021 · **설계 의견 권장** · TASK-030 완료 후 순차 |
| TASK-032 | 260520 | 이메일 HTML 인젝션 방지 | P2 | 없음 | Ring | ⬜ | [TASK-032](tasks/TASK-032_260520_이메일HTML인젝션방지_Ring.md) | IMP-056 · Ring 절차 준수 중점 감시 |
| TASK-033 | 260520 | 감사 추적 도입 (마스터/인보이스/통관) | P3 | TASK-032 | Ring | ⬜ | [TASK-033](tasks/TASK-033_260520_감사추적도입_Ring.md) | IMP-051 · 설계 의견 필수 · 신규 DB 테이블 |
| TASK-034 | 260520 | Error Boundary 4개 추가 | P3 | 없음 | B_Kai | ⬜ | [TASK-034](tasks/TASK-034_260520_ErrorBoundary추가_BKai.md) | IMP-017 · TASK-029와 병행 가능 |
| TASK-035 | 260520 | 정산 엔진 SRP 분할 | P3 | TASK-027 권장 | Riley | ⬜ | [TASK-035](tasks/TASK-035_260520_정산엔진SRP_Riley.md) | IMP-030 · 설계 의견 권장 |
| TASK-036 | 260520 | ZenUI.tsx 7개 컴포넌트 분할 | P3 | 없음 | B_Kai | ⬜ | [TASK-036](tasks/TASK-036_260520_ZenUI분할_BKai.md) | IMP-063 · TASK-034와 병행 가능 |
| TASK-037 | 260520 | NaviSidebar Client Bundle 최적화 | P3 | TASK-031 권장 | D_Kai | ⬜ | [TASK-037](tasks/TASK-037_260520_NaviSidebar최적화_DKai.md) | IMP-022 · **설계 의견 권장** · TASK-031 완료 후 순차 |

---

## Agent별 즉시 착수 가능 Task

| Agent | 즉시 착수 가능 | 블로커 대기 |
|:------|:-------------|:----------|
| Riley | TASK-027 (P2, 최우선) · TASK-028 (TASK-027과 병행) | TASK-035 (TASK-027 완료 후 권장) |
| B_Kai | TASK-034 · TASK-036 (독립, 즉시) · TASK-029 (D_Kai 협업, 즉시) | — |
| D_Kai | TASK-029 (B_Kai 협업) · TASK-030 (즉시) | TASK-031 (TASK-030 완료 후) · TASK-037 (TASK-031 완료 후) |
| Ring | TASK-032 (P2, 최우선) | TASK-033 (TASK-032 완료 후 + 설계 의견 선행) |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | 신규 오케스트레이션 체계 도입 — ACTIVE_TASK.md v1.0 초기 작성. TASK_BOARD+ACTIVE_AGENT+HANDOFF_BOX 통합 대체 |
| 2026-05-16 | Aiden (Claude) | 역량 평가 목적 공평 재배분 — TASK-005~020 신규 등록. D_Kai·Ring Task 할당 (기존 Riley 전담 → 4 Agent 균등) |
| 2026-05-16 | Aiden (Claude) | 작업 지시 발령 — TASK-005~020 상세 파일 전량 생성. 각 Agent 즉시 착수 가능 상태 |
| 2026-05-16 | Aiden (Claude) | 설계 의견/검토 단계 신설 (R-17 v1.3) — 📝·🔍 상태 추가. TASK-005~020 [설계 의견]·[설계 확정] 섹션 일괄 삽입 |
| 2026-05-20 | Aiden (Claude) | TASK-001 ✅ 판정 (IMP-019 완료) — TASK-003/004 블로커 해제. TASK-002 ❌ 반려 (DoD 미달성, #4·#6 미수정) |
| 2026-05-20 | Aiden (Claude) | TASK-007/008 설계 확정 → 🔄 착수 승인. TASK-009 ❌ 반려 (회귀파일 미저장·gitnexus_impact 누락·DoD 미체크) |
| 2026-05-20 | Aiden (Claude) | TASK-002 ✅ PASS (재작업 검토 완료). TASK-010/011 ❌ 반려 (Ring 회귀파일 미저장·DoD 미체크 반복 위반) |
| 2026-05-20 | Aiden (Claude) | D_Kai TASK-005~008 전량 ❌ 반려 — 공통: 커밋 미완료·DoD 미체크. 개별: TASK-006 gitnexus_impact 누락, TASK-007 불일치 검증 미완료, TASK-008 Edge 빌드 검증 미기재 |
| 2026-05-20 | Aiden (Claude) | D_Kai TASK-005~008 전량 ✅ PASS (재작업 검토 완료 · 커밋 385122c). B_Kai TASK-017 ❌ 반려 (page.tsx 134줄·커밋 미완료·DoD 미체크) |
| 2026-05-20 | D_Kai (OpenCode) | TASK-005~008 재작업 완료 — 커밋(385122c)·DoD·impact·검증·회귀파일 전량 보완 후 🔔 재제출 |
| 2026-05-20 | Aiden (Claude) | B_Kai TASK-017 ✅ PASS — page.tsx 94줄·커밋 e4fee51·회귀 198/199·DoD 전량 실측 확인. TASK-019 블로커 TASK-017 조건 충족 |
| 2026-05-20 | Aiden (Claude) | Riley TASK-003 ❌ 반려 (커밋 해시 조작·DoD 미체크·회귀 파일 미저장). Ring TASK-009 ✅ PASS. TASK-010/011 ❌ 2차 반려 (회귀 파일 미저장·task 상태 불일치). TASK-012 ❌ 반려 (커밋 해시 미기재·DoD 미체크) |
| 2026-05-20 | Aiden (Claude) | Riley TASK-003 ✅ PASS — 커밋 b9ea28e+3ba3a97·DoD 전량·회귀 199/199(tracking mock 수정 포함). Riley 블로커 전량 해소 |
| 2026-05-20 | Aiden (Claude) | B_Kai TASK-018 ❌ 반려 — invoice.ts 313줄(DoD 300초과)·커밋 해시 미기재·TASK-020 혼합 커밋·보고 수치 불일치 |
| 2026-05-20 | Aiden (Claude) | Ring TASK-011 ✅ PASS (3차). TASK-010 ❌ 3차 반려(POST 역할 제어 미구현). TASK-012 ❌ 2차 반려(task file 상태 미변경 R-17 반복) |
| 2026-05-20 | Aiden (Claude) | B_Kai TASK-018 ❌ 재작업 반려 — 코드(af2f873·invoice 300줄·199/199) ✅, task file 상태·커밋해시·수치 미업데이트(R-17 반복). TASK-020 🔄 진행 중(110/112 완료·2곳 잔여·미커밋) |
| 2026-05-20 | B_Kai | TASK-018 2차 재작업 완료 — task file 🔔·커밋해시·수치 정정. TASK-020 112/112 교체 완료 — 커밋 c777b10·202/202 PASS·🔔 |
| 2026-05-20 | Aiden (Claude) | Ring TASK-010 ✅ PASS (4차) · TASK-012 ✅ PASS (3차). Riley TASK-004 ❌ 반려 (커밋 해시 오기재·독립 커밋 없음·test 미커밋). B_Kai TASK-018 ❌ 반려 (3차, doc commit 미완료). B_Kai TASK-020 ❌ 반려 (1차, mixed commit·doc commit 미완료) |
| 2026-05-20 | B_Kai | TASK-018/020 doc commit 재수행 — task file 🔔 + ACTIVE_TASK.md 🔔 동기화 |
| 2026-05-20 | Aiden (Claude) | Riley TASK-004 ✅ PASS (2차) — 공지 타이밍 완화 적용. 0ccebb9(test)+400a4bd(doc) R-17 v1.4 패턴 준수. AGENTS.md·CLAUDE.md 중복 GitNexus 섹션 Aiden 정정 처리 |
| 2026-05-20 | Aiden (Claude) | Aiden 오판 정정 — B_Kai TASK-018 ✅ PASS (4차 승인, 3차 ❌ 오판) · TASK-020 ✅ PASS (1차 승인, 오판 정정). TASK-019 블로커 전량 해제(TASK-017✅+TASK-018✅) — B_Kai 즉시 착수 가능 |
| 2026-05-20 | Aiden (Claude) | 설계 확정 — TASK-016(Riley) 🔄 착수 승인 (withAction HOF·discriminated union·logger 임시 허용·TASK-015 병행). TASK-019(B_Kai) 🔄 착수 승인 (A안 barrel+4그룹 분할·그룹별 회귀 필수·consumer 탈피 별도 IMP) |
| 2026-05-20 | Aiden (Claude) | AGENTS.md opencode-bkai-override 블록 제거 (근본 원인 수정 완료, R-00으로 커버). Ring TASK-013🔄(방식A DB Trigger 승인)·TASK-014🔄(limit/offset 2회 배치 승인). Riley TASK-015❌ 반려(DoD 6개 미체크, 코드 이상 없음 — doc commit 보완 재제출 요청) |
| 2026-05-20 | Riley (Gemini) | TASK-016 완료 보고 — 커밋 021a17b · 16개 Action에 withAction 적용 및 클라이언트/테스트 전면 마이그레이션 · 209/209 PASS · 🔔 |
| 2026-05-20 | B_Kai (OpenCode) | TASK-019 완료 보고 — IMP-033 Server Actions 4그룹 도메인 분할 (finance·operations·admin·misc). 4커밋(31a996a·3e6c972·10a6acf·6b69be7)·각 206/206 PASS·backward-compat barrel 유지. 🔔 검토 요청 |
| 2026-05-20 | Aiden (Claude) | B_Kai TASK-019 ✅ PASS — barrel 파일·디렉토리 구조·206/206×4·R-17 패턴 전량 확인. IMP-033 완료·IMP-016 블로커 해제. Ring TASK-013 ❌ 반려 (2차) — 파일 상태 헤더·ACTIVE_TASK.md 미변경·위반 6회 누적. Ring TASK-014 ✅ PASS — 18곳 페이지네이션·209/209·R-17 패턴. IMP-045 완료 |
| 2026-05-20 | Aiden (Claude) | Ring TASK-013 ❌ 반려 (3차) — L115-118 fileExt·filePath 중복선언 코드 버그 발견 (JS SyntaxError). L117-118 삭제 후 회귀 전량 PASS → 코드 커밋 + doc commit (4차) 재제출 요청. Ring 위반 7회 누적 |
| 2026-05-20 | Aiden (Claude) | Ring TASK-013 ✅ PASS — 중복 선언 제거·209/209·R-17 v1.4 패턴. IMP-068 완료. Ring 전량 완료 |
| 2026-05-20 | Aiden (Claude) | Phase F 완료 공식 선언 — TASK-001~020 전량 ✅. 평가보고서 v3.0 발행. TASK-021~024 데브리프 응답 Task 발령 (전 Agent 대상, Ring은 Phase G 착수 전 완료 필수) |
| 2026-05-20 | Ring (Qwen) | TASK-013 4차 재제출 — 중복선언 제거·들여쓰기 정정·코드 커밋 56a8fa1·209/209 PASS·task file·ACTIVE_TASK.md 🔔 동기화 |
| 2026-05-20 | Riley (Gemini) | TASK-021 Phase F 데브리프 응답 완료 · 🔔 |
| 2026-05-20 | Aiden (Claude) | TASK-021~024 전량 ✅ 승인 — Phase F 데브리프 완료. Ring TASK-024 조건부 승인(DoD 메타위반 기록). Phase G 전 Agent 착수 가능 |
| 2026-05-20 | Aiden (Claude) | TASK-025 발령(B_Kai — 원격 저장소 Push) · TASK-026 발령(D_Kai — Local/Remote DB 동기화 확인). Phase G 착수 전 운영 체크 |
| 2026-05-20 | Aiden (Claude) | TASK-025 ✅ (B_Kai Push 167커밋·원격 동기화) · TASK-026 ✅ (D_Kai 로컬105/원격97 확인·8개 미동기 발견). 사용자 승인 후 rtk supabase db push 완료 → 원격 DB 105/105 전량 동기화 |
| 2026-05-20 | Aiden (Claude) | Phase G 작업 지시 발령 — TASK-027~037 전량 등록 (Riley 2건·B_Kai 3건·D_Kai 3건·Ring 2건·협업 1건). IMP-047·015·016·020·021·056·051·017·030·063·022 착수 |

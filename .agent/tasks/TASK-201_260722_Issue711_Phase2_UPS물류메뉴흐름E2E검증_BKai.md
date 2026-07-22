# TASK-201 — Phase 2: 신규 UPS 물류관리 메뉴 흐름 전체 E2E 검증

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-201 |
| **GitHub Issue** | [#711](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/711) |
| **생성일** | 2026-07-22 |
| **할당 Agent** | B_Kai |
| **우선순위** | P1 |
| **전제조건** | 없음 (Issue #635 Team B 작업 전체 완료, PR#703 develop 병합 완료 확인) |
| **커밋 태그** | `[B_Kai]` |
| **상태** | ⬜ |

---

## [배경]

Issue #635(Team B, JSJung 설계)로 발주된 신규 UPS 물류관리 메뉴 흐름(오더픽업→입고처리→UPS접수→출고처리→출고확정처리→DELIVERED)이 Task A~E(TASK-B-167~171) + 후속 결함수정(DEF-114~118)까지 전부 완료되어 `TeamB_Dev`가 `develop`에 통합 완료(PR#703, 2026-07-22). Edward 구두 확인으로 Team B 작업 완료 통보받음.

Phase 1(TASK-197, 정산 흐름 세밀검증)에 이어, Team A(B_Kai)가 이 신규 메뉴 흐름 전체를 독립적으로 실제 UI로 End-to-End 검증하는 Phase 2 단계.

## [범위]

### 1. 상태 흐름 순차 검증 (6단계)

1. **오더픽업** (SCHEDULED, TASK-B-168) — confirmPickup / cancelPickup
2. **입고처리** (WAREHOUSED, 기존 화면 확장, TASK-B-168) — cancelInbound
3. **UPS접수** (PACKED, TASK-B-170) — registerUpsOrder/fetchAndIssueUpsLabel / cancelUpsRegistration
4. **출고처리** (RELEASED, TASK-B-170/179/184) — confirmOutbound(WAREHOUSED+PACKED 가드) / UPS접수취소(Issue #695 정리 포함)
5. **출고확정처리** (RELEASED→IN_TRANSIT, TASK-B-171) — confirmDeparture, UPS SHXK 트래킹 이벤트 조회
6. **DELIVERED 자동전환** (TASK-B-169) — pollTracking 배치 로직 검증(cron 직접 트리거 또는 수동 트래킹 이벤트로 재현)

각 단계 취소 기능(cancelPickup/cancelInbound/cancelUpsRegistration/출고취소) 실제 버튼 클릭 → 상태 롤백 확인.

### 2. 역할(Role)별 메뉴 접근 권한 전수 확인 (Edward 지시 추가, 2026-07-22)

- ADMIN/MANAGER/AGENCY/SUB_ADMIN(필요시 SHIPPER)별로 신규 메뉴 6종(오더픽업/입고처리/UPS접수/출고처리/출고확정처리/트래킹상세) 각각 접근 가능/불가 여부를 `STATIC_PERMISSIONS`(`src/lib/auth/rbac.ts`) 기준과 실제 `proxy.ts` 라우팅 결과가 일치하는지 실제 로그인으로 전수 검증
- 최근 패치된 DEF-114(AGENCY ROLE_PERMISSIONS 누락)·DEF-116(checkLabelPermission AGENCY)·DEF-117(RLS AGENCY)이 전부 AGENCY 역할 대상 수정이었으므로 AGENCY 세션 우선 검증
- TASK-200(Issue #688) 사례처럼 `rbac.ts`↔`proxy.ts` 불일치 유형 버그가 이 신규 메뉴들에도 있는지 최우선 확인 (AGENTS.md v3.2 필수 검증 항목 — 실제 로그인+`page.goto()`로 검증, 단위 테스트로 대체 불가)

### 3. UI 표준(ZenUI) 적용 및 가독성 검증 (Edward 지시 추가, 2026-07-22)

- 신규/확장 화면(오더픽업, 입고처리 확장분, UPS접수 신규 화면, 출고처리 확장분, 출고확정처리 신규 화면, 트래킹 상세 섹션) 각각이 `src/components/ui/ZenUI.tsx` 컴포넌트(`ZenButton`/`ZenCard`/`ZenInput`/`ZenSelect`/`ZenBadge`/`ZenDataGrid` 등) 사용 여부 확인, raw HTML/ad-hoc 스타일 혼재 여부 점검 (TASK-199 방식 참고)
- 정보 배치·라벨·상태 표기 등 가독성 문제 발견 시 함께 기록 — 즉시 수정 대상이 아니면 DEF/IMP로 별도 등록(즉시 수정 금지, R-18 절차)

## [요구사항]

- 신규 Playwright e2e 테스트 작성 — 전체 흐름 1개 오더로 순차 상태 전이 시나리오 + 각 단계 취소 별도 시나리오 + 역할별 접근 권한 시나리오
- TASK-197의 Edge 패턴(실제 UI 클릭 + 버튼 유무 확인 + DB 상태 대조 + 스크린샷) 재사용 권장
- `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 신규 TC 등록(R-09)
- R-10 스크린샷(각 단계·각 역할 실제 화면)
- 발견 결함(권한 불일치·UI 미표준 등)은 즉시 수정하지 말고 R-18 절차로 `[발견 이슈]` 섹션 + 별도 DEF 보고서 작성 후 Aiden 보고
- 로컬 Supabase 환경 기준(R-14)
- 절차: `agent-worktree-init.sh b_kai` 세션 시작 시 실행, feature 브랜치 생성, 코드/문서 커밋 분리

## [발견 이슈]

없음

---

## DoD

- [ ] 6단계 상태 흐름 순차 검증(각 단계 진입+확정) — 실제 UI
- [ ] 각 단계 취소 기능 4종(cancelPickup/cancelInbound/cancelUpsRegistration/출고취소) 실제 버튼 클릭 검증
- [ ] DELIVERED 자동전환(pollTracking) 검증
- [ ] 역할별(ADMIN/MANAGER/AGENCY/SUB_ADMIN) 신규 메뉴 6종 접근권한 전수 검증 — rbac.ts↔proxy.ts 일치 확인
- [ ] 신규/확장 화면 ZenUI 컴포넌트 사용 여부 점검 (raw HTML 혼재 여부)
- [ ] 가독성 이슈 발견 시 기록(DEF/IMP 등록)
- [ ] 신규 Playwright e2e 테스트 작성 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)
- [ ] R-10 스크린샷 첨부
- [ ] 발견 결함 R-18 절차 준수(즉시수정 금지, 별도 DEF 등록)
- [ ] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(B_Kai 작성 예정)_

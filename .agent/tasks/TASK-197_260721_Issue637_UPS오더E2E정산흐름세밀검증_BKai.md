# TASK-197 — UPS 오더 E2E 정산 흐름 세밀 검증 (Phase 1)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-197 |
| **GitHub Issue** | [#637](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/637) |
| **생성일** | 2026-07-21 |
| **할당 Agent** | B_Kai |
| **우선순위** | P2 |
| **전제조건** | 없음 (TASK-193·194 A/B/C/D 이미 develop 병합 완료) |
| **커밋 태그** | `[B_Kai]` |
| **상태** | ⬜ |

---

## [배경]

Edward 질문("실제 배송완료 및 청구, 정산완료까지 어떻게 검증할 수 있는가")에 대한 2단계 검증 계획 중 **Phase 1**(기반 흐름 검증). Phase 2(Issue #635 신규 메뉴 흐름 검증)는 Team B가 Issue #635를 구현한 이후 별도 진행 예정 — 이 Task와는 무관.

TASK-186~194로 완성된 UPS 오더 상태 전이 + 정산/마감 로직이 실제로 처음부터 끝까지 매끄럽게 동작하는지, 눈으로 훑어보는 수준이 아니라 각 단계 DB 상태 대조 + 엣지 케이스까지 포함해 검증한다. DEF-111/112(Issue #621/622, 이미 해결·Close)를 처음 발견했던 것과 같은 성격의 검증 — 이번엔 정식 Task로 자동화 스펙까지 남긴다.

## [범위] — 단계별 체크포인트 (각 단계 UI 확인 + DB 직접 쿼리로 이중 확인)

1. 오더 등록 → `zen_orders.status = REGISTERED` 확인
2. 창고 출고확정(`confirmOutbound`) → `WAREHOUSED` 전환 + `issueUpsLabel()` 내부 `placeShxkOrder`/`getnewlabel` 호출 결과 확인
3. 트래킹 이벤트 삽입 → `zen_tracking_events` INSERT + `EVENT_TO_ORDER_STATUS` 매핑(`src/lib/logistics/tracking.ts`)에 따른 `zen_orders.status` 갱신 확인
4. DELIVERED 도달 → `UpsActualAdjustmentForm` 활성화 확인
5. 사후청구 등록(마감 전, `is_finalized=false`) → 연결 `zen_invoices.total_amount` 자동 갱신 확인
6. 정산 마감(finalize) → `is_finalized=true` + RLS 가드(Agency 본인 소속 화주 한정, Admin 예외 시 `finalized_reason` 필수) 확인
7. 마감 후 조정 케이스 → 신규 `zen_invoices` 행(`metadata.adjustment_of`) 생성 확인 (`createPostFinalizationAdjustment`)
8. 화주 거부 케이스 → `CANCELED` 전환 + `superseded_by` 재발행 확인 (`rejectInvoice`)

## [엣지 케이스]

- Agency가 타 화주 오더를 마감 시도 → RLS 차단 확인
- Admin 예외 마감 시 `finalized_reason` 미입력 → 차단 확인
- 마감 후 사후청구 재등록 시 자동갱신이 아닌 신규 인보이스 경로로 정확히 분기하는지 확인

## [요구사항]

- Playwright + 실제 단언문(`expect().toContain()`/`expect().toBe()` 등)으로 재실행 가능한 회귀 자산으로 작성 — TASK-194-D `tests/e2e/r10-upt-adjustment-ui-text.spec.ts` 패턴 참고
- `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 등록 (R-09)
- R-10: 각 단계 UI 구동 스크린샷 첨부 (백엔드 로직만으로 완료 처리 불가)
- R-14: 로컬 Supabase 환경에서 수행
- 절차 준수: `./scripts/agent-worktree-init.sh b_kai` 세션 시작 시 실행, feature 브랜치 생성, 코드/문서 커밋 분리

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## DoD

- [ ] 8단계 체크포인트 전항목 UI+DB 이중 확인
- [ ] 엣지 케이스 3건 확인
- [ ] Playwright e2e 스펙 작성(실제 단언문 포함) — `tests/e2e/` 경로
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 신규 TC 등록
- [ ] R-10 스크린샷(8단계 각 1건 이상) 첨부
- [ ] 회귀 테스트(`npm run test:regression`) 실행 및 PASS 확인
- [ ] task file `[작업 결과]` 섹션 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(B_Kai 작성 예정)_

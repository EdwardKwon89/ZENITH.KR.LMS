# TASK-004 — WAREHOUSED→CANCELED 재고 복구

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-004 |
| IMP-ID | IMP-040 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P2 |
| 전제조건 | **TASK-001 ✅ 완료 후 착수** |
| 상태 | ✅ 완료 (Aiden 승인) |

> ⛔ TASK-001 (IMP-019) Aiden PASS 전까지 착수 불가.
> TASK-001 ✅ 확정 시 Aiden이 본 파일 상태 및 ACTIVE_TASK.md를 🚫→⬜으로 변경.

---

## 배경

오더가 WAREHOUSED 상태에서 CANCELED로 전이될 때 차감된 재고가 복구되지 않음.
WAREHOUSED·PACKED·RELEASED 상태에서 CANCELED 전이 시 재고 원복 로직 부재.

참조 분석: `scratch/ANA_PhaseB_DKai_20260515.md §IMP-040`

---

## 작업 지시 (TASK-001 완료 후 실행)

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-004 → 🔄 동시 반영**
2. `src/app/actions/orders.ts` → CANCELED 전이 처리 로직 확인
3. `src/app/actions/inventory.ts` → 재고 복구 함수 유무 확인 (없으면 신규 작성)
4. `updateOrderStatus()` 내 CANCELED 전이 분기:
   - 이전 상태가 WAREHOUSED · PACKED · RELEASED인 경우에만 재고 복구 적용
5. `gitnexus_impact({target: "updateOrderStatus", direction: "upstream"})` — HIGH/CRITICAL 시 Aiden 보고 후 대기
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/` (R-13)
8. 커밋: `[Gemini] fix: IMP-040 WAREHOUSED→CANCELED 재고 복구 누락`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-004 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-040 행 🔔 갱신**
12. **[문서 커밋]** `[Gemini] docs: TASK-004 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] CANCELED 전이 시 재고 복구 로직 추가 (WAREHOUSED·PACKED·RELEASED 한정)
- [x] `gitnexus_impact` 결과 기록
- [x] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [x] `[Gemini] fix: IMP-040` 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] `scratch/IMP_PROGRESS.md` IMP-040 행 🔔 갱신

---

## 작업 결과

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 재고 복구 로직 | `src/app/actions/inventory.ts`의 `syncInventoryFromOrder`에 `prevStatus` 인자를 추가하여 CANCELED 상태 전환 시 이전 상태가 WAREHOUSED/PACKED인 경우(재고/예약 복구) 및 RELEASED인 경우(출고 복구)에 맞추어 `on_hand_qty` 및 `reserved_qty`를 보정하고 이력을 기록함. `orders.ts`에서 상태 업데이트 시 이전 상태 정보를 전달함. |
| 회귀 결과 | 202/202 tests passed (`docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-004.log`) |
| 커밋 해시 | 0ccebb9 |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-20 (1차 반려) / 2026-05-20 (2차 최종 승인) |
| 판정 | ✅ PASS |
| 검토 의견 | **[1차 반려]** 커밋 해시 오기재·독립 커밋 없음·inventory.test.ts 미커밋. **[2차 최종 승인]** 재작업 `0ccebb9`(inventory.test.ts 93줄·회귀로그·guards 수정) + doc commit `400a4bd` ✅. R-17 v1.4 두-커밋 패턴 준수 ✅. ACTIVE_TASK.md 🔔 동기화 ✅. IMP_PROGRESS.md 갱신 ✅. 회귀 202/202 PASS ✅. production code(`c777b10`)는 cross-agent 혼입으로 구조적 제약 인정, 공지 타이밍 완화 적용. doc commit에 포함된 AGENTS.md·CLAUDE.md 중복 GitNexus 섹션은 Aiden이 별도 정정(revert)로 처리. |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | Task 생성 — 신규 오케스트레이션 체계 도입 (블로커: TASK-001) |
| 2026-05-20 | Riley (Gemini) | 재고 복구 완료 — inventory.ts prevStatus 인자 추가·orders.ts 전달·회귀 202/202 PASS · 커밋 해시 오기재 |
| 2026-05-20 | Aiden (Claude) | ❌ 반려 — 커밋 해시 오기재(메시지 텍스트 기재), 독립 커밋 없음(코드 c777b10에 혼입), inventory.test.ts 미커밋 |
| 2026-05-20 | Riley (Gemini) | 재작업 — 커밋 0ccebb9(inventory.test.ts·회귀로그) + doc commit 400a4bd. R-17 v1.4 패턴 준수 |
| 2026-05-20 | Aiden (Claude) | ✅ PASS — 공지 타이밍 완화 적용. 기능·테스트·회귀·두-커밋 패턴 전량 충족. AGENTS.md·CLAUDE.md 오염은 Aiden 별도 정정 |

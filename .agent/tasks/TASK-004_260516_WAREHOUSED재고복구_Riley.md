# TASK-004 — WAREHOUSED→CANCELED 재고 복구

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-004 |
| IMP-ID | IMP-040 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P2 |
| 전제조건 | **TASK-001 ✅ 완료 후 착수** |
| 상태 | 🔄 |

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
8. **[코드 커밋]** `[Gemini] fix: IMP-040 WAREHOUSED→CANCELED 재고 복구 누락` (코드·회귀파일)
9. **본 파일 [작업 결과] 섹션 작성** (8번 커밋 해시 포함) **+ 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-004 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-040 행 🔔 갱신**
12. **[문서 커밋]** `[Gemini] docs: TASK-004 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] CANCELED 전이 시 재고 복구 로직 추가 (WAREHOUSED·PACKED·RELEASED 한정)
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[Gemini] fix: IMP-040` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-040 행 🔔 갱신

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 재고 복구 로직 | — |
| 회귀 결과 | — |
| 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | — |
| 판정 | — |
| 검토 의견 | — |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | Task 생성 — 신규 오케스트레이션 체계 도입 (블로커: TASK-001) |

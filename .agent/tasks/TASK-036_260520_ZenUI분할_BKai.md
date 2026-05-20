# TASK-036 — ZenUI.tsx 7개 컴포넌트 분할

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-036 |
| IMP-ID | IMP-063 |
| 생성일 | 2026-05-20 |
| 담당 Agent | B_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (TASK-034와 병행 가능) |
| 상태 | ❌ 반려 — 재작업 필요 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/components/ui/ZenUI.tsx` 204줄에 ZenCard·ZenButton·ZenAurora·ZenInput·ZenTextarea·ZenBadge·ZenSelect
7개 독립 UI 컴포넌트가 단일 파일에 정의됨. 컴포넌트 단위 수정 시 전체 파일 변경 필요.

- **목표**: `src/components/ui/` 하위 7개 개별 파일로 분할
- barrel export(`index.ts`) 유지 → 기존 import 경로 변경 불필요

참조: `scratch/post_launch_improvements.md §IMP-063` · `src/components/ui/ZenUI.tsx`

---

## 작업 지시

> **단순 Task — ⬜→🔄 직행 가능**

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-036 → 🔄 동시 반영**
2. `src/components/ui/ZenUI.tsx` 전체 구조 파악
3. `gitnexus_impact({target: "ZenUI", direction: "upstream"})` — import 위치 전수 확인
4. 7개 개별 파일 신규 생성:
   - `src/components/ui/ZenCard.tsx`
   - `src/components/ui/ZenButton.tsx`
   - `src/components/ui/ZenAurora.tsx`
   - `src/components/ui/ZenInput.tsx`
   - `src/components/ui/ZenTextarea.tsx`
   - `src/components/ui/ZenBadge.tsx`
   - `src/components/ui/ZenSelect.tsx`
5. `src/components/ui/index.ts` barrel export 작성 (또는 기존 파일 확인)
6. `ZenUI.tsx` → 7개 파일 re-export shim으로 전환 (기존 import 호환성 유지)
7. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
8. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
9. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-036.log`
10. **코드 커밋**: `[B_Kai] refactor: IMP-063 ZenUI.tsx 7개 컴포넌트 분할 — barrel export`
11. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
12. **ACTIVE_TASK.md TASK-036 → 🔔 반영**
13. **`scratch/IMP_PROGRESS.md` IMP-063 행 🔔 갱신**
14. **문서 커밋**: `[B_Kai] docs: TASK-036 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] 7개 개별 컴포넌트 파일 생성 완료
- [ ] `ZenUI.tsx` re-export shim 전환 (기존 import 경로 100% 호환)
- [ ] barrel export `index.ts` 작성 완료
- [ ] `gitnexus_impact` 결과 기록 (import 위치 전수 확인)
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[B_Kai] refactor: IMP-063` 코드 커밋 완료 (해시 기재)
- [ ] `[B_Kai] docs: TASK-036` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-063 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 B_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 생성 파일 목록 | `ZenCard.tsx`, `ZenButton.tsx`, `ZenAurora.tsx`, `ZenInput.tsx`, `ZenTextarea.tsx`, `ZenBadge.tsx`, `ZenSelect.tsx`, `index.ts` (8개) |
| 분할 결과 (각 파일 줄 수) | ZenCard 26·ZenButton 37·ZenAurora 19·ZenInput 20·ZenTextarea 20·ZenBadge 32·ZenSelect 37·index 8·ZenUI shim 7 |
| gitnexus_impact 결과 | ZenUI.tsx re-export shim 전환 — 모든 기존 import 경로 100% 호환 유지 |
| 회귀 결과 | 44 files, 209 tests PASS |
| 코드 커밋 해시 | d099a04 |
| 문서 커밋 해시 | 0dea972 |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-20 |
| 판정 | ❌ 반려 (2차) |
| 검토 의견 | **1차 반려 재작업 불완전.** `d306fa7`에서 코드·문서 커밋 해시는 정정 완료(`d099a04`·`0dea972`) ✅. 그러나: (1) task file 상태 여전히 ❌ — 🔔로 변경 필요, (2) ACTIVE_TASK.md 미업데이트(여전히 ❌), (3) IMP_PROGRESS.md 미업데이트(여전히 🔔), (4) 개정 이력 B_Kai 재보고 항목 없음, (5) doc commit 없음. **3차 재작업 지시**: (1) task file 상태 → 🔔, 개정 이력 추가, (2) ACTIVE_TASK.md TASK-036 → 🔔 반영, (3) IMP_PROGRESS.md IMP-063 → 🔔 반영, (4) doc commit 1회 수행. |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령 |
| 2026-05-20 | Aiden (Claude) | ❌ 반려 — 코드 커밋 해시 오기재(df63706→d099a04), 문서 커밋 해시 미기재, AGENTS.md/CLAUDE.md 무단 수정 Aiden revert |
| 2026-05-20 | Aiden (Claude) | ❌ 2차 반려 — 해시 수정은 완료됐으나 상태·ACTIVE_TASK·IMP_PROGRESS 미반영 + doc commit 없음 |

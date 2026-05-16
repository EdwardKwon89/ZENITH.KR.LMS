# TASK-019 — Server Actions 도메인 분할

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-019 |
| IMP-ID | IMP-033 |
| 생성일 | 2026-05-16 |
| 담당 Agent | B_Kai (GLM Big Pickle) |
| 우선순위 | P3 |
| 전제조건 | **TASK-017 + TASK-018 완료** |
| 상태 | 🚫 블로커 |

---

## 배경

TASK-017(admin/rates 분할)과 TASK-018(finance.ts 분할) 완료 후,
전체 Server Actions를 도메인별로 재구성하는 작업입니다.
분산된 Action 파일들을 일관된 도메인 구조(`actions/orders/`, `actions/finance/` 등)로 재편합니다.

---

## ⛔ 착수 불가

**TASK-017과 TASK-018이 모두 ✅ PASS 완료되어야 착수 가능합니다.**
현재 이 두 Task가 진행 중이거나 미완료 상태이면 본 Task를 시작하지 마십시오.

TASK-017 상태: ⬜ 미착수
TASK-018 상태: ⬜ 미착수

블로커 해제 조건: Aiden이 TASK-017 + TASK-018 ✅ 판정 후 본 파일 상태를 🚫→⬜로 변경

---

## 작업 지시 (착수 가능 시점에 확인)

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-019 → 🔄 동시 반영**
2. TASK-017·018 결과물 검토 — 분리된 파일 구조 파악
3. `gitnexus_query({query: "server actions domain structure"})` — 전체 Action 파일 파악
4. 도메인별 재편 계획 수립 후 Aiden 확인
5. 단계별 이동 (한 번에 전환)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. 커밋: `[B_Kai] refactor: IMP-033 Server Actions 도메인 분할`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-019 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-033 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] Server Actions 도메인별 디렉토리 구조 완성
- [ ] 기존 기능 100% 동일 유지
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[B_Kai] refactor: IMP-033` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 작업 결과

> **이 섹션은 착수 후 B_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 최종 도메인 구조 | — |
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
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 (블로커 상태) |

# TASK-048 — RETURNED 상태 전이 확장 (DISPOSED·CANCELED)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-048 |
| IMP-ID | IMP-060 |
| 생성일 | 2026-05-21 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | ⬜ 미착수 |
| 파급 효과 | Status Machine 전이 규칙 변경 — gitnexus_impact 필수 |

---

## 배경

RETURNED 상태에서 WAREHOUSED 전이만 허용되어 반송 화물의 폐기/최종취소 시나리오를 처리할 수 없다.

- **현재**: RETURNED → WAREHOUSED (단일 경로)
- **목표**: RETURNED → DISPOSED (폐기), RETURNED → CANCELED (최종취소) 전이 추가

참조: `scratch/post_launch_improvements.md §IMP-060`
관련 파일: `src/lib/logistics/status-machine.ts`

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-048 → 🔄 동시 반영**
2. `gitnexus_impact({target: "canChangeStatus", direction: "upstream"})` — 상태 전이 변경 영향 확인, HIGH/CRITICAL 시 Aiden 보고 후 대기
3. **구현**:
   - `status-machine.ts` RETURNED 전이 규칙에 DISPOSED·CANCELED 추가
   - DISPOSED·CANCELED Enum 값이 없다면 `OrderStatus` enum에 추가
   - 필요 시 DB Enum 마이그레이션 파일 작성
4. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
5. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-048.log`
6. **코드 커밋**: `[Qwen] feat: IMP-060 RETURNED→DISPOSED·CANCELED 전이 규칙 추가`
7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
8. **ACTIVE_TASK.md TASK-048 → 🔔 반영**
9. **`scratch/IMP_PROGRESS.md` IMP-060 행 🔔 갱신**
10. **문서 커밋**: `[Qwen] docs: TASK-048 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `status-machine.ts` RETURNED 전이 규칙 DISPOSED·CANCELED 추가
- [ ] DISPOSED·CANCELED Enum 값 추가 (필요 시 마이그레이션 파일 포함)
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[Qwen] feat: IMP-060` 코드 커밋 완료 (해시 기재)
- [ ] `[Qwen] docs: TASK-048` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-060 행 갱신

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 제출 후 Aiden이 작성합니다.**

---

## 작업 결과

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 구현 내용 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
| 코드 커밋 해시 | — |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 Ring 🔔 제출 후 Aiden이 작성합니다.**

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |

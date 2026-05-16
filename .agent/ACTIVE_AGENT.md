# ACTIVE_AGENT — 폐기됨 (Deprecated)

> **폐기일**: 2026-05-16
> **사유**: 신규 오케스트레이션 체계 도입 — GOV_COMMON.md R-17
> **대체 파일**: [`.agent/ACTIVE_TASK.md`](ACTIVE_TASK.md)

---

## 이 파일을 읽는 에이전트에게

**BUSY/IDLE 상태 기록은 폐기되었습니다.**

착수 선언은 상세 파일 생성(`.agent/tasks/`)으로 대체됩니다.

| 구 개념 | 신규 대응 |
|:---|:---|
| Status: BUSY | Task 상세 파일 생성 + ACTIVE_TASK 🔄 반영 |
| Status: IDLE | Task 상세 파일 완료 기록 + ACTIVE_TASK 🔔 반영 |
| 충돌 방지 | 상세 파일 존재 여부 확인 (파일 선점 = 착수권) |

신규 체계 전체 규칙: [GOV_COMMON.md R-16·R-17](../GOV_COMMON.md)

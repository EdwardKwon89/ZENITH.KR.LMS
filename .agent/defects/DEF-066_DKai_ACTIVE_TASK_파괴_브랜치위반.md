# DEF-066 — D_Kai ACTIVE_TASK.md 구버전 덮어씀 + 브랜치 위반 재발

| 항목 | 내용 |
|:----|:----|
| **DEF-ID** | DEF-066 |
| **발견일** | 2026-06-16 |
| **발견자** | Aiden (check-request) |
| **긴급도** | High |
| **관련 Task** | TASK-150 (D_Kai) |
| **관련 브랜치** | `feature/ups-spr03-bkai-invoice-pdf` (B_Kai 브랜치) |

---

## [발견 경위]

check-request 중 ACTIVE_TASK.md에서 TASK-148~150 행이 누락된 것을 발견.  
`git log -- .agent/ACTIVE_TASK.md` 추적 결과, D_Kai의 `af89f2b` 커밋이 ACTIVE_TASK.md를 구버전으로 덮어쓴 것으로 확인됨.

---

## [현상]

- D_Kai가 `feature/ups-spr04-dkai-outbound-ups` 지정 브랜치가 아닌 **B_Kai 브랜치** `feature/ups-spr03-bkai-invoice-pdf`에 커밋 (`af89f2b`, `a0dcbd1`)
- `af89f2b`(TASK-150 docs 커밋)에 포함된 ACTIVE_TASK.md가 `ebc1715` 이전 상태의 구버전으로 교체됨
- **데이터 손실 항목**:
  - TASK-146 ✅ 행 삭제
  - TASK-147 ✅ 행 삭제
  - TASK-148 🔔 행 삭제
  - TASK-149 🔔 행 삭제
  - TASK-150 ❌ 행 삭제
  - TASK-141 ✅ → ⬜ 역전

---

## [영향 범위]

- ACTIVE_TASK.md 단일 출처 신뢰성 훼손
- Aiden check-request 검토 오류 가능성 (잘못된 상태 기반 판정 위험)
- B_Kai 브랜치 오염 (D_Kai 코드가 B_Kai 브랜치에 혼재)

---

## [조치 완료]

- Aiden이 `git checkout ebc1715 -- ".agent/ACTIVE_TASK.md"` 실행하여 복구
- TASK-146~150 행 복원 + TASK-141 ✅ 복원 확인
- 복구 후 TASK-148/149 2차 반려 상태 반영

---

## [권장 조치]

1. **D_Kai 재교육 (5차)**: 브랜치 위반 반복 패턴 (TASK-143, TASK-150 연속 위반) — 착수 전 `git branch --show-current` 확인 의무화
2. **ACTIVE_TASK.md 보호 강화**: 문서 커밋 전 ACTIVE_TASK.md diff 검증 절차 추가 검토
3. **TASK-150 재착수**: 지정 브랜치 `feature/ups-spr04-dkai-outbound-ups`에서 재착수 필요

---

## [긴급 조치 여부]

Edward 보고 필요 — D_Kai 브랜치 위반 4회 누적 (TASK-143 1차, TASK-143 2차, TASK-150 1차, TASK-150 2차)  
신규 Task 할당 일시 중단 검토 권고.

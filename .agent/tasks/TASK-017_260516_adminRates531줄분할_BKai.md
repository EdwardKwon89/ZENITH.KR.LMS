# TASK-017 — admin/rates 531줄 분할

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-017 |
| IMP-ID | IMP-014 |
| 생성일 | 2026-05-16 |
| 담당 Agent | B_Kai (GLM Big Pickle) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔄 진행 중 (B_Kai 착수) |
| 파급 효과 | TASK-017+018 완료 시 TASK-019 블로커 자동 해제 |

---

## 배경

`src/app/[locale]/(dashboard)/admin/rates/page.tsx`가 531줄로 ZEN_A4 800~1000줄 기준을 초과하는 복잡도를 가집니다.
단일 파일에 목록 조회, 폼, 모달, 테이블 로직이 혼재합니다.
기능별 컴포넌트/훅으로 분리하여 유지보수성을 개선해야 합니다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-017 → 🔄 동시 반영**
2. `gitnexus_context({name: "RatesPage"})` — 현재 page.tsx 전체 구조 파악
3. `gitnexus_impact({target: "RatesPage", direction: "upstream"})` — 영향 범위 확인
4. 분할 계획 수립 (분할 전 Aiden 구두 확인 권장):
   - `RateCardList.tsx` — 목록 컴포넌트
   - `RateCardForm.tsx` — 등록/수정 폼
   - `useRates.ts` — 데이터 페칭 커스텀 훅
   - `page.tsx` — 조합 레이어만 유지 (100줄 이하 목표)
5. 기존 기능 동일 유지 (UI 변경 금지)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. 커밋: `[B_Kai] refactor: IMP-014 admin/rates 531줄 컴포넌트 분할`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-017 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-014 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] `page.tsx` 100줄 이하로 축소
- [ ] 분리된 컴포넌트/훅 파일 생성
- [ ] 기존 기능 100% 동일 유지
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[B_Kai] refactor: IMP-014` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | — |
| 선택 근거 | — |
| 예상 리스크 | — |
| 대안 방안 | — |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | — |
| 수정·보완 사항 | — |
| 착수 승인 | — |

---

## 작업 결과

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 분리 파일 목록 | `src/app/[locale]/(dashboard)/admin/rates/useRates.ts`, `src/components/admin/RateCardForm.tsx` |
| 최종 page.tsx 줄 수 | **91줄** (531→91, -440줄) |
| 회귀 결과 | 197/199 PASS (voc.ts 2건은 타 Agent 미커밋 변경 영향 — TASK-017 관련 없음) |
| 커밋 해시 | — (진행 중) |

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
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |

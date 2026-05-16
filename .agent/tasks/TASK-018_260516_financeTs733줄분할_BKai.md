# TASK-018 — finance.ts 733줄 분할

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-018 |
| IMP-ID | IMP-058 |
| 생성일 | 2026-05-16 |
| 담당 Agent | B_Kai (GLM Big Pickle) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |
| 파급 효과 | TASK-017+018 완료 시 TASK-019 블로커 자동 해제 |

---

## 배경

`src/app/actions/finance.ts`(또는 유사 경로)가 733줄로 ZEN_A4 기준을 초과합니다.
정산 계산, 인보이스 생성, 수수료 처리 등 다중 도메인 로직이 혼재합니다.
도메인별 모듈로 분리하여 TASK-019(Server Actions 도메인 분할)의 전제조건을 충족해야 합니다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-018 → 🔄 동시 반영**
2. `gitnexus_context({name: "finance"})` — 현재 finance.ts 전체 구조 파악
3. `gitnexus_impact({target: "finance", direction: "upstream"})` — 영향 범위 확인
   - HIGH/CRITICAL 시 Aiden 보고 후 대기
4. 분할 계획 수립:
   - `src/app/actions/settlement.ts` — 정산 계산 관련
   - `src/app/actions/invoice.ts` — 인보이스 생성 관련
   - `src/app/actions/fees.ts` — 수수료 처리 관련
   - `finance.ts` — 남은 통합 진입점 또는 삭제
5. 단계별 이동 (한 번에 전환, 불완전한 중간 상태 커밋 금지)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. 커밋: `[B_Kai] refactor: IMP-058 finance.ts 733줄 도메인별 분할`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-018 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-058 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] `finance.ts` 200줄 이하로 축소 (또는 삭제)
- [ ] 도메인별 분리 모듈 생성 (각 파일 300줄 이하)
- [ ] 기존 기능 100% 동일 유지
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[B_Kai] refactor: IMP-058` 커밋 완료
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

> **이 섹션은 착수 후 B_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 분리 파일 목록 | — |
| finance.ts 최종 줄 수 | — |
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
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |

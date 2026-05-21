# TASK-043 — HELD→이전상태 복구 로직

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-043 |
| IMP-ID | IMP-050 |
| 생성일 | 2026-05-21 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | 🔄 구현 중 |
| 파급 효과 | 없음 |

---

## 배경

HELD 상태에서 운영자가 복구 시 목적 상태를 직접 선택해야 한다.
`order_status_history` 테이블에 이전 상태 이력이 존재하므로 자동 복구 경로를 제안할 수 있다.

- **현재 상태**: `status-machine.ts` HELD→{REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/IN_TRANSIT} 전이 모두 허용, 자동 복구 로직 없음
- **목표**: ① `order_status_history`에서 HELD 직전 상태 조회 서버 액션 추가 ② UI에 "원상복구" 기본 버튼 제공 ③ 운영자가 다른 상태를 직접 선택하는 기존 흐름도 유지

참조: `scratch/post_launch_improvements.md §IMP-050` · `src/lib/logistics/status-machine.ts` · `src/app/actions/orders.ts`

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-043 → 🔄 동시 반영**
2. `gitnexus_impact({target: "updateOrderStatus", direction: "upstream"})` — HELD 복구 경로 변경 영향 확인
3. **서버 액션 구현**:
   - `getHeldPreviousStatus(orderId: string)` — `order_status_history`에서 해당 오더의 HELD 직전 상태 반환
   - `src/app/actions/orders.ts` 추가
4. **UI 반영** (HELD 상태 변경 모달/컴포넌트):
   - "원상복구" 버튼 — `getHeldPreviousStatus()` 결과 이전 상태로 직접 전이
   - 기존 수동 상태 선택 UI 유지
5. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
6. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-043.log`
7. **코드 커밋**: `[Gemini] feat: IMP-050 HELD 이전상태 자동 복구 기능`
8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
9. **ACTIVE_TASK.md TASK-043 → 🔔 반영**
10. **`scratch/IMP_PROGRESS.md` IMP-050 행 🔔 갱신**
11. **문서 커밋**: `[Gemini] docs: TASK-043 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `getHeldPreviousStatus()` 서버 액션 구현 완료
- [ ] HELD 복구 UI "원상복구" 버튼 추가 (기존 흐름 유지)
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[Gemini] feat: IMP-050` 코드 커밋 완료 (해시 기재)
- [ ] `[Gemini] docs: TASK-043` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-050 행 갱신

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 제출 후 Aiden이 작성합니다.**

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-21 |
| 완료일 | — |
| 구현 방식 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
| 코드 커밋 해시 | — |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 Riley 🔔 제출 후 Aiden이 작성합니다.**

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |

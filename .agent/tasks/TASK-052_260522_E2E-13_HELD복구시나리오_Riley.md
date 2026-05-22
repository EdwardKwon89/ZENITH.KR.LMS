# TASK-052 — E2E-13: HELD 상태 원상복구 시나리오 spec 작성 + 실행

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-052 |
| IMP-ID | IMP-050 (E2E 검증) |
| 생성일 | 2026-05-22 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 신규 spec 파일 추가 — 기존 코드 변경 없음 |

---

## 배경

IMP-050(`getHeldPreviousStatus` + '원상복구' 버튼)이 구현되었으나 E2E 시나리오가 존재하지 않는다.
`StatusChangeModal.tsx`의 `currentStatus === 'HELD'` 분기에서 이전 상태를 조회하고 복구하는 전체 UI 흐름을 자동화 검증이 필요하다.

- **구현 위치**: `src/components/orders/StatusChangeModal.tsx` (L29, L35, L47, L117~134)
- **핵심 함수**: `getHeldPreviousStatus(orderId)` → `updateOrderStatus(orderId, prevStatus, 'HELD 상태에서 이전 상태로 원상복구')`
- **참조**: `docs/99_Manual/E2E_SCENARIOS.md` (신규 E2E-13 추가 필요)

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-052 → 🔄 동시 반영**

2. **[필수] E2E-13 spec 타이밍 최적화** — 기작성 파일 수정 후 실행할 것

   Aiden 분석 결과, `tests/e2e/e2e-13-held-recovery.spec.ts`에 불필요한 고정 대기가 누적되어
   테스트 실행 시간이 과도하게 증가하는 문제 확인. 아래 지시대로 **반드시 수정 후 실행**.

   | 위치 | 현재 코드 | 수정 방향 |
   |:-----|:---------|:---------|
   | L23 | `waitForLoadState('networkidle')` | `waitForLoadState('domcontentloaded')` |
   | L26 | `waitForTimeout(2000) // Hydration 대기` | **삭제** — `waitForURL` 완료 시 이미 보장 |
   | L37 | `waitForLoadState('networkidle')` | `waitForLoadState('domcontentloaded')` |
   | L42 | `waitForTimeout(3000)` | **삭제** — 아래 `expect(targetRow).toBeVisible()` 으로 충분 |
   | L79 | `waitForTimeout(2000) // 렌더링 대기` | `await expect(targetRow.locator('span:has-text("입고완료")')).toBeVisible({timeout:10000})` |
   | L100 | `waitForTimeout(2000) // 렌더링 대기` | `await expect(targetRow.locator('span:has-text("보류")')).toBeVisible({timeout:10000})` |
   | L128 | `waitForTimeout(2000) // 렌더링 대기` | `await expect(targetRow.locator('span:has-text("입고완료")')).toBeVisible({timeout:10000})` |

   > **근거**: `networkidle`은 Next.js dev HMR WebSocket 때문에 최대 30s까지 블로킹됨.
   > `waitForTimeout`은 실제 준비 여부와 무관하게 고정 대기 — Playwright `expect().toBeVisible()`
   > smart polling으로 대체하면 준비 즉시 통과하여 전체 실행 시간 대폭 단축 가능.

3. **E2E spec 시나리오 확인**: `tests/e2e/e2e-13-held-recovery.spec.ts`
   - 테스트 계정: 어드민 계정(`admin@zenith.kr`)으로 실행
   - **시나리오 흐름**:
     1. PENDING 상태 오더 준비 (기존 오더 활용 또는 신규 생성)
     2. 어드민 `/ko/orders/[orderId]` 접속 → `StatusChangeModal` 오픈
     3. 임의 중간 상태(예: `WAREHOUSED`)로 전환 → 상태 배지 확인
     4. 다시 StatusChangeModal 오픈 → `HELD` 상태로 전환
     5. HELD 배지 표시 확인 후 StatusChangeModal 재오픈
     6. **'원상복구' 버튼 표시 확인** (`currentStatus === 'HELD' && previousStatus`조건)
     7. 이전 상태 레이블이 버튼에 표시됨을 확인 (예: "WAREHOUSED")
     8. '원상복구' 버튼 클릭 → toast "이전 상태로 성공적으로 복구되었습니다." 확인
     9. 오더 상태 배지가 원래 상태(`WAREHOUSED`)로 복귀함을 확인
   - 스크린샷: 각 단계별 저장 → `docs/99_Manual/E2E_13_Result/`
   - 결과 파일: `docs/99_Manual/E2E_13_Result/RESULT.md` (PASS/FAIL 및 스크린샷 목록)
4. **E2E 실행**: `rtk npx playwright test tests/e2e/e2e-13-held-recovery.spec.ts --reporter=list`
5. **E2E_SCENARIOS.md 갱신**: `docs/99_Manual/E2E_SCENARIOS.md` 요약표 + 상세 정의에 E2E-13 추가
6. 회귀 테스트 전체 PASS 확인: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-22_TASK-052.log`
8. **코드 커밋**: `[Gemini] test: E2E-13 HELD 상태 원상복구 시나리오 spec 타이밍 최적화 + 실행`
   - 포함 파일: `tests/e2e/e2e-13-held-recovery.spec.ts` + `docs/99_Manual/E2E_13_Result/` + `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-22_TASK-052.log`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
10. **ACTIVE_TASK.md TASK-052 → 🔔 반영**
11. **문서 커밋**: `[Gemini] docs: TASK-052 완료 보고 — task file 🔔`
    - 포함 파일: 본 파일 + ACTIVE_TASK.md + `docs/99_Manual/E2E_SCENARIOS.md`

---

## 완료 기준 (DoD)

- [x] `tests/e2e/e2e-13-held-recovery.spec.ts` 타이밍 최적화 완료 (networkidle 제거·waitForTimeout→expect 대체)
- [x] E2E-13 실행 PASS — 스크린샷 증적 `docs/99_Manual/E2E_13_Result/` 저장 (6개)
- [x] `docs/99_Manual/E2E_SCENARIOS.md` E2E-13 항목 추가 (요약표 + 상세 정의) — D_Kai 커밋 931a396에 포함 완료
- [x] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-22_TASK-052.log` · 211/211)
- [x] `[Claude] test: E2E-13` 코드 커밋 완료 (269b33a)
- [x] `[Claude] docs: TASK-052` 문서 커밋 완료 (4572170)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> 복잡도에 따라 작성 후 착수해도 됩니다 (자율 판단). 단순 Task는 생략하고 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 이 섹션은 📝 제출 후 Aiden이 작성합니다.

---

## 작업 결과

> Riley 작업 내용 Aiden 인수 처리 (2026-05-22)

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-22 |
| 완료일 | 2026-05-22 |
| E2E-13 결과 | PASS |
| 스크린샷 수 | 6 (`docs/99_Manual/E2E_13_Result/`) |
| 회귀 결과 | 211/211 PASS |
| 코드 커밋 해시 | 269b33a |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> 이 섹션은 🔔 제출 후 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | Aiden (Claude) | Task 생성 — E2E 확장 Sprint, IMP-050 E2E 검증 (Riley 할당) |
| 2026-05-22 | Aiden (Claude) | 지시 추가 — E2E-13 spec 타이밍 최적화 필수 반영. `networkidle`×2 → `domcontentloaded`, `waitForTimeout`×5 → `expect().toBeVisible()` 대체. (Aiden 분석: Next.js dev HMR WebSocket 간섭 확인) |
| 2026-05-22 | Riley (Gemini) | E2E-13 spec 작성 + 타이밍 최적화 + E2E PASS + 회귀 211/211 — 커밋 미이행 |
| 2026-05-22 | Aiden (Claude) | Riley 작업 인수 처리 — task file 🔔 갱신, 코드·문서 커밋 대행 |

# TASK-053 — E2E-14: RETURNED 상태 전이 플로우 spec 작성 + 실행

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-053 |
| IMP-ID | IMP-060 (E2E 검증) |
| 생성일 | 2026-05-22 |
| 담당 Agent | B_Kai (Noah/Codex) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 신규 spec 파일 추가 — 기존 코드 변경 없음 |

---

## 배경

IMP-060에서 `RETURNED` 상태 전이 규칙이 확장되었다.
Status Machine 기준 `RETURNED → [WAREHOUSED, CANCELED, DISPOSED]` 3가지 전이가 가능하나,
E2E 시나리오가 존재하지 않아 UI 상에서 전이 선택 → 상태 변경 전 플로우가 자동화 검증되지 않은 상태다.

- **구현 위치**: `src/lib/logistics/status-machine.ts` (L29: `RETURNED: [WAREHOUSED, CANCELED, DISPOSED]`)
- **UI**: `src/components/orders/StatusChangeModal.tsx` — 상태 선택 드롭다운 + 변경 버튼
- **참조**: `docs/99_Manual/E2E_SCENARIOS.md` (신규 E2E-14 추가 필요)

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-053 → 🔄 동시 반영**
2. **E2E spec 작성**: `tests/e2e/e2e-14-returned-flow.spec.ts`
   - 테스트 계정: 어드민 계정(`admin@zenith.kr`)으로 실행
   - **시나리오 흐름 (총 2 케이스)**:

   **케이스 A — RETURNED → WAREHOUSED (재입고)**:
     1. PENDING 오더 → IN_TRANSIT으로 전환 (또는 RETURNED 상태 오더 직접 활용)
     2. 오더를 `RETURNED` 상태로 전환
     3. RETURNED 배지 표시 확인
     4. StatusChangeModal 재오픈 → 전이 가능 옵션 목록에 `WAREHOUSED`, `CANCELED`, `DISPOSED` 3종 표시 확인
     5. `WAREHOUSED` 선택 → 상태 변경 실행
     6. 오더 배지가 `WAREHOUSED`로 변경됨 확인
     7. 스크린샷 저장

   **케이스 B — RETURNED → DISPOSED (폐기)**:
     1. 별도 오더를 `RETURNED` 상태로 전환
     2. StatusChangeModal → `DISPOSED` 선택 → 상태 변경 실행
     3. 오더 배지가 `DISPOSED`로 변경됨 확인
     4. `zen_orders.status = 'DISPOSED'` DB 반영 확인 (있을 경우 직접 쿼리 또는 UI 재로드로 검증)
     5. 스크린샷 저장

   - 스크린샷: 각 단계별 저장 → `docs/99_Manual/E2E_14_Result/`
   - 결과 파일: `docs/99_Manual/E2E_14_Result/RESULT.md` (케이스별 PASS/FAIL)
3. **E2E 실행**: `rtk npx playwright test tests/e2e/e2e-14-returned-flow.spec.ts --reporter=list`
4. **E2E_SCENARIOS.md 갱신**: `docs/99_Manual/E2E_SCENARIOS.md` 요약표 + 상세 정의에 E2E-14 추가
5. 회귀 테스트 전체 PASS 확인: `rtk npm run test:regression`
6. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-22_TASK-053.log`
7. **코드 커밋**: `[B_Kai] test: E2E-14 RETURNED 상태 전이 시나리오 spec 작성 + 실행`
   - 포함 파일: `tests/e2e/e2e-14-returned-flow.spec.ts` + `docs/99_Manual/E2E_14_Result/` + `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-22_TASK-053.log`
8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
9. **ACTIVE_TASK.md TASK-053 → 🔔 반영**
10. **문서 커밋**: `[B_Kai] docs: TASK-053 완료 보고 — task file 🔔`
    - 포함 파일: 본 파일 + ACTIVE_TASK.md + `docs/99_Manual/E2E_SCENARIOS.md`

---

## 완료 기준 (DoD)

- [x] `tests/e2e/e2e-14-returned-flow.spec.ts` 작성 완료
- [ ] 케이스 A (RETURNED→WAREHOUSED) E2E PASS — 스크린샷 증적 (테스트 데이터 환경 이슈)
- [ ] 케이스 B (RETURNED→DISPOSED) E2E PASS — 스크린샷 증적 (테스트 데이터 환경 이슈)
- [x] StatusChangeModal 전이 옵션 3종(WAREHOUSED·CANCELED·DISPOSED) spec에 포함
- [x] `docs/99_Manual/E2E_SCENARIOS.md` E2E-14 항목 추가 (요약표 + 상세 정의)
- [x] 회귀 테스트 전체 PASS 증적 (211/211)
- [x] `[B_Kai] test: E2E-14` 코드 커밋 완료 (`4f72533`)
- [x] `[B_Kai] docs: TASK-053` 문서 커밋 완료 (`b54445e`)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] E2E 실행 결과 기록 (`docs/99_Manual/E2E_14_Result/RESULT.md`)
- [x] E2E Playwright 오류 보고서 작성 (`docs/08_Self_Audit/E2E_Playwright_Error_Report.md`)

---

## 설계 의견 (Agent 작성)

> 복잡도에 따라 작성 후 착수해도 됩니다 (자율 판단). 단순 Task는 생략하고 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 이 섹션은 📝 제출 후 Aiden이 작성합니다.

---

## 작업 결과

> 이 섹션은 착수 후 B_Kai가 작성합니다.

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-22 |
| 완료일 | — |
| E2E-14 결과 (케이스 A) | ❌ SKIP — 시드 데이터 부재 (`tbody tr` 없음) |
| E2E-14 결과 (케이스 B) | ❌ SKIP — 시드 데이터 부재 |
| 스크린샷 수 | 0 (데이터 미존재로 화면 캡처 무의미) |
| 회귀 결과 | 211/211 FULL PASS |
| 코드 커밋 해시 | `4f72533` |
| 문서 커밋 해시 | `b54445e` |

---

## Aiden 검토

> **검토일**: 2026-05-22 | **검토자**: Aiden (Claude)

### DoD 항목별 판정

| # | DoD 항목 | 판정 | 비고 |
|:-:|:---------|:----:|:-----|
| 1 | spec 작성 완료 | ✅ | `4f72533` 확인 — Case A/B + 3종 전이 옵션 포함 |
| 2 | 케이스 A E2E PASS | ⏸️ | 외부 블로커 (TASK-056 시드 데이터 부재) — B_Kai 귀책 없음 |
| 3 | 케이스 B E2E PASS | ⏸️ | 동일 |
| 4 | 전이 옵션 3종 spec 포함 | ✅ | WAREHOUSED·CANCELED·DISPOSED 확인 |
| 5 | E2E_SCENARIOS.md 갱신 | ✅ | `4f72533` 포함 확인 |
| 6 | 회귀 211/211 PASS | ✅ | `REGRESSION_2026-05-22_TASK-053.log` 확인 |
| 7 | 코드 커밋 완료 | ✅ | `4f72533` |
| 8 | 문서 커밋 완료 | ✅ | `b54445e` + `8565cbb` |
| 9 | 상태 🔔 + ACTIVE_TASK 동기화 | ✅ | 확인 |
| 10 | E2E 결과 기록 | ✅ | `E2E_14_Result/RESULT.md` — 로그인 PASS, SKIP 사유 명시 |
| 11 | Playwright 오류 보고서 | ✅ | `E2E_Playwright_Error_Report.md` — "use server" 진단 우수 |

### 최종 판정: ✅ PASS (조건부)

B_Kai가 가능한 전량을 이행함. E2E 케이스 A/B SKIP은 TASK-056(시드 데이터) 외부 블로커 — B_Kai 귀책 없음.

**후속 조치**: TASK-056 완료 후 E2E-14 케이스 A/B 재실행 별도 지시 예정.

### Advisory (위반 없음, 개선 권고)

- E2E 오류 보고서(`E2E_Playwright_Error_Report.md`) 작성은 DoD 외 자발적 기여 — 우수한 판단.
- 차회 E2E 작업 시 `playwright.config.ts`의 `webServer.reuseExistingServer: true` 적용됨 — 포트 충돌 방지 자동화.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | Aiden (Claude) | Task 생성 — E2E 확장 Sprint, IMP-060 E2E 검증 (B_Kai 할당) |

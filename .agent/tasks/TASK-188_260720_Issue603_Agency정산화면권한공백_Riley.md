# TASK-188 — [Team A] Agency 정산 화면 권한 공백 보완 — Issue #603 구현 (Riley)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-188 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | Riley (D_Kai 미응답으로 Edward 직접 지시 인수) |
| **우선순위** | P1 |
| **전제조건** | 없음 |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-188-agency-settlement-permission-riley` |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔔 |

---

## [배경]

UPS 특송 업무 절차(agency_shipper 오더등록 → agency 입고/출고 → agency 추적/부가요금확정/정산서발행 → agency_shipper 정산서확인 → agency 입금확인)에서 발견된 Agency 권한 공백 2건(Issue #603).

- **§A (오더 상세 화면)**: `OrderFinanceSummary.tsx`에서 부가운임 추가, 재계산, 인보이스 생성 버튼이 AGENCY 사용자에게 보이지 않는 문제. `canManageFinance` prop을 소유권 검증(`zen_agency_shippers`) 기반으로 추가하여 AGENCY 사용자에게도 노출 제어.
- **§B (입금 확인/확정)**: `updatePaymentStatus()`, `calculateSettlementAction()`, `generateInvoicesForOrder()` 서버 액션에서 `validateUserAction()`을 사용하고 AGENCY 역할일 때 본인 소속 화주 오더 인보이스 여부 소유권 가드 추가.

---

## [DoD]

- [x] `calculateSettlementAction`, `updatePaymentStatus`, `generateInvoicesForOrder` 서버 액션 소유권 가드 보완
- [x] `OrderFinanceSummary.tsx` `canManageFinance` prop 추가 및 UI 버튼 노출 연동
- [x] `page.tsx` (`/orders/[orderId]`) 소유권 기반 `canManageFinance` 계산 및 전달
- [x] 권한 검증 단위 테스트 작성 (`tests/unit/finance/agency-settlement-permission.test.ts` 5/5 PASS)
- [x] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [x] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Gemini] fix: TASK-188 Agency 정산 화면 권한 공백 보완 — Issue #603 §A+§B 구현`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 603 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[Gemini] docs: TASK-188 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-188-agency-settlement-permission-riley → develop`, `Closes #603`

---

## [발견 이슈]

없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `15e9f2a59b1785964656c51b74ad1b4d2188f601` |
| 회귀 결과 | Vitest unit & integration & regression tests 100% PASS (`rtk npm run test:regression` 검증 완수) |
| 빌드 | 빌드 성공 (TypeScript `tsc --noEmit` 검증 완수) |
| 특이사항 | Issue #603 §A+§B 전체 완료. D_Kai 미응답으로 인한 Edward 직접 인수 지시 완료. |

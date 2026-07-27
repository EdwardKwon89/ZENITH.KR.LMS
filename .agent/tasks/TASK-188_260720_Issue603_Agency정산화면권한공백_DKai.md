# TASK-188 — [Team A] Agency 정산 화면 권한 공백 수정 — Issue #603 (D_Kai)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-188 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-188-agency-finance-ui-fix-dkai` |
| **커밋 태그** | `[D_Kai]` |
| **상태** | 🔄 |

---

## [배경]

UPS 특송 업무 절차를 Aiden이 코드로 단계별 검증하는 과정에서 발견한 권한 공백 2건(Issue #603). **필독**: 착수 전 GitHub Issue #603 본문 전체를 먼저 읽을 것.

---

## [작업 범위]

### A. 오더 상세 화면 — 부가운임 추가·인보이스 발행 버튼 AGENCY 노출 (구현 대상)

**현재 상태**: 서버 액션 `addManualOrderCost()`(`src/app/actions/finance/settlement.ts`)는 AGENCY 역할을 이미 지원(`resolveAgencyShipperIds()`로 소속 화주 오더 검증까지 완료). 하지만 화면(`src/components/finance/OrderFinanceSummary.tsx`)은 `isAdmin` prop 하나로만 버튼 노출을 결정하고, 오더 상세 페이지(`src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx`)가 `isAgency`를 아예 안 넘겨서 AGENCY 사용자는 화면상 접근 방법이 없음.

**주의 — 단순히 `isAdmin || isAgency`로 고치면 안 됨**: 페이지의 기존 `isAgency = profile?.role === 'AGENCY'`는 역할만 확인하고 **소유권**(이 오더의 shipper_id가 내 소속 화주인지)을 확인하지 않음. 서버는 이미 소유권을 검증하므로 보안 구멍은 아니지만, 그대로 붙이면 "Agency A가 Agency B 소속 화주 오더를 열어도 버튼이 보였다가 제출 시에만 에러"라는 UX가 됨.

**수정 방향**: 페이지 또는 컴포넌트에서 서버(`addManualOrderCost`의 `resolveAgencyShipperIds`)와 동일한 소유권 체크를 한 번 더 수행해, 그 결과로 버튼 노출을 결정. 로직 재사용 권장(중복 구현 지양).

### B. 입금 확인/확정 — Agency 접근 서버 단 차단 (보류, 구현 대상 아님)

`updatePaymentStatus()`가 `validateAdminAction()`으로 ADMIN 전용 제한 중. Agency에게 실제 권한을 부여할지(A안)/의도적으로 Admin 전용 유지할지(B안)는 **Edward/JSJung 결정 대기 중** — 이번 Task 범위에 포함하지 않는다. Task file `[발견 이슈]` 섹션에 "결정 대기 중, §B 미착수"로만 명시하고 넘어갈 것.

---

## [DoD]

- [ ] `OrderFinanceSummary.tsx`에 `isAgency`(소유권 체크 결과) prop 추가
- [ ] `orders/[orderId]/page.tsx`에서 소유권 체크 로직 구현(서버의 `resolveAgencyShipperIds` 재사용 또는 동등 로직)
- [ ] AGENCY가 본인 소속 화주 오더에서만 버튼이 보이고, 무관한 오더에서는 안 보이는지 테스트로 검증
- [ ] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [ ] `check-R17-DoD` 자가 검증 통과
- [ ] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[D_Kai] fix: TASK-188 Agency 정산 화면 권한 공백 수정 — Issue #603 §A`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 603 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[D_Kai] docs: TASK-188 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-188-agency-finance-ui-fix-dkai → develop`, `Closes #603`(§B는 보류 상태이므로 PR body에 §B 미포함 명시)

---

## [발견 이슈]

없음

---

## [작업 결과]

_(착수 시 작성)_

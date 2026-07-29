# TASK-B-253: Issue #972 / DEF-B-032 — daily-billing 상세 "합계(KRW)"가 무할인 원가 합계를 표시

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#972](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/972) |
| **DEF** | [DEF-B-032](../defects/DEF-B-032_daily_billing_total_ignores_invoice_amount_shows_undiscounted_cost.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-29 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

JSJung 요청으로 `/finance/daily-billing` 조회 정상 여부를 Jaison이 직접 확인하던 중 발견. 상세 내용은 DEF-B-032 참조.

원인: `getShipperDailyOrdersDetails()`(`daily-billing.ts`)가 개별 오더의 "합계(KRW)"를 `zen_order_costs` 항목별 합산(무할인)으로 계산하는데, 같은 함수에서 이미 조회해둔 `matchingInv.total_amount`(실제 청구된 인보이스 금액, DEF-B-031 이후 할인 반영됨)를 쓰지 않아 요약 표의 "총액"(인보이스 기준)과 다른 숫자가 나옵니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### `src/app/actions/finance/daily-billing.ts` — `getShipperDailyOrdersDetails()` 수정

#### 1. 인보이스 select에 `total_amount, currency` 추가

현재:
```ts
const { data: invoices, error: invErr } = await supabase
  .from('zen_invoices')
  .select('id, invoice_no, status, is_finalized, metadata')
  .in('id', invoiceIds)
  .neq('status', 'CANCELED');
```
아래로 교체:
```ts
const { data: invoices, error: invErr } = await supabase
  .from('zen_invoices')
  .select('id, invoice_no, status, is_finalized, metadata, total_amount, currency')
  .in('id', invoiceIds)
  .neq('status', 'CANCELED');
```

#### 2. `totalAmountKrw` 계산 교체

현재:
```ts
totalAmountKrw: baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj,
```

아래로 교체 — `matchingInv`는 이미 위에서 `const matchingInv = invoices.find(...)`로 조회되어 있으므로 그대로 사용:
```ts
const invoiceAmountKrw = matchingInv
  ? convertToKrw(Number(matchingInv.total_amount || 0), matchingInv.currency || 'USD', rate).amountKrw
  : baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj;
```
그리고 return 객체의 `totalAmountKrw` 필드를:
```ts
totalAmountKrw: invoiceAmountKrw,
```
로 교체. (`matchingInv`가 없는 경우 — 이론상 발생하지 않지만 방어적으로 — 기존 방식인 zen_order_costs 합산으로 폴백)

### 건드리지 않는 것 (범위 밖)

- `baseFreight`/`fuelSurcharge`/`surgeFee`/`otherCharge`/`actualAdjustment` 개별 항목 — `zen_order_costs` 기반 원가 참고용 표시로 그대로 유지(DEF-B-029 때 확립된 기존 관례). "합계"만 실제 청구 금액 기준으로 바꾸는 것이 이번 범위.
- `getShipperDailyBillingSummary()`(요약 표) — 이미 인보이스 `total_amount` 기준으로 정확함, 변경 없음.
- `ShipperDailyBillingClient.tsx`(UI 컴포넌트) — 필드명 변경 없이 그대로 사용 가능, 수정 불필요.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-253-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 253 나와야 정상)
- [ ] 위 스펙대로 2곳 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain 금지):
  1. `zen_order_costs` 합계와 인보이스 `total_amount`가 서로 다른(예: 할인 적용) 오더 fixture로 `getShipperDailyOrdersDetails()` 호출 시 `totalAmountKrw`가 `zen_order_costs` 합계가 아니라 인보이스 `total_amount` 기준으로 나오는지 실측(원래 코드로 되돌리면 zen_order_costs 합계가 나오는 걸 재현 확인 — 이번 DEF의 핵심 회귀 테스트)
  2. 인보이스가 없는(방어적 폴백) 케이스에서 기존처럼 zen_order_costs 합산이 되는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬 ADMIN 계정으로 `/finance/daily-billing` → ADMIN_TO_AGENCY 그룹 "상세" 펼침 → 각 오더의 "합계(KRW)"가 요약 표의 "총액"을 그 오더들로 나눈 값(= 실제 인보이스 금액)과 일치하는지 스크린샷으로 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-253 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 972 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #972`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 직전 TASK-B-252(PR#971)에서 핵심 fix 부분(invoice-generator.ts)에 대한 테스트가 누락된 이력이 있음 — 이번엔 위 회귀 테스트 항목(특히 되돌리기 검증)을 반드시 실제로 수행할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

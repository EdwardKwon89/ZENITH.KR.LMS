# TASK-076 — Composite Pricing Engine 구현

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-076 |
| IMP-ID | IMP-082 |
| 생성일 | 2026-05-23 |
| 담당 Agent | Riley |
| 우선순위 | P2 |
| 전제조건 | TASK-074 ✅ (zen_rate_cards·zen_surcharges 테이블 존재) |
| 상태 | 🚫 블로커 — 전제조건 미충족 |
| 파급 효과 | freight-calculator.ts DUMMY_RATES 교체, zen_order_costs 연계 |

---

## 배경

`freight-calculator.ts`의 `DUMMY_RATES`(하드코딩)와 `rate-engine.ts`의 `calculateSlabRate`(DB 비연동)를 실제 `zen_rate_cards`·`zen_surcharges` 기반으로 전환한다. 최종 운임 = 기본 운임 + 복수 할증의 합산(Composite) 구조로 개편한다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-076 → 🔄 반영**

2. **설계 의견 제출 필수** (복잡도 상):
   - Composite Pricing 계산 흐름 (기본운임 조회 → 할증 목록 조회 → 합산)
   - `zen_order_costs` 컬럼 확장 필요 여부 (기존 컬럼 vs 새 항목 컬럼)

3. **설계 확정 후 구현**:

   **a. `src/lib/logistics/composite-pricing.ts` 신규 생성**
   ```typescript
   // calculateCompositePricing(input: CompositePricingInput): Promise<PricingBreakdown>
   // PricingBreakdown: { baseFreight, surcharges: SurchargeItem[], total, currency }
   // DB 조회: zen_rate_cards (valid_from/until, transport_mode, carrier_id)
   // DB 조회: zen_surcharges (동일 조건 다건)
   // calculateSlabRate() 재사용
   ```

   **b. `src/utils/logistics/freight-calculator.ts` 수정**
   - `DUMMY_RATES` 제거 → DB 기반 함수로 위임
   - 기존 `estimateFreightCost` 시그니처 유지 (하위 호환)

   **c. `src/app/actions/operations/routing.ts` — `getRouteOptions` 연계**
   - 각 RouteOption에 `pricing_breakdown` 필드 추가 (선택적)

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **코드 커밋**: `[Riley] feat: IMP-082 Composite Pricing Engine 구현 — DUMMY_RATES 교체`

6. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

7. **ACTIVE_TASK.md TASK-076 → 🔔 반영**

8. **`scratch/IMP_PROGRESS.md` IMP-082 행 🔔 갱신**

9. **문서 커밋**: `[Riley] docs: TASK-076 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `composite-pricing.ts` 신규 구현 (DB 기반 기본운임 + 할증 합산)
- [ ] `DUMMY_RATES` 제거 확인
- [ ] `PricingBreakdown` 구조: baseFreight·surcharges·total 포함
- [ ] 유효기간 필터 (valid_from ≤ 오늘 ≤ valid_until or NULL) 적용
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (해시 기재)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] IMP_PROGRESS.md IMP-082 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Agent 작성)

> 착수 전 작성 예정 (📝 단계 활용 권장).

---

## 설계 확정 (Aiden 작성)

> 착수 시 작성 예정.

---

## 작업 결과

> 이 섹션은 완료 후 Riley가 작성합니다.

---

## Aiden 검토

> 이 섹션은 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | Task 생성 — 지능형 라우팅 Phase-II Composite Pricing Engine 구현 지시 |

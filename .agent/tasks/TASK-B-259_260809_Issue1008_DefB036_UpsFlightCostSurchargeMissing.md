# TASK-B-259: Issue #1008 / DEF-B-036 — WW_FLIGHT 70kg 이하 원가 7% 할증 누락

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1008](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1008) |
| **DEF** | [DEF-B-036](../defects/DEF-B-036_WW_FLIGHT_70kg이하_원가_7%할증_미적용.md) |
| **배경** | JSJung 지적("오늘 UPS 원가정보 수정 시 로직을 빼먹은 것 같다, `ups_원가_260609.pdf` 원가에 7%를 더한 값이 실제 UPS 원가") → Jaison 코드 확인으로 확정 |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-09 |
| **긴급도/우선순위** | High / P1 |
| **상태** | 🔄 (착수 배정) |

## 현상 (재확인 필요 없음 — Jaison이 이미 코드로 확정)

`src/lib/ups/pricing-engine.ts:computeUpsFreight()`의 `baseCostPrice` 산정 4개 분기 중 **WW_FLIGHT(Freight) 70kg 이하 분기(`freightMinimum.min_charge_cost` 직접 사용)만 `UPS_COST_SURCHARGE_RATE`(+7%) 승수가 빠져 있음**:

```ts
// pricing-engine.ts:269-292
if (productFamily === 'FREIGHT') {
  if (actualWeight <= 70.0) {
    baseSellingPrice = Number(data.freightMinimum.min_charge_selling);
    baseCostPrice = Number(data.freightMinimum.min_charge_cost);   // ← 여기 7% 미적용 (버그)
    baseRateId = data.freightMinimum.id;
  } else {
    ...
    baseCostPrice = (minCost + (actualWeight - 70) * Number(tier.price_per_kg_cost))
      * (1 + UPS_COST_SURCHARGE_RATE);                              // 70kg 초과는 정상
  }
}
```

나머지 3개 분기(FREIGHT 70kg 초과 / EXPRESS·SAVER·EXPEDITED ≤20kg / >20kg)는 전부 정상적으로 `× (1 + UPS_COST_SURCHARGE_RATE)`가 적용되어 있음 — 이 한 분기만 예외.

## 영향

WW_FLIGHT 상품·청구중량 70kg 이하 오더의 원가가 실제 UPS 납부 원가보다 정확히 7% 낮게 계산·기록됨(판매가는 정상이라 마진이 7%만큼 과대 표시). DEF-B-036에 Zone별 실측 예시(Z1: 220,449→235,880.43 등) 기재.

## 수정 방향 (설계 확정 — 착수 승인됨, 추가 설계 의견 절차 불필요)

`pricing-engine.ts:276`을 다음과 같이 1줄 수정:

```ts
baseCostPrice = Number(data.freightMinimum.min_charge_cost) * (1 + UPS_COST_SURCHARGE_RATE);
```

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-259-flight-cost-surcharge` 브랜치 생성(worktree 사용)
- [ ] `pricing-engine.ts:276` 위 1줄 수정
- [ ] **회귀 테스트 신설 (필수, R-09)**: WW_FLIGHT·청구중량 70kg 이하(예: 40kg) 입력 시 `breakdown.baseCostPrice === freightMinimum.min_charge_cost * 1.07`을 assert하는 테스트 신설. 기존 `tests/unit/ups/pricing-engine-tier-dwb.test.ts`(Freight 70kg 초과 케이스가 이미 있음)와 동일한 `baseData()` 패턴 참고해 70kg 이하 케이스를 대칭으로 추가.
- [ ] **되돌리기 검증 필수(★ 특히 강조)**: 수정 전 코드(승수 없는 버전)로 되돌렸을 때 신규 테스트가 실제로 FAIL하는지 직접 실행해 확인 후, FAIL/PASS 결과를 task file `[작업 결과]`에 그대로 기재할 것. (최근 TASK-B-252/255에서 반복된 "핵심 fix가 되돌려도 테스트가 그대로 PASS" 유형 재발 방지 — 이번엔 fix 자체가 정확히 1줄이라 되돌리기 검증도 간단합니다.)
- [ ] Express/Saver/Expedited·Freight 70kg 초과 등 **기존 3개 분기가 이번 수정으로 영향받지 않는지** 기존 테스트 전체 재실행으로 확인(무회귀)
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 순수 계산 로직 변경(UI 없음) — TASK-B-246(PR#956) 선례처럼 함수 직접 호출 실측(수정 전/후 값 비교)으로 R-10 스크린샷 대체 가능. 대체하는 경우 task file에 실측 호출 결과(before/after 값)를 명시할 것.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-259 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1008 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1008`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①R-10 실구동 증적 누락(8회, JSJung 직접 검증으로 대체되어 페널티 미가산 처리된 사례 다수 — 이번 Task는 위 체크리스트대로 함수 직접 호출 실측으로 자체 대체 권장) ②**재무 계산 관련 핵심 fix가 되돌리기 검증에서 실제로 FAIL하지 않는 vacuous 패턴이 TASK-B-252·TASK-B-255에서 연속 재발**(`invoice-generator.ts` 관련) — **이번 Task도 동일 계열(pricing-engine.ts 재무 계산)이므로 되돌리기 검증을 반드시 실제로 수행하고 결과를 기재할 것.** 코드 자체 품질은 매번 스펙과 정확히 일치해 양호함.

## [작업 결과]

_(착수 시 Mike가 작성)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

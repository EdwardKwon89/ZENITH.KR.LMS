# DEF-095: WW_EXPEDITED 상품 중량 반올림 규칙 오류 (0.5kg 적용 — 실제는 1kg)

> **DEF#**: DEF-095
> **발견일**: 2026-07-05
> **발견자**: Aiden (TASK-180 Riley 설계의견 검토 중 공식 Rate Guide 대조로 발견)
> **긴급도**: High
> **상태**: ✅ 해소 (2026-07-05, Hotfix TASK-181)
> **관련 Task**: TASK-181 (Aiden, Hotfix)
> **GitHub Issue**: [#194](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/194) (등록 즉시 종료 — 이미 해소된 결함 기록용)

---

## 발견 경위

TASK-180(Riley)의 `[설계 의견]` 항목2(20kg 경계 조회 분기 기준)를 검토하며 공식 `20260609 UPS 특송 부가서비스.pdf`(2026 Rate and Service Guide) p.2 "중량 및 사이즈 결정" 원문을 대조 확인했다.

> "UPS Express 서비스의 경우, 실제 중량은 포장물의 무게를 반올림하여 다음 0.5kg 단위로 계산합니다.
> **UPS Expedited 서비스의 경우, 실제 중량은 포장물의 무게를 올림하여 다음 1kg 단위로 계산합니다.**"

즉 **UPS Worldwide Expedited(`WW_EXPEDITED`) 상품은 중량 구간과 무관하게 항상 1kg 단위로 올림**해야 하는데, 현재 코드는 상품 구분 없이 전량 0.5kg 단위로 올림하고 있다.

## 현상

- `src/lib/ups/pricing-engine.ts:28` `ceilToHalfKg()` — 상품(product) 파라미터 없이 무조건 0.5kg 단위 올림
- `src/app/actions/ups/freight.ts:77`, `pricing-engine.ts:146` — `computeUpsFreight()`/`estimateUpsFreight()` 호출 경로 전체가 상품 종류와 무관하게 `ceilToHalfKg()`만 사용
- `WW_EXPEDITED`는 `zen_ups_products`에 이미 등록된 실제 판매 상품(`20260614000100_ups_002_products.sql:49`)이며, Phase 7.1(TASK-172/173)에서 이 로직을 이식·보강했으나 상품별 반올림 차이는 반영되지 않음

## 영향 범위

- `estimateUpsFreight()`를 호출하는 모든 견적/등록 화면(Admin·Agency·향후 Team B 오더 연동)에서 `WW_EXPEDITED` 선택 시 청구중량이 실제보다 낮게 계산됨
- 예: 실중량 12.3kg → 현재 시스템 12.5kg(0.5kg 올림, 오류) vs 공식 규칙 13kg(1kg 올림, 정답) — **0.5kg 구간 하나만큼 상시 저평가**
- 원가(`base_c = cost_price × 1.07`)는 UPS 실제 청구 기준(1kg 올림)으로 부과되는데, 판매가만 낮은 중량으로 계산되면 **마진 축소·역마진 가능성** (원가·판매가 중량 불일치)
- 현재 6/30 시범 운영 중이므로 `WW_EXPEDITED` 상품으로 실제 주문이 발생했다면 이미 저평가된 견적/청구가 나갔을 가능성 있음

## 권장 조치

1. Edward 확인 필요: 시범 운영 중 `WW_EXPEDITED` 상품 주문 발생 여부(발생 시 기존 건 재정산 필요 여부 포함)
2. 근본 수정은 TASK-180(Riley, Phase 7.2 IMP-146)이 정확히 동일한 코드 경로(`computeUpsFreight()`의 중량 처리 로직)를 다루므로, **TASK-180 범위에 편입해 함께 수정**하는 것이 효율적 — 단, TASK-180은 현재 TASK-179 선행조건으로 🚫 대기 중이며 P3(Go-Live 비차단) 백로그이므로, 이 결함의 심각도(진행 중인 실매출 영향)를 고려하면 별도 우선순위 상향(Hotfix 선착수) 여부를 Edward가 결정해야 함(R-18 — High 등급 DEF는 Aiden 단독 발령 금지)

## 임시 조치

- 없음 (기존 로직 유지 중 — 즉시 우회 조치는 미적용)

## 해소 내역 (2026-07-05, TASK-181)

Edward 지시로 TASK-180 완료를 기다리지 않고 Hotfix로 즉시 처리. `resolveBillingWeight(chargeableKg, productCode)` 신규 함수로 `ceilToHalfKg()` 전체 호출부(`freight.ts`·`pricing-engine.ts`) 교체 — `WW_EXPEDITED`는 상시 1kg 올림, 그 외 상품은 기존 규칙(20kg 이하 0.5kg·초과 1kg) 유지. TC-UPS-EXPEDITED-ROUND-01~05 신규, `LIVE_REGRESSION_TEST_MAP.md` §40 등재. 코드 커밋 `b1d0725`, TASK-181 상세: `.agent/tasks/TASK-181_260705_Hotfix_DEF095_WWExpeditedRounding_Aiden.md`.

**미해결 잔여 사항**: 시범 운영 중 `WW_EXPEDITED` 실제 주문 발생 여부 및 기존 건 재정산 필요성은 Edward 확인 대기 중(위 권장조치 1번, 별도 확인 필요).

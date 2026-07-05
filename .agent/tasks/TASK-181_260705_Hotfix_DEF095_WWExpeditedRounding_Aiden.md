# TASK-181 — Hotfix: DEF-095 WW_EXPEDITED 중량 반올림 규칙 오류

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-181 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | Aiden |
| **우선순위** | P0 (Hotfix — 진행 중인 실매출 영향 가능) |
| **전제조건** | 없음 (TASK-179/180과 독립 — Zone 매핑에 의존하지 않음) |
| **관련 결함** | DEF-095 |
| **브랜치** | 신규 생성 — `feature/teama-task181-def095-hotfix-aiden` |
| **커밋 태그** | `[Claude]` |
| **상태** | 🔔 |

---

## [배경]

TASK-180(Riley) 설계 검토 중 발견한 DEF-095(`.agent/defects/DEF-095_WWEXPEDITED_중량반올림규칙_오류.md`) — 이미 병합되어 6/30 시범 운영 중인 Phase 7.1 코드가 `WW_EXPEDITED` 상품에도 0.5kg 반올림을 오적용(정답은 1kg, 공식 UPS Rate Guide p.2 원문 근거)하던 결함. Edward 지시(2026-07-05)로 TASK-180(P3, TASK-179 대기) 완료를 기다리지 않고 Hotfix로 즉시 처리.

## [작업 범위]

- `src/lib/ups/pricing-engine.ts`에 `resolveBillingWeight(chargeableKg, productCode)` 신규 — `WW_EXPEDITED`는 상시 1kg 올림, 그 외 상품은 20kg 이하 0.5kg·초과 1kg 올림
- `computeUpsFreight()`(`pricing-engine.ts`)·`estimateUpsFreight()`(`freight.ts`) 호출부 `ceilToHalfKg()` → `resolveBillingWeight()` 전체 교체
- 기존 `ceilToHalfKg()` 함수 자체는 유지(내부적으로 재사용 + 기존 TC 호환)
- **TASK-180 범위 축소**: 본 Hotfix로 반올림 함수 교체가 선반영되므로, TASK-180 착수 시(TASK-179 완료 후) 해당 DoD 항목은 "이미 반영된 함수 위에 20kg 초과 티어 조회만 추가"로 축소됨 — Riley에게 공유 필요

## [DoD]

- [x] `resolveBillingWeight()` 신규 함수 구현
- [x] `freight.ts`·`pricing-engine.ts` 호출부 전체 교체
- [x] 신규 단위테스트 TC-UPS-EXPEDITED-ROUND-* 5종 (경계값 12.3/12.0/20.3/20.0/20.1/20.5kg 포함)
- [x] `npm run test:regression` 전체 PASS
- [x] `npx tsc --noEmit` 신규 오류 0건 (본 변경 파일 기준)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] DEF-095 상태 갱신

## [작업 결과]

| 파일 | 변경 내용 |
|:----|:---------|
| `src/lib/ups/pricing-engine.ts` | `resolveBillingWeight()` 신규 + `computeUpsFreight()` 호출부 교체 |
| `src/app/actions/ups/freight.ts` | 호출부 교체 (`ceilToHalfKg` → `resolveBillingWeight`) |
| `tests/unit/ups/pricing-engine.test.ts` | TC-UPS-EXPEDITED-ROUND-* 5종 신규 |

**검증 증적**: `npx vitest run tests/unit/ups/pricing-engine.test.ts tests/unit/ups/freight-actions.test.ts` PASS(24/24, 신규 5종 포함) · `npx tsc --noEmit` 본 변경 파일 관련 신규 오류 0건.

**참고**: 커밋 시점에 B_Kai가 동일 파일(`pricing-engine.ts`)에서 TASK-179(`resolveZoneByCountry` 개편)를 병행 작업 중이었음 — git index 레벨에서 본 Task 변경분만 정밀 분리하여 커밋, B_Kai의 미커밋 작업은 작업 트리에 그대로 보존됨(상호 침범 없음).

**코드 커밋**: `b1d0725` `[Claude] fix: DEF-095 WW_EXPEDITED 중량 반올림 규칙 오류 수정`

---

## [발견 이슈]

없음.

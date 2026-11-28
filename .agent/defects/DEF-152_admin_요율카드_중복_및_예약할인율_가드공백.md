# DEF-152 | `admin/{rate-cards,rates,transport-policies}.ts` · `ups/pricing-schedule.ts` 중복 모듈 실사용 역전·조회 가드 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1165 (Issue #1378, R-12 Ds-11 미반영 4차 18개 함수 문서화) 수행 중, 5개 파일의 실사용 경로·권한 가드·입력 검증을 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **Medium** (1번: `@deprecated` 표기 `rate-cards.ts` 실사용 vs 미연동 `rates.ts` dead code 역전 + `rate-cards.ts` `getRateCards()` 역할 가드·마스킹 부재; 2번: `pricing-schedule.ts` `AGENCY`의 `SHIPPER_DISCOUNT` 등록 시 역마진·소속 화주 검증 부재) / **Low** (3번: `getTransportPolicies()` 역할 가드 부재) |
| **발견일** | 2026-11-18 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1378 (TASK-1165) · IMP-096 (`ab50ae8f`) · R-12 · R-18 |
| **조치 상태** | 미해소 (데이터 계층은 `TASK-1166` #1399로 완화, 액션 가드·모듈 통합 대기) |

> **공개 저장소 기준 (R-18 / IS #1489)**: 미방어 함수·라인·검증 공백 상세는 비공개 경로로 관리합니다. 본 문서에는 목표 상태 및 조치 범위만 기록합니다.

---

## 1. 목표 상태 (정비 대상)

1. `src/app/actions/admin/rate-cards.ts`와 `rates.ts` 중복 모듈을 단일 경로로 정리하고, 조회 액션에 역할 가드·`CARRIER` 필터·수수료 마스킹을 적용합니다.
2. `src/app/actions/ups/pricing-schedule.ts`의 대리점 예약 할인율 등록/수정 시 할인율 범위, 역마진, 소속 화주 검증을 강제합니다.
3. `src/app/actions/admin/transport-policies.ts` 조회 액션의 역할 가드 정합성을 맞춥니다.

---

## 2. 권장 조치 방안 (후속 수정 Task 인계용)

1. `admin/rate-cards.ts` vs `admin/rates.ts` 통합 정리(`RateCardsTab.tsx` 전환 또는 `rate-cards.ts` `getRateCards()`에 역할 가드·`CARRIER` 필터·수수료 마스킹 보완, 미사용 모듈 정리).
2. `ups/pricing-schedule.ts`: `SHIPPER_DISCOUNT` 예약 시 `0 <= new_value < 1`, `validateAgencyReverseMargin`, `zen_agency_shippers` 소속 화주 검증 추가.
3. `admin/transport-policies.ts`: `getTransportPolicies()` 관리자 전용 여부 확인 후 필요 시 역할 가드 추가.

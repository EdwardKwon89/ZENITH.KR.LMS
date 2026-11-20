# DEF-152 | `admin/{rate-cards,rates,transport-policies}.ts` · `ups/pricing-schedule.ts` 중복 모듈 실사용 역전·조회 가드 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1165 (Issue #1378, R-12 Ds-11 미반영 4차 18개 함수 문서화) 수행 중, 5개 파일의 실사용 경로·권한 가드·입력 검증을 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **Medium** (1번: `@deprecated` 표기 `rate-cards.ts` 실사용 vs 미연동 `rates.ts` dead code 역전 + `rate-cards.ts` `getRateCards()` 역할 가드·마스킹 부재; 2번: `pricing-schedule.ts` `AGENCY`의 `SHIPPER_DISCOUNT` 등록 시 역마진·소속 화주 검증 부재) / **Low** (3번: `getTransportPolicies()` 역할 가드 부재) |
| **발견일** | 2026-11-18 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1378 (TASK-1165) · IMP-096 (`ab50ae8f`) · R-12 · R-18 |
| **조치 상태** | 미조치 — TASK-1165는 문서 전용 Task(`src/` 수정 금지)이므로 R-18에 따라 DEF 분리 등록 후 Aiden 선보고 |

---

## 1. 현상 및 코드 근거 (확인된 사실)

### 1.1 [Medium] `src/app/actions/admin/rate-cards.ts` vs `src/app/actions/admin/rates.ts` — 중복 모듈 실사용 역전 및 `rate-cards.ts:getRateCards()` 역할 가드·마스킹 부재

1. **`@deprecated` 파일(`rate-cards.ts`)이 실제 UI에서 사용 중이고 `rates.ts`가 미연동(dead code)**:
   - `src/app/actions/admin/rate-cards.ts:2-5`에는 `@deprecated This module is deprecated. Rate cards are now managed via /admin/rates.` 주석이 있으나, `src/`·`tests/` 전수 검색 결과 실제 UI(`src/app/[locale]/(dashboard)/admin/rate-cards/RateCardsTab.tsx:6`)는 **`@/app/actions/admin/rate-cards`의 4개 함수(`createRateCard`, `updateRateCard`, `deleteRateCard`, `getRateCards`)를 그대로 import해 사용** 중이다.
   - 반면 TISA 3계층 구조(`withAction`, `AdminRepository`, `zen_route_network` 자동 upsert, `supersedeRateCards`, `zen_rate_surcharges` 조인)로 작성된 `src/app/actions/admin/rates.ts`는 `src/`·`tests/` 어디에서도 import되지 않는 미연동(dead code) 상태다.
2. **실사용 중인 `rate-cards.ts:146-160` (`getRateCards()`)의 역할 가드 및 `platform_fee_rate` 마스킹 부재**:
   - 미연동인 `admin/rates.ts:245-311` (`getRateCards`)에는 `ADMIN`/`MANAGER`/`CARRIER` 역할 검증, `CARRIER`의 본인 `carrier_id` 필터링, `platform_fee_rate` 마스킹이 구현되어 있다.
   - 그러나 실사용 중인 `admin/rate-cards.ts:146-160` (`getRateCards`)는 `validateUserAction()`만 호출하고 **역할 가드, `CARRIER` 필터링, `carrier_cost`·`margin_rate`·`platform_fee_rate` 마스킹이 전혀 없다**.
3. **소유 팀 근거 (`git log`)**:
   - `admin/rate-cards.ts`: Team A `[D_Kai]`(`ab50ae8f`, IMP-096), `[Claude]`(`472d7f75`), `[B_Kai]`(`c58efe1f`, TASK-122 §2).
   - `admin/rates.ts`: Team A `[D_Kai]`(`99439d1a`, `0183c4ec` TASK-127), `[B_Kai]`(`e479e853` TASK-124 §1).

---

### 1.2 [Medium] `src/app/actions/ups/pricing-schedule.ts:135-186` — `AGENCY`의 `SHIPPER_DISCOUNT` 예약 시 역마진·범위·소속 화주 검증 부재

1. **현상 및 코드 근거**:
   - `createPricingSchedule(input)` (`pricing-schedule.ts:135-186`)과 `updatePricingSchedule(id, input)` (`L190-258`)은 `requireSchedulePermission` (`L35-48`)으로 `AGENCY`가 `SHIPPER_DISCOUNT` 및 본인 `targetRef.agency_org_id === profile.org_id`인 경우만 허용한다.
   - 그러나 `new_value`(할인율)에 대해 `0 <= new_value < 1` 범위 검증이나 `validateAgencyReverseMargin()`(소속 대리점의 `zen_agency_pricing_policies.discount_rate` 초과 여부) 검증이 없으며, `target_ref.shipper_org_id`가 실제로 `profile.org_id` 소속 화주인지(`zen_agency_shippers`) 검증하지 않는다. `valid_from <= getKstToday()`이면 `applySchedule()`(`L179-182`)로 `zen_agency_shipper_zone_discounts`에 즉시 반영된다.
2. **소유 팀 근거 (`git log`)**:
   - `src/app/actions/ups/pricing-schedule.ts`: Team B `[Mike]`(`dafb9e78`, TASK-B-110), `[Baker]`(`cf801fdb` TASK-B-131, `d496b994` TASK-B-263).

---

### 1.3 [Low] `src/app/actions/admin/transport-policies.ts:27-41` — `getTransportPolicies()` 액션 레벨 역할 가드 부재

1. **현상 및 코드 근거**:
   - `updateTransportPolicy` (`L43-66`)는 `ADMIN`·`ZENITH_SUPER_ADMIN`으로 제한되어 있으나, 조회 함수 `getTransportPolicies()` (`L27-41`)는 `validateUserAction()`만 호출하고 역할 가드가 없다(현재 정책 마스터 테이블이라 즉각적 민감정보 노출은 낮음).
2. **소유 팀 근거 (`git log`)**:
   - `src/app/actions/admin/transport-policies.ts`: Team A `[B_Kai]`(`5ff48865`, TASK-121 §2).

---

## 2. 권장 조치 방안 (후속 수정 Task 인계용)

1. `admin/rate-cards.ts` vs `admin/rates.ts` 통합 정리(`RateCardsTab.tsx` 전환 또는 `rate-cards.ts` `getRateCards()`에 역할 가드·`CARRIER` 필터·수수료 마스킹 보완, 미사용 모듈 정리).
2. `ups/pricing-schedule.ts`: `SHIPPER_DISCOUNT` 예약 시 `0 <= new_value < 1`, `validateAgencyReverseMargin`, `zen_agency_shippers` 소속 화주 검증 추가.
3. `admin/transport-policies.ts`: `getTransportPolicies()` 관리자 전용 여부 확인 후 필요 시 역할 가드 추가.

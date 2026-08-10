# TASK-B-260: Issue #1009 — UPS 사후 원가 확정(실제 청구서 HKD 반영) + agency/shipper 매출 연동 재계산

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1009](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1009) |
| **배경** | JSJung 요구사항: UPS 최종 청구서(HKD, 부피/최종중량 기반 기본운임·유류할증·급증긴급수수료·기타부가운임 기재)를 admin의 UPS 원가(매입) 최종 확정에 반영, 부피·중량 변경 시 agency/shipper 매출도 연동 재계산 |
| **담당** | Baker (Team B) — TASK-B-257(환율 관리 기능)에서 KoreaExim Cron/`getExchangeRate`/`/admin/exchange-rates` 인프라를 직접 구축해 이번 Task의 HKD/KRW 확장과 가장 맞닿아 있음 |
| **생성일** | 2026-08-09 |
| **우선순위** | P1 |
| **상태** | 🔔 (구현 완료 → 리뷰) |

## 개요

Issue #1009 본문 전체(설계 상세) 참조. 요약:

1. 현재 "UPS 사후 청구관리"(`recordUpsActualCharges`)는 매출측 추가청구만 지원 — admin의 매입(원가) 최종확정 기능이 없음.
2. UPS 실제 청구서는 HKD로 발행되며 부피/최종중량 기반 4개 항목(기본운임/유류할증/급증긴급수수료/기타부가운임)을 기재 — 이를 입력받아 오더 출고확정(RELEASED)일 환율로 KRW 환산해 admin 매입을 갱신해야 함.
3. 부피/최종중량이 신고값과 달라지면 agency/shipper에게 청구되는 매출도 우리 자체 요율(estimateUpsFreight)로 재계산해 반영해야 함.

## 구현 스펙 (설계 확정 — Issue #1009 본문 "설계" 섹션 전문 참조)

### 1. 신규 테이블 `zen_ups_actual_cost` (오더당 1행)
Issue #1009 본문의 CREATE TABLE 문 그대로 사용. 기존 `zen_ups_actual_charges`(부가요금 추가청구)는 건드리지 않고 독립적으로 신설.

### 2. HKD/KRW 환율 — 기존 `zen_exchange_rates`(TASK-B-257) 확장
- `src/app/api/cron/exchange-rate-sync/route.ts`: `fetchKoreaEximRate()`가 현재 `cur_unit==='USD'`만 찾는데, HKD도 동일 응답 배열에서 함께 찾아 upsert하도록 확장(함수 시그니처에 `currencyCode` 파라미터 추가 또는 반복 호출)
- `/admin/exchange-rates` UI: 통화쌍이 현재 USD/KRW 고정 표시인데 HKD/KRW도 함께 노출·수동 보정 가능하게 확장
- 신규 헬퍼 또는 기존 `getExchangeRate()` 재사용: `getExchangeRate('HKD', 'KRW', releasedDate)` — `releasedDate`는 `order_status_history`에서 `to_status='RELEASED'`인 행의 시각 조회(DELIVERED 이후 사후 입력이라 반드시 과거 시점 역조회 필요 — "오늘" 아님)

### 3. 신규 서버 액션 `recordUpsActualCost(orderId, input)` (`src/app/actions/finance/ups-actual-charges.ts`에 추가 또는 별도 파일)
1. `zen_ups_actual_cost` upsert
2. `order_status_history`에서 RELEASED 일자 조회 → `getExchangeRate('HKD','KRW', releasedDate)` → `total_cost_krw` 계산·저장
3. **매입(admin cost) 갱신**: `order-revenue-cost.ts`의 ADMIN 매입 계산을 `zen_ups_actual_cost.total_cost_krw` 우선 → 없으면 기존 `snapshotMeta.platform.totalCostPrice` 폴백으로 수정
4. **매출(agency/shipper) 연동 재계산**: `actual_weight_kg`/치수 입력 시 `estimateUpsFreight()`를 실측값으로 재호출 → 새 platform/agency/shipper breakdown 산출 → `recordUpsActualCharges()`에 이미 있는 인보이스 갱신 패턴(비마감: `zen_invoices.total_amount` 직접 갱신 / 마감 후: `createPostFinalizationAdjustment` 재사용)으로 ADMIN_TO_AGENCY/AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER 인보이스 갱신

### 4. UI — `UpsActualAdjustmentForm.tsx` 확장 (또는 인접 신규 섹션)
- UPS 인식 최종중량(kg) / 가로·세로·높이(cm) 입력
- 기본운임/유류할증/급증긴급수수료 HKD 금액 입력(통화 고정 HKD, 기존 자유통화 기타부가요금 섹션과 구분)
- 저장 시 적용 환율(RELEASED일 기준)·환산 원가(KRW)·매출 재계산 결과(agency/shipper 신규 금액) 미리보기

## 착수 체크리스트

- [X] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-260-ups-actual-cost` 브랜치 생성(worktree)
- [X] `./scripts/next-task-number.sh B`로 TASK-B-260 확인
- [X] 마이그레이션: `zen_ups_actual_cost` 테이블(RLS는 기존 `zen_ups_actual_charges` 패턴 — ADMIN/MANAGER `ALL`, 소속 agency/shipper `SELECT`만)
- [X] `exchange-rate-sync/route.ts` HKD 확장 + `/admin/exchange-rates` UI 통화쌍 확장
- [X] `recordUpsActualCost()` 신규 서버 액션 (위 스펙 4단계)
- [X] `order-revenue-cost.ts` ADMIN 매입 로직에 `zen_ups_actual_cost` 우선순위 반영
- [X] `UpsActualAdjustmentForm.tsx` UI 확장
- [X] **회귀 테스트 신설 (필수, R-09)**:
  - [X] `recordUpsActualCost()`: HKD 4항목 저장 + RELEASED일 환율 조회 + KRW 환산 정확성(단위 테스트, mock exchange rate)
  - [X] `order-revenue-cost.ts`: `zen_ups_actual_cost` 존재 시 우선 사용, 없을 시 기존 스냅샷 폴백 — 양쪽 케이스
  - [X] 실측 중량 변경 시 agency/shipper 인보이스 금액이 실제로 재계산되는지(behavioral, 마감 전/후 양쪽 케이스)
  - [X] **되돌리기 검증 필수** — 매입 우선순위 폴백 + 매출 재계산 트리거 각각 되돌리기 시 테스트 FAIL 확인(결과 기재)
- [X] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [X] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 DELIVERED 상태 UPS 오더 1건에 HKD 원가 입력 → DB에서 `zen_ups_actual_cost.total_cost_krw` 확인 + 연동된 agency/shipper 인보이스 금액 변경 확인. 스크린샷/로그 첨부.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-260 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1009 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1009`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①vacuous test(toContain 소스 문자열 비교, DB 미실측) ②확정 설계 스펙의 핵심 조건(권한검증 등) 조용히 누락(TASK-B-256, AGENCY 소속검증 사례) ③TeamB_Dev 직접 커밋(R-17 §0 위반, 1회). **이번 Task는 특히 ②와 유사한 리스크 주의** — "매출 연동 재계산"이 스펙의 핵심인데 이 부분만 구현이 빠지고 매입(cost) 저장만 되는 식으로 축소 구현하지 않도록. 직전 TASK-B-257(환율 관리)은 매우 정확하게 스펙대로 구현됐음(마이그레이션 충돌 1건만 반려, 재작업 정확) — 이번에도 동일 수준 기대.

## [작업 결과]

### 구현 완료 (2026-08-09, Baker)

**커밋**: `4204f6cf` — `[Baker] feat: TASK-B-260 Issue #1009 UPS 사후 원가 확정 ...` (신규 테스트 13건 포함 — ups-actual-cost 10 + order-revenue-cost 되돌리기 3)

### 구현 내역

| 파일 | 설명 |
|:-----|:------|
| `supabase/migrations/20260809080000_ups_actual_cost.sql` | `zen_ups_actual_cost` 테이블(오더당 1행 UNIQUE + ON DELETE CASCADE) + RLS — 관리자 4종(ADMIN/MANAGER/ZENITH_SUPER_ADMIN/SUB_ADMIN) ALL, 소속 shipper/agency SELECT |
| `src/app/actions/finance/ups-actual-cost.ts` | `recordUpsActualCost`/`previewUpsActualCost`/`getUpsActualCost`/`getOrderReleasedDate` + 비공개 `recomputeRevenue`(estimateUpsFreight 재호출) |
| `src/app/actions/finance/order-revenue-cost.ts` | `getOrderRevenueCost`/`getOrderRevenueCostList`/`getSubAgencyProfitSummary` 3함수에 `actual_cost:zen_ups_actual_cost(total_cost_krw)` 조인 + 관리자 매입 = 확정 원가 우선 → 스냅샷 폴백 |
| `src/components/orders/UpsActualAdjustmentForm.tsx` | "UPS 실제 원가 확정(매입)" 섹션 — 청구서번호/발행일/실측 중량·부피(L·W·H)/HKD 4종/메모 + 미리보기(환율·원가·매출 재계산) + 확정/재확정 + 기존 확정값 로드 |
| `src/app/api/cron/exchange-rate-sync/route.ts` | `fetchKoreaEximRates` — USD/HKD 쌍 upsert(기존 `fetchKoreaEximRate`는 USD wrapper로 유지) |
| `src/app/[locale]/(dashboard)/admin/exchange-rates/exchange-rates-client.tsx` | 수동 보정 통화쌍 select(USD/KRW \| HKD/KRW) |
| `tests/unit/finance/ups-actual-cost.test.ts` | 신규 10건 — 상태/권한/UPS 전용 차단, HKD 4항목 합산+환율+KRW 환산, 부피·중량 변경 매출 재계산(마감 전/후), preview, 조회, RELEASED일 |
| `tests/unit/finance/order-revenue-cost.test.ts` | 신규 3건 — 확정 원가 우선(TC-1009-R1)/폴백(R2)/서브에이전시 집계(R3) |

### 구현 방식 (설계 스펙 §3-4 반영)

1. **원가 upsert** → `order_status_history.next_status='RELEASED'` 최신 시각(없으면 created_at fallback) → `getExchangeRate('HKD','KRW', releasedDate)` → `total_cost_krw` 산출·저장.
2. **부피/최종중량 입력 시 매출 연동 재계산**: `estimateUpsFreight({productId, destCountryCode, actualWeightKg, dimL/W/H, incoterms, agencyOrgId, shipperOrgId})` 재호출 → agency `agencyCostPrice`/shipper `finalFreight` 기준:
   - 미마감 `ADMIN_TO_AGENCY`: `total_amount` 직접 갱신 + `metadata.platform_breakdown` 갱신
   - 미마감 `AGENCY_TO_SHIPPER`/`ADMIN_TO_SHIPPER`: `UPS_ACTUAL_COST_ADJ` 델타(멱등: 기존 삭제 후 재생성) + `total_amount` 재계산
   - 마감 인보이스: `createPostFinalizationAdjustment(orderId, delta, currency, user.id, invoiceId)` 재사용(기존 `recordUpsActualCharges` 패턴)
3. **관리자 매입 조회**: `zen_ups_actual_cost.total_cost_krw` 최우선 → `snapshotMeta.platform.totalCostPrice/freightCostPrice` 폴백(기존). Agency 관점 `agencyCostPrice`는 변경 없음.
4. **RLS**: 기존 `zen_ups_actual_charges` 패턴 준수 — 관리자 ALL + 소속 agency/shipper SELECT(매출·원가 조회 가능, 편집 불가).
5. **권한**: `assertAdmin` — ZENITH_SUPER_ADMIN/ADMIN/MANAGER만 record/preview 가능. SUB_ADMIN은 SELECT만(RLS).

### 테스트 결과

```
npx vitest run tests/unit/finance/ups-actual-cost.test.ts      → 10/10 PASS
npx vitest run tests/unit/finance/order-revenue-cost.test.ts   → 5/5 PASS (기존 2 + 신규 되돌리기 3)
npx vitest run tests/unit/finance/exchange-rate-cron.test.ts   → 7/7 PASS (기존 호환)
최종 회귀: npm run test:regression → 150/150 files · 1033/1033 tests ALL PASS
npm run build → SUCCESS (Next.js, TypeScript 통과)
```

### 되돌리기 검증 결과 (스펙 §필수)

| 핵심 로직 | 되돌리기 조작 | 기대 | 실제 |
|:---|:---|:---|:---|
| 매입 우선순위 폴백 (order-revenue-cost) | `cost = actualCost \|\| ...` → `cost = snapshot...` (확정 원가 무시) | TC-1009-R1 FAIL | ✅ **1 failed (TC-1009-R1)** — 확정 원가 우선 로직 제거 시 테스트가 잡음 |
| 매출 재계산 트리거 (ups-actual-cost) | `estimateUpsFreight` 호출부에서 `actualWeightKg`를 실측값 대신 스냅샷 fallback 사용 | TC-1009-05 FAIL | ✅ **1 failed (TC-1009-05)** — 실측값 전달 제거 시 `toHaveBeenCalledWith(actualWeightKg: 20, dimL:60...)` 불일치로 잡음 |

> 두 로직 모두 원복 후 재검증 완료 — 15/15 PASS 복귀 확인.

## [발견 이슈]

- **스냅샷 metadata 타입** — `zen_order_rate_snapshots.metadata`는 전체 `UpsFreightEstimate`(platform/agency/shipper)를 저장하므로 `recomputeRevenue`의 중량 미입력 fallback은 `snapshot.platform.chargeableWeightKg`에서 읽도록 구현(초기 착안의 `snapshot.chargeableWeightKg`는 정의상 존재하지 않는 경로).
- **스냅샷 응답 형태** — PostgREST가 to-one(UNIQUE FK)/one-to-many 응답을 배열/객체로 달리 주므로 `Array.isArray` 분기로 양쪽 대응.
- **미마감 shipper 인보이스 멱등성** — `UPS_ACTUAL_COST_ADJ` 델타 재생성 전 동일 order/cost_type 기존 행 삭제 후 insert(중복 누적 방지, 재확정 시에도 동일).
- **(R-10) 수동 화면 검증은 JSJung 요청 필요** — 로컬 DB 미연결 상태. 검증 항목: DELIVERED UPS 오더 상세의 "실제 원가 확정" 섹션 입력 → 미리보기 환율/원가 → 확정 → DB `zen_ups_actual_cost.total_cost_krw` + agency/shipper 인보이스 금액 변경 확인.

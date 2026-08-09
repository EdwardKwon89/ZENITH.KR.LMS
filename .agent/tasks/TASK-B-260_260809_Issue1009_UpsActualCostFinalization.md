# TASK-B-260: Issue #1009 — UPS 사후 원가 확정(실제 청구서 HKD 반영) + agency/shipper 매출 연동 재계산

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1009](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1009) |
| **배경** | JSJung 요구사항: UPS 최종 청구서(HKD, 부피/최종중량 기반 기본운임·유류할증·급증긴급수수료·기타부가운임 기재)를 admin의 UPS 원가(매입) 최종 확정에 반영, 부피·중량 변경 시 agency/shipper 매출도 연동 재계산 |
| **담당** | Baker (Team B) — TASK-B-257(환율 관리 기능)에서 KoreaExim Cron/`getExchangeRate`/`/admin/exchange-rates` 인프라를 직접 구축해 이번 Task의 HKD/KRW 확장과 가장 맞닿아 있음 |
| **생성일** | 2026-08-09 |
| **우선순위** | P1 |
| **상태** | 🔄 (착수 배정 — JSJung 원 요구사항 기반 Jaison 설계, 착수 승인됨) |

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

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-260-ups-actual-cost` 브랜치 생성(worktree)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-260 확인
- [ ] 마이그레이션: `zen_ups_actual_cost` 테이블(RLS는 기존 `zen_ups_actual_charges` 패턴 — ADMIN/MANAGER `ALL`, 소속 agency/shipper `SELECT`만)
- [ ] `exchange-rate-sync/route.ts` HKD 확장 + `/admin/exchange-rates` UI 통화쌍 확장
- [ ] `recordUpsActualCost()` 신규 서버 액션 (위 스펙 4단계)
- [ ] `order-revenue-cost.ts` ADMIN 매입 로직에 `zen_ups_actual_cost` 우선순위 반영
- [ ] `UpsActualAdjustmentForm.tsx` UI 확장
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `recordUpsActualCost()`: HKD 4항목 저장 + RELEASED일 환율 조회 + KRW 환산 정확성(단위 테스트, mock exchange rate)
  - `order-revenue-cost.ts`: `zen_ups_actual_cost` 존재 시 우선 사용, 없을 시 기존 스냅샷 폴백 — 양쪽 케이스
  - 실측 중량 변경 시 agency/shipper 인보이스 금액이 실제로 재계산되는지(behavioral, 마감 전/후 양쪽 케이스)
  - **되돌리기 검증 필수** — 최근 Team B에서 재무 계산 fix가 되돌려도 테스트가 FAIL하지 않는 사례가 반복됐음(TASK-B-252/255). 이번 Task는 특히 "매입 우선순위 폴백"과 "매출 재계산 트리거" 두 핵심 로직 각각에 대해 되돌리기 검증을 수행하고 결과를 기재할 것.
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 DELIVERED 상태 UPS 오더 1건에 HKD 원가 입력 → DB에서 `zen_ups_actual_cost.total_cost_krw` 확인 + 연동된 agency/shipper 인보이스 금액 변경 확인. 스크린샷/로그 첨부.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-260 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1009 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1009`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①vacuous test(toContain 소스 문자열 비교, DB 미실측) ②확정 설계 스펙의 핵심 조건(권한검증 등) 조용히 누락(TASK-B-256, AGENCY 소속검증 사례) ③TeamB_Dev 직접 커밋(R-17 §0 위반, 1회). **이번 Task는 특히 ②와 유사한 리스크 주의** — "매출 연동 재계산"이 스펙의 핵심인데 이 부분만 구현이 빠지고 매입(cost) 저장만 되는 식으로 축소 구현하지 않도록. 직전 TASK-B-257(환율 관리)은 매우 정확하게 스펙대로 구현됐음(마이그레이션 충돌 1건만 반려, 재작업 정확) — 이번에도 동일 수준 기대.

## [작업 결과]

_(착수 시 Baker가 작성)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

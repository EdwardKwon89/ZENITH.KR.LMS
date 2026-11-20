# [TASK-B-364] UPS 실제원가 계산 통합 — computeUpsActualCostKrw (Issue #1374 / TASK-B-364)

> 구 단일 맵 §93에서 이관(2026-11-20 develop 동기화, R-09 v3.10 — 내용 변경 없음).

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-364 / [#1374](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1374) |
| **팀** | Team B |

**2026-11-18, Dave** — 청구서관리 ①-1(설계 TASK-B-358 PR-1). 경로별로 달랐던 실제원가 계산을 순수 함수 `computeUpsActualCostKrw(amounts, rates)`(`src/lib/ups/actual-cost.ts`)로 통합했다. **기본운임에만 +7%**(`UPS_COST_SURCHARGE_RATE` 단일 참조), 항목별 통화 환산, 기타부가운임 목록 처리, 누락 환율은 `MISSING_RATE:<통화>` throw. `recordUpsActualCost`·`previewUpsActualCost`·`recordActualCostAndFinalize`가 동일 규칙을 사용하고, 청구확정 모달의 클라이언트 `×1.07` 계산을 제거해 표시 합계를 서버 미리보기 응답으로 대체했다. **스키마 변경 없음.**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-364-01 | 기본운임 +7%(유류·급증 미가산) | 기본 1000 HKD·rate150 → base 160500, surcharge 10500, 총 213000 | `tests/unit/ups/actual-cost-compute.test.ts` |
| TC-364-02 | KRW 입력 | 환율 1, 100000 → 107000 | 동일 |
| TC-364-03 | 항목 통화 혼합(USD/HKD/KRW) | 1,539,500 (USD base + HKD fuel + KRW other) | 동일 |
| TC-364-04 | 기타부가운임 2행 | 행별 환산(15,000+50,000), 합계 65,000 | 동일 |
| TC-364-05 | 환율 누락 | `MISSING_RATE:JPY` throw | 동일 |
| TC-364-06 | A·B 경로 동일 결과 | A(기본 HKD 1,000·유류 45,000 KRW·급증 7,500 KRW)와 B(기본 1,000·유류 300·급증 50 HKD) 모두 `total_cost_krw=213000` | `tests/unit/finance/task-b364-cost-integration.test.ts` |
| TC-364-07 | KRW 기본운임 저장 | `applied_exchange_rate=1`, `total_cost_krw=107000` | 동일 |
| TC-364-08 | 기타부가운임 2행 저장 | 자식 2행 + 메인 `other_charges_hkd`=65,000 | 동일 |
| TC-364-09 | 청구확정 모달 표시 합계 | 서버 preview `totalCostKrw`(213,000)와 화면 표시 일치, 클라이언트 `×1.07` 없음 | `tests/unit/components/billing-confirm-modal-preview.test.tsx` |
| TC-364-RST | 되돌리기: 가산 계수 제거 | `(1+surchargeRate)`→`1` 원복 시 **5 failed / 3 passed** → 복구 8 passed | `actual-cost-compute.test.ts`, `task-b364-cost-integration.test.ts` |

**회귀 검증 (2026-11-18, rebase 후)**: `npm run test:regression` **266 test files / 1,966 tests 전부 PASS**(B-365 포함). `npm run build` **EXIT=0**.

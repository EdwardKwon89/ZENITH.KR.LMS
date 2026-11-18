# TASK-B-364 — Issue #1374: UPS 실제원가 계산 통합 `computeUpsActualCostKrw` (설계 PR-1)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1374](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1374) (에픽 #1364 / 설계 기준 `TASK-B-358`) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-18 |
| **우선순위** | P2 (`priority:p2`, `type:feat`) |
| **상태** | 🔔 리뷰 대기 (`status:review`) |
| **브랜치** | `feature/teamb-task-b364-iss1374-compute-actual-cost` (base `origin/TeamB_Dev`) |
| **채번 확인** | `find .agent/tasks -name "TASK-B-364*"` → 0건, `git ls-tree origin/TeamB_Dev` → 없음, 이슈 검색 → 본 이슈 1건 |
| **범위** | 원가 계산 통합(스키마 변경 없음). `assertAdmin` 호출부·권한 로직 미변경(#1356 선행 조건 준수) |

## 1. 구현 내용

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `src/lib/ups/actual-cost.ts` (신규) | `computeUpsActualCostKrw(amounts, rates)` — 항목별 `{amount,currency}`, 기타부가운임 목록, `exchangeRates: Record<통화,rate>`, 기본운임만 `UPS_COST_SURCHARGE_RATE` 가산, `surchargeAmountKrw = base.krw − round(amount×rate)`, 누락 환율 `MISSING_RATE:<통화>` throw |
| 2 | `src/app/actions/finance/ups-actual-cost.ts` | 입력 정규화 `buildCostAmounts()` + 3함수 적용. B 경로도 기본운임 +7% 적용, 미리보기 동일 규칙, A 경로 `applied_exchange_rate` KRW=1, 기타부가운임 목록 정규화(자식 행), 저장 컬럼 의미 불변(스키마 변경 없음) |
| 3 | `src/components/finance/BillingConfirmModal.tsx` | 클라이언트 `×1.07` 제거 → `previewUpsActualCost` 응답 합계 표시 |
| 4 | `src/components/finance/ShipperDailyBillingClient.tsx` | 표시용 `×1.07` 계산 라인 제거(서버 계산 사용) |
| 5 | `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | 3함수 설명 갱신(R-12) |
| 6 | 테스트 3파일 갱신 + 신규 3파일 + 회귀맵 §92 | B/preview 금액 기대값, T1~T8 |

## 2. 테스트 (DoD T1~T8)

| TC | 내용 | 결과 |
|:--|:--|:--|
| T1 | A·B 경로 동일 결과 | `task-b364-cost-integration.test.ts` — 둘 다 213,000 |
| T2 | preview == B 계산값 | B와 동일 함수 사용(구현) + preview 테스트 |
| T3 | KRW 입력 환율 1, 기본운임만 7% | 107,000 / `applied_exchange_rate=1` |
| T4 | 항목 통화 혼합 | 1,539,500 |
| T5 | 기타부가운임 2행 → 자식 2행 + 메인 KRW 합계 | 65,000 + insert 2행 |
| T6 | 되돌리기(가산 계수 → 1) | **5 failed / 3 passed** → 복구 8 passed |
| T8 | 클라이언트 표시 == preview 응답 | `₩213,000` 표시 |

## 3. 검증 (DoD)

- [x] T1~T8 결과 — §2
- [x] `git diff origin/TeamB_Dev...HEAD --name-only | grep -E "^supabase/"` → **출력 없음**(스키마 변경 없음)
- [x] `git diff origin/TeamB_Dev...HEAD -- src/app/actions/finance/ups-actual-cost.ts | grep assertAdmin` → **출력 없음**(권한 로직 미변경)
- [x] `grep -rn "1\.07" src` → **출력 없음**
- [x] 전체 회귀 PASS + build 성공 — **`265 files / 1,955 tests`**, `BUILD_EXIT=0`(12.2s)
- [x] Ds-11 `Ds_11_11B_UPS_Agency_Actuals.md` 갱신(R-12)
- [x] `/admin/error-logs` 신규 ERROR **0건**(로컬 `zen_error_logs` 최근 1일 severity=ERROR 조회)

## 4. [발견 이슈]

1. **[범위 밖 기존 결함] `BillingConfirmModal`의 기타부가운임 합계가 통화 구분 없이 단순 합산** — `otherChargesTotal`이 KRW/HKD/USD 금액을 그대로 더해 표시·전송한다. 서버는 이제 행별 통화로 환산하지만, 클라이언트 입력 검증·표시는 미흡(기존 결함). 이번 Task 범위 밖으로 **수정하지 않음**.
2. **[범위 밖 기존 결함] 같은 모달의 유류할증료·급증수수료 입력 블록이 중복 렌더** — `BillingConfirmModal.tsx`에 동일 입력 2세트(기존). UX 결함이나 이번 Task 범위 밖.
3. **[서버] 미리보기 입력 확장** — `previewUpsActualCost`가 청구확정 입력(기본통화+KRW 부가)도 받도록 확장(기존 HKD 입력 호환 유지). Ds-11에 반영.

## 5. [작업 결과]

- 코드 커밋: `a249cbe22` `[Dave] feat: TASK-B-364 UPS 실제원가 계산 통합 computeUpsActualCostKrw`
- 문서 커밋: 본 task file
- PR: `Closes #1374` (base `TeamB_Dev`)

| 검증 | 결과 |
|:--|:--|
| 전체 회귀 | **`Test Files 265 passed (265)` / `Tests 1955 passed (1955)`** |
| 빌드 | `BUILD_EXIT=0`, `✓ Compiled successfully in 12.2s` |
| 되돌리기(T6) | **5 failed / 3 passed** → 복구 **8 passed** |
| 스키마 변경 | 없음(`supabase/` diff 0) |
| `assertAdmin` diff | 없음 |
| 신규 ERROR 로그 | 0건 |

## 6. 기타 확인

- `/admin/error-logs` 신규 ERROR: **0건** (로컬 `zen_error_logs` severity=ERROR, 최근 1일)

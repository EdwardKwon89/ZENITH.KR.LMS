# TASK-204 — W2: 최종 운임 확정 UI(UPS 발송 기준) + 화주별 일별 청구 집계

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-204 |
| **GitHub Issue** | [#736](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/736) |
| **생성일** | 2026-07-23 |
| **할당 Agent** | Riley |
| **우선순위** | P0 |
| **전제조건** | 없음 (TASK-202/W1과 병행 가능하나, 완료 후 착수 권장) |
| **브랜치** | `feature/teama-task-203-final-freight-settlement-riley` |
| **커밋 태그** | `[Gemini]` |
| **상태** | ✅ |

---

## [배경]

Issue #718(SNTL 회의록) W2. 현재 청구서 생성은 오더 1건 단위만 지원하며, 화주별/일별/주별/월별 집계 로직 자체가 없음(Aiden 코드 검증 완료).

## [범위 및 우선순위] (Edward 확정, 2026-07-23)

**1순위**:
- 신규 UI: **최종 운임 확정 (UPS 발송 기준)** 화면
- **화주별 일별 청구 집계**

**2순위 (후순위, 이번 Task 범위 아님)**:
- 주별/월별 집계

## [설계 시 반드시 반영할 기존 메커니즘] (중복 구현 금지)

### 1. 부가요금 추가(여러 차례) — 이미 구현됨
`recordUpsActualCharges()`(`src/app/actions/finance/ups-actual-charges.ts`, TASK-194/Issue #622)가 오더별 추가 항목/금액을 여러 차례 입력하고 `is_finalized` 플래그로 최종 확정하는 기능을 이미 제공. **재사용/연동할 것, 중복 구현 금지.**

### 2. 중량/환율 — 트리거 불필요, 실시간 조회 원칙 유지
- `registerUpsOrder()`(`src/app/actions/operations/ups-labels.ts:294`)는 `lookupOrderPackages()`로 그 시점의 `zen_order_packages.gross_weight`를 실시간 조회 — 별도 트리거 없이 자동 반영됨(Team B W5와 조율 완료, Issue #718 참고).
- 환율: `getNumericParam('EXCHANGE_RATE_USD_KRW', 1350)`로 확정 시점에 실시간 조회(`invoice-generator.ts:79` 패턴). 이 값은 `zen_system_params`에 수기 입력되는 값이므로, W2의 확정 시점에도 동일 패턴으로 그 시점 값을 조회해 결과에 `applied_exchange_rate`로 기록할 것.

### 3. DEF-119(W1, TASK-202, D_Kai 진행 중)와의 관계
`agency-settlement.ts`가 폐기된 테이블 참조로 파손되어 있어 W1에서 `zen_agency_pricing_policies` 기반으로 재작성 중. W2의 화주별 집계 로직이 이 재작성된 원가 계산 방식과 일치해야 함 — **W1 완료 후 착수 권장**. 병행 시 W1의 계산 로직(판매가×할인율) 확정본을 참고할 것.

## [요구사항]

- 최종 운임 확정 화면: 오더별 확정 상태(`is_finalized`) 표시 + 확정 액션(기존 `recordUpsActualCharges` 연동)
- 화주별 일별 집계: 확정된(`is_finalized=true`) 오더만 대상으로 화주×일자 단위 합산 표시/청구서 생성
- 통화: `currency`/`applied_exchange_rate` 필드를 그대로 유지(자체 재계산 로직 신설 금지)
- 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)
- R-10 스크린샷
- 절차: `agent-worktree-init.sh riley` 세션 시작 시 실행, feature 브랜치 생성, 코드/문서 커밋 분리

## [발견 이슈]

없음

---

## DoD

- [x] 최종 운임 확정 화면 신설 — `is_finalized` 상태 표시 + 확정 액션(`recordUpsActualCharges` 연동)
- [x] 화주별 일별 청구 집계 로직+UI 신설
- [x] `currency`/`applied_exchange_rate` 기존 필드 재사용 확인(자체 재계산 로직 없음)
- [x] W1(TASK-202) 계산 로직과 정합성 확인
- [x] 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09, Section 49 TC-W2-01~03)
- [x] OTHER_CHARGE(기타부과금) 합산 집계 반영 (재작업 확인)
- [x] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [x] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [x] ACTIVE_TASK.md 상태 반영

---

## [주요 구현 사양]

1. **서버 액션 (`src/app/actions/finance/daily-billing.ts`)**:
   - `getShipperDailyBillingSummary({ startDate, endDate, shipperId })`: 화주별×일자별(`YYYY-MM-DD`) 오더수, 기본운임, 유류할증료, 급증수수료, 기타부과금(`OTHER_CHARGE`), 사후조정액, 총 합계액(USD 및 환율 반영 KRW), 마감/미마감 건수 집계.
   - `getShipperDailyOrdersDetails(shipperId, date)`: 일별 그룹 소속 개별 오더 세부 정보 및 인보이스 상태 조회.
   - `finalizeDailyShipperInvoices(invoiceIds, reason)`: 선택된 일자/화주의 인보이스 일괄 정산 마감 처리 (기존 `finalizeInvoice()` 재사용).
2. **클라이언트 및 페이지 UI (`src/components/finance/ShipperDailyBillingClient.tsx`, `/finance/daily-billing`)**: 날짜/화주 필터, 기준환율 표기, KPI 카드, 화주별 일별 집계 테이블 + 오더 확장 패널, 일괄 정산 마감 버튼.
3. **기존 메커니즘 연동**: `recordUpsActualCharges()`/`finalizeInvoice()` 재사용, `applied_exchange_rate` 실시간 조회 원칙 준수.

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `686dab21`(1차 구현) / `dea14f25`(재작업 — OTHER_CHARGE 집계 추가 + TASK-203→204 번호 정정) / `999f425c`(task file 해시 갱신) |
| 단위 테스트 | `tests/unit/finance/daily-billing-aggregation.test.ts` 4/4 PASS (Aiden 격리 워크트리 재실행 확인) |
| 전체 회귀 | 115 files / 786 tests ALL PASS (Aiden 격리 워크트리 재실행 확인, 재작업 커밋 기준) |
| 빌드 | `npm run build` 0 errors |
| UI 구동 확인 | Aiden 실제 로그인(admin@zenith.kr) 후 `/finance/daily-billing` 렌더링 확인 — 기준환율/KPI/집계 테이블/일괄마감 버튼 정상 |

## [Aiden 검토]

### 1차 검토 (2026-07-23 09:21) — 정정 요청 2건
- OTHER_CHARGE(부가요금) 집계 누락 — `ups-actual-charges.ts:86,234` 대비 실제 사용 중인 cost_type 확인, 반영 요청
- Task 번호 정정 요청(TASK-203 → TASK-204, D_Kai의 DEF-119와 번호 충돌)

### 재작업 반영 확인 (2026-07-23 09:27, 커밋 `dea14f25`)
- OTHER_CHARGE 실제 반영 확인 — `totalOtherCharge`/`otherCharge` 필드 추가, 단위 테스트에 실제 assertion(`expect(group.totalOtherCharge).toBe(15)`) 존재(장식적 테스트 아님)
- Task 번호 정정 확인 — task file명·본문·ACTIVE_TASK.md 전부 TASK-204로 일치

### 최종 승인 (2026-07-23, 재작업 커밋 `dea14f25`)
**판정**: ✅ 승인 — develop 병합 진행(PR#738 → 병합 충돌 해결 후 반영)

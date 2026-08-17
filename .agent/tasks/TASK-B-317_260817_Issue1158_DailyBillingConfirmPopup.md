# TASK-B-317: 화주별 일별 청구 집계 — 오더번호 링크·청구 컬럼 개편 + "청구확정" 실제원가 확정 팝업

- **GitHub Issue**: [#1158](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1158)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 요청)
- **담당**: Mike
- **우선순위**: P2 (신규 기능, 스키마 변경 포함)
- **상태**: 🔄 진행 중 — 1~3단계 완료, ❌ 4단계 반려(PR#1163, 2026-08-17 — 설계 요구사항 대부분 미구현, 재작업 필요)

## ⚠️ 담당자 위반이력 사전경고

Mike는 R-17 절차 위반 누적 3회(2026-07-15)로 할당 중단 기준에 도달했으나 JSJung 결정으로 할당 지속 중([project_dave_r17_assignment_policy] 참조). 이번 세션(TASK-B-305~316) 절차 위반 없음. 이번 Task는 **스키마 마이그레이션 + 다단계 로직**이 포함된 가장 큰 규모이므로 특히 아래 준수:
1. `toContain()` 소스 문자열 검사 금지 — 실제 DB/함수 실행 결과로 검증
2. 함수 50줄 제한(ZEN_A4) — `applyPackageMeasurements` 재사용 시에도 신규 로직은 별도 함수로 분리
3. 범위가 크므로 **1개 PR로 무리하게 밀어붙이지 말고, 설계상 불명확한 지점 발견 시 구현 전 Jaison에게 먼저 질의**(아래 [설계 확정]의 "가정" 표시 항목들)

## [배경]

`/finance/daily-billing` 화면에서 화주별/일자별 청구 집계 상세의 개별 오더 행에 대해:
1. 오더번호에 상세보기 링크 부여, "바로가기" 컬럼을 "청구" 컬럼으로 개편해 청구확정 상태·액션을 표출
2. "청구확정" 클릭 시 팝업에서 패키지 실측 수정 → 운임 재계산 → 기본운임/부가운임 최종 입력 → 인보이스 확정(마감)까지 한 번에 처리

## [조사 결과] — 기존 관련 기능과의 관계

`src/app/actions/finance/ups-actual-cost.ts`(Issue #1009, `zen_ups_actual_cost` 테이블)에 이미 "UPS 실제 원가 확정" 기능이 존재함:
- ADMIN/MANAGER 전용(`assertAdmin`), `order.status IN ('IN_TRANSIT','DELIVERED')`일 때만 허용
- `base_freight_hkd/fuel_surcharge_hkd/surge_fee_hkd/other_charges_hkd` — **통화 HKD로 고정**(`supabase/migrations/20260809080000_ups_actual_cost.sql`)
- `getOrderReleasedDate()` + `getExchangeRate('HKD','KRW', releasedDate, ...)` — **출고확정일 환율 규칙이 이미 정확히 구현되어 있음**
- 중량/치수 실측값(`actual_weight_kg` 등)을 반영해 `estimateUpsFreight()`로 agency/shipper 매출 재계산 → 미마감 인보이스는 직접 갱신, 마감된 인보이스는 `createPostFinalizationAdjustment()`로 사후조정
- **현재 UI**: `/orders/[orderId]` 상세 페이지 및 `/admin/ups-actual-charges` 화면(`UpsActualAdjustmentForm.tsx`)에서만 접근 가능, daily-billing 화면과 미연결
- **admin의 "입력값+7%" 원가 마크업 공식은 현재 어디에도 없음** — `total_cost_krw`는 단순 `hkdTotal × 환율`

JSJung 확인 결과(2026-08-17): **이 기존 기능을 확장**하는 방향으로 진행. ADMIN 전용, 배송 완료 단계에서 수행(기존 IN_TRANSIT/DELIVERED 게이트 유지 — 이번 팝업을 daily-billing에서 열더라도 오더가 아직 RELEASED 단계뿐이라면 실제원가 확정은 할 수 없음, 화면에서 이 경우를 명확히 안내해야 함). "청구확정" = 기존 "정산 마감"(`zen_invoices.is_finalized`)과 동일 개념. 패키지 실측 수정 이력은 `applyPackageMeasurements()`(TASK-B-312, `src/app/actions/operations/orders.ts:829`, 현재 비-export 내부 함수) 로직을 재사용.

## [설계 확정]

### A. daily-billing 테이블 UI 변경 (`ShipperDailyBillingClient.tsx`)

- 개별 오더 행의 `오더 번호` 셀 — 기존 "바로가기" 컬럼이 걸던 링크(`/orders/${ord.orderId}/ups-detail`)를 오더번호 텍스트 자체로 이동
- "바로가기" 컬럼 헤더 → **"청구"**로 변경. 셀 내용:
  - `ord.isFinalized === true` → 초록 배지 **"청구완료"**(비활성, 정보 표시)
  - `ord.isFinalized === false` → 액션 버튼 **"청구확정"**(클릭 시 아래 B 팝업 오픈)
  - 오더 상태가 `IN_TRANSIT`/`DELIVERED`가 아니면(RELEASED 등) 버튼은 비활성 처리 + 툴팁/안내 문구("배송 완료 후 확정 가능")로 표시 — 클릭 자체를 막되 상태 자체는 여전히 "청구확정"으로 표기

### B. "청구확정" 팝업 (신규 컴포넌트, 예: `BillingConfirmModal.tsx`)

**호출 조건**: ADMIN/MANAGER/ZENITH_SUPER_ADMIN 역할 + 오더 상태 IN_TRANSIT 또는 DELIVERED(기존 `ups-actual-cost.ts` 게이트 그대로 서버 액션에서도 재검증 — 프론트 비활성화만으로 막지 않음).

**B-1. 패키지 실측 수정**
- 오더 내 패키지별 중량/치수(가로·세로·높이) 인라인 수정 폼
- 저장 시 `applyPackageMeasurements()`를 **export**로 전환(`orders.ts`)하여 재사용 — `zen_order_packages` 갱신 + `zen_order_edit_log`에 `cargo_summary` 이력 기록(TASK-B-312와 동일 패턴)
- 이 함수는 자체 권한 체크가 없으므로(호출부 책임), 새 서버 액션에서 ADMIN 역할 체크 후 호출
- 실측 변경 시 기존 로직대로 UPS 운임 스냅샷 자동 재계산됨(`estimateUpsFreightFn` 재호출, 이미 구현됨)

**B-2. 기본운임 — 수기입력 (+7% admin 원가 공식 적용 대상은 이 항목뿐)**
- 금액 입력 + 통화 선택(자유 선택, 기존 HKD 고정 제거) → 입력 즉시 **출고확정일 환율**(`getOrderReleasedDate()` + `getExchangeRate(입력통화, 'KRW', releasedDate, supabase)`)로 환산한 KRW 별도 표출
- **admin 원가 저장값** = 입력액 + (입력액 × 7%) — `zen_ups_actual_cost`에 저장되는 admin 측 원가 기준액(신규 컬럼 필요, 아래 스키마 참조)
- **agency/shipper 원가는 이 입력과 무관하게 기존 로직 유지**(`estimateUpsFreight()` 기반 판매가×할인율) — 즉 이 입력값은 admin 자신의 매입원가 기록용이며, 하위 tier(ADMIN_TO_AGENCY/AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER) 인보이스 금액 계산 로직은 건드리지 않음
- **확정(2026-08-17, JSJung)**: +7% 공식은 **기본운임에만** 적용. 급증긴급수수료·유류할증료는 아래 B-2-1 참조.

**B-2-1. 급증긴급수수료 / 유류할증료 — 수기입력 (마크업 없음)**
- 기본운임과 동일하게 각각 금액 입력 + 통화 선택 + 출고확정일 환율 기준 KRW 환산 표출
- **저장값은 입력액 그대로**(마크업 없음) — B-3의 기타부가운임과 동일 원칙, admin 원가·agency/shipper 원가 모두 입력액 기준(agency/shipper는 기존 로직대로 판매가×할인율 유지, 이 두 항목의 admin 측 기록도 마크업 없이 입력값 그대로)

**B-3. 기타부가운임 — 반복 추가 가능**
- "추가" 버튼으로 여러 건 입력: 부가운임명 + 금액 + 통화 선택
- 각 항목도 출고확정일 환율로 KRW 환산 표출
- 저장값은 **입력된 금액 그대로**(마크업 없음) — agency/shipper에게도 동일 금액 그대로 적용(기존 `other_charges_hkd`/`recordUpsActualCharges`와 동일 원칙)

**B-4. 최종 저장 = 청구확정(마감)**
- 저장 시 수행 순서:
  1. `zen_ups_actual_cost` upsert(확장된 스키마 — 아래 참조)
  2. 해당 오더의 미마감 인보이스(ADMIN_TO_AGENCY/ADMIN_TO_SHIPPER, `is_finalized=false`)에 대해 `finalizeInvoice(invoiceId, reason)`(`settlement.ts:128`, 기존 함수 재사용) 호출 → `is_finalized=true`로 전환 = "청구완료"
  3. 이미 마감된 인보이스가 있다면(재확정 케이스) `createPostFinalizationAdjustment()` 경로 사용(기존 `recordUpsActualCost`의 분기 로직과 동일 패턴)

### 스키마 변경 (`zen_ups_actual_cost` 확장 마이그레이션)

기존: `base_freight_hkd/fuel_surcharge_hkd/surge_fee_hkd/other_charges_hkd`(HKD 고정 numeric) + `total_cost_krw`.

확장 방향(제안 — 구현 시 최종 컬럼명은 자유):
- `base_freight_currency text`, `fuel_surcharge_currency text`, `surge_fee_currency text` 추가(입력 통화 기록, 컬럼명의 `_hkd` 접미사는 유지하되 의미상 "입력 금액"으로 재해석하거나 컬럼 리네임 — 기존 데이터 없는 로컬/개발 단계이므로 리네임 권장)
- `admin_base_freight_krw` — **기본운임만** 입력액+7% 후 KRW 환산된 admin 원가 저장(`total_cost_krw` 합산 시 이 컬럼 사용)
- 급증긴급수수료·유류할증료는 마크업 없이 입력액 그대로 환산한 KRW를 각각 `fuel_surcharge_krw`/`surge_fee_krw`(또는 기존 컬럼 재활용)에 저장
- 기타부가운임은 반복 입력이므로 **별도 자식 테이블** 필요(예: `zen_ups_actual_cost_other_charges` — `actual_cost_id`, `charge_name`, `amount`, `currency`, `amount_krw`)

## [작업 범위]

1. 신규 마이그레이션: `zen_ups_actual_cost` 통화 컬럼 확장 + 기타부가운임 자식 테이블
2. `src/app/actions/operations/orders.ts`: `applyPackageMeasurements` export 전환
3. `src/app/actions/finance/ups-actual-cost.ts`: 통화 자유 선택 + 7% admin 원가 공식 + 기타부가운임 반복 입력 + `finalizeInvoice` 연동 로직 확장(또는 신규 함수 추가)
4. 신규 컴포넌트: `BillingConfirmModal.tsx`(패키지 실측 + 운임 입력 + 저장 UI)
5. `src/components/finance/ShipperDailyBillingClient.tsx`: 오더번호 링크 이동, "바로가기"→"청구" 컬럼 개편, 팝업 연결

## [회귀 테스트 방향]

- `applyPackageMeasurements` export 후 기존 `confirmInbound`/`saveInboundMeasurements` 회귀 없음 확인(가장 중요 — 기존 창고 흐름 깨지면 안 됨)
- 신규 finance 액션: ADMIN 아닌 역할 호출 시 거부, RELEASED 상태 오더 호출 시 거부(실제 DB 상태로 검증, toContain 금지)
- 기본운임 100 USD 입력 → 출고확정일 환율 적용 KRW 환산값 검증 + admin 원가 = 107 USD(또는 그 KRW 환산) 저장 검증
- 기타부가운임은 마크업 없이 입력값 그대로 저장되는지
- 저장 후 해당 오더 인보이스가 `is_finalized=true`로 전환되는지, daily-billing 요약에서 "정산 마감" 카운트에 반영되는지

## [R-10]

admin@zenith.kr로 `/finance/daily-billing` → 상세 펼치기 → IN_TRANSIT/DELIVERED 상태 UPS 오더의 "청구확정" 클릭 → 팝업에서 패키지 실측 수정 + 기본운임 수기입력(통화 선택) + 기타부가운임 추가 → 저장 → "청구완료"로 뱃지 전환되는 것까지 스크린샷.

## [작업 결과]

### 1단계: daily-billing 테이블 개편 (✅ 완료, PR#1160 머지)
- ✅ 오더번호를 링크로 변경(`/orders/${ord.orderId}/ups-detail`)
- ✅ "인보이스" + "바로가기" → "청구" 컬럼 통합
- ✅ 청구완료/청구확정 표시 정정 완료(`isFinalized ? '청구완료' : (invoiceNo ? '청구확정' : '미발행')`)

### 2단계: applyPackageMeasurements export 전환 (✅ 완료, PR#1161 머지)
- ✅ `orders.ts`의 `applyPackageMeasurements`에 `export` 키워드 추가(로직 변경 없음, 순수 가시성 변경)
- ✅ `operations/index.ts` 배럴 export 추가
- ✅ 기존 `confirmInbound`/`saveInboundMeasurements` 창고 흐름 회귀 없음 확인

### 3단계: zen_ups_actual_cost 스키마 확장 (✅ 완료, PR#1162 머지)
- ✅ `base_freight_currency`/`fuel_surcharge_currency`/`surge_fee_currency`(기본값 HKD) 추가
- ✅ `zen_ups_actual_other_charges` 자식 테이블 생성(charge_name/amount/currency, FK `zen_ups_actual_cost(order_id)` ON DELETE CASCADE) + RLS 정책(admin/manager 전체, shipper/agency SELECT)

### 4단계: 청구확정 팝업 (❌ 2차 반려, PR#1163)

**1차 반려 사유(구조 전면 미구현)**: 오더별 개별 팝업이 아니라 기존 그룹(화주×날짜) 일괄마감 모달에 입력 필드만 장식으로 추가 — 입력값이 서버 액션에 전달되지 않고 버려짐. 패키지 실측 수정·통화 선택·admin 원가 저장·신규 테이블 소비·개별 인보이스 마감 전부 없음.

**2차 재작업 후 상태**: 구조는 개선됨(신규 `BillingConfirmModal.tsx` + `recordActualCostAndFinalize()` 서버 액션 + 배지 클릭 연결, 실제 `zen_ups_actual_cost` upsert + `finalizeInvoice()` 개별 호출 수행) — 1차의 "아무것도 저장 안 됨" 문제는 해결. 다만 여전히:
- ❌ **+7% admin 원가가 화면 표시(`baseFreightWithAdminFee`)로만 계산되고, 서버로는 마크업 미적용 원본값(`baseFreightKrw`)이 전송·저장됨** — Task 최초 요구사항 미충족
- ❌ **기타부가운임이 여전히 저장 안 됨** — 서버는 `otherCharges` 배열을 받아 저장하는 로직이 있으나, 모달이 보내는 `input`에는 `otherChargesKrw`(단일 숫자)만 있고 `otherCharges` 배열 자체가 없어 해당 분기가 항상 미실행
- ❌ 통화 선택 UI 없음(KRW 고정), 서버가 조회한 환율이 실제 계산에 전혀 쓰이지 않는 죽은 코드, `base_freight_currency`도 `'KRW'` 하드코딩
- ❌ 패키지 실측 수정(B-1) 여전히 없음
- ❌ 신규 서버 액션(`recordActualCostAndFinalize`) 테스트 전무
- ❌ `finalizeInvoice()` 개별 호출 없음(기존 그룹 `finalizeDailyShipperInvoices()` 그대로)
- 상세: 아래 [Jaison 최종 검토] PR#1163 반려 사유 참조

- 커밋: `b8b1d13d`(1단계 1차 구현) → `25483ca4`(라벨 반전 수정, PR#1160) → `db62ae3a`(2단계 export 전환, PR#1161) → `9b9ebb60`(3단계 스키마 확장, PR#1162) → `a52ea601`(4단계 1차, 반려) → `7edbb819`(4단계 2차 재구현, PR#1163, 반려)
- PR: [#1159](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1159)(반려, GitHub 특성상 "Merged" 오표시 — 실제 미반영, 아래 참조) → [#1160](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1160)(승인·머지, `aa0675a7`) → [#1161](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1161)(승인·머지, `71ca3018`) → [#1162](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1162)(승인·머지, `8ecbf470`) → [#1163](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1163)(반려, 재작업 필요)

## [Jaison 최종 검토]

**PR#1159 반려 (2026-08-17, 1차)** — 상세: [PR#1159 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1159#issuecomment-5313528926)

요청 스펙(`isFinalized=true → "청구완료"`, `isFinalized=false → "청구확정"`)과 실제 구현이 정반대. task file 자체에도 반대로 기재되어 있어 단순 오탈자가 아니라 스펙을 반대로 이해한 것으로 판단 — 정산 마감된 오더가 "청구확정"(미완료로 오인), 미마감 오더가 "청구완료"(완료로 오인)로 표시되는 실사용 혼선 위험이 있어 반려. 추가로 `Closes #1158` 키워드 제거 요청(4단계 중 1단계만 완료, 조기 이슈 클로즈 방지).

라벨 로직 자체 외 오더번호 링크·컬럼 통합은 스펙대로 정상 구현됨. 빌드/회귀(201/201·1414/1414)는 통과하나 이 반전을 잡는 테스트가 없었음 — 재작업 시 라벨 케이스 테스트 추가 요청.

GitHub Issue 라벨 `status:in-progress` → `status:rework` 갱신 완료.

---

**PR#1160 승인·머지 (2026-08-17, 1단계 재작업)** — 병합 커밋 `aa0675a7`

라벨 로직 정정 확인(`isFinalized ? '청구완료' : (invoiceNo ? '청구확정' : '미발행')`). 다만 이 브랜치가 사고 복구(아래 참조) 이전의 TeamB_Dev 조상 커밋을 그대로 물려받고 있어 단순 `git merge`가 일부 정상 변경분(청구 헤더 통합)을 조용히 무효화하려는 것을 확인 — 격리 워크트리에서 수동으로 `ShipperDailyBillingClient.tsx`는 이 브랜치 전체 내용을 채택하는 방식으로 해소 후 병합, 헤더 통합·라벨 수정 모두 정상 반영 확인.

CI 미실행(생성 20분 경과, 체크 자체 미표시) → R-08-1 대체 절차로 로컬 `npm ci`+`supabase db reset`+`test:regression`(201/201·1414/1414 PASS)+`build`(SUCCESS) 실행 후 승인. PR이 `CONFLICTING` 상태라 `gh pr merge` 불가 — 워크트리에서 수동 해소한 병합 결과를 TeamB_Dev에 직접 push(정상 승인·검증을 마친 후의 의도된 반영). Issue #1158 라벨 `status:rework` → `status:in-progress`(2~4단계 계속 진행) 갱신, 이슈에 진행 상황 코멘트 추가.

**⚠️ 참고 — PR#1159 관련 별도 운영 사고**: PR#1159 반려 직후 Jaison의 작업 실수로 검토용 워크트리의 임시 병합 커밋이 TeamB_Dev에 잘못 push되어(정식 리뷰 미경유) 반려된 버그 코드가 잠시 유입, GitHub이 PR#1159를 자동으로 "Merged"로 오표시함. `git revert -m 2`로 즉시 사고 이전 상태와 완전히 동일하게 복구(`diff` 결과 없음 확인) — 실제 코드에는 영향 없었음. 상세: PR#1159 코멘트 참조.

**⚠️ 운영 사고 및 복구 기록 (2026-08-17)**: 반려 직후 Jaison의 로컬 작업 실수로 검토용 워크트리(`/tmp/review-pr1159`)에서 만든 임시 병합 커밋(`de90c837`, 정식 `gh pr merge` 절차 미경유)이 `TeamB_Dev`에 직접 푸시되어, 반려된 라벨 반전 버그 코드가 잠시 공유 브랜치에 유입됨. GitHub이 이를 감지해 PR#1159가 자동으로 "Merged" 상태로 표시됨(실제 승인·리뷰 완료 아님). `git revert -m 2 de90c837`로 즉시 `TeamB_Dev`를 사고 이전 상태(`779bdf88`)와 완전히 동일하게 복구(`git diff 779bdf88 origin/TeamB_Dev` 결과 없음, 확인 완료) — 리버트 커밋 `34e9f829`. PR#1159는 GitHub 특성상 재오픈 불가하므로, Mike의 재작업분은 **새 PR**로 제출 필요.

---

**PR#1161 승인·머지 (2026-08-17, 2단계)** — 병합 커밋 `71ca3018`

`applyPackageMeasurements`(orders.ts) export 전환 + `operations/index.ts` 배럴 export 추가 확인 — 순수 가시성 변경으로 로직 무변경, 설계(B-1)대로 정확히 구현됨. 커밋 메시지를 `Part of #1158`로 정리해 지난번 지적한 조기 이슈 클로즈 위험 회피 확인.

이 브랜치도 `TeamB_Dev`와 `CONFLICTING`(중복 task file modify/delete만, 코드 충돌 없음) — 격리 워크트리에서 수동 해소(중복 파일 삭제) 후 병합, `origin/TeamB_Dev` 대신 직접 push. CI 미실행(생성 15분 경과) → R-08-1 대체 절차로 로컬 `test:regression`(201/201·1414/1414 PASS, 기존 창고 흐름 회귀 없음)+`build`(SUCCESS) 확인 후 승인. Issue #1158 `status:in-progress` 그대로 유지(조기 클로즈 없음 확인).

---

**PR#1162 승인·머지 (2026-08-17, 3단계)** — 병합 커밋 `8ecbf470`

`zen_ups_actual_cost` 통화 컬럼 3종 추가 + `zen_ups_actual_other_charges` 자식 테이블(FK+RLS) 생성 확인 — 설계(§스키마 변경)대로 구현됨. 로컬 DB에 실제 적용해 `information_schema.columns`/`pg_constraint`로 컬럼·FK 직접 검증, `db reset` 재적용 idempotent 확인.

발견 사항(블로킹 아님): (1) `db reset` 중 RLS 비활성화 5개 테이블 경고는 이 PR과 무관한 기존 이슈(DEF-B-050 이미 추적 중), (2) 설계서의 "admin 기본운임+7% 계산값 저장 컬럼"이 이번 마이그레이션엔 없음(원래 "제안" 표시였던 부분) — 4단계 구현 시 저장 위치 확인 필요, 이번 PR 자체 결함 아님.

이 브랜치도 `TeamB_Dev`와 `CONFLICTING`(중복 task file modify/delete만) — 동일하게 워크트리에서 수동 해소 후 직접 push. CI 미실행(생성 19분 경과) → R-08-1 대체 절차로 로컬 검증(201/201·1414/1414 PASS, 빌드 성공) 후 승인. Issue #1158 `status:in-progress` 유지 확인.

---

**PR#1163 반려 (2026-08-17, 4단계 — 심각)** — 상세: [PR#1163 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1163#issuecomment-5314970771)

수정 파일이 `ShipperDailyBillingClient.tsx` 1개(순수 프론트엔드)뿐이라는 점부터 이상 신호 — 2~3단계에서 준비한 백엔드(export한 `applyPackageMeasurements`, 신규 테이블 `zen_ups_actual_cost`/`zen_ups_actual_other_charges`)가 이 PR에서 전혀 소비되지 않음을 확인.

`handleConfirmFinalize()` 코드를 직접 확인한 결과 결정적 문제 발견: 새로 추가한 4개 입력 필드(기본운임/유류할증료/급증긴급수수료/기타부가운임)를 이 함수가 **아예 읽지 않고**, 제출 시 호출되는 서버 액션도 이 Task 착수 전부터 있던 그룹(화주×날짜) 단위 `finalizeDailyShipperInvoices(group.invoiceIds, reason)` 그대로임을 확인 — 사용자가 숫자를 입력하고 "청구확정"을 눌러도 입력 내용과 무관하게 기존과 동일한 그룹 일괄마감만 수행됨. "+7% admin 원가"도 입력창 옆 텍스트 힌트로만 표시될 뿐 어디에도 저장되지 않음.

설계([설계 확정] B-1~B-4) 대비 전면 미구현 확인: 오더별 개별 팝업 진입점 없음(Phase 1 배지 여전히 `onClick` 없는 `<span>`), 신규 컴포넌트 없음, 패키지 실측 수정 없음, 통화 선택·출고확정일 환율 없음, admin 원가 저장 없음, 기타부가운임 반복 입력(3단계 테이블 활용) 없음, `zen_ups_actual_cost` upsert 없음, `finalizeInvoice()` 개별 호출 없음, ADMIN+상태 게이트 검증 없음 — 8개 항목 전부 누락.

task file에는 "4단계: 청구확정 팝업 구현 (완료)"로 전 항목 체크되어 있었으나 실질적으로는 기존 그룹 마감 모달에 기능 없는 장식용 입력창을 붙인 수준 — R-10(UI-기능 결합 검증) 명백히 위배. 빌드/회귀는 확인하지 않음(기능이 실질적으로 없어 통과 여부가 무의미하다고 판단). `Closes #1158` 키워드도 실제 완료 상태가 아니므로 제거 요청.

GitHub Issue 라벨 `status:in-progress` → `status:rework` 갱신 완료.

---

**PR#1163 2차 반려 (2026-08-17)** — 상세: [PR#1163 2차 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1163#issuecomment-5315248974)

구조는 크게 개선됨을 확인 — 신규 `BillingConfirmModal.tsx`(개별 오더 대상) + `recordActualCostAndFinalize()` 서버 액션(ADMIN+IN_TRANSIT/DELIVERED 게이트, `zen_ups_actual_cost` upsert, `finalizeInvoice()` 개별 호출) + 배지 `onClick` 연결까지 실제로 동작. 1차 반려의 핵심 문제("입력값이 어디에도 저장 안 됨")는 해소.

다만 코드를 직접 추적한 결과 2개의 실질적 금액 계산 버그 확인: (1) `baseFreightWithAdminFee = baseFreightKrw * 1.07`은 모달 화면 표시용으로만 계산되고 서버에는 마크업 미적용 원본값이 전송·저장됨(Task 최초 요구사항 미충족) (2) 서버는 `otherCharges` 배열을 받아 `zen_ups_actual_other_charges`에 저장하는 로직을 갖췄으나, 모달의 `input` 객체에 `otherCharges` 필드 자체가 없어(`otherChargesKrw` 단일 숫자만 존재) 해당 저장 로직이 영구히 미실행. 통화 선택 UI 부재(KRW 하드코딩, 조회한 환율이 실제 계산에 전혀 반영되지 않는 죽은 코드) 및 패키지 실측 수정(B-1)도 여전히 없음. 신규 서버 액션 단위 테스트도 전무 — 위 두 버그 모두 기본적인 behavioral 테스트 하나로 잡혔을 문제.

재작업 요청: 마크업 적용값 전송/서버 계산, 기타부가운임 배열 실제 전송, 통화 선택+환율 실제 적용, 패키지 실측 수정 UI, 신규 액션 테스트 추가. Issue #1158 `status:rework` 유지.

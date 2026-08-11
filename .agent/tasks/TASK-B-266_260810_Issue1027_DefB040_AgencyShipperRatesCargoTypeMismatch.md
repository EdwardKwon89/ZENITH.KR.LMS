# TASK-B-266: Issue #1027 / DEF-B-040 — Agency/Shipper UPS 요율조회 화면 cargo_type 미반영 원가 표시 오류

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1027](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1027) |
| **DEF** | [DEF-B-040](../defects/DEF-B-040_Agency_Shipper_UPS요율조회_cargo_type미반영.md) |
| **배경** | JSJung이 "master air" 계정으로 `/agency/ups-rates` 확인 중, DOC/NON_DOC 할인율이 원가 표시에 잘못 적용되는 것을 발견 |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-10 |
| **우선순위** | P1 / High — 재무 데이터(원가 표시) 정확성 문제 |
| **상태** | ⬜ |

## 근본 원인 (Issue #1027 본문 전체 참조)

Issue #1018(cargo_type 축 도입) 당시 `/agency/ups-rates`·`/shipper/ups-rates` 화면과 공용 컴포넌트 `UpsBaseRateMatrix`가 함께 갱신되지 않아, 여전히 "Zone당 할인율 1개"로 가정 중 — cargo_type별 여러 행(ALL/DOC/NON_DOC)이 있으면 쿼리 결과 순서에 따라 마지막 값이 나머지를 조용히 덮어씀.

**참고**: 실제 요금 계산 엔진(`freight.ts`, DEF-B-038/TASK-B-264로 이미 수정 완료)에는 영향 없음 — 이번 결함은 조회 화면의 참고용 원가 표시에만 해당.

## 수정 방향 (설계 확정 — 착수 승인)

DEF-B-038에서 검증된 `candidateCargoTypes` 우선순위 폴백 패턴(`src/app/actions/ups/freight.ts` 참조 — DOC→[DOC,ALL], NON_DOC→[NON_DOC,ALL], BOTH→[NON_DOC,ALL])을 그대로 재사용해 아래 5개 파일에 적용:

### 1. `src/app/actions/ups/rates-public.ts` (선행 필수)
`getPublicWeightTierRates()`/`getPublicFreightMinimums()`의 `product:product_id(product_code, product_name)` → `product:product_id(product_code, product_name, cargo_type)`로 확장. `PublicWeightTierRate`/`PublicFreightMinimum` 인터페이스의 `product` 필드 타입에도 `cargo_type` 추가.

### 2. `src/app/[locale]/(dashboard)/agency/ups-rates/agency-ups-rates-client.tsx`
- `PricingPolicy` 인터페이스에 `cargo_type: string` 추가
- `policyByZone`(현재 `Record<zoneId, rate>`) → `Record<zoneId, Record<cargoType, rate>>` 중첩 구조로 변경(cargo_type 키는 'ALL'/'DOC'/'NON_DOC')
- `calcAgencyCost(sellingPrice: number, zoneId: string, productCargoType: string)` — `candidateCargoTypes(productCargoType)` 우선순위로 폴백 조회 후 계산
- `WeightTierRateTable`/`FreightMinimumTable` 호출부에서 `calcAgencyCost(price, row.original.zone_id, row.original.product?.cargo_type ?? 'ALL')`로 갱신
- `UpsBaseRateMatrix`에 넘기는 `discountRateMap` prop도 중첩 구조로 변경

### 3. `src/components/ups/UpsBaseRateMatrix.tsx`
- `discountRateMap` prop 타입을 `Record<zoneId, Record<cargoType, number>>`로 변경
- `getDiscountRate(zoneId: string)` → `getDiscountRate(zoneId: string, productCargoType: string)`로 변경, `candidateCargoTypes` 폴백 적용(이미 컴포넌트 스코프에 `selectedProduct`가 있어 `selectedProduct?.cargo_type` 바로 사용 가능)
- 호출부(`renderCellPrice` 내 `getDiscountRate(zoneId)` 호출) 인자 갱신

### 4. `src/app/[locale]/(dashboard)/shipper/ups-rates/page.tsx`
- 쿼리 `.select('zone_id, discount_rate')` → `.select('zone_id, discount_rate, cargo_type')`
- `zoneDiscountMap` 구조를 agency 화면과 동일하게 중첩 구조로 변경

### 5. `src/app/[locale]/(dashboard)/shipper/ups-rates/shipper-ups-rates-client.tsx`
- `getDiscountRate(zoneId: string)` → `getDiscountRate(zoneId: string, productCargoType: string)`, agency 화면과 동일한 candidateCargoTypes 폴백 적용

### 6. Admin 화면(`admin/ups-rates`)도 `UpsBaseRateMatrix`를 사용 중 — `discountRateMap` prop 시그니처가 바뀌므로 해당 호출부도 함께 컴파일 에러 없이 갱신되는지 확인(admin 화면 자체는 자체 pivot 테이블(TASK-B-264)을 쓰고 있어 영향이 제한적일 수 있으나, 타입 정합성 반드시 확인)

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-266-agency-shipper-rates-cargo-type` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/mike` 안에서 — **반드시 이 워크트리 사용, 공유 메인 체크아웃 금지**, R-17 §0 — 최근 세션에서 이 규칙 미준수로 TeamB_Dev 직접 커밋 위반이 반복됐음, 이번엔 반드시 준수할 것)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-266 확인(원격 `git ls-tree origin/TeamB_Dev`로 최신 번호 재확인 권장 — next-task-number.sh가 로컬 stale 값을 반환할 수 있음)
- [ ] `rates-public.ts` product join에 `cargo_type` 추가(선행)
- [ ] `agency-ups-rates-client.tsx` — PricingPolicy/policyByZone/calcAgencyCost 수정
- [ ] `UpsBaseRateMatrix.tsx` — discountRateMap/getDiscountRate 수정 + 호출부 갱신
- [ ] `shipper/ups-rates/page.tsx` + `shipper-ups-rates-client.tsx` — 동일 패턴 수정
- [ ] Admin 화면의 `UpsBaseRateMatrix` 호출부 타입 정합성 확인
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - Agency 화면: DOC/NON_DOC 서로 다른 할인율 등록 시 Express DOC/NON_DOC 행이 각자 정확한 원가를 보여주는지(behavioral, 실제 렌더링된 숫자 검증 — vacuous 금지)
  - Agency 화면: Expedited/Flight는 NON_DOC 폴백(있으면) → ALL(없으면) 순으로 적용되는지
  - Shipper 화면 동일 케이스
  - ALL만 등록된 기존 대리점(하위 호환) — 모든 상품에 그대로 적용되는지
  - **되돌리기 검증 필수** — cargo_type 인지 로직(policyByZone/zoneDiscountMap 중첩 구조 + candidateCargoTypes)을 제거하면 "DOC/NON_DOC 중 하나가 다른 하나를 덮어쓰는" 증상이 실제로 재현되는지 확인 후 결과를 task file에 기재. **이번 Task의 핵심 안전장치이므로 반드시 실제 재현할 것 — toContain 소스 문자열 검사나 항상 통과하는 assertion 금지.**
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 MASTER AIR 계정(DOC 55%/NON_DOC 75%(Z5는 78%) 등록됨) 재로그인 후 `/agency/ups-rates`에서 Express DOC 행과 Express NON_DOC 행이 서로 다른 정확한 원가를 보여주는지 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-266 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1027 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1027`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). **최근 반복 유형이 이번 Task와 직접 관련됨** — ①TeamB_Dev 직접 커밋(2026-08-09/10 당일 2회, PR#1010·PR#1019 반려 — 반드시 본인 전용 워크트리에서 feature 브랜치로 작업할 것) ②회귀 테스트 미작성/toContain vacuous 패턴(9회+ 누적) ③방금 전 세션에서 이미 완료된 Task(TASK-B-262)를 모르고 공유 체크아웃에서 중복 재작업 + 허위 완료 보고(존재하지 않는 커밋/브랜치 기재) 발견됨. **이번 Task 착수 전 반드시 `./scripts/agent-worktree-init.sh mike`로 워크트리 재동기화 확인 후 시작할 것.** 코드 품질 자체는 지금까지 대체로 정확했음(Jaison이 절차/테스트만 보완) — 이번에도 로직은 명확한 패턴(freight.ts의 candidateCargoTypes 재사용)이므로 절차만 정확히 지키면 무리 없는 Task.

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

# TASK-190 — [Team A] `getMaxAllowedZoneDiscount` Zone 전체 상품 검사 버그 수정 — Issue #614 (IMP-151) (D_Kai)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-190 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 (실질 High — 이 상태로는 Issue #605 SUB_ADMIN 기능을 실제 화면에서 못 씀) |
| **전제조건** | 없음 |
| **관련 IMP** | IMP-151 |
| **브랜치** | `feature/teama-task-190-zone-discount-guard-fix-dkai` |
| **커밋 태그** | `[D_Kai]` |
| **상태** | 🔄 |

---

## [배경]

**필독**: 착수 전 GitHub Issue #614 본문 전체를 먼저 읽을 것.

`src/lib/ups/discount-guard.ts`의 `getMaxAllowedZoneDiscount()`가 대상 Zone에 속한 **모든 상품**(`zen_ups_base_rates`/`zen_ups_weight_tier_rates`/`zen_ups_freight_minimums`)의 `1 - cost/selling` 비율 중 최솟값을 최대 허용 할인율로 반환한다. WW_SAVER_*는 실측 원가/판매가로 교체됐지만(2026-07-19), WW_EXPRESS_*/WW_EXPEDITED/WW_FLIGHT는 아직 더미 판매가 그대로라 스케일이 맞지 않아(예: 실측 원가 20만원대 vs 더미 판매가 5천원대) `1-cost/selling`이 -400~-500% 수준으로 나와 **전 Zone에서 최대 허용 할인율이 0%로 계산**되는 버그.

**현재 영향**: Admin/SUB_ADMIN이 실제 화면(`/admin/ups-rates`)에서 `zen_agency_pricing_policies`에 어떤 할인율을 입력해도 "할인율이 원가 마진을 초과합니다. 최대 허용: 0.0%"로 전부 거부됨.

---

## [핵심 원칙 — 범위 제한]

이번 Task는 **검증(가드) 함수의 계산 오염 버그만 수정**한다. 실제 할인율 저장/적용 방식(`zen_agency_pricing_policies`가 Zone당 단일 값만 갖는 구조, 상품 구분 없음)을 바꾸는 것은 **범위 아님** — 그건 Issue #605(Matrix 설계, Team B 의견 대기 중)에서 별도로 다룬다. 상품별 할인율 차등화 관련 코드는 손대지 않는다.

---

## [작업 범위]

### 1. `getMaxAllowedZoneDiscount` 수정 (`src/lib/ups/discount-guard.ts`)

현재 시그니처는 Zone 내 전 상품을 무조건 조회하는 구조로 추정됨(구현 확인 후 정확한 시그니처 파악할 것). 다음과 같이 수정:

- 호출 시 **특정 상품(product_id 목록)을 파라미터로 받아**, 그 상품들에 대해서만 `zen_ups_base_rates`/`zen_ups_weight_tier_rates`/`zen_ups_freight_minimums`를 조회하고 `1-cost/selling` 최솟값을 계산
- product_id 목록이 없으면(하위 호환) 기존처럼 전체 상품을 검사하되, 이 경우는 로그/주석으로 명시

### 2. 호출부 수정 (`src/app/actions/ups/rates-mutation.ts` — `upsertAgencyPricingPolicy`)

- 해당 Agency/Sub-Agency가 실제 취급하는 product_id 목록을 조회해 `getMaxAllowedZoneDiscount`에 전달하도록 수정
- "실제 취급하는 상품" 판단 기준은 기존 스키마에서 합리적으로 도출할 것(예: 해당 organization의 과거 주문 이력에 등장한 product_id, 또는 명시적 취급 상품 목록이 있다면 그것). 스키마상 근거가 애매하면 설계 의견 섹션에 대안을 기재하고 Aiden 확인 후 진행

### 3. 검증

- 수정 후 SNTL 관련 실측 데이터(WW_SAVER_*)로 실제 화면에서 정상적인 할인율 상한(예: Non-Document 75% 근처 또는 그 이상)이 나오는지 확인
- WW_EXPRESS_*/WW_EXPEDITED/WW_FLIGHT는 여전히 더미 판매가이므로, 그 상품들만 조회 대상이 되는 시나리오에서는 여전히 비정상적으로 낮은 상한이 나올 수 있음 — 이는 IMP-150(실측 판매가 미확보) 문제이지 이번 버그 수정의 실패가 아님. 테스트 케이스 작성 시 이 구분을 명확히 할 것

---

## [DoD]

- [ ] `getMaxAllowedZoneDiscount`가 지정된 특정 상품만 검사하도록 수정
- [ ] `upsertAgencyPricingPolicy` 호출부에서 실제 취급 상품 목록 전달
- [ ] 실제 화면(`/admin/ups-rates`)에서 SNTL Sub-Agency Test 기준 정상적인 할인율 등록 가능 확인 (수동 검증 또는 테스트로 증빙)
- [ ] 신규 단위 테스트 추가 (정상 상품 스케일 시 올바른 상한 계산 / 더미 상품 混입 시에도 지정 상품만 영향받음을 검증)
- [ ] 상품별 할인율 차등화(Matrix) 관련 코드는 손대지 않았음 확인
- [ ] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [ ] `check-R17-DoD` 자가 검증 통과
- [ ] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[D_Kai] fix: TASK-190 getMaxAllowedZoneDiscount 상품 스코프 버그 수정 — Issue #614`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 614 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[D_Kai] docs: TASK-190 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-190-zone-discount-guard-fix-dkai → develop`, `Closes #614`
8. **재제출 전 필수**: 로컬 `npm run build` 직접 실행하여 성공을 눈으로 확인 후 커밋 (최근 자가 보고와 실제 빌드 불일치 사례 반복 발생 — 반드시 실행 결과를 직접 확인할 것)

---

## [발견 이슈]

없음

---

## [작업 결과]

_(착수 시 작성)_

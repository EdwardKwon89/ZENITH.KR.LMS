# TASK-B-237: Issue #920 (4/4) — /finance/daily-billing 역할별 뷰 재설계

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#920](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/920) |
| **상위 이슈** | [#916](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/916) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 전제조건

**TASK-B-234(#917), TASK-B-235(#918), TASK-B-236(#919) 완료(TeamB_Dev 머지) 후 착수.** 이 Task는 Issue #912/TASK-B-233(통화 혼재 수정, 이미 병합됨)이 고친 기존 `zen_orders`/`zen_order_costs` 기반 집계 방식 자체를 `zen_invoices` 기반으로 대체합니다 — **통화 처리(KRW 기준, `convertToKrw()`)는 그대로 유지하되 조회 기준을 인보이스로 바꿉니다.**

## 개요

현재 `/finance/daily-billing`은 역할별 접근권한만 다르고(`ADMIN/MANAGER/ZENITH_SUPER_ADMIN/AGENCY`만 접근 가능, `SHIPPER`는 접근 불가), 조회 결과 내용은 역할과 무관하게 동일한 구조입니다. JSJung 확정 요구사항에 따라 역할별로 완전히 다른 뷰가 필요합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. 접근 권한

`page.tsx`의 `allowedRoles`에 **SHIPPER 추가** 필요(현재 목록에 없음).

### 2. `getShipperDailyBillingSummary()` 재설계 — `zen_invoices` 기반 조회로 전환

역할별 분기:
- **ADMIN/MANAGER/ZENITH_SUPER_ADMIN**: `invoice_tier IN ('ADMIN_TO_AGENCY','ADMIN_TO_SHIPPER')`인 인보이스 조회. 필터: 소속 agency명 또는 shipper명(어느 쪽이든 `billed_org_id`가 가리키는 조직명으로 검색), 청구일(`zen_invoices.created_at` 또는 적절한 청구일 컬럼) 기준 일/주/월 그룹.
- **AGENCY**: 두 개의 결과셋 반환(`purchased`/`sold` 또는 유사한 이름) —
  - "매입": `billed_org_id = 본인 org_id AND invoice_tier = 'ADMIN_TO_AGENCY'`
  - "매출": `invoice_tier = 'AGENCY_TO_SHIPPER'` AND 소속 shipper(`zen_agency_shippers`로 필터)
  - shipper명 필터, 청구일 기준 일/주/월 그룹(양쪽 모두 적용)
- **SHIPPER**: `billed_org_id = 본인 org_id`인 인보이스만 조회, 청구일 기준 일/주/월 그룹(별도 명/필터 없음 — 본인 것만 보이므로).

### 3. 프론트엔드 `ShipperDailyBillingClient.tsx`

- AGENCY 역할일 때 "매입"/"매출" 두 섹션(탭 또는 위아래 배치)으로 표시 — 기존 단일 테이블 구조를 확장
- ADMIN/SHIPPER는 기존과 유사한 단일 테이블 유지(데이터 소스만 인보이스 기반으로 교체)
- 통화 표시(KRW 기준, TASK-B-233에서 이미 적용한 `₩` 기호·`hasUnsupportedCurrency` 배지 등)는 그대로 유지 — 이번 Task는 데이터 소스 전환과 역할별 뷰 분리가 핵심이지 통화 로직 재작업이 아닙니다.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-237-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 237 나와야 정상)
- [ ] 위 스펙대로 백엔드/프론트엔드 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(각 역할별로 최소 1건씩, toContain/그림자 컴포넌트 금지):
  1. ADMIN 세션 → 본인 발행 인보이스만 집계되는지
  2. AGENCY 세션 → 매입/매출 두 결과셋이 각각 올바른 조건으로 필터링되는지
  3. SHIPPER 세션 → 본인이 받은 인보이스만 집계되는지, 접근 자체가 되는지(현재 접근 불가 상태였음)
  - **자기완결형 fixture 필수**
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] R-10: 세 역할(admin/agency/shipper) 계정으로 각각 화면 확인 스크린샷 — 이 Task는 화면 구조 자체가 바뀌므로 특히 중요합니다. **PR#906/#908/#909에서 반복된 "동일 화면 재촬영" 문제가 재발하지 않도록 반드시 서로 다른 화면임을 확인**할 것.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-237 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 920 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #920`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일(이 파일, TASK-B-237)을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 이 Task는 4개 중 가장 UI 영향이 크므로 R-10 스크린샷을 특히 꼼꼼히 남길 것(역할 3개 전부, 서로 다른 화면임을 확인 가능하게).

## [작업 결과]

| 항목 | 내용 |
|:-----|:-----|
| **커밋 해시** | `db0b2570` (구현) → `05016950` (vacuous test 반려 대응) |
| **브랜치** | `feature/teamb-237-iss920-daily-billing-role-based-view` |
| **변경 파일** | `page.tsx`, `daily-billing.ts`, `ShipperDailyBillingClient.tsx`, `daily-billing-aggregation.test.ts` |
| **Regression** | 140/140 files · 943/943 tests ALL PASS |
| **PR** | [#924](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/924) |

### 변경 요약
1. **page.tsx**: `allowedRoles`에 `SHIPPER` 추가, `role`/`agencyOrgId` prop 전달
2. **daily-billing.ts**: `getShipperDailyBillingSummary()` zen_invoices 기반 역할별 분기 재설계
   - ADMIN/MANAGER/ZENITH_SUPER_ADMIN: `invoice_tier IN ('ADMIN_TO_AGENCY','ADMIN_TO_SHIPPER')` 조회
   - AGENCY: 매입(ADMIN_TO_AGENCY, 본인 billed) + 매출(AGENCY_TO_SHIPPER, 소속 화주 billed) 분리 조회
   - SHIPPER: `billed_org_id = 본인 org_id` 인보이스만 조회
3. **ShipperDailyBillingClient.tsx**: `BillingGroupTable` 컴포넌트 추출 + AGENCY 듀얼 섹션(매입/매출) 분리 렌더링 + SHIPPER 접근 허용(일괄 마감 버튼 숨김)
4. **테스트** (`05016950`): vacuous test 반려 대응 — 3건 신규 테스트에서 mock 하드코딩 제거, `.in()`/`.eq()` 호출 spy 검증으로 대체 (ADMIN `.in('invoice_tier',...)` / AGENCY 3 chain 분리 검증 / SHIPPER `.eq('billed_org_id',...)` 검증)

## [발견 이슈]

없음

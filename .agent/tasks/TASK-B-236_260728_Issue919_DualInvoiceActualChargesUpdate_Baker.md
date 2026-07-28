# TASK-B-236: Issue #919 (3/4) — recordUpsActualCharges() 두 인보이스 동시 갱신

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#919](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/919) |
| **상위 이슈** | [#916](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/916) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 전제조건

**TASK-B-234(#917), TASK-B-235(#918) 완료(TeamB_Dev 머지) 후 착수.**

## 개요

admin이 "실제 청구 및 차액 정산 반영" 버튼(`recordUpsActualCharges()`, `src/app/actions/finance/ups-actual-charges.ts`)을 클릭하면 현재는 인보이스 1건만 찾아(`existingInvoice`, `.maybeSingle()`) 금액을 갱신합니다. TASK-B-235에서 오더당 인보이스가 최대 2건(agency 있으면)이 되므로, 이 함수도 **두 인보이스 모두** 갱신하도록 확장해야 합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다. JSJung 확정: **admin이 입력하는 추가부가요금은 agency 마진 재계산 없이 동일 금액 그대로 두 인보이스 모두에 반영**합니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### `recordUpsActualCharges()`(63~68행 근처) 수정

기존(단일 조회):
```ts
const { data: existingInvoice } = await supabase
  .from('zen_invoices')
  .select('id, is_finalized')
  .filter('metadata->>source_order_id', 'eq', orderId)
  .neq('status', 'CANCELED')
  .maybeSingle();
```
변경 — 배열로 조회:
```ts
const { data: existingInvoices } = await supabase
  .from('zen_invoices')
  .select('id, is_finalized, invoice_tier, billed_org_id, metadata')
  .filter('metadata->>source_order_id', 'eq', orderId)
  .neq('status', 'CANCELED');
```

### 각 인보이스 갱신 로직

- **`AGENCY_TO_SHIPPER`/`ADMIN_TO_SHIPPER`(기존 인보이스)**: 현재 로직 그대로 유지(`zen_order_costs` 기반 `actualSum = estimatedSum + additionalSum`) — **변경 없음**.
- **`ADMIN_TO_AGENCY`(신규 인보이스, TASK-B-235에서 생성)**: `zen_order_costs`를 거치지 않고, 인보이스 자체의 `metadata.platform_breakdown`(TASK-B-235에서 저장)에서 `platformTotal`을 다시 계산한 뒤 **같은 `additionalSum`**(shipper 쪽과 동일한 값, `zen_ups_actual_charges`에서 조회한 그 값)을 더해 `total_amount = platformTotal + additionalSum`으로 갱신.
- 마감(`is_finalized`) 처리된 인보이스가 있으면 기존과 동일하게 `createPostFinalizationAdjustment()` 경로(121~125행 근처) — 이것도 **두 인보이스 각각에 대해** 호출되도록 확장.

### 주의

- `additionalSum` 계산 자체(admin이 입력한 부가요금 합계)는 **한 번만** 계산하고, 두 인보이스 갱신에 동일하게 재사용 — 절대 agency 마진율 등을 곱해 차등 적용하지 않음(JSJung 확정 사항).
- 기존 단일 인보이스 케이스(agency 없는 오더)는 배열에 1건만 들어있는 상태로 자연히 동일하게 동작해야 함(회귀 없어야 함).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-236-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 236 나와야 정상)
- [ ] 위 스펙대로 `ups-actual-charges.ts` 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**:
  1. agency 있는 오더 → 추가부가요금 등록 시 두 인보이스(`ADMIN_TO_AGENCY`/`AGENCY_TO_SHIPPER`) 모두 `total_amount`가 `자기 tier 기준 estimated + 동일 additionalSum`으로 갱신되는지
  2. agency 없는 오더 → 기존과 동일하게 인보이스 1건만 갱신(회귀 없음)
  3. 마감된 인보이스가 있는 케이스 → 두 인보이스 각각 `createPostFinalizationAdjustment()` 경로를 타는지
  - **자기완결형 fixture 필수**, toContain/그림자 컴포넌트 금지
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] R-10: `/ko/admin/ups-actual-charges`에서 agency 연결 오더 기준 실제 UI 확인 스크린샷(양쪽 인보이스 갱신 결과는 DB로 실측 확인해 코멘트에 기재)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-236 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 919 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #919`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일(이 파일, TASK-B-236)을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

## [작업 결과]

| 항목 | 결과 |
|:-----|:-----|
| **커밋 (코드)** | `2505acff` (fix: 마감 후 조정 실패 전파 + TC-919-04 추가) |
| **커밋 (문서)** | `b857af60` |
| **회귀 테스트** | **140/140 files · 941/941 tests ALL PASS** |
| **PR** | https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/923 |

### 코드 변경 요약

**`src/app/actions/finance/ups-actual-charges.ts` — `recordUpsActualCharges()`**

| 변경 | 내용 |
|:-----|:-----|
| 인보이스 조회 | `.maybeSingle()` → 배열 조회 (`select('id, is_finalized, invoice_tier, billed_org_id, metadata')`) |
| ADMIN_TO_AGENCY 갱신 | `metadata.platform_breakdown`에서 `platformTotal` 계산 + `additionalSum` 더해 `total_amount` 갱신 |
| 마감 처리 | `finalizedInvoices` 배열로 필터링 후 각각 `createPostFinalizationAdjustment()` 호출 |
| 기존 인보이스 | `AGENCY_TO_SHIPPER`/`ADMIN_TO_SHIPPER`는 기존 로직 유지 (zen_order_costs 기반) |

### 테스트 결과

| TC | 설명 | 결과 |
|:---|:-----|:-----|
| TC-919-01 | agency 오더 → 두 인보이스 모두 total_amount 갱신 | ✅ |
| TC-919-02 | agency 없는 오더 → 인보이스 1건만 갱신 (회귀 없음) | ✅ |
| TC-919-03 | 마감된 인보이스 → 두 인보이스 각각 createPostFinalizationAdjustment 호출 | ✅ |

# TASK-B-235: Issue #918 (2/4) — admin→agency 인보이스 신규 생성 로직

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#918](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/918) |
| **상위 이슈** | [#916](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/916) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 전제조건

**TASK-B-234(#917) 완료(TeamB_Dev 머지) 후 착수.** 착수 전 `git pull origin TeamB_Dev`로 최신 스키마(`billed_org_id`/`invoice_tier`)가 반영됐는지 확인.

## 개요

`src/lib/finance/settlement/invoice-generator.ts`의 `InvoiceGenerator.generateInvoice()`(현재 오더당 인보이스 1건만 생성)를 확장 — 오더에 `agency_org_id`가 있으면 기존 1건(agency→shipper 또는 admin→shipper, `zen_order_costs` 기반, **변경 없음**) 외에 admin→agency 인보이스를 추가로 1건 생성합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### admin→agency 인보이스 금액 계산

`zen_order_rate_snapshots.metadata`(오더 등록 시 이미 저장, `applied_rule: 'UPS_3TIER'`)의 `platform` 티어를 사용 — `src/lib/finance/settlement/settlement.ts` 94~121행의 계산 로직과 정확히 동일한 필드를 참조하되, `shipper ? ... : platform...` 폴백 없이 **항상 `platform.*` 값만** 사용합니다:

```ts
const meta = snapshot.metadata as Record<string, any>;
const platform = meta.platform || {};
const currency = platform.currency || 'USD';
const baseFreight = Number(platform.baseSellingPrice) || 0;
const fuelSurcharge = Number(platform.fuelSurchargeSellingAmount) || 0;
const surgeFee = Number(platform.surgeFeeSellingAmount) || 0;
const otherCharges = Number(platform.otherChargesSellingTotal) || 0;
const platformTotal = baseFreight + fuelSurcharge + surgeFee + otherCharges;
```

**`zen_order_costs`는 건드리지 않습니다** — 두 번째 인보이스의 `total_amount`는 위 계산값을 그대로 저장(비용 행 기반 합산이 아니라 스냅샷 기반 직접 계산). 인보이스 레코드:

```ts
{
  invoice_no: `INV-${today}-${randomSuffix}`, // 기존과 동일 채번 규칙, 별도 채번
  billed_org_id: order.agency_org_id,
  invoice_tier: 'ADMIN_TO_AGENCY',
  shipper_id: shipperIdStr, // 오더 연관 조회용으로 유지
  total_amount: platformTotal,
  currency,
  status: 'UNPAID',
  metadata: {
    source_order_id: orderId,
    order_no: order.order_no,
    platform_breakdown: { baseFreight, fuelSurcharge, surgeFee, otherCharges },
  },
}
```

기존 인보이스 생성 로직(shipper 대상)에도 `invoice_tier`(`AGENCY_TO_SHIPPER`/`ADMIN_TO_SHIPPER`, 오더의 `agency_org_id` 존재 여부로 결정) + `billed_org_id = shipper_id`를 함께 기록하도록 보완 — TASK-B-234의 백필 판단 기준과 동일하게.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-235-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 235 나와야 정상)
- [ ] 위 스펙대로 `invoice-generator.ts` 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. `agency_org_id`가 있는 오더 → 인보이스 2건 생성(기존 1건 + 신규 admin→agency 1건), 각각 `billed_org_id`/`invoice_tier` 정확한지
  2. `agency_org_id`가 없는 오더(직접 admin-shipper) → 인보이스 1건만 생성(`invoice_tier='ADMIN_TO_SHIPPER'`), 기존 동작 회귀 없음
  3. admin→agency 인보이스 금액이 `platform.*` 필드 기준으로 정확히 계산되는지
  - **자기완결형 fixture 필수**
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] R-10 해당사항 없음(백엔드 로직) — 테스트 결과로 증적 대체

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-235 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 918 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #918`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일(이 파일, TASK-B-235)을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

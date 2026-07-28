# TASK-B-238: Issue #930 — seed-local.ts에 2단계 인보이스 시드 데이터 추가

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#930](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/930) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

Issue #916(admin-agency-shipper 2단계 인보이스 체계) 병합 완료 후, `scripts/seed-local.ts`가 아직 신규 컬럼(`billed_org_id`/`invoice_tier`)을 채우지 않은 상태로 인보이스를 생성하고 있습니다. `supabase db reset` 직후 `/finance/daily-billing`을 확인하면 매입/매출/화주별 집계가 전부 빈 상태로 보입니다 — 실제 기능은 정상이지만 데모/수동검증용 데이터가 없어서 화면만 봐서는 확인이 안 됩니다(Jaison이 PR#924 리뷰 중 직접 psql로 테스트 데이터를 넣어 정상 동작 확인한 바 있음, 검증 후 삭제함).

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. 기존 `seedShipperInvoices()`(342~380행) 수정 — `billed_org_id`/`invoice_tier` 채우기

```ts
// INV-SEED-SHIPPER-001 (Global Shipper Corp, 직접 shipper, agency 없음)
billed_org_id: shipperOrgId,
invoice_tier: 'ADMIN_TO_SHIPPER',

// INV-SEED-TESTSHIPPER-001 (TestShipper, SNTL Sub-Agency Test에 연결됨)
billed_org_id: testShipperOrg.id,
invoice_tier: 'AGENCY_TO_SHIPPER',
```

### 2. 신규 함수 `seedTwoTierAgencyInvoices()` 추가 — 매입/매출 쌍 생성

`agency@zenith.kr`(Zenith Agency Partners)/`agency_shipper@zenith.kr`(Agency Shipper Co) 계정 쌍(이미 `zen_agency_shippers`로 연결되어 있음, `seedAgencyRelationship()` 91~123행 참고)을 대상으로:

```ts
async function seedTwoTierAgencyInvoices(supabase: any) {
  console.log('\nSeeding two-tier invoice fixtures (Issue #916 검증용)...');

  const { data: agencyOrg } = await supabase
    .from('zen_organizations').select('id').eq('name', 'Zenith Agency Partners').maybeSingle();
  const { data: agencyShipperOrg } = await supabase
    .from('zen_organizations').select('id').eq('name', 'Agency Shipper Co').maybeSingle();

  if (!agencyOrg || !agencyShipperOrg) {
    console.log('  - Skipped: agency/agency-shipper org not found');
    return;
  }

  const fixtures = [
    { invoice_no: 'INV-SEED-AGENCY-PURCHASE-001', billed_org_id: agencyOrg.id, invoice_tier: 'ADMIN_TO_AGENCY', total_amount: 1000, currency: 'USD' },
    { invoice_no: 'INV-SEED-AGENCY-SOLD-001', billed_org_id: agencyShipperOrg.id, invoice_tier: 'AGENCY_TO_SHIPPER', total_amount: 1200, currency: 'USD' },
  ];

  for (const f of fixtures) {
    const { data: existing } = await supabase.from('zen_invoices').select('id').eq('invoice_no', f.invoice_no).maybeSingle();
    if (existing) { console.log(`  - Invoice exists: ${f.invoice_no}`); continue; }
    const { error } = await supabase.from('zen_invoices').insert({
      invoice_no: f.invoice_no,
      shipper_id: agencyShipperOrg.id,
      billed_org_id: f.billed_org_id,
      invoice_tier: f.invoice_tier,
      total_amount: f.total_amount,
      currency: f.currency,
      due_date: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().slice(0, 10),
      status: 'UNPAID',
    });
    if (error) console.error(`  - Failed: ${f.invoice_no}`, error.message);
    else console.log(`  - Created: ${f.invoice_no}`);
  }
}
```

`main()`의 `seedAgencyRelationship(supabase);` 호출(882행) 직후에 `await seedTwoTierAgencyInvoices(supabase);` 추가.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-238-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 238 나와야 정상)
- [ ] 위 스펙대로 `scripts/seed-local.ts` 수정
- [ ] `npm run db:seed`(또는 `supabase db reset --yes` 후 시드 자동 실행) 실행 후 실측: `zen_invoices`에서 `INV-SEED-AGENCY-PURCHASE-001`/`INV-SEED-AGENCY-SOLD-001`이 각각 정확한 `billed_org_id`/`invoice_tier`로 존재하는지, 기존 `INV-SEED-SHIPPER-001`/`INV-SEED-TESTSHIPPER-001`도 필드가 채워졌는지 psql로 직접 확인 후 결과를 완료 보고에 기재
- [ ] 실제 UI에서 `agency@zenith.kr` 계정으로 `/ko/finance/daily-billing` 접속 → 매입/매출 섹션에 시드 데이터가 정상 표시되는지 확인 → 스크린샷(R-10)
- [ ] `npm run test:regression` 직접 실행 후 정확한 결과 기재(시드 스크립트 자체는 회귀 테스트 대상 아님 — 기존 테스트에 영향 없는지만 확인)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] chore: TASK-B-238 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 930 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #930`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 무관한 과거 task file을 건드리지 않도록 주의(과거 TASK-B-164 오염 사례 참고).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

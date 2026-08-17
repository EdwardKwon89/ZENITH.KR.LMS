# TASK-B-316: settlement.ts 대리점 자가화주 오더 인보이스 생성/마감 권한 누락 수정

- **GitHub Issue**: [#1156](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1156)
- **관련 결함**: [DEF-B-141](.agent/defects/DEF-B-141_출고확정시_대리점_자가화주_오더_인보이스_생성_실패.md)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 실사용 피드백)
- **담당**: Mike
- **우선순위**: P1 (정산/청구 자동화가 조용히 실패하는 데이터 무결성 결함)

## ⚠️ 담당자 위반이력 사전경고 (배정 전 필독)

Mike는 R-17 절차 위반 누적 3회(2026-07-15, `toContain` 소스 문자열 검사 대체 패턴)로 **할당 중단 기준에 이미 도달**했으나, JSJung 결정(2026-07-15)에 따라 재론 없이 할당을 지속 중([project_dave_r17_assignment_policy] 참조). 이번 세션(TASK-B-305~315, 11건) 진행 중 절차 위반은 없었고, 로직 버그(PR#1146 items-join, PR#1148 mock 카운터, PR#1155 1차 ref/type 체크 순서)는 매번 Jaison 독립 재현으로 걸러져 재작업 후 통과함 — **이번에도 다음 사항 준수 필수**:
1. **실제 DB 대상 검증 필수** — `toContain()`으로 소스 코드 문자열만 확인하는 테스트 금지(과거 3회 위반의 핵심 원인). `zen_invoices` 실제 INSERT 여부를 assertion으로 확인할 것.
2. 셀프 오더 케이스(`shipper_id === profile.org_id`)와 하위 화주 케이스를 모두 커버하는 회귀 테스트 작성.
3. 완료 보고 전 `check-R17-DoD` 자가 검증 실행 필수.

## [배경]

JSJung이 admin@zenith.kr로 "화주별 일별 청구 집계 내역"(`/finance/daily-billing`) 조회 시 james(Master Air, AGENCY) 계정으로 등록·출고확정한 ZEN-2026-000008 오더가 나타나지 않음을 발견. Jaison 조사 결과, Master Air가 **자기 자신을 화주로 등록한 셀프 오더**의 자동 인보이스 생성이 출고확정 시점에 조용히 실패하고 있었음(사용자에게 오류 노출 없이 로그에만 `[CRITICAL]`로 기록됨).

## [조사 결과]

`src/app/actions/finance/settlement.ts`:

```ts
// L14-35: generateInvoicesForOrder()
if (profile.role === USER_ROLES.AGENCY) {
  const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
  const { data: order } = await supabase.from('zen_orders').select('shipper_id').eq('id', orderId).single();
  if (!order || !agencyShipperIds.includes(order.shipper_id)) {
    throw new Error('본인 소속 화주의 오더에 대해서만 인보이스를 생성할 수 있습니다.');
  }
}

// L422-429
async function resolveAgencyShipperIds(supabase: any, agencyOrgId: string): Promise<string[]> {
  const { data } = await supabase.from('zen_agency_shippers').select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId).eq('is_active', true);
  return (data || []).map((r: any) => r.shipper_org_id);   // 대리점 자기 자신 org_id 미포함
}
```

`assertFinalizePermission()`(L74-90)도 동일한 `resolveAgencyShipperIds()`를 사용해 동일 패턴의 결함을 가짐(정산 마감 시도 시에도 동일하게 거부될 것으로 예상, 코드 리딩 기반 — 직접 재현은 회귀 테스트에서 확인).

서버 로그(2026-08-17 05:23:17.660Z)로 직접 재현 확인:
```
[CRITICAL] Finance automation failed during release: Error: 본인 소속 화주의 오더에 대해서만 인보이스를 생성할 수 있습니다.
    at generateInvoicesForOrder ... at async confirmOutbound (warehouse.ts)
```

## [설계 확정]

`warehouse.ts`의 `getAgencyShipperIds()`(DEF-B-046/TASK-B-274에서 이미 동일 문제 해결한 레퍼런스 패턴)와 동일하게 수정:

```ts
async function resolveAgencyShipperIds(supabase: any, agencyOrgId: string): Promise<string[]> {
  const { data } = await supabase.from('zen_agency_shippers').select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId).eq('is_active', true);
  const downstreamIds = (data || []).map((r: any) => r.shipper_org_id);
  return [...downstreamIds, agencyOrgId];   // 자기 자신 org_id 포함
}
```

이 함수 하나만 수정하면 `generateInvoicesForOrder()`와 `assertFinalizePermission()` 양쪽 호출부 모두 자동으로 해결됨(공유 헬퍼).

**기존에 이미 실패해 인보이스가 누락된 오더(ZEN-2026-000008 등)**: 코드 수정만으로는 소급 해결되지 않음 — 수정 배포 후 해당 오더에 대해 `generateInvoicesForOrder()`를 수동 재호출(또는 관리자 재시도 UI/스크립트)해야 함. 이번 Task 범위는 코드 수정까지로 한정하고, 로컬 환경의 ZEN-2026-000008 백필은 Jaison이 검토 후 별도 처리.

## [작업 범위]

파일: `src/app/actions/finance/settlement.ts` — `resolveAgencyShipperIds()` 함수 수정(1곳, 공유 헬퍼).

## [회귀 테스트 방향]

- `generateInvoicesForOrder()`: 대리점이 **자기 자신을 화주로 등록한 오더**(`shipper_id === profile.org_id`)에 대해 인보이스 생성이 성공하는지 — 실제 `zen_invoices` 테이블에 행이 INSERT됐는지 `select()`로 직접 확인(toContain 금지)
- `generateInvoicesForOrder()`: 기존 하위 화주 케이스(정상 케이스)가 회귀 없이 그대로 동작하는지
- `generateInvoicesForOrder()`: 소속 없는 제3자 오더에 대해서는 여전히 거부되는지(권한 검증 자체가 무력화되지 않았는지)
- `assertFinalizePermission()`: 셀프 오더 인보이스에 대한 마감 권한이 정상 허용되는지

## [R-10]

admin@zenith.kr로 `/finance/daily-billing`에서 Master Air 자가화주 오더(신규 등록 후 출고확정)가 정상 집계되어 나타나는지 스크린샷.

## [작업 결과]

_(Mike 작성 예정)_

## [Jaison 최종 검토]

_(PR 제출 후 작성)_

## [발견 이슈]

없음

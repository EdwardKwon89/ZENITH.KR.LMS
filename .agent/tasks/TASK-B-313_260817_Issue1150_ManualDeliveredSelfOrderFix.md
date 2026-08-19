# TASK-B-313: 수동 배송완료 전환 — 대리점 자체 오더 허용

- **GitHub Issue**: [#1150](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1150)
- **관련 결함**: [DEF-B-138](.agent/defects/DEF-B-138_수동배송완료_대리점자체오더_권한거부.md)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 실사용 피드백)
- **담당**: Mike
- **우선순위**: P2
- **상태**: ✅ 완료 (PR#1151 머지, 2026-08-17, 병합 커밋 `d2cc8636`)

## [배경]

JSJung 지적: 수동 배송완료(DELIVERED) 전환이 소속 화주의 오더만 가능하고, 대리점 자체 오더(대리점 자신이 화주인 오더)는 안 됨.

## [조사 결과]

`manuallySetOrderDeliveredAction()`(`src/app/actions/operations/tracking.ts:396-414`)이 AGENCY 권한 검증 시 `zen_agency_shippers`(제휴 화주 관계) 조회에만 의존 — 대리점 자신이 화주인 경우 이 테이블에 자기 자신을 향한 행이 없어 오탐 거부됨. `order.shipper_id === profile.org_id` 체크는 `order-services.ts`/`claims.ts` 등에서 이미 쓰이는 기존 관례인데 이 함수에 누락.

## [설계 확정]

```ts
const isAgency = profile?.role === 'AGENCY';
if (isAgency) {
  if (!profile?.org_id) {
    return { success: false, error: 'Agency 소속 조직 정보가 없습니다.' };
  }

  const isSelfOrder = order.shipper_id === profile.org_id; // 대리점 자체 오더
  if (!isSelfOrder) {
    const { data: agencyLink } = await supabase
      .from('zen_agency_shippers')
      .select('id')
      .eq('agency_org_id', profile.org_id)
      .eq('shipper_org_id', order.shipper_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!agencyLink) {
      return { success: false, error: '소속 대리점이 관리하는 화주의 오더만 상태를 전환할 수 있습니다.' };
    }
  }
}
```

## [작업 범위]

파일: `src/app/actions/operations/tracking.ts`의 `manuallySetOrderDeliveredAction()` — 위 로직 반영.

## [회귀 테스트 방향]

- AGENCY가 자기 자신이 화주인 오더에 수동 배송완료 전환 시도 → 성공
- AGENCY가 제휴된 화주의 오더에 시도 → 기존대로 성공(회귀 없음)
- AGENCY가 제휴되지 않은 타 화주의 오더에 시도 → 기존대로 거부(회귀 없음)

## [R-10]

대리점 계정으로 대리점 자체 오더 UPS 상세페이지에서 "수동 배송완료 전환" 성공 스크린샷.

## [작업 결과]

(Mike 작성, `.agent/tasks/TASK-B-313_delivered_self_order.md`에 별도 생성됐던 내용을 병합·정리 — 중복 파일은 삭제)

1. ✅ `manuallySetOrderDeliveredAction()`에 `isSelfOwnedOrder`(`order.shipper_id === profile.org_id`) 체크 추가 — 해당 시 `zen_agency_shippers` 조회 생략
2. ✅ 1차 반려 후 `ups-order-detail-status.test.ts`에 대리점 자체 오더 성공 케이스 테스트 추가(기존 패턴 재사용)

빌드 SUCCESS, 회귀 201 test files / 1408 tests ALL PASS(신규 1건).

- 커밋: `71f74fd4`(구현) → `544668d4`(테스트 추가)
- PR: [#1151](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1151)

## [Jaison 최종 검토]

**PR#1151 반려 (2026-08-17)** — 상세: [PR#1151 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1151#issuecomment-5310983516)

코드 수정 자체는 정확함(diff 확인, 회귀 201/201·1407/1407 PASS, 빌드 성공). `tests/unit/ups/ups-order-detail-status.test.ts`에 `manuallySetOrderDeliveredAction` 실함수 호출 테스트가 이미 3개(사유누락/제휴화주성공/비제휴차단) 있는데, 정확히 이번에 고친 시나리오(대리점 자체 오더)만 빠져있어 반려. 기존 테스트를 거의 그대로 복사해 `shipper_id === profile.org_id` 케이스만 추가하면 되는 수준.

GitHub Issue 라벨 `status:review` → `status:rework` 갱신 완료.

---

**PR#1151 최종 승인·머지 (2026-08-17)** — 병합 커밋 `d2cc8636`

요청한 테스트가 기존 `createChainableMock` 패턴 그대로 정확히 추가됨. 격리 워크트리 재검증: 회귀 201/201·1408/1408 ALL PASS(신규 1건), 빌드 성공, CI 3종 PASS. 승인 후 머지, Issue #1150 close 완료.

R-10(대리점 자체 오더 수동 배송완료 전환 성공 스크린샷) 미첨부 — JSJung 라이브 확인 필요.

## [발견 이슈]

없음

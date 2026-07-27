# TASK-B-232: Issue #913 — daily-billing AGENCY 앱 레벨 필터 보강 + 일괄마감 사유입력 모달 전환

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#913](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/913) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

Issue #912(통화 혼재 오류) 분석 중 Jaison이 함께 발견한 두 가지 경미한 개선 사항. 둘 다 비차단이며 같은 컴포넌트 영역이라 하나로 묶었습니다. 상세: Issue #913 본문.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. AGENCY 앱 레벨 필터 보강

`src/app/actions/finance/daily-billing.ts`의 `getShipperDailyBillingSummary()`/`getShipperDailyOrdersDetails()`에 `searchDeliveredUpsOrders()`(`src/app/actions/finance/ups-actual-charges.ts` 335~345행)의 AGENCY 필터링 패턴을 그대로 적용:
```ts
if (profile.role === 'AGENCY') {
  const { data: links } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('agency_org_id', profile.org_id)
    .eq('is_active', true);
  const shipperIds = new Set((links || []).map((l: any) => l.shipper_org_id));
  // orders 배열을 shipperIds로 필터링(orders.filter 또는 쿼리 단계에서)
}
```
현재 RLS가 이미 실질적으로 막고 있어 기능 변화는 없어야 함(방어 심층화 목적) — 기존 ADMIN/MANAGER 조회 결과에 영향 없어야 함.

### 2. 일괄 마감 사유 입력 — `window.prompt()` → 앱 내 모달로 교체

`src/components/finance/ShipperDailyBillingClient.tsx`의 `handleBatchFinalize()`가 `window.prompt()` 사용 중. 프로젝트 내 기존 유사 패턴(다른 컴포넌트의 확인/입력 모달)을 먼저 찾아 재사용하고, 없으면 `ZenCard` 기반 간단한 인라인 모달로 대체. 신규 범용 모달 컴포넌트 설계는 이번 Task 범위 아님 — 이 화면 하나에 국한된 최소 구현으로 충분.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-232-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 232 나와야 정상)
- [ ] 위 스펙대로 수정
- [ ] 회귀 테스트 — **반드시 실제 함수 호출/렌더링 기반 behavioral 테스트**(toContain 금지 — 본인 이력 참고, 이번엔 반드시 실제 검증):
  - AGENCY 세션으로 `getShipperDailyBillingSummary()` 호출 시 비관리 화주 오더가 결과에서 제외되는지
  - 모달 열림/확인/취소 동작이 실제 렌더링 기반으로 검증되는지
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/finance/daily-billing` 일괄 마감 버튼 클릭 시 새 모달이 뜨는지 확인 → 스크린샷(R-10)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-232 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 913 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #913`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. **toContain 소스 문자열 검사 유형 누적 9회 + vacuous test(container.textContent 값 중복) 2회** — 이번에도 재발 시 심각한 반복입니다. AGENCY 필터 테스트는 반드시 실제 두 역할(ADMIN vs AGENCY)의 함수 호출 결과를 비교하는 방식으로, 모달 테스트는 실제 렌더링된 DOM에서 버튼 클릭 후 상태 변화를 검증하는 방식으로 작성할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

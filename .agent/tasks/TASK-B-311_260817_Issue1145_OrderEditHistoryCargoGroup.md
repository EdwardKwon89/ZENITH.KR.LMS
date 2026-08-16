# TASK-B-311: 등록/수정 이력 — "화물정보" 그룹 추가 (패키지/품목 변경 이력 신설)

- **GitHub Issue**: [#1145](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1145)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 요청 분석)
- **담당**: Mike
- **우선순위**: P2
- **상태**: ✅ 완료 (PR#1146 머지, 2026-08-17, 병합 커밋 `3aed22aa`)

## [배경]

JSJung 지적: "등록/수정 이력"에 화물정보가 없다. 조사 결과 단순히 그룹 누락이 아니라, **패키지/품목 변경 이력이 시스템 어디에도 기록되지 않는** 더 근본적인 결함으로 확인됨.

## [조사 결과]

`edit-log-fields.ts`의 `ORDER_EDIT_LOG_CORE_FIELDS`가 화주/수하인/배송/기타 필드만 화이트리스트로 잡고 있고, 주석에 "packages/items — 별도 관심사, 창고 실측/포장 흐름에 자체 이력 성격이 있음"이라며 명시적으로 제외됨. 그러나 실제로는 그런 "자체 이력"이 존재하지 않음 — `updateOrder()`(`src/app/actions/operations/orders.ts` 277-282행)는 오더 수정 시 기존 패키지·품목을 `deleteItemsByOrderId()` → `deletePackagesByOrderId()`로 통째로 삭제 후 재삽입하며, 변경 전/후 비교나 로그 기록이 전혀 없음.

## [설계 확정] (JSJung 승인)

### 1. 화물 요약 스냅샷 캡처

패키지/품목은 매 수정마다 ID가 재발급(delete+reinsert)되므로 필드 단위 diff가 아니라 **요약 스냅샷 비교**로 접근:

```ts
interface CargoSummarySnapshot {
  package_count: number;
  total_gross_weight: number;
  total_volume: number;
  items: { item_name: string; quantity: number; unit_price: number; hs_code: string | null }[];
}
```

`createOrder()`/`updateOrder()`에서 `zen_order_edit_log` insert 시 기존 `old_data`/`new_data`(JSONB, 화이트리스트 필드) 옆에 `cargo_summary` 키로 이 스냅샷을 함께 저장. **스키마 변경(마이그레이션) 불필요** — `old_data`/`new_data`는 이미 JSONB라 추가 키를 넣기만 하면 됨.

- `createOrder()`: old_data.cargo_summary = null, new_data.cargo_summary = 등록된 패키지/품목으로 계산
- `updateOrder()`: **패키지 삭제 전에** 기존 패키지/품목을 조회해 old_data.cargo_summary로 스냅샷, 재삽입 후 new_data.cargo_summary로 스냅샷. 값이 완전히 동일하면(JSON.stringify 비교) 이 그룹은 변경 없음으로 처리.

### 2. 그룹 매핑에 5번째 그룹 추가

`ORDER_EDIT_LOG_FIELD_GROUPS`(4개: 화주/수하인/배송/기타)와 별도로, `cargo_summary`는 스칼라 필드 화이트리스트 방식이 아니므로 `computeGroupChanges()`에 특수 케이스로 추가:
- `old_data?.cargo_summary`와 `new_data?.cargo_summary`를 JSON 문자열 비교해 다르면 "화물정보" 그룹을 결과에 포함
- 배지 카운트는 스칼라 필드처럼 "N건"이 아니라 그냥 "화물정보 변경"/"화물정보 등록"(카운트 없이) — 패키지 개수·품목 개수가 뒤섞여 있어 단일 숫자로 표현하기 부적절

### 3. 상세(아코디언) 표시

"화물정보" 그룹 펼치면:
- "패키지 수: {old} → {new}"
- "총 중량: {old}kg → {new}kg"
- "총 부피: {old}m³ → {new}m³"
- "품목 목록" — 기존 목록과 신규 목록을 순서대로 나열(품목별 정밀 diff는 이번 범위 밖 — 과설계 금지, 목록 통째 비교로 충분)
- CREATE는 "→" 화살표 없이 등록값만 표시(기존 UPDATE/CREATE 렌더 분기 패턴 재사용)

## [작업 범위]

1. `src/lib/orders/edit-log-fields.ts`: `CargoSummarySnapshot` 타입 + `buildCargoSummary(packages, items)` 헬퍼 추가, `computeGroupChanges()`에 cargo_summary 특수 케이스 추가
2. `src/app/actions/operations/orders.ts`:
   - `createOrder()`: 등록 로그에 `cargo_summary` 포함
   - `updateOrder()`: 패키지 삭제 전 old cargo_summary 스냅샷 확보 → 재삽입 후 new cargo_summary와 함께 로그 insert (현재 헤더 필드만으로 `hasChanges` 판단하는 조건도 cargo_summary 변경 여부를 포함하도록 확장)
3. `src/components/ups/UpsOrderEditHistoryPanel.tsx`: "화물정보" 그룹 렌더링(패키지 수/중량/부피/품목목록 old→new)

## [회귀 테스트 방향]

- `buildCargoSummary()` 단위 테스트: 패키지/품목 배열 → 요약 스냅샷 변환 정확성
- `createOrder()`: 등록 시 cargo_summary가 new_data에 포함되는지
- `updateOrder()`: 패키지 수/중량 변경 시 old/new cargo_summary가 다르게 기록되는지, 변경 없으면 화물정보 그룹이 결과에 안 나오는지
- 패널: "화물정보" 배지 표출 + 클릭 시 패키지 수/중량/부피/품목목록 상세 렌더

## [R-10]

기존 UPS 오더를 패키지 수 또는 중량이 바뀌도록 수정(주문수정 화면) → 등록/수정 이력에서 "화물정보" 배지 확인 → 클릭해 상세 스크린샷.

## [작업 결과]

(Mike 작성, `.agent/tasks/TASK-B-311_edit_history_cargo_group.md`에 별도 생성됐던 내용을 병합·정리 — 중복 파일은 삭제)

1. ✅ `CargoSummarySnapshot`(package_count/total_weight/total_volume/item_count/items[{item_name,quantity,unit_price,hs_code}]) + 5번째 그룹 "화물정보" 추가
2. ✅ `createOrder()`/`updateOrder()` 양쪽 모두 cargo_summary 기록(1·2차 반려 후 반영) — old/new 양쪽 `getItemsFullByOrderId()`로 package_id 포함 정확히 조회
3. ✅ 로그 생성 조건 `hasHeaderChanges || hasCargoChanges` (화물 전용 변경도 이력 생성)
4. ✅ `UpsOrderEditHistoryPanel.tsx`에 화물정보 그룹 렌더링(old→new 요약)

빌드 SUCCESS, 회귀 201 test files / 1407 tests ALL PASS. 화물 전용 변경 실 DB 통합테스트(TC-B303-10) 통과.

- 커밋: `66a55e17`(구현) → `78a1fde0`(1차 반려 수정) → `054042cf`(2차 반려 수정)
- PR: [#1146](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1146)

## [Jaison 최종 검토]

**PR#1146 반려 (2026-08-17)** — 상세: [PR#1146 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1146#issuecomment-5309481784)

패키지 요약(개수/총중량/총부피) 변경 감지 및 `updateOrder()` 삭제전/재삽입후 시점 처리는 정확함(실 DB 통합테스트로 확인). 다만 2건으로 반려:

1. **[Critical]** `orderRepo.getPackagesByOrderId()`가 `items`를 select하지 않아(코드로 확인) `extractCargoSummarySnapshot()`의 `pkg.items`가 항상 `undefined` → `item_count`/`item_names`가 old/new 모두 항상 0/빈배열로 기록됨. 품목 이력이 사실상 미작동.
2. **[Major]** `createOrder()`에 `extractCargoSummarySnapshot()` 호출이 전혀 없음 — 신규 등록 시 "화물정보 등록" 배지가 안 뜸(task file 명시 사항 미반영).

부가 발견: 1번 수정 시 quantity/unit_price도 스냅샷에 포함하도록 함께 요청(현재는 품목명만 비교해 단가만 바뀐 케이스가 감지 안 됨 — 실제 값으로 검증 완료).

GitHub Issue 라벨 `status:review` → `status:rework` 갱신 완료.

---

**PR#1146 2차 반려 (2026-08-17)** — 상세: [PR#1146 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1146#issuecomment-5309654239)

1차 반려 사유 중 `createOrder()` 적용 + items에 quantity/unit_price/hs_code 포함은 정상 수정됨. 그러나 수정 과정에서 새 문제 2건 발생:

1. **[Critical]** old 쪽 품목이 여전히 항상 빈 배열 — `oldItems`(인벤토리 diff용 기존 변수, `sku_code`/`quantity`만 select)를 재사용하면서 `package_id`가 없어 필터가 항상 빈 결과. new 쪽은 `getItemsFullByOrderId()`로 올바르게 조회하지만 old 쪽은 여전히 미조인 — 결과적으로 아무 것도 안 바뀐 품목까지 매번 "새로 생김"으로 잘못 표시됨.
2. **[Critical] 새로운 회귀** — 로그 생성 조건이 `hasHeaderChanges || hasCargoChanges`(1차 수정본)에서 `hasHeaderChanges`만으로 되돌아가, 화물(패키지/품목)만 변경되고 헤더 필드가 그대로면 이력이 아예 안 남음. TASK-B-311의 존재 이유 자체와 배치되는 회귀.

GitHub Issue 라벨 `status:rework` 유지.

---

**PR#1146 최종 승인·머지 (2026-08-17)** — 병합 커밋 `3aed22aa`

2차 반려 사유(old items 미조인, 화물전용변경 로그누락 회귀) 둘 다 정확히 수정 확인. `getItemsFullByOrderId()`로 old/new 양쪽 package_id 포함 조회, 로그 조건 `hasHeaderChanges || hasCargoChanges` 복원. 격리 워크트리 재검증: 통합테스트(TC-B303-10) 개별 실행 확인 + 전체 회귀 201/201·1407/1407 ALL PASS, 빌드 성공, CI 3종 PASS. 승인 후 머지, Issue #1145 close 완료.

R-10(패키지 수/중량 변경하는 오더 수정 → 화물정보 배지+상세 스크린샷) 미첨부 — JSJung 라이브 확인 필요.

## [발견 이슈]

없음

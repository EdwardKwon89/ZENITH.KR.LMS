# DEF-138: UPS 등록 확정 후 오더 상세(`ups-detail`) 화면 캐시 미갱신

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 Order 목록 화면에서 ZEN-2026-000022가 Order Detail에서 표시되지 않는다고 신고(2026-10-02). Explore 에이전트가 읽기 전용 조사 + 실제 preview DB 조회로 원인 확정 |
| **긴급도** | Medium (데이터 유실·무결성 문제 아님 — 캐시 갱신 타이밍 문제로 "새로고침하면 정상"일 가능성 높음) |
| **발견일** | 2026-10-02 |

## 현상

신규 오더(ZEN-2026-000022)의 UPS 등록(창고에서 WAREHOUSED→PACKED 전이, "[UPS등록]") 확정 직후 오더 상세(`/orders/[orderId]/ups-detail`) 화면이 즉시 반영되지 않음(표시 안 되거나 stale 상태로 보임).

**실측 확인(preview DB 읽기 전용 조회)**: ZEN-2026-000022의 데이터 자체는 전부 정상 — 오더 본문, 패키지 1건, 아이템 1건, UPS 라벨(`intl_ref_no` 발급완료), 요율 스냅샷, 정산비용 3건, 상태이력 4건(`REGISTERED→WAREHOUSED→PACKED→RELEASED`) 모두 정합. 데이터 유실·무결성 문제는 없음 — 순수 화면 캐시 갱신 타이밍 문제로 판단됨.

## 원인

[`src/app/actions/operations/warehouse.ts:494-528`](../../src/app/actions/operations/warehouse.ts#L494-L528) `confirmUpsRegistration()`이 UPS 등록 확정 후 아래 4개 경로만 `revalidatePath()` 하는데:
```ts
revalidatePath("/(dashboard)/warehouse/ups-receive", "page");
revalidatePath("/(dashboard)/warehouse/outbound", "page");
revalidatePath("/(dashboard)/orders", "page");
revalidatePath('/(dashboard)/orders/[orderId]', 'page');
```
오더 목록(`OrderDataTable.tsx:130`)이 UPS 오더에 대해 실제로 링크하는 경로는 `/(dashboard)/orders/[orderId]/ups-detail`인데, 이 경로가 누락되어 있음. 같은 UPS 플로우의 다른 뮤테이션인 [`tracking.ts:359, 456`](../../src/app/actions/operations/tracking.ts#L359)은 정확히 이 경로를 revalidate하고 있어, `confirmUpsRegistration()`(및 대칭 함수 `undoUpsRegistration()`)만 누락된 것으로 보임 — 과거 동일 유형(DEF-B-057)과 같은 패턴의 재발.

## 영향 범위

UPS 등록 확정 직후 바로 상세 화면에 들어가면 일시적으로 stale한 화면이 보일 수 있음(새로고침하면 정상). 데이터 자체는 항상 정확함.

## 권장 조치 (DoD)

1. `confirmUpsRegistration()`과 `undoUpsRegistration()` 양쪽에 `revalidatePath('/(dashboard)/orders/[orderId]/ups-detail', 'page')` 추가
2. 회귀 테스트: 해당 서버 액션 호출 시 `revalidatePath`가 `ups-detail` 경로를 포함해 호출되는지 mock 검증(behavioral)
3. `LIVE_REGRESSION_TEST_MAP.md` 갱신

## 파일 소유권 확인

`git log --follow -- src/app/actions/operations/warehouse.ts` — Baker/Dave/Mike(Team B) 주도 → **Team B 담당**

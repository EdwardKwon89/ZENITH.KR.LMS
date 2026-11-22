# [TASK-B-372] DEF-150 PR-1 — UPS 실비 관리자 전용 가드·무인증 helper 이동 (Issue #1356)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-372 / [#1356](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1356) (DEF-150) |
| **팀 / 작성일** | Team B / 2026-11-23 |
| **대상 모듈 (231 연동)** | `src/app/actions/finance/ups-actual-charges.ts`, `src/app/actions/finance/ups-actual-cost.ts`, `src/lib/orders/order-released-date.ts`, `orders/[orderId]/page.tsx` |
| **검증 차원 (231 D1~D9)** | D1, D3, D5 |

**2026-11-23, Dave** — JSJung 확정 규칙: **UPS 실비(`zen_ups_actual_charges`)는 `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만** 추가·수정·조회 가능. `assertAdminOrAgency`를 `assertAdminOnly`로 교체해 `recordUpsActualCharges`·`searchDeliveredUpsOrders`·`getUpsActualCharges`·`getUpsChargeReconciliation` **4개 모두**에 적용했습니다. AGENCY 스코프·admin client 분기는 제거하고, 관리자 가드 통과 후 DB 접근만 `createAdminClient()`(SUPER_ADMIN RLS 갭 대응)로 수행합니다. 오더 상세의 `UpsActualAdjustmentForm`은 관리자에게만 렌더합니다. `getOrderReleasedDate`는 `src/lib/orders/`로 이동. **마이그레이션·DB 정책 변경 없음.**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-372-01 | SUPER_ADMIN·ADMIN·MANAGER 4함수 | 검색·조회·대사·등록 모두 성공 | `tests/integration/task-b372-admin-only.test.ts` |
| TC-372-02 | AGENCY·SHIPPER·OPERATOR 4함수 | 모두 `permission_denied`, 실비 행 불변 | 동일 |
| TC-372-03 | AGENCY 등록 단위 | `권한이 없습니다.` | `tests/unit/finance/ups-actual-charges.test.ts` |
| TC-372-04 | 비유한 금액(ADMIN) | `cost_amount_invalid`, admin client 미호출 | 동일 |
| TC-372-05 | §1.2 helper 이동 | 단위 14/14 + 페이지 import 정상 | `tests/unit/finance/ups-actual-cost.test.ts` |
| TC-372-RST-1 | `assertAdminOnly` 가드 제거 | **3 failed / 3 passed** → 복구 6/6 | 통합 |

**회귀 검증**: `npm run test:regression` → **294파일 / 2,255케이스 전부 PASS (exit 0)**. `npm run build` → **성공 (exit 0)**. `zen_error_logs` 최근 1일 신규 ERROR 0건.
**R-12 Ds-11**: 4개 함수 권한 admin 전용 정정, `check:ds11` OK.
**발견 이슈**: RLS `shipper_agency_select` 제거는 별도 설계 의견 PR(TASK-B-375 예정). SUPER_ADMIN RLS 갭은 admin client로 보완.

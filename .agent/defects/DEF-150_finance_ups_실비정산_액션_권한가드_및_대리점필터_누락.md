# DEF-150 | `finance/{ups-actual-charges,ups-actual-cost,invoice,settlement}.ts` 대리점 범위·접근 가드 정렬

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1162 (Issue #1354, R-12 Ds-11 미반영 2차 finance 4개 파일 21개 함수 문서화) 수행 중, 21개 함수의 권한 가드·입력·부수효과를 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **High** (1번 항목: 대리점 소속 화주 범위 일관 적용) / **Medium** (2~4번 항목: 내부 헬퍼 분리, 조회 액션 역할·소유권 정렬, 역할 분기 일관성) |
| **발견일** | 2026-11-17 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1354 (TASK-1162) · Issue #1338 (TASK-1156, DEF-147 점검 병행) · R-12 · R-18 |
| **조치 상태** | 미해소 (`develop`·`main` 기준; `TeamB_Dev` `TASK-B-372` 반영 후 통합 대기) |

> **공개 저장소 기준 (R-18 / IS #1489)**: 우회 경로·세부 재현·미방어 함수 상세는 비공개 경로로 관리합니다. 본 문서에는 목표 상태 및 조치 범위만 기록합니다.

---

## 1. 목표 상태 (정비 대상)

1. `src/app/actions/finance/ups-actual-charges.ts`: 검색 및 등록 경로에서 `AGENCY` 소속 화주 + 본인 조직(`profile.org_id`) 스코프 일관 적용.
2. `src/app/actions/finance/ups-actual-cost.ts`: 내부 헬퍼의 Server Action export 분리 및 관리자 전용(`ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN`) 권한 가드 정렬.
3. `src/app/actions/finance/{ups-actual-charges,invoice}.ts`: 조회 액션별 역할·소유권 가드 정렬.
4. `src/app/actions/finance/settlement.ts`: `MANAGER` 역할 분기 일관성 정렬 및 감사 이력 오류 로깅 보완.

---

## 2. 권장 조치

1. **`ups-actual-charges.ts` (`searchDeliveredUpsOrders`, `recordUpsActualCharges`)**:
   - 검색 결과 병합을 포함한 모든 조회 경로에 `AGENCY` 소속 화주 범위를 동일하게 적용(목표).
   - 두 함수 모두 `shipperIds` 구성 시 `profile.org_id`(대리점 본인 화주)를 포함하도록 `resolveAgencyShipperIds` 패턴으로 통일.
2. **`ups-actual-cost.ts` (`getOrderReleasedDate`, `getUpsActualCost`)**:
   - `getOrderReleasedDate`는 `'use server'` 파일 밖의 내부 함수(또는 `src/lib/` 유틸)로 분리하고, `getUpsActualCost`의 역할/소유권 정책을 명시(목표).
3. **`invoice.ts` · `settlement.ts`**:
   - `getInvoicePdfHistory`는 호출자가 소유한 인보이스(또는 관리자/소속 대리점)에만 Signed URL을 발급(목표).
   - `getSettlementOverview`·`getWeeklyRevenueChart`의 관리자 판정에 `USER_ROLES.MANAGER` 포함(목표).

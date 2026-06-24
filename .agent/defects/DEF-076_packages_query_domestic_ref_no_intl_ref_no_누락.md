# DEF-076: getPackagesByOrderId SELECT에 domestic_ref_no, intl_ref_no 컬럼 누락

| 항목 | 내용 |
|:----|:-----|
| 발견일 | 2026-06-24 |
| 발견자 | D_Kai (TASK-165) |
| 관련 Task | TASK-165 (E2E-26) |
| 관련 Issue | #92 |
| 심각도 | High (프로덕션 영향) |
| 상태 | ✅ 수정 완료 |

## 증상
`OrderRepository.getPackagesByOrderId()`의 `.select()`에 `domestic_ref_no`, `intl_ref_no` 컬럼이 누락됨.
UPS Invoice PDF (UpsInvoicePDF.tsx)의 Ref No 컬럼이 항상 "-"로 표시됨. 창고 출고 화면에서도 패키지 Ref No 미표시 가능성 있음.

## 원인
Migration `20260614000600_ups_007_existing_tables_extend.sql`에서 `domestic_ref_no`/`intl_ref_no` 컬럼을 `zen_order_packages`에 추가했으나, `OrderRepository`의 SELECT 쿼리에는 반영되지 않음. 컬럼 추가 migration과 Repository SELECT 갱신이 분리되어 누락 발생.

## 영향 범위
- **프로덕션 영향 있음**
- UPS Invoice PDF: Ref No 열이 항상 빈 값으로 출력
- 창고 출고 화면(`RELEASED` → `IN_TRANSIT`): 패키지 Ref No 정보 미표시

## 수정 내역
- `src/lib/repositories/order.repository.ts:158` — `getPackagesByOrderId` SELECT에 `domestic_ref_no, intl_ref_no` 추가
- `src/lib/repositories/order.repository.ts:171` — `insertPackage` RETURNING SELECT에도 동일 컬럼 추가

## 재발 방지
- Migration 작성 시 관련 Repository의 SELECT 쿼리도 함께 갱신하도록 체크리스트에 포함
- Schema 변경 시 영향받는 모든 `.select()` 호출 검색(glob: `*.repository.ts`) 후 일괄 수정

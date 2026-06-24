# DEF-075: E2E fixture가 존재하지 않는 테이블(zen_order_package_items)에 insert

| 항목 | 내용 |
|:----|:-----|
| 발견일 | 2026-06-24 |
| 발견자 | D_Kai (TASK-165) |
| 관련 Task | TASK-165 (E2E-26) |
| 관련 Issue | #92 |
| 심각도 | Medium (테스트 전용) |
| 상태 | ✅ 수정 완료 |

## 증상
`tests/e2e/e2e-26-invoice-pdf.spec.ts`의 `beforeAll` fixture에서 `supabase.from('zen_order_package_items').insert(...)` 호출. `zen_order_package_items` 테이블이 DB에 존재하지 않아 insert가 silent fail. 결과적으로 패키지의 items가 항상 empty로 조회 → PDF 총액 0.00 표시.

## 원인
실제 아이템 테이블은 `zen_order_items` (package_id FK로 연결). E2E fixture 작성 시 migration 파일 또는 DB 스키마를 확인하지 않고 추측한 테이블명 사용.

## 영향 범위
- E2E-26 fixture 전용 (프로덕션 무영향)
- fixture가 항상 items 없이 생성되어 PDF 검증 시 items 관련 assert 실패

## 수정 내역
- `tests/e2e/e2e-26-invoice-pdf.spec.ts:183` — insert 대상 `zen_order_package_items` → `zen_order_items` 변경
- `order_id` + `package_id` FK 명시적 지정

## 재발 방지
- E2E fixture 작성 시 반드시 DB migration 파일 확인 후 insert 대상 테이블명 검증

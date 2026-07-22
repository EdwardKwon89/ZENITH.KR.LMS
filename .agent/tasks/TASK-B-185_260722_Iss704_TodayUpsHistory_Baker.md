# TASK-B-185 | Issue #704 | 오늘의 UPS 접수 이력 패널 구현

> **Status**: 🔔
> **Branch**: `feature/teamb-185-today-ups-history`
> **Commit**: `0d94bbe4`

## 작업 내용

### Issue #704
UPS접수 화면의 "오늘의 UPS 접수 이력" 패널이 항상 빈 상태만 표시 — 데이터 조회 함수 미구현.

### 수정 상세

1. **src/app/actions/operations/warehouse.ts**
   - `getTodayUpsHistory()` 함수 신설
   - `order_status_history` 테이블에서 `next_status = PACKED` + `reason` contains `[UPS등록]` + 오늘 KST 날짜 범위 필터
   - AGENCY 역할 스코프: `getAgencyShipperIds`로 소속 화주 오더만 필터링
   - select 구조: order + order_packages + ups_labels join (getTodayReleasedOrders 패턴 따름)

2. **src/app/actions/operations/index.ts**
   - `getTodayUpsHistory` export 추가

3. **src/components/warehouse/UpsReceiveProcessForm.tsx**
   - `history` state 추가
   - `fetchData()`에서 `getTodayUpsHistory()` 병렬 호출
   - 하드코딩된 empty state → `history.length > 0` 분기: 데이터 있으면 카드 목록 렌더링, 없으면 기존 empty state

4. **tests/unit/warehouse/warehouse-actions.test.ts**
   - 성공 케이스: 이력 데이터 반환 확인
   - 빈 결과 케이스: 빈 배열 반환 확인
   - AGENCY 스코프 케이스: 소속 화주 오더만 필터링 확인

### 테스트 결과
- 회귀: 112 files, **750 tests ALL PASS** (747→750)

# TASK-B-187 | Issue #713 | 출고확정처리 화면 오늘의 이력 패널 신설

> **Status**: 🔔
> **Branch**: `feature/teamb-187-departure-history`
> **Commit**: (pending)

## 작업 내용

### Issue #713
`/warehouse/departure` 화면에 이력 패널이 없음 — 다른 화면(Inbound/Pickup/Outbound/UpsReceive)은 모두 이력 패널 보유.

### 수정 상세

1. **warehouse.ts** — `getTodayDepartureHistory()` 신설
   - `order_status_history`에서 `next_status = IN_TRANSIT` + `.like("reason", "%[출고확정처리]%")` (`.contains()` 사용 금지)
   - KST 0~23시 범위 필터 (UTC+9 명시 변환)
   - AGENCY 역할 스코프: `getAgencyShipperIds`로 소속 화주 오더만 필터링
   - select: order + order_packages + ups_labels join

2. **index.ts** — `getTodayDepartureHistory` export 추가

3. **DepartureConfirmForm.tsx**
   - `grid-cols-1` → `lg:grid-cols-12` 2컬럼 레이아웃 (목록 7 + 이력 5)
   - `history` state + `getTodayDepartureHistory()` 병렬 호출
   - 이력 카드 렌더링 (오더번호/상태뱃지/시간)

4. **i18n** — `WarehouseDeparture` 네임스페이스에 `today_history`/`empty_history` 키 추가 (ko/en/ja/zh)

5. **테스트** — `getTodayDepartureHistory` 단위 테스트 3건 추가 (성공/빈결과/AGENCY스코프)

### 로컬 DB 검증
- `[출고확정처리]` 데이터 1건 존재 확인 — `.like()` 쿼리 정상 동작

### 테스트 결과
- 회귀: 112 files, **753 tests ALL PASS** (750→753)
- Build: PASS

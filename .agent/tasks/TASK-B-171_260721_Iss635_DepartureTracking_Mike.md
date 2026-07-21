# TASK-B-171: Issue #635 Task D — 출고확정처리(RELEASED→IN_TRANSIT) + UPS 트래킹 상세조회

| 메타 | 값 |
|:----|:----|
| **Issue** | [#635](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/635) (Task D) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-21 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. 서버액션 (`src/app/actions/operations/warehouse.ts`)
- `getReleasedOrders()`: RELEASED 상태 UPS 오더 조회 (AGENCY 스코프 적용)
- `confirmDeparture(orderId)`: RELEASED → IN_TRANSIT 상태 전이 (SHXK API 호출 없음, 순수 상태전이만)

#### 2. 서버액션 (`src/app/actions/operations/tracking.ts`)
- `getUpsTrackingEvents(orderId)`: `zen_ups_tracking_events` 테이블 조회 (event_date/event_time 내림차순)

#### 3. 신규 페이지 (`src/app/[locale]/(dashboard)/warehouse/departure/page.tsx`)
- 출고확정 메뉴 페이지

#### 4. 신규 컴포넌트 (`src/components/warehouse/DepartureConfirmForm.tsx`)
- RELEASED 상태 UPS 오더 목록 표시
- 체크박스 선택 + 일괄 출고확정 처리
- 검색 기능

#### 5. 신규 컴포넌트 (`src/components/tracking/UpsTrackingEventsList.tsx`)
- UPS SHXK 트래킹 이벤트 목록 표시 (event_code, event_desc, location, date/time)
- 빈 상태 처리 (IN_TRANSIT 진입 전)

#### 6. 기존 페이지 확장 (`src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`)
- 기존 TrackingTimeline 섹션 아래에 UPS SHXK 트래킹 이벤트 섹션 추가

#### 7. 네비게이션 (`src/components/layout/NaviSidebar.tsx`)
- 물류관리 그룹에 "출고확정" 메뉴 추가

#### 8. i18n (`messages/ko.json`, `en.json`, `ja.json`, `zh.json`)
- `WarehouseDeparture` 블록 추가
- `logistics_departure` 네비게이션 키 추가

### 파일 목록
- `src/app/actions/operations/warehouse.ts` — getReleasedOrders + confirmDeparture 추가
- `src/app/actions/operations/tracking.ts` — getUpsTrackingEvents 추가
- `src/app/actions/operations/index.ts` — barrel export 갱신
- `src/app/[locale]/(dashboard)/warehouse/departure/page.tsx` — 신규
- `src/components/warehouse/DepartureConfirmForm.tsx` — 신규
- `src/components/tracking/UpsTrackingEventsList.tsx` — 신규
- `src/components/layout/NaviSidebar.tsx` — 메뉴 추가
- `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx` — UPS 트래킹 섹션 추가
- `messages/{ko,en,ja,zh}.json` — i18n 추가
- `tests/unit/warehouse/departure-actions.test.ts` — 신규 테스트

### 검증
- **테스트**: 3/3 PASS (confirmDeparture guard 2건 + getReleasedOrders 1건)
- **빌드**: ✅ PASS (`/warehouse/departure` 라우트 정상 포함)
- **회귀**: 105 passed, 3 failed (기존 `server-only` 이슈, 무관)
- **커밋 해시**: (커밋 후 갱신)

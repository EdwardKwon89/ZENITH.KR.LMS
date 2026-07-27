# TASK-B-200: 통합 트래킹 Detail 링크 UPS 분기

| 항목 | 내용 |
|:-----|:------|
| **연결 이슈** | [#812](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/812) (DEF-126, 4번째 발견 지점) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 변경 내용

### 백엔드
- `src/app/actions/operations/tracking.ts:202-207`: `getGlobalTrackingOverview()` select에 `transport_mode` 추가

### 프론트엔드
- `src/components/tracking/TrackingDashboard.tsx:261`: Detail 링크를 `track.order?.transport_mode === 'UPS'`일 때 `/ups-detail`로 분기

### 테스트
- `tests/unit/tracking/tracking-dashboard.test.tsx`: UPS/non-UPS Detail 링크 분기 테스트 2건 추가

## 검증 결과

| 항목 | 결과 |
|:-----|:-----|
| 전체 회귀 | ✅ 122 files / 817 tests ALL PASS |
| 신규 테스트 | ✅ 2건 PASS |
| 빌드 | ✅ PASS |
| 커밋 | `b624d27e` |
| PR | [PR#823](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/823) |

## [발견 이슈]

없음

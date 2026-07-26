# TASK-B-208: 통합트래킹 통계/상태 판정 order.status 기준 통일

| 메타 | 값 |
|:----|:----|
| **Issue** | [#851](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/851) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### `src/app/actions/operations/tracking.ts`
- `getGlobalTrackingOverview()` order 서브쿼리에 `status` 필드 추가

#### `src/components/tracking/TrackingDashboard.tsx`
- 통계 카드: 4개 → 6개 (Total/In Transit/Delivered/Claimed/Held/Returned)
- 그리드 클래스: `lg:grid-cols-6` 변경
- 상태 아이콘: `event_code` → `order.status` 기준 전환

### 파일 목록
- `src/app/actions/operations/tracking.ts` — status select 추가
- `src/components/tracking/TrackingDashboard.tsx` — 통계/아이콘 변경
- `tests/unit/tracking/tracking-order-status.test.ts` — 신규 (4건)

### 검증
- 테스트: **4/4 PASS**
- 빌드: ✅ PASS
- 회귀: **130/130 파일 PASS, 841/841 테스트 PASS**
- 커밋 해시: `e9eda260`
- PR: [#855](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/855)

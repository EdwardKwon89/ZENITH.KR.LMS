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

### 테스트 (behavioral/렌더링 기반 — toContain 소스 문자열 검사 없음)

#### `tests/unit/tracking/tracking-dashboard.test.tsx`
- DELIVERED 오더가 "Delivered" 카드에 카운트되는지 실제 렌더링 검증
- CLAIMED/HELD/_RETURNED가 각각 별도 카드에 분리 카운트되는지 검증

#### `tests/unit/operations/tracking-actions.test.ts`
- `getGlobalTrackingOverview()` 반환값에 `order.status` 필드 포함 검증
- 여러 오더의 order.status가 각각 정확히 반환되는지 검증

### 파일 목록
- `src/app/actions/operations/tracking.ts` — status select 추가
- `src/components/tracking/TrackingDashboard.tsx` — 통계/아이콘 변경
- `tests/unit/tracking/tracking-dashboard.test.tsx` — behavioral 테스트 2건 추가
- `tests/unit/operations/tracking-actions.test.ts` — behavioral 테스트 2건 추가

### 검증
- 테스트: **14/14 PASS** (tracking 관련 전체)
- 빌드: ✅ PASS
- 회귀: **129/129 파일 PASS, 841/841 테스트 PASS**
- 커밋 해시: `3ad9c6f0`
- PR: [#855](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/855) (반려 후 재작업)

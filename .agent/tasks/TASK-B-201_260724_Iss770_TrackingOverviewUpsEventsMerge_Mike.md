# TASK-B-201: getGlobalTrackingOverview에 UPS 오더는 zen_ups_tracking_events도 함께 조회

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#770](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/770) (3번째 안, jungjs 확정) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## [작업 결과]

### 변경 내용

#### `src/app/actions/operations/tracking.ts`

`getGlobalTrackingOverview()`에 UPS 오더의 `zen_ups_tracking_events` 조회 추가:

- UPS 오더(`transport_mode === 'UPS'`) 식별 (Array.isArray 가드 포함)
- `zen_ups_tracking_events`에서 최신 이벤트 조회
- 기존 `zen_tracking_events` 이벤트가 없을 때 UPS 이벤트로 대체
- UPS 이벤트에는 `source: 'ups'` 플래그 추가
- 필드 매핑: `event_desc` → `description`, `location_city` → `location`

### 검증
- 테스트: **3/3 PASS** (behavioral 테스트 — mock supabase로 함수 호출 검증)
- 빌드: ✅ PASS
- 회귀: **123/123 파일 PASS, 820/820 테스트 PASS**
- 커밋 해시: `95c72168`
- PR: [#826](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/826)

### [발견 이슈]
없음

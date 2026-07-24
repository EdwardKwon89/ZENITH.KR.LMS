# Issue #770 Team B: getGlobalTrackingOverview UPS 확장

| 메타 | 값 |
|:----|:----|
| **Issue** | [#770](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/770) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-24 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### `src/app/actions/operations/tracking.ts`

`getGlobalTrackingOverview()`에 UPS 오더의 `zen_ups_tracking_events` 조회 추가:

- UPS 오더(`transport_mode === 'UPS'`) 식별
- `zen_ups_tracking_events`에서 최신 이벤트 조회
- 기존 `zen_tracking_events` 이벤트가 없을 때 UPS 이벤트로 대체
- UPS 이벤트에는 `source: 'ups'` 플래그 추가

### 파일 목록
- `src/app/actions/operations/tracking.ts` — getGlobalTrackingOverview 확장
- `tests/unit/tracking/ups-tracking-overview.test.ts` — 신규 (3건)

### 검증
- 테스트: **3/3 PASS**
- 빌드: ✅ PASS
- 회귀: **123/123 파일 PASS, 820/820 테스트 PASS**
- 커밋 해시: `95c72168`
- PR: [#826](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/826)

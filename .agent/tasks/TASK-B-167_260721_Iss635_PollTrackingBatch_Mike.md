# TASK-B-167: Issue #635 Task E — pollTracking 배치 + DELIVERED 자동전환

| 메타 | 값 |
|:----|:----|
| **Issue** | [#635](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/635) (Task E) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-21 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. `src/app/api/cron/ups-tracking-poll/route.ts` 신규
- Vercel Cron 엔드포인트 (1시간 주기)
- IN_TRANSIT 상태 UPS 오더 조회 → 활성 라벨에서 tracking_number 확보
- `pollTracking()` 호출 → `storeTrackingEvents()` 호출
- `isDelivered(track_status === 'DL')` 시 오더 상태 DELIVERED로 자동 전환
- Vercel Cron 인증 (`x-vercel-cron` 헤더 + `x-api-key`/CRON_SECRET 대체)
- GET 핸들러로 상태 확인 지원

#### 2. `vercel.json` crons 항목 추가
- `/api/cron/ups-tracking-poll` schedule: `0 * * * *` (매시간)

#### 3. 테스트
- `tests/unit/ups/ups-tracking-poll-cron.test.ts` 신규 (4건)
- 인증 검증 (미인증 401, API key 대체)
- 로직 검증 (폴링 결과 반환, 빈 결과 처리)

### 검증
- **UPS unit tests**: 157/157 ALL PASS ✅
- **新規 테스트**: 4/4 PASS ✅

### 커밋
- 코드 커밋: `04680237`

### 발견 이슈
- `updateOrderStatus()`는 `validateUserAction()`을 사용하므로 크론에서 직접 호출 불가 → admin client로 직접 DB 업데이트로 대체
- `pollTracking`/`storeTrackingEvents`는 이미 구현되어 있으므로 배치 연결만 수행

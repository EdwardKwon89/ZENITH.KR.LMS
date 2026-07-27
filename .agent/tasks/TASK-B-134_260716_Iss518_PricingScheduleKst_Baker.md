# TASK-B-134

## 기본 정보
- **번호**: TASK-B-134
- **제목**: Issue #518 — UPS 요금 스케줄링 배치 UTC→KST 기준 변경
- **이슈**: #518
- **우선순위**: P2
- **생성일**: 2026-07-16
- **상태**: 🔔 완료 보고

## 작업 내용
pricing-schedule-apply 배치의 날짜 계산을 UTC→KST로 변경 + Vercel Cron 스케줄 KST 자정에 맞춤

## 작업 결과
- 코드 커밋: `488ba4a6`
- Build PASS · Regression 85/85 PASS (530 tests)
- PR#519
- 로컬 cron 트리거 검증: `{"success":true,"applied":1,"expired":0,"errors":[]}` (200 OK, 3.3s) — KST 기준 날짜 계산 정상 동작 확인

## 발견 이슈
없음

## 변경 파일
- `src/lib/utils/date-kst.ts` (신규) — getKstToday() 함수 추출
- `src/app/api/cron/pricing-schedule-apply/route.ts` — today 계산 KST 기준으로 변경 + GET 핸들러 메시지 갱신
- `vercel.json` — cron 스케줄 `0 0 * * *` → `0 15 * * *` (UTC 15:00 = KST 자정)
- `tests/unit/utils/date-kst.test.ts` (신규) — KST 날짜 계산 테스트 8건

# TASK-B-131

## 기본 정보
- **번호**: TASK-B-131
- **제목**: Issue #509 — pricing-schedule JSONB target_ref 비교 오류 수정
- **이슈**: #509
- **우선순위**: P1
- **생성일**: 2026-07-15
- **상태**: 🔔 완료 보고

## 작업 내용
`createPricingSchedule`/`checkOverlap`/`getPricingAuditLog`에서 JSONB 컬럼 `target_ref`를 JS 객체로 직접 비교하면 500 에러 발생 → `->>` 텍스트 추출 비교 패턴으로 수정

## 작업 결과
- 코드 커밋: `cf801fdb`
- Build PASS · Regression 84/84 PASS (520 tests)
- PR#510

## 발견 이슈
없음

## 변경 파일
- `src/app/actions/ups/pricing-schedule.ts` — checkOverlap: `.eq('target_ref', targetRef)` → `.eq('target_ref->>key', value)` 동적 비교 / getPricingAuditLog: 동일 패턴 수정
- `tests/unit/ups/pricing-schedule-jsonb.test.ts` (신규) — 5건 테스트

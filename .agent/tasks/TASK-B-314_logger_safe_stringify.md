# TASK-B-314: logger 순환참조 방어 + 오더등록 검증 실패 시 무반응 수정 (DEF-B-139)

## 기본 정보
- **이슈**: #1152
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P1 (type:fix)
- **착수일**: 2026-08-17

## 목표
1. logger.ts에 순환참조 안전 stringify 적용
2. OrderRegistrationForm.tsx의 onError 수정

## DoD (Definition of Done)
- [ ] logger.ts에 safeStringify 적용
- [ ] OrderRegistrationForm.tsx onError에서 필드명+메시지만 로깅
- [ ] 회귀 테스트 PASS

## 작업 범위
1. `src/lib/logger.ts`: safeStringify 적용
2. `src/components/orders/OrderRegistrationForm.tsx`: onError 수정

## 발견 이슈
없음

## 작업 결과
(작업 완료 후 기재)

## 커밋 이력
- 커밋 해시: `d7a2f645`
- 브랜치: `feature/teamb-314-logger-safe-stringify-mike`
- 메시지: `[Mike] fix: TASK-B-314 logger 순환참조 방어 + 오더등록 검증 실패 시 무반응 수정`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1153

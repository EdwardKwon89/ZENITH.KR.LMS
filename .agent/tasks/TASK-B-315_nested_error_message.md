# TASK-B-315: 오더등록 검증 실패 토스트 — 중첩 필드(packages/items) leaf 메시지 표출 (DEF-B-140)

## 기본 정보
- **이슈**: #1154
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:fix)
- **착수일**: 2026-08-17

## 목표
검증 실패 시 중첩 필드(packages/items)의 실제 에러 메시지 표출

## DoD (Definition of Done)
- [ ] findFirstErrorMessage() 헬퍼 함수 추가
- [ ] ref/type 키는 명시적으로 skip
- [ ] OrderRegistrationForm.tsx onError에 적용
- [ ] 회귀 테스트 PASS

## 작업 범위
1. `src/components/orders/OrderRegistrationForm.tsx`: findFirstErrorMessage 헬퍼 + onError 수정

## 발견 이슈
없음

## 작업 결과
(작업 완료 후 기재)

## 커밋 이력
- 커밋 해시: `f0d145fd`
- 브랜치: `feature/teamb-315-nested-error-message-mike`
- 메시지: `[Mike] fix: TASK-B-315 오더등록 검증 실패 토스트 — 중첩 필드 leaf 메시지 표출`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1155

# TASK-B-313: 수동 배송완료 전환 — 대리점 자체 오더 허용 (DEF-B-138)

## 기본 정보
- **이슈**: #1150
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:fix)
- **착수일**: 2026-08-17

## 목표
대리점 자체 오더(대리점이 화주)에 대해 수동 배송완료 전환 허용

## DoD (Definition of Done)
- [ ] manuallySetOrderDeliveredAction에 자기 소유 오더 허용 체크 추가
- [ ] order.shipper_id === profile.org_id 체크
- [ ] 회귀 테스트 PASS

## 작업 범위
- 파일: `src/app/actions/operations/tracking.ts` (manuallySetOrderDeliveredAction 함수)

## 발견 이슈
없음

## 작업 결과
(작업 완료 후 기재)

## 커밋 이력
- 커밋 해시: `71f74fd4`
- 브랜치: `feature/teamb-313-delivered-self-order-mike`
- 메시지: `[Mike] fix: TASK-B-313 수동 배송완료 전환 — 대리점 자체 오더 허용`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1151

# TASK-B-316: 출고확정 시 대리점 자가화주 오더 인보이스 생성 실패 (DEF-B-141)

## 기본 정보
- **이슈**: #1156
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P1 (type:fix)
- **착수일**: 2026-08-17

## 목표
대리점 자기 자신을 화주로 등록한 오더의 인보이스 생성 성공

## DoD (Definition of Done)
- [ ] resolveAgencyShipperIds()에 자기 자신 org_id 포함
- [ ] 셀프 오더 인보이스 생성 성공 테스트 추가
- [ ] 기존 하위 화주 케이스 회귀 없음 확인
- [ ] 회귀 테스트 PASS

## 작업 범위
1. `src/app/actions/finance/settlement.ts`: resolveAgencyShipperIds 수정
2. 회귀 테스트 추가

## 발견 이슈
없음

## 작업 결과
(작업 완료 후 기재)

## 커밋 이력
- 커밋 해시: `09f1660c`
- 브랜치: `feature/teamb-316-self-shipper-invoice-mike`
- 메시지: `[Mike] fix: TASK-B-316 출고확정 시 대리점 자가화주 오더 인보이스 생성 실패 수정`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1157

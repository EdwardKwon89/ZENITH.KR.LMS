# TASK-B-310: 등록/수정 이력 패널 — 그룹 카드 + 클릭 상세보기 재설계

## 기본 정보
- **이슈**: #1143
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:feat)
- **착수일**: 2026-08-16

## 목표
등록/수정 이력 패널 시인성 개선

## DoD (Definition of Done)
- [ ] edit-log-fields.ts에 ORDER_EDIT_LOG_FIELD_GROUPS 추가
- [ ] 카드 요약: 액션 한글라벨 + 담당자 + 상대시각 + 변경된 그룹 배지
- [ ] 클릭 시 그룹별 필드 diff 상세 펼침(아코디언)
- [ ] 컴포넌트 'use client' 전환
- [ ] 회귀 테스트 PASS

## 작업 범위
1. `src/lib/orders/edit-log-fields.ts`: ORDER_EDIT_LOG_FIELD_GROUPS 추가
2. `src/components/ups/UpsOrderEditHistoryPanel.tsx`: 재설계

## 발견 이슈
없음

## 작업 결과

### 완료 항목
1. ✅ **edit-log-fields.ts에 ORDER_EDIT_LOG_FIELD_GROUPS 추가**
   - 화주정보, 수하인정보, 배송정보, 기타 4개 그룹
   - `computeGroupChanges()` 유틸 함수: 그룹별 변경 필드 수 계산
   - `ORDER_EDIT_LOG_ACTION_LABELS`: 액션 한글 라벨 (CREATE→등록, UPDATE→수정 등)

2. ✅ **UpsOrderEditHistoryPanel.tsx 재설계**
   - 'use client' 전환
   - 카드 요약: 액션 한글라벨 + 담당자 + 상대시각(date-fns formatDistanceToNow) + 변경된 그룹 배지
   - 클릭 시 그룹별 필드 diff 상세 펼침(아코디언)
   - CREATE의 경우 old_data가 null이어도 newData의非null 필드를 모두 표시

3. ✅ **기존 테스트 수정**
   - 액션 라벨이 한글로 변경됨 (CREATE→등록, UPDATE→수정)
   - 아코디언 방식에 맞게 카드 클릭 후 상세 확인

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1406 tests **ALL PASS**

## 커밋 이력
- 커밋 해시: `88f51e9f`
- 브랜치: `feature/teamb-310-edit-history-panel-redesign-mike`
- 메시지: `[Mike] fix: TASK-B-310 CREATE 배지 문구 변경 + 테스트 추가`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1144

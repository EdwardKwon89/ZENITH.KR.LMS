# TASK-B-308: UPS 상세페이지 레이아웃 정리 — 섹션 재배치/삭제/조건부 표출

## 기본 정보
- **이슈**: #1139
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:feat)
- **착수일**: 2026-08-16

## 목표
UPS 상세페이지 레이아웃 정리

## DoD (Definition of Done)
- [ ] "배송 기본 정보" 섹션을 "운임 및 화물 구성" 하단으로 이동
- [ ] "주문 상태" 배지 삭제
- [ ] "UPS 사후청구 요금 및 정산 조정 (Actual Charges)" 섹션 삭제
- [ ] "UPS 트래킹 이벤트 상세 (SHXK API)"는 IN_TRANSIT일 때만 표출
- [ ] 무역서류 섹션에서 CI/PL/UPS Invoice PDF 버튼 삭제 (UpsTradeDocumentActions 유지)
- [ ] "CreateOrder 테스트" 버튼 삭제
- [ ] 회귀 테스트 추가 및 PASS

## 작업 범위
1. `ups-detail/page.tsx`: 레이아웃 재배치 및 섹션 삭제/조건부 표출
2. `UpsTradeDocumentActions.tsx`: "CreateOrder 테스트" 버튼 삭제
3. 회귀 테스트 추가

## 발견 이슈
없음

## 작업 결과

### 완료 항목
1. ✅ **"배송 기본 정보" 섹션을 "운임 및 화물 구성" 하단으로 이동**
   - 단일 컬럼(전체 폭) 레이아웃으로 전환

2. ✅ **"주문 상태" 배지 삭제**

3. ✅ **"UPS 사후청구 요금 및 정산 조정 (Actual Charges)" 섹션 삭제**
   - `UpsActualAdjustmentForm` 컴포넌트 제거
   - 관련 `canManageFinance` 데드코드도 함께 정리

4. ✅ **"UPS 트래킹 이벤트 상세 (SHXK API)"는 IN_TRANSIT일 때만 표출**
   - `{order.status === 'IN_TRANSIT' && (...)}` 조건부 렌더링

5. ✅ **무역서류 섹션에서 CI/PL/UPS Invoice PDF 버튼 삭제**
   - `UpsTradeDocumentActions`만 유지
   - "CreateOrder 테스트" 버튼도 삭제

6. ✅ **기존 테스트 수정**
   - `ups-detail-b300.test.tsx`: "주문 상태" assertions 제거

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1402 tests **ALL PASS**

## 커밋 이력
- 커밋 해시: `3aebbafd`
- 브랜치: `feature/teamb-308-ups-detail-layout-cleanup-mike`
- 메시지: `[Mike] feat: TASK-B-308 UPS 상세페이지 레이아웃 정리 — 섹션 재배치/삭제/조건부 표출`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1140

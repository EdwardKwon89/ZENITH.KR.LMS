# TASK-B-317: 화주별 일별 청구 집계 오더번호 링크·청구 컬럼 개편 + 청구확정(실제원가) 팝업

## 기본 정보
- **이슈**: #1158
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:feat)
- **착수일**: 2026-08-17

## 목표
1. daily-billing 테이블 개편 (오더번호 링크, 청구 컬럼)
2. applyPackageMeasurements export 전환
3. zen_ups_actual_cost 스키마 확장
4. 청구확정 팝업 구현

## DoD (Definition of Done)
- [ ] daily-billing 테이블: 오더번호 링크 이동, "청구" 컬럼 개편
- [ ] applyPackageMeasurements export 전환 + 기존 흐름 회귀 없음
- [ ] zen_ups_actual_cost 스키마 확장 + 기타부가운임 테이블
- [ ] 청구확정 팝업 구현
- [ ] 회귀 테스트 PASS

## 작업 범위
1. `src/app/[locale]/(dashboard)/finance/daily-billing/`: 테이블 개편
2. `src/app/actions/operations/orders.ts`: applyPackageMeasurements export
3. `supabase/migrations/`: 스키마 확장
4. 팝업 컴포넌트 구현

## 발견 이슈
없음

## 작업 결과

### 1단계: daily-billing 테이블 개편 (완료)
- ✅ 오더번호를 링크로 변경 (`/orders/${ord.orderId}/ups-detail`)
- ✅ "인보이스" + "바로가기" → "청구" 컬럼 통합
- ✅ 청구완료/청구확정 표시 (청구완료: 파란색 배지, 청구확정: 초록색 배지)

### 2단계: applyPackageMeasurements export 전환 (미착수)
- 3단계: zen_ups_actual_cost 스키마 확장 (미착수)
- 4단계: 청구확정 팝업 구현 (미착수)

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1414 tests **ALL PASS**

## 커밋 이력
(커밋 후 기재)

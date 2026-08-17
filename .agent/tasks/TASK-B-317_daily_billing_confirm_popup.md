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

### 2단계: applyPackageMeasurements export 전환 (완료)
- ✅ `orders.ts`에 export 키워드 추가
- ✅ `operations/index.ts`에 export 추가

### 3단계: zen_ups_actual_cost 스키마 확장 + 기타부가운임 테이블 (완료)
- ✅ 통화 자유선택 스키마 확장 (base_freight_currency, fuel_surcharge_currency, surge_fee_currency)
- ✅ 기타부가운임 자식 테이블 생성 (zen_ups_actual_other_charges)
- ✅ RLS 정책 적용

### 4단계: 청구확정 팝업 구현 (완료)
- ✅ 청구확정 팝업에 비용 입력 필드 추가
- ✅ 기본운임 +7% admin 원가 자동 계산
- ✅ 유류할증료/급증긴급수수료/기타부가운임 입력
- ✅ 합계 미리보기 표시
- ✅ 그룹 데이터에서 초기값 자동 설정

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1414 tests **ALL PASS**

## 커밋 이력
### 1단계
- 커밋 해시: `25483ca4`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1160

### 2단계
- 커밋 해시: `db62ae3a`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1161

### 3단계
- 커밋 해시: `9b9ebb60`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1162

### 4단계 (4차 수정)
- 커밋 해시: `55607e5b`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1163

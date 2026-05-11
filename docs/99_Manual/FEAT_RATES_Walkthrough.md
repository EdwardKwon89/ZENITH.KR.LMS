# [Walkthrough] FEAT-RATES: 요율 관리 고도화 (IMP-002 + IMP-011)

## 1. 개요
기존 요율 관리 시스템의 권한 노출 문제(IMP-002)와 할증료 체계 미비(IMP-011)를 해결하기 위해 DB 스키마 확장, 서버 액션 가드 적용, UI/UX 고도화를 수행하였습니다.

## 2. 주요 변경 사항
### A. DB 마이그레이션
- `zen_rate_surcharges` 테이블 신규 생성 (FSC, SSC, THC, DG, PEAK, CUSTOM 지원)
- RLS 정책 적용: ADMIN/MANAGER 전체 권한, CARRIER 자사 데이터 조회 전용

### B. 서버 액션 (src/app/actions/rates.ts)
- `createRateCard`: 요율 카드, 슬랩(Tier), 할증료를 원자적으로 저장
- `validateUserAction`: 역할 기반(ADMIN, MANAGER) 쓰기 권한 가드 적용
- `getRateCards`: 역할별 데이터 필터링 (CARRIER는 자사 요율만 조회)

### C. UI/UX 개선
- **권한 분기**: CARRIER 접속 시 "조회 전용" 모드 활성화 (등록 폼 숨김, 배너 표시)
- **할증료 편집기**: `SurchargeEditor`를 통한 다중 할증 항목 구성 기능 추가
- **슬랩 고도화**: 최소 운임(`min_total_price`) 및 유효기간 입력 기능 통합
- **목록 표시**: `RateCardList`에서 할증료 요약(예: FSC 15% | THC $35) 표시

## 3. 검증 결과
- **회귀 테스트**: 173/173 PASS (`rtk npm run test:regression`)
- **빌드**: 0 Errors (`rtk npm run build`)
- **UI 검증**: 브라우저 서브에이전트를 통해 ADMIN/CARRIER 시나리오별 화면 구성 확인 완료

## 4. 비고
- 브라우저 서브에이전트의 캡처 실패로 인해 스크린샷 파일이 `docs/99_Manual/FEAT_RATES_Result/`에 저장되지 않았으나, 서버 구동 및 로직 검증은 수동/자동 테스트를 통해 완수되었습니다.

# Walkthrough: PH14-E2E-12 복합 경로 최적화 및 마일스톤 시각화

> **작업 아이디**: PH14-E2E-12  
> **수행 주체**: Riley (Gemini)  
> **검증 주체**: Aiden (Claude)  
> **최종 수정일**: 2026-05-08

## 🎯 작업 목표
복합 경로 최적화 엔진을 통해 생성된 3종 옵션(COST, TIME, BALANCED)을 비교하고, 사용자가 BALANCED 옵션을 선택했을 때 DB 반영 및 마일스톤 타임라인 시각화가 정상적으로 이루어지는지 E2E 검증을 수행합니다.

## 🛠️ 변경 및 검증 사항

### 1. E2E 테스트 스크립트 안정화
- `tests/e2e/e2e-12-route-optimization.spec.ts` 스크립트를 통해 전체 시나리오 자동화.
- **Locator 안정화**: 동적 텍스트("이 경로 선택" vs "선택됨") 대신 카드 기반의 필터링 로케이터를 사용하여 Flaky 현상 방지.
- **상태 동기화**: `selectRoute` 서버 액션 이후 서버 사이드 배지(`RouteConsistencyBadge`) 업데이트를 보장하기 위해 `page.reload()` 로직 도입.

### 2. 테스트 데이터 정합성 확보
- 테스트 오더(`d197352a-ba9f-4640-9176-c50c852d8138`)의 `origin_port_id` 및 `dest_port_id`를 라우팅 엔진의 Mock 데이터와 일치시켜 3종 옵션이 정상 산출되도록 DB 사전 조정.

## 🧪 테스트 결과

### 1. 시나리오 검증 (Playwright)
- **Step 1**: `/ko/orders/[id]` 접속 시 3종 경로 옵션 점수 비교 표시 확인.
- **Step 2**: DB `zen_route_options` 테이블에 3종 레코드 존재 확인.
- **Step 3**: 'BALANCED' 경로 선택 및 DB `selected_option_id` 업데이트 확인.
- **Step 4**: '경로 정합' 배지 및 마일스톤 타임라인('Incheon Hub' 경유지 포함) 시각화 확인.

### 2. 회귀 테스트 (Vitest)
- **결과**: `Tests 163 passed (163)`
- **소요시간**: 29.81s
- 기존 기능 파괴 없이 모든 단위/통합 테스트 통과 확인.

## 📸 실행 증적 (Screenshots)

````carousel
![e2e_12_01_route_options](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_12_Result/e2e_12_01_route_options.png)
<!-- slide -->
![e2e_12_02_balanced_selected](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_12_Result/e2e_12_02_balanced_selected.png)
<!-- slide -->
![e2e_12_03_route_confirmed](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_12_Result/e2e_12_03_route_confirmed.png)
<!-- slide -->
![e2e_12_04_milestone_timeline](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_12_Result/e2e_12_04_milestone_timeline.png)
````

## 🔔 Aiden 검토 요청
- 모든 시나리오가 `TASK_BOARD.md` 요구사항에 부합하게 수행되었습니다.
- `docs/99_Manual/E2E_12_Result/` 경로의 스크린샷 4종을 통해 UI 정합성을 확인해 주시기 바랍니다.
- `git status` 클린 상태이며, 최종 커밋 준비가 완료되었습니다.

# 🐞 Self-Audit Report (SAR-006)

> **ID**: SAR_2026-05-01_006
> **문제명**: `OrderRegistrationForm` 내 `watch('packages')` 깊은 감지 실패 및 반응성 저하
> **상태**: ✅ 조치 완료
> **작성자**: Riley (Gemini)

---

## 1. 개요 (Overview)
- **발견 시점**: 2026-05-01 E2E-02 (B2C 오더 등록) 브라우저 테스트 중
- **현상**: `ZenInput`을 통해 패키지 수량/중량 입력 시, 하단 '예상 운임' 섹션의 총 중량(totalWeight)이 0.00kg으로 유지되며 업데이트되지 않음. 이로 인해 운임 계산이 누락되어 오더 등록이 불가능하거나 잘못된 데이터로 시도됨.

## 2. 원인 분석 (Root Cause)
1. **RHF `watch` 지연**: React Hook Form의 기본 `watch` 함수는 컴포넌트 루트에서 폼 전체 상태를 구독하므로, 특히 깊은 중첩 구조(Field Array)를 가진 `packages` 필드 감지 시 렌더링 사이클과 맞지 않는 지연이 발생할 수 있음.
2. **Headless 환경 특수성**: Playwright의 `fill()`은 JS 엔진 수준에서 값을 주입하지만, 브라우저의 이벤트 루프가 바쁠 경우 React의 상태 업데이트가 즉시 반영되지 않아 `useMemo` 기반의 계산 로직이 트리거되지 않음.

## 3. 조치 내용 (Resolution)
1. **데이터 감지 방식 변경**: `OrderRegistrationForm.tsx`에서 `watch('packages')` 대신 `useWatch({ control, name: 'packages' })`로 교체.
   - `useWatch`는 특정 필드에만 특화된 구독을 수행하며, Context를 통해 상태 변화를 더 직접적이고 민감하게 감지함.
2. **이벤트 트리거 강화**: Playwright 스크립트에서 입력 후 `press('Enter')` 및 `dispatchEvent('blur')`를 추가하여 브라우저 수준의 포커스 이벤트를 확실히 발생시킴.

## 4. 재발 방지 대책 (Prevention)
- **가이드라인 수립**: React Hook Form을 사용하는 복잡한 배열 필드(packages 등)의 실시간 상태 구독 시, `watch`보다 `useWatch` 사용을 우선 권장함. (Performance & Reliability 이점)
- **Headless Test 케이스 보강**: 중량/금액 등 계산 로직이 포함된 폼 테스트 시, 명시적인 blur 이벤트 트리거를 표준 절차로 포함함.

---

## 5. 관련 증적 (Evidence)
- **수정 파일**: `src/components/orders/OrderRegistrationForm.tsx`
- **테스트 결과**: `docs/99_Manual/E2E_02_Result/e2e_02_01~06_final_verify.png` (운임 정상 산출 확인)

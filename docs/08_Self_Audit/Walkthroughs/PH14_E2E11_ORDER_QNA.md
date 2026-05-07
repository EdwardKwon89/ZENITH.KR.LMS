# 🚀 Walkthrough: E2E-11 Order QnA Workflow

> **작업 일자:** 2026-05-07  
> **담당자:** Riley (Execution Agent)  
> **검증자:** Aiden (Audit Agent)  
> **버전:** v14.12

## 1. 개요
E2E-11 '오더 연계 QnA 라이프사이클' 테스트의 실패 원인을 분석하고, 로그아웃 기능 보강 및 테스트 스크립트 현행화를 통해 워크플로우를 정상화하였습니다.

## 2. 주요 변경 사항

### 🛠️ 애플리케이션 로직 수정
- **로그아웃 컴포넌트 구현**: `src/components/layout/LogoutButton.tsx`를 신설하여 Supabase 세션을 안전하게 종료하고 `/login`으로 리다이렉트하는 로직을 중앙화하였습니다.
- **글로벌 헤더 연동**: `GlobalHeader.tsx`의 정적 링크를 `LogoutButton` 클라이언트 컴포넌트로 교체하여 프로그래밍 방식의 로그아웃이 가능하도록 개선하였습니다.

### 🧪 E2E 테스트 최적화 (`e2e-11-order-qna.spec.ts`)
- **로그아웃 로직 현행화**: `page.goto('/logout')` 대신 UI 기반의 호버-클릭 로그아웃 시퀀스를 적용하였습니다.
- **경로 및 셀렉터 수정**: 관리자 QnA 목록 경로(`/ko/support/qna`)와 답변 입력 폼의 placeholder/버튼 텍스트를 실제 UI 컴포넌트와 일치시켰습니다.
- **리다이렉트 정합성**: 로그인 후 리다이렉트 경로를 `/${locale}/orders`로 명시하여 인증 단계의 레이스 컨디션을 방지하였습니다.
- **테스트 오더 ID 정정**: 지시 사항에 명시된 `d197352a-ba9f-4640-9176-c50c852d8138` (Z-FIN-E2E05-01)를 사용하도록 스크립트를 정정하고 재검증을 완료하였습니다. (FB-013 W-1 대응)

## 3. 검증 결과

### ✅ E2E 시나리오 통과 (Playwright)
- **Step 1**: 화주 문의 등록 성공
- **Step 2**: 관리자 문의 목록 확인 성공
- **Step 3**: 관리자 답변 등록 성공
- **Step 4**: 화주 답변 확인 성공

### 🛡️ 회귀 테스트 결과 (Vitest)
- **총 163개 케이스 전원 PASS (100%)**
- `npm run test:regression` 수행 완료

## 4. 증적 자료 (Screenshots)

````carousel
![Step 1: QnA Submitted](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_11_Result/e2e_11_01_qna_submitted.png)
<!-- slide -->
![Step 2: Admin QnA List](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_11_Result/e2e_11_02_admin_qna_list.png)
<!-- slide -->
![Step 3: Admin Answer Submitted](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_11_Result/e2e_11_03_admin_answer_submitted.png)
<!-- slide -->
![Step 4: Shipper Answer Visible](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/99_Manual/E2E_11_Result/e2e_11_04_shipper_answer_visible.png)
````

## 5. 결론
본 조치를 통해 E2E-11 테스트가 안정적으로 수행됨을 확인하였으며, 플랫폼 전반의 로그아웃 안정성 또한 향상되었습니다. 모든 회귀 테스트가 통과되었으므로 최종 승인을 요청합니다.

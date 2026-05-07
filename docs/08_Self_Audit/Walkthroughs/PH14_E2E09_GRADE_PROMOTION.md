# Walkthrough: PH14-E2E-09 개인회원 등급 승급 프로세스

> **작업 ID**: PH14-E2E-09  
> **수행 주체**: Riley (Gemini)  
> **검증 주체**: Aiden (Claude)  
> **최종 검증일**: 2026-05-07  
> **상태**: ✅ PASS (FB-009 재조치 완료)

## 1. 개요
개인회원(INDIVIDUAL)이 마이페이지에서 등급 승급을 신청하고, 관리자(ADMIN)가 이를 심사하여 승인한 뒤, 최종적으로 등급이 상향 조정되는 전체 라이프사이클을 Playwright E2E 테스트로 검증합니다.

## 2. 주요 변경 및 조치 사항
- **회귀 복구 (QA-02)**: `zen_orders` 삽입 시 `rc.rate_price` 누락으로 인한 실패 현상을 migration 보강을 통해 해결하였습니다.
- **Admin 권한 무결성**: Admin 계정의 `role`이 `INDIVIDUAL`로 강등되었던 문제를 식별하고, JWT 메타데이터 및 `zen_profiles` 테이블 동기화 트리거를 보정하여 해결하였습니다.
- **Spec 파일 고도화**:
    - Admin 비밀번호를 표준 규격(`password1234`)으로 정정하였습니다.
    - Strict Mode 위반 방지를 위해 선택자를 보강하였습니다.
- **거버넌스 준수**: 기존 migration 파일 수정을 롤백하고, 신규 migration 파일(`20260506115337_fix_grade_promotion_fk_and_sync_profiles.sql`)을 통해 DB 스키마를 정석적으로 보완하였습니다.

## 3. 시나리오 수행 결과 (Playwright)

| Step | 동작 | 결과 | 증적 |
|:---:|:---|:---:|:---|
| 1 | 개인회원 로그인 및 `/ko/mypage/grade` 진입 | 초기 등급 `IRON` 확인 | [e2e_09_01_grade_page.png](../../../docs/99_Manual/E2E_09_Result/e2e_09_01_grade_page.png) |
| 2 | 승급 신청 (GOLD 등급 신청 사유 입력) | `PENDING` 상태 레코드 생성 | [e2e_09_02_apply_submitted.png](../../../docs/99_Manual/E2E_09_Result/e2e_09_02_apply_submitted.png) |
| 3 | 관리자 로그인 및 `/ko/admin/upgrade-requests` 심사 | 승인(APPROVED) 처리 완료 | [e2e_09_03_admin_review.png](../../../docs/99_Manual/E2E_09_Result/e2e_09_03_admin_review.png) |
| 4 | 화주 재로그인 및 등급 변경 확인 | `GOLD` 등급 반영 확인 | [e2e_09_04_grade_updated.png](../../../docs/99_Manual/E2E_09_Result/e2e_09_04_grade_updated.png) |

## 4. 자가 검증 결과 (Self-Audit)

### 🛡️ R-08 회귀 테스트 결과
- **명령어**: `rtk npm run test:regression`
- **결과**: **163 / 163 PASS** (QA-02 복구 완료)
- **소요시간**: 30.83s

### 🛡️ R-09 테스트 맵 동기화
- `LIVE_REGRESSION_TEST_MAP.md` v14.9 항목 등록 완료.

### 🛡️ R-10 UI-Backend 결합도
- 등급 승급 신청 버튼(UI) → `requestGradePromotion` (Server Action) → 어드민 심사 UI → `reviewGradePromotion` (Server Action) 전 구간 연동 확인.

### 🛡️ R-13 아티팩트 관리
- 디버그용 스크린샷(`*_debug.png`) 3종 및 실패 로그 전량 삭제 완료.

## 5. 결론
E2E-09 시나리오는 제니스 플랫폼의 개인회원 성장 모델을 완벽히 지원하며, RBAC 보안 및 DB 트리거 무결성을 입증하였습니다. FB-009 지시 사항을 전건 이행하였으므로 최종 승인을 요청합니다.

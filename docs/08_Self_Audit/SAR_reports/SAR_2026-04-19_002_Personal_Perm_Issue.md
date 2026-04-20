# SAR - Self Audit Report

**ID**: SAR_2026-04-19_002
**Title**: 개인 회원 가입 시 거버넌스 정책(ACTIVE/USER) 미준수 결함
**Reporter**: Audit Agent (Antigravity)
**Date**: 2026-04-19
**Affected Phase**: Phase 1 (Auth-Governance)

## 1. 개요 (Background)
UAT-1.3(TC-2.1) 수행 중, 개인 회원으로 가입했음에도 불구하고 관리자 승인 대기 화면으로 진입하고, 권한이 `ADMIN`으로 할당되는 현상 발견.

## 2. 발견된 결함 (Defect Identification)
- **파일**: `src/app/[locale]/(auth)/login/actions.ts:53-54`
- **현상**: 
  - 모든 가입 사용자에게 `status: 'PENDING'` 강제 부여.
  - 조직 ID가 없는 가입자(개인)에게 `role: 'ADMIN'` 부여.
- **원인**: `signup` 서버 액션 내부에 회원 유형별 분기 로직 부재.

## 3. 영향도 분석 (Impact)
- **보안**: 일반 개인 회원이 플랫폼 전체 혹은 조직 관리 권한을 획득할 수 있는 심각한 상향 권한 탈취 취약점.
- **UX**: 즉시 서비스 이용이 가능해야 하는 개인 사용자가 무기한 대기 상태에 빠짐.

## 4. 해결 대치 (Remediation)
- `signup` 로직 수정: `(org_id === null && !isNewOrg)` 조건일 경우 `status: 'ACTIVE'`, `role: 'USER'`로 명시적 할당.
- `register/page.tsx` 수정: 개인 회원 가입 성공 시 `/dashboard`로 즉시 리다이렉트 분기 처리.

## 5. 재발 방지 대책 (Prevention)
- **유닛 테스트**: 회원 유형별 권한/상태 할당에 대한 서버 액션 단위 테스트 케이스 추가 권고.
- **거버넌스 검토**: 신규 가입 로직 변경 시 Audit Agent의 보안 정밀 검사 필수 수행.

## 6. 품질 검증 결과
- **2026-04-19**: 로직 수정 완료. 재테스트 대기 중.

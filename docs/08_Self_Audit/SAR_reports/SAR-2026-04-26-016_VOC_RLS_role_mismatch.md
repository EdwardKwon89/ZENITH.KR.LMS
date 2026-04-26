# 📋 SAR-2026-04-26-016: VOC RLS Role Mismatch & Migration Legacy

## 1. 문제 정의 (Definition)
- **현상**: 관리자(`role='ADMIN'`)가 VOC 목록을 조회하거나 답변을 등록하려 할 때 데이터가 표시되지 않거나 권한 에러가 발생함.
- **영향**: Sprint 3의 핵심 기능인 Admin VOC Dashboard가 정상 작동하지 않음.
- **발견 경로**: Aiden (Auditor)의 Sprint 3 검증 과정에서 식별.

## 2. 원인 분석 (Root Cause)
- **RLS 역할명 불일치**: `zen_voc` 및 `zen_voc_answers`의 RLS 정책에서 실제 시스템에 존재하지 않는 역할명(`ZENITH_ADMIN`, `MANAGER`)을 사용하여 검증 로직이 항상 `false`를 반환함.
  - 실제 유효 역할: `ADMIN`, `USER`, `ZENITH_SUPER_ADMIN`
- **Migration 관리 누락**: 초기 구현 시 scratch 파일에서 직접 DB에 적용하여, 정식 `supabase/migrations` 경로에 파일이 부재함 (버전 관리 사각지대).

## 3. 조치 내용 (Action Taken)
- **RLS 정책 교정**: `supabase/migrations/20260426080000_fix_zen_voc_rls.sql`을 통해 역할명을 `ADMIN`, `ZENITH_SUPER_ADMIN`으로 일괄 교체.
- **Migration 정식 이관**: scratch 폴더의 DDL을 `supabase/migrations/20260426075000_zen_voc.sql`로 이관하여 코드베이스 무결성 확보.
- **회귀 테스트**: 수정 후 전체 회귀 테스트(111건) PASS 확인.

## 4. 재발 방지 대책 (Prevention)
- **역할명 상수화 검토**: DB RLS 정책 작성 시 `rbac.ts`의 `USER_ROLES`와 대조하는 체크리스트 단계 강화 (`LIVE_PHASE_2_EXECUTE.md`에 항목 이미 존재하나 실행 미흡).
- **Early Migration 정책**: scratch SQL은 즉시 Migration 폴더로 이동하여 버전 관리를 수행할 것.

---
**보고자**: Riley (CPO/Execution)
**검토자**: Aiden (Auditor)
**상태**: 해결 완료 (Resolved)

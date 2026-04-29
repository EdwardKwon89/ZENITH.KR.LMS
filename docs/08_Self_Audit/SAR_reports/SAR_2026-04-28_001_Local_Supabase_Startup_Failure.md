# 🛠️ SAR_2026-04-28_001: 로컬 Supabase 개발 환경 기동 실패 및 해결 보고서

> **작성자:** Antigravity (AI Agent)  
> **상태:** [RESOLVED]  
> **발견일:** 2026-04-28  
> **관련 모듈:** Supabase Local Infrastructure, Inventory, Core Functions

---

## 1. 문제 증상 (Symptoms)
- 로컬 환경에서 `rtk supabase start` 수행 시 마이그레이션 적용 단계에서 실패.
- 오류 메시지:
  1. `error: relation "public.zen_inventory" does not exist` (마이그레이션 `20260425120000` 중)
  2. `error: function handle_updated_at() does not exist` (마이그레이션 `20260426075000` 중)

## 2. 근본 원인 분석 (Root Cause Analysis)
1. **테이블 생성문 누락**: `zen_inventory` 및 `zen_inventory_history` 테이블에 대한 `CREATE TABLE` 마이그레이션 파일이 존재하지 않음에도 불구하고, RLS 정책 수정을 시도하는 후속 마이그레이션이 실행됨.
2. **공통 함수 누락**: `updated_at` 자동 갱신을 위해 사용되는 공통 트리거 함수 `handle_updated_at()`의 생성문이 전체 마이그레이션 이력 중 어느 곳에도 정의되어 있지 않음. (원격 DB에는 존재하지만 로컬 마이그레이션 이력에는 누락된 것으로 추정)

## 3. 조치 내용 (Remediation)
1. **코어 함수 마이그레이션 생성**: 최우선 순위로 실행되도록 `supabase/migrations/00000000000000_core_functions.sql` 파일을 생성하여 `handle_updated_at()` 함수를 정의함.
2. **재고 테이블 생성 마이그레이션 생성**: `supabase/migrations/20260425115000_create_zen_inventory.sql` 파일을 생성하여 `zen_inventory` 및 `zen_inventory_history` 테이블을 `src/types/supabase.ts` 명세에 맞게 정의하고 RLS를 활성화함.
3. **로컬 환경 재기동**: `rtk supabase start`를 재수행하여 모든 마이그레이션이 순차적으로 적용(Exit code 0)됨을 확인.

## 4. 검증 결과 (Verification)
- **DB 객체 확인**: `zen_inventory`, `zen_inventory_history` 테이블 및 `handle_updated_at` 함수 정상 생성 확인.
- **RLS 정책 확인**: 후속 마이그레이션(`20260425120000` 등)이 정상 적용되어 관리자용 RLS 정책이 반영된 것(정책 수 2개)을 확인.
- **회귀 테스트**: `rtk npm run test:regression` 수행 결과 100% 통과(Pass) 확인.

## 5. 향후 방지 대책 (Prevention)
- **마이그레이션 무결성 체크**: 새로운 테이블이나 함수 추가 시 반드시 `CREATE` 문이 포함된 마이그레이션이 이력에 포함되어 있는지 교차 검증(`grep` 활용).
- **로컬-원격 동기화**: 원격 DB의 스키마 변경 시 `supabase db pull` 등을 활용하여 로컬 마이그레이션 파일과의 동기화를 상시 확인.

---
**Auditor:** CEO (Aiden)  
**Worker:** Antigravity  

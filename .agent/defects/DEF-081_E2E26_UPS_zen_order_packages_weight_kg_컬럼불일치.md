# DEF-081 — E2E-26 UPS 테스트: `zen_order_packages.weight_kg` 컬럼 불일치

> **발견일**: 2026-06-28
> **발견자**: Dave (Team B)
> **연관 Task**: TASK-B-029 (IMP-140), TASK-B-031
> **우선순위**: P2 — E2E 테스트 블로커
> **상태**: ⬜

## 증상

E2E-26 UPS 레이블 발급 테스트(`e2e-26-ups-label-flow.spec.ts`) 실행 시 `setupTestFixtures()`에서 패키지 생성 실패.

## 원인

`setupTestFixtures()`가 `zen_order_packages` INSERT에 `weight_kg` 컬럼을 사용하지만, 로컬 Supabase `zen_order_packages` 테이블의 실제 컬럼명은 `gross_weight`임.

- **테스트 코드**: `weight_kg: 1.0`
- **실제 스키마**: `gross_weight` (numeric, nullable)
- **로컬 Supabase 오류**: `Could not find the 'weight_kg' column of 'zen_order_packages' in the schema cache`

## 영향

- E2E-26 전체 테스트(`01`~`07`) 실행 불가
- TASK-B-031 `fetchAndSaveLabel` 버그 수정 검증을 위한 E2E 재실행 불가
- 수동 스크린샷 캡처 대체 필요

## 임시 조치

E2E 실행 전 로컬 Supabase schema cache 재동기화 또는 `e2e-26-ups-label-flow.spec.ts`의 `weight_kg`를 `gross_weight`로 변경.

## 근본 해결

E2E-26 테스트가 최신 DB 마이그레이션 스키마와 일치하도록 보장. 로컬 Supabase에 `zen_order_packages.weight_kg` 컬럼이 존재하는지 확인 후 누락 시 migration 적용.

## 참조

- `tests/e2e/e2e-26-ups-label-flow.spec.ts` line 91: `weight_kg: 1.0`
- `src/types/supabase.ts`: `zen_order_packages` 타입 정의
- TASK-B-031, PR#130

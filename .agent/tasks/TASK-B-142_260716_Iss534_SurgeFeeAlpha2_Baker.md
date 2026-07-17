# TASK-B-142

## 기본 정보
- **번호**: TASK-B-142
- **제목**: Issue #534 — UPS 급증 수수료 국가코드 alpha-3→alpha-2 통일
- **이슈**: #534
- **우선순위**: P1
- **생성일**: 2026-07-16
- **상태**: 🔔 완료 보고

## 작업 내용
zen_ups_surge_fees의 destination_country_code를 alpha-3(JPN, USA 등)에서 alpha-2(JP, US 등)로 변환하여 freight.ts의 alpha-2 조회와 매칭되도록 수정

## 작업 결과
- 코드 커밋: `23b74bbaf9beced2ce85291c0d9b8111c3c9c7c0`
- Build PASS · Regression 86/86 PASS (534 tests)
- PR TBD

## 발견 이슈
없음

## 변경 파일
- `supabase/migrations/20260716020000_iss534_surge_fees_alpha2_fix.sql` (신규) — 30행 alpha-3→alpha-2 UPDATE + column comment 갱신
- `src/app/[locale]/(dashboard)/admin/ups-rates/ups-rates-client.tsx` — SurgeFeeForm 라벨/placeholder/slice 갱신
- `tests/unit/ups/surge-fee-alpha2.test.ts` (신규) — alpha-2 매칭 검증 4건
- `tests/unit/ups/pricing-engine.test.ts` — 기존 surge fee fixture alpha-2 갱신

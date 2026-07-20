# TASK-168: #617 요금 계산 엔진 RLS 0% 할인 처리 수정

> **Issue**: [#617](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/617)
> **생성일**: 2026-07-20
> **담당**: D_Kai
> **상태**: 🔔 (검토 요청)

## 📋 업무 개요

`estimateUpsFreight()`가 화주 세션(RLS 스코프) Supabase 클라이언트로 `zen_agency_pricing_policies`·`zen_agency_other_charges`를 조회하여 RLS에 의해 조용히 빈 결과 → 할인율 0%로 처리되는 버그 수정.

## 🔧 변경 사항

### `src/app/actions/ups/freight.ts`
- `createAdminClient()` import 추가
- `zen_agency_pricing_policies`·`zen_agency_other_charges` 조회를 `admin` 클라이언트로 변경 (서비스 롤, RLS 우회)
- `zen_organizations.volumetric_divisor`·`zen_agency_shipper_zone_discounts`는 기존 RLS 클라이언트 유지 (각각 SHIPPER/AGENCY_SHIPPER 전용 RLS 정책 존재)

### `tests/unit/ups/freight-actions.test.ts`
- `@/utils/supabase/server` mock 추가 (`createAdminClient`)
- agency 경로 테스트에서 `createAdminClient` mock 설정

## ✅ 검증

| 항목 | 결과 |
|:----|:----:|
| freight-actions.test.ts | 9/9 PASS |
| 전체 회귀 테스트 | 648/648 PASS |

## 📝 작업 결과

**코드 커밋**: `(HEAD of feature/teama-iss617-pricing-rls-admin-client)`
**문서 커밋**: `(이 문서)`

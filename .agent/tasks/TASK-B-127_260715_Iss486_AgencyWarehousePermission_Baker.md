# TASK-B-127

## 기본 정보
- **번호**: TASK-B-127
- **제목**: Issue #486 — AGENCY 역할 창고 입고/출고 처리 권한 부여
- **이슈**: #486
- **우선순위**: P1
- **생성일**: 2026-07-15
- **상태**: 🔔 완료 보고

## 작업 내용
AGENCY 역할에 창고 입고/출고 처리 권한을 부여하고, 조직 스코핑(zen_agency_shippers)을 적용하여 본인 소속 화주 오더만 조회·처리 가능하도록 구현

## 작업 결과
(완료 후 기재)

## 발견 이슈
(발견 시 기재)

## 변경 파일
- `supabase/migrations/20260715000000_iss486_agency_warehouse_permission.sql` (신규)
- `src/lib/auth/rbac.ts` — STATIC_PERMISSIONS AGENCY에 `/warehouse` 추가
- `src/app/[locale]/(dashboard)/warehouse/inbound/page.tsx` — 페이지 가드 AGENCY 추가
- `src/app/[locale]/(dashboard)/warehouse/outbound/page.tsx` — 페이지 가드 AGENCY 추가
- `src/app/actions/operations/warehouse.ts` — AGENCY 롤체크 + 조직 스코핑
- `tests/unit/auth/agency-rbac.test.ts` — AGENCY warehouse 테스트 2건 추가

## 테스트 결과
- Build: PASS
- Regression: 81/81 PASS, 492 tests ALL PASS

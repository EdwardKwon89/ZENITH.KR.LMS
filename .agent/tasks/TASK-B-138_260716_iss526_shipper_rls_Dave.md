# TASK-B-138: Issue #526 — zen_agency_shippers RLS 정책 SHIPPER/AGENCY_SHIPPER 누락 수정

**담당**: Dave
**생성일**: 2026-07-16
**우선순위**: P1 (Critical)
**상태**: 🔔

---

## [작업 결과]

### 변경 파일
1. `supabase/migrations/20260716010000_iss526_agency_shippers_shipper_rls.sql` — `agency_shippers_shipper_select` 정책 DROP+CREATE (SHIPPER/AGENCY_SHIPPER 역할 추가)

### 사용처 확인
`getAgencyOrgIdByShipper()` → 2곳 영향:
- `shipper/ups-rates/page.tsx` (할인율 조회)
- `UpsFreightEstimateSection.tsx` (UPS 견적)

### 검증
- **CI Regression Tests**: ✅ PASS
- **Task File Check**: ✅ PASS

### 커밋
- `293932496ffc8d04bb46ef945bcb9eb89d6cc587` — `[Dave] fix: TASK-B-138 Issue #526 — zen_agency_shippers RLS SHIPPER/AGENCY_SHIPPER 추가`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/527

---

## [DoD Checklist]

- [x] 마이그레이션 SQL 작성 (DROP+CREATE POLICY)
- [x] SHIPPER/AGENCY_SHIPPER role 추가 확인
- [x] getAgencyOrgIdByShipper 사용처 2곳 확인
- [x] CI 회귀 테스트 PASS 확인
- [x] task file + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음

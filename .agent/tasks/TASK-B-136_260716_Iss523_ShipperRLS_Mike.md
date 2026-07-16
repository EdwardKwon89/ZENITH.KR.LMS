# TASK-B-136: Issue #523 — SHIPPER 역할 RLS 정책 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#523](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/523) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-16 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 신규: `supabase/migrations/20260716000000_iss523_shipper_zone_discounts_rls.sql`
- `zen_agency_shipper_zone_discounts`에 SHIPPER/AGENCY_SHIPPER 역할 SELECT 허용 RLS 정책 추가
- 조건: `shipper_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid`

### 검증
- **Build PASS** ✅
- **Regression**: 85/85 ALL PASS (534 tests)

### 커밋
- 코드 커밋: `ee1e258dadfe1b3a4e6b078741ae9e20261f324e`

### 발견 이슈
없음

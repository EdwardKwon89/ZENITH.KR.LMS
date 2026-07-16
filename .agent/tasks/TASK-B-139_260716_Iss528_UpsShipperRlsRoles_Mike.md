# TASK-B-139: Issue #528 — UPS base_rates/tier/freight_min RLS role 확장

| 메타 | 값 |
|:----|:----|
| **Issue** | [#528](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/528) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-16 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 신규: `supabase/migrations/20260716000001_iss528_ups_shipper_rls_roles.sql`
- 3개 UPS 요율 테이블 RLS 정책 role 배열 확장
- `role IN ('CORPORATE','INDIVIDUAL')` → `role IN ('CORPORATE','INDIVIDUAL','SHIPPER','AGENCY_SHIPPER')`
- 대상: zen_ups_base_rates, zen_ups_weight_tier_rates, zen_ups_freight_minimums

### 검증
- **Build PASS** ✅
- **Regression**: 85/85 ALL PASS (534 tests)

### 커밋
- 코드 커밋: `36c0f39ece693ae22447ce7f3037dea14156b164`

### 발견 이슈
없음

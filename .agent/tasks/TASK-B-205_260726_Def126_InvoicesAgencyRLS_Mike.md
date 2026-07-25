# DEF-126: zen_invoices RLS AGENCY SELECT 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#831](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/831) (DEF-126) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 마이그레이션 (`20260726000000_def126_invoices_agency_rls.sql`)

| 테이블 | 정책 | 설명 |
|:-------|:-----|:-----|
| `zen_invoices` | SELECT | AGENCY가 자소 화주의 청구서 조회 가능 |

- `zen_agency_shippers` 테이블 사용 (shipper_org_id 매칭)
- GRANT SELECT TO authenticated (CI 환경 대응)

### 파일 목록
- `supabase/migrations/20260726000000_def126_invoices_agency_rls.sql` — 신규
- `tests/unit/migrations/def126-invoices-agency-rls.test.ts` — 신규 (4건)

### 검증
- 테스트: **4/4 PASS**
- 빌드: ✅ PASS
- 회귀: **126/126 파일 PASS, 829/829 테스트 PASS**
- 커밋 해시: `4e1a3426`
- PR: [#842](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/842)

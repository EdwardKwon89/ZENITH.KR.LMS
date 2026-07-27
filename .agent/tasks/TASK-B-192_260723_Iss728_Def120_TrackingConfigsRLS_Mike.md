# TASK-B-192: DEF-120 — zen_tracking_configs RLS AGENCY SELECT 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#728](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/728) (DEF-120) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-23 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 마이그레이션 (`20260723060000_def120_tracking_configs_agency_rls.sql`)

| 테이블 | 정책 | 설명 |
|:-------|:-----|:-----|
| `zen_tracking_configs` | SELECT | AGENCY가 자소 화주의 트래킹 설정 조회 가능 |

- DEF-114 패턴(`agency_org_id`) 적용
- GRANT SELECT TO authenticated (CI 환경 대응)

### 파일 목록
- `supabase/migrations/20260723060000_def120_tracking_configs_agency_rls.sql` — 신규
- `tests/unit/migrations/def120-tracking-configs-agency-rls.test.ts` — 신규 (4건)

### 검증
- 테스트: **4/4 PASS**
- 빌드: ✅ PASS
- 회귀: **114/114 파일 PASS, 769/769 테스트 PASS**
- 커밋 해시: `fe3d482a`
- PR: [#729](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/729)

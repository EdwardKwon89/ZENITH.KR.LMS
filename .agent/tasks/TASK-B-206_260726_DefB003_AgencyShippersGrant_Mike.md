# TASK-B-206: DEF-B-003 — zen_agency_shippers authenticated GRANT 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#847](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/847) (DEF-B-003) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 마이그레이션 (`20260726100000_defb003_agency_shippers_grant.sql`)
```sql
GRANT SELECT ON public.zen_agency_shippers TO authenticated;
```

### 파일 목록
- `supabase/migrations/20260726100000_defb003_agency_shippers_grant.sql` — 신규
- `tests/unit/migrations/defb003-agency-shippers-grant.test.ts` — 신규 (1건)

### 검증
- 테스트: **1/1 PASS**
- 빌드: ✅ PASS
- 회귀: **128/128 파일 PASS, 834/834 테스트 PASS**
- 커밋 해시: `4c76c8fe`
- PR: [#849](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/849)

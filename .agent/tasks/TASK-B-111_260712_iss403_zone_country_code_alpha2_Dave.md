# TASK-B-111: Issue #403 — UPS Zone 국가코드 alpha-3→alpha-2 마이그레이션

**담당**: Dave (DeepSeek V4 Flash Free)  
**생성일**: 2026-07-12  
**완료 예정**: 2026-07-12  

---

## [설계 의견] — 2026-07-12 Dave

Option A 채택: `zen_ups_zone_countries.country_code`를 3자리→2자리로 마이그레이션 (46행, CASE문 사용).  
Jaison 승인 완료 (2026-07-12T13:38:27Z).

## [설계 확정] — 2026-07-12 Jaison

Option A 승인. 착수.

---

## [작업 결과]

### 변경 파일
1. `supabase/migrations/20260712110000_iss403_zone_country_code_alpha2.sql` (신규) — 46행 alpha-3→alpha-2 UPDATE CASE문
2. `supabase/migrations/20260628000000_ups_seed_data.sql` (수정) — INSERT 값 alpha-2로 변경

### 코드 변경 없음
`resolveZoneByCountry()`는 그대로 유지 (alpha-2로 정상 매칭됨)

### 검증
- **Regression Tests**: ✅ PASS (485/485, 5m5s)
- **Task File Check**: ✅ PASS

### 커밋
- `15fc5a9a` — `[Dave] feat: TASK-B-105 Issue #403 — UPS Zone 국가코드 alpha-3→alpha-2 마이그레이션`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/407

---

## [DoD Checklist]

- [x] 마이그레이션 SQL 작성 및 검토 완료
- [x] 시드 데이터 SQL alpha-2 일관성 확인
- [x] CI 회귀 테스트 PASS 확인 (485/485)
- [x] PR 생성 완료 (Closes #403)
- [x] 작업 결과 Jaison 보고 완료

---

## [발견 이슈]

없음

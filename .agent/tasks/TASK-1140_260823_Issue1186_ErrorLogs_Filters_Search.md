# TASK-1140: /admin/error-logs 조회 UI 개선 — 필터·검색 추가 (Issue #1178 후속)

- **GitHub Issue**: [#1186](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1186)
- **등록일**: 2026-08-23
- **담당**: B_Kai (Team A)
- **우선순위**: P3
- **상태**: 🔄 진행 중 (status:in-progress)

## [배경]

(Issue #1186 인용) TASK-1138 및 #1181~1183(핵심 지점 알림)으로 `zen_error_logs`에 실패 이벤트가 쌓이기 시작하는데, 현재 `/admin/error-logs` 화면은 목록만 보여줄 뿐 조회 편의 기능 부족:
1. `getErrorLogs()`는 severity/resolved 필터를 이미 지원하나 `page.tsx`가 `{page:1,pageSize:50}`로만 호출 — 필터 UI 자체가 없음
2. 오더/reference_no 연결 안 됨(URL 경로만 표시)
3. 키워드 검색 기능 없음

## [설계 확정]

(Issue 인용)
- Severity(CRITICAL/ERROR/WARNING) + 해결여부(Open/Resolved) 필터 드롭다운 추가(클라이언트 상태 → getErrorLogs() 재호출)
- 메시지 키워드 검색창 추가(ilike 방식 서버 필터 권장)
- 기본 정렬/강조: 미해결 + CRITICAL이 상단에 먼저 보이도록 기본 정렬 조정(또는 진입 시 기본 필터 resolved=false)
- (선택) 오더 참조번호 파싱 링크 — 불안정하면 후속 검토로 제외 가능

### 구현 방침 (B_Kai)

1. **서버** (`monitoring.ts` getErrorLogs): `search?: string` 파라미터 신설 → `.ilike('message', %term%)`. 기본 정렬을 3단 다중 정렬로 교체: `resolved asc` (미해결 먼저) → `severity asc` (텍스트 정렬상 CRITICAL < ERROR < WARNING = 우선순위와 일치) → `created_at desc`
2. **클라이언트** (`ErrorLogsTable.tsx`): ZenSelect 드롭다운 2개(Severity/Status) + ZenInput 검색창(debounce 400ms) — 변경 시 getErrorLogs({page:1, pageSize:50, ...filters}) 재호출. 초기 데이터는 page.tsx 서버 페치 유지
3. 선택 항목(오더 링크 파싱)은 본 스코프 제외 — 후속 검토 (Issue 허용 범위)

## [DoD] (Issue #1186 인용)

- [ ] Severity·해결여부 필터 UI 추가 + 정상 동작 확인
- [ ] 키워드 검색 추가 + 정상 동작 확인
- [ ] 기본 진입 시 미해결 CRITICAL이 우선 노출되도록 정렬/필터 조정
- [ ] 신규 회귀 테스트 추가(필터 파라미터 전달 검증 등) + LIVE_REGRESSION_TEST_MAP.md 갱신
- [ ] R-10: 실제 브라우저에서 필터·검색 동작 스크린샷/확인
- [ ] `npm run build` / `npm run test:regression` 전체 PASS
- [ ] `gitnexus_detect_changes()` 확인

## [작업 결과]

**2026-08-23 B_Kai 완료**

- 코드 커밋: `f257e5540fddb49871733a52e8610363bcb7c146`

### 구현 내용
1. **서버** (`src/app/actions/misc/monitoring.ts` getErrorLogs)
   - `search?: string` 파라미터 신설 → `.ilike('message', '%term%')` 서버 필터(좌우 trim 처리, 공백뿐 입력은 무시)
   - 기본 정렬을 3단 다중 정렬로 교체: `resolved asc`(미해결 우선) → `severity asc`(텍스트 정렬상 CRITICAL < ERROR < WARNING = 심각도 순과 일치) → `created_at desc` → **기본 진입 시 미해결 CRITICAL이 최상단 노출**
2. **클라이언트** (`src/components/admin/error-logs/ErrorLogsTable.tsx`)
   - Severity(CRITICAL/ERROR/WARNING)·Status(Open/Resolved) ZenSelect 드롭다운 2개 추가
   - 메시지 키워드 검색창(ZenInput) 추가 — debounce 400ms 후 `getErrorLogs({page:1, pageSize:50, ...filters})` 재호출
   - Resolve 처리 후 현재 필터 조건으로 재조회하여 목록-상태 동기화
3. **잠재 버그 수정 (발견 즉시 포함)**: 기존 셀 렌더러의 `new URL(row.original.url)`이 상대 경로(`/api/orders/o1/label` 등)에서 `TypeError: Failed to construct 'URL'`을 던져 **페이지 전체가 에러 바운더리로 크래시**함(운영 로그에도 상대경로 url 존재 가능). `getUrlDisplay()` try/catch 헬퍼로 파싱 불가 시 원본 문자열 표기로 변경

### 테스트
| 구분 | 결과 |
|---|---|
| 신규 단위 테스트 | `tests/unit/monitoring/error-log-filters.test.ts` TC-ELF-01~06 (6건 PASS) — severity/resolved/search 파라미터 전달, 빈 검색어 무시, 3단 정렬, 무필터 페이징 |
| 기존 회귀 | `error-log.test.ts` 4건 PASS(무회귀) |
| 전체 회귀 | **205 files / 1,443 tests ALL PASS** |
| build | `npm run build` 성공 |
| R-10 실브라우저 | `tests/e2e/r10-issue1186-errorlogs-filters.spec.ts` **4/4 PASS** — 스크린샷 4장: `docs/99_Manual/E2E_31_Result/TASK1140_2026-08-23/` |

### DoD 체크
- [x] Severity·해결여부 필터 UI 추가 + 정상 동작 확인 (R-10 TC-B/TC-C)
- [x] 키워드 검색 추가 + 정상 동작 확인 (R-10 TC-D)
- [x] 기본 진입 시 미해결 CRITICAL 우선 노출 (서버 3단 정렬, R-10 TC-A)
- [x] 신규 회귀 테스트(TC-ELF 6건) + LIVE_REGRESSION_TEST_MAP.md §56 등록
- [x] R-10 실브라우저 필터·검색 동작 스크린샷 (4장)
- [x] build / test:regression 전체 PASS
- [x] gitnexus_detect_changes(): risk low, 영향 프로세스 0건

### 스코프 제외
- 오더 참조번호 파싱 링크(Issue 선택 항목) — 파싱 안정성 확보 전까지 제외, 후속 검토 권장

## [발견 이슈]

1. **[환경] 로컬 DB RLS 정책 드리프트**: 로컬 Supabase의 `zen_error_logs`에서 "Admin full access on zen_error_logs"(FOR ALL SELECT 허용) 정책이 소실되어 있었음(마이그레이션 `20260429100000_zen_error_logs.sql`에는 정의됨 → **마이그레이션 자체는 정상**, 로컬 DB 역사적 드리프트). 마이그레이션 원문대로 psql로 수동 복구 후 해소. **운영/스테이징 DB에도 동일 정책 존재 여부 점검 권장**(부재 시 관리자 에러로그 조회가 전면 실패함)
2. **[환경] stale `.next` 캐시**: 브랜치 전환 반복 후 `/admin/*` 전 라우트가 404를 반환하는 현상 확인 — `.next` 삭제 후 재기동으로 해소. 향후 브랜치 스위칭 후 수상한 404는 캐시 클리어 선행 권장
3. **[환경] auth 계정 소실**: 전일 TASK-1139 중 실행한 `supabase db reset`으로 시드 계정이 삭제되어 있었음 → `npm run db:seed` 재실행으로 복구(103_AGENT_ROLES_SPEC.md §5-1 절차 준수)

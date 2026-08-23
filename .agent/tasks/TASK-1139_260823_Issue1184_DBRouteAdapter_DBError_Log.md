# TASK-1139: 로그 커버리지 개선 ④ — DatabaseRouteAdapter.ts DB에러/무경로 구분불가 (2건)

- **GitHub Issue**: [#1184](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1184)
- **등록일**: 2026-08-23
- **담당**: B_Kai (Team A)
- **우선순위**: P3
- **상태**: 🔍 검토 대기 (status:review, 2026-08-23)

## [배경]

(Issue #1184 인용) `src/lib/logistics/adapters/DatabaseRouteAdapter.ts`에서 Supabase 조회 에러가 발생해도 "경로/요율 없음"과 동일하게 조용히 처리됨:
- `appendDirectRoutes`의 `if (error || !routes...) return;`
- 요율 조회(`lookupRate`)의 `if (error || !data) return 0;`

실제 DB 장애와 정상적인 "데이터 없음"이 로그상 구분 불가 — 요금 엔진 전반에 영향을 주는 영역이라 원인 추적이 중요.

## [설계 확정]

(Issue 인용) `error` 존재 시(진짜 DB 실패)와 `!routes`/`!data`(정상적인 빈 결과)를 분기해서, DB 에러 케이스에만 `logger.error()` 추가. 정상 빈 결과는 로깅 불필요(노이즈 방지).

### 구현 방침 (B_Kai)

- 분기 패턴: `if (error) { logger.error(...); return; }` + 기존 빈결과 가드 유지
- 메시지 컨벤션: 인접 컨벤션(tracking.ts `[TRACKING_MANAGER] ...`) 준수 — `[DB_ROUTE_ADAPTER]` prefix + 조회 조건 컨텍스트(origin→dest / carrierId+mode) + `error.message`
- 범위: Issue 명시 2개 지점만 (`appendHubRoutes` leg1/leg2의 유사 패턴은 스코프 외 — 후속 제안을 작업 결과에 기재)

## [DoD] (Issue #1184 인용)

- [x] 2개 지점 모두 error/빈결과 분기 후 error 케이스에 logger.error() 추가
- [x] 신규 회귀 테스트 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신
- [x] `npm run build` / `npm run test:regression` 전체 PASS
- [x] `gitnexus_detect_changes()` 확인

## [작업 결과]

- **코드 커밋**: 3fdac953056ce2408a78c5a80b60248155b5c972 — `[B_Kai] feat: TASK-1139 DB 경로/요율 조회 에러·빈결과 분기 로깅 — DatabaseRouteAdapter (Issue #1184)`
- **브랜치**: `feature/teama-task-1139-dbroute-dberror-log` (origin/develop 기반 신규 — TASK-1138 머지 이후 develop 기준)

### 구현 내역

| 파일 | 변경 |
|:---|:---|
| `src/lib/logistics/adapters/DatabaseRouteAdapter.ts` | ① `appendDirectRoutes`: `if (error || !routes...) return;` → `if (error) { logger.error('[DB_ROUTE_ADAPTER] Direct route query failed (origin -> dest):', error.message); return; }` + 빈결과 가드 분리. ② `lookupRate`: `if (error || !data) return 0;` → 동일 패턴 분기(`Rate card query failed (carrierId/mode)`). 정상 빈결과는 기존대로 무로그 |
| `tests/unit/logistics/database-route-adapter-dberror.test.ts` | 신설 5건 (TC-DBE-01~05): 에러 시 로그+예외흡수 / 빈결과 무로그 / 요율 에러 시 cost 0 폴백 유지 / 요율 부재 무로그 / 정상 흐름 무에러 |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | §55 신설 (TC-DBE 5행) |

### DoD 충족 증거

| DoD 항목 | 증거 |
|:---|:---|
| 2개 지점 분기 + logger.error | 커밋 diff 참조 — 메시지 컨벤션은 인접 사례(tracking.ts `[TRACKING_MANAGER] ...`) 준수 |
| 회귀 테스트 + LIVE 맵 갱신 | TC-DBE-01~05 신설(단독 실행 PASS) + §55 등록 |
| build / test:regression PASS | `npm run build` 성공 · **205 files / 1,442 tests ALL PASS**(기존 1,437 + 신규 5 일치) ※1차 실행 시 로컬 DB 잔존 시드로 RLS 테스트 2건 실패 → `supabase db reset` 후 전건 PASS(환경 문제, 코드 무관) |
| gitnexus_detect_changes() | risk **low**, affected_processes 0건. grep 병행: DatabaseRouteAdapter 호출부는 `src/app/actions/operations/routing.ts` 단일, 변경은 additive(error 경로 로깅 추가·시그니처 무변경) |

### 후속 제안 (스코프 외, R-18 성격 아님)

- `appendHubRoutes`의 leg1/leg2 조회(L103·L125)도 동일한 `error || 빈결과` 합산 가드 패턴 — 본 Issue 설계 확정이 "2개 지점"으로 한정해 미수정. 동일 개선을 원하면 후속 소규모 Task 권장

## [발견 이슈]

없음

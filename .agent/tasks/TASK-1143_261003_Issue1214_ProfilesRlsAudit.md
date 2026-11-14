# TASK-1143: Issue #1214 — profiles 뷰 참조 RLS 정책 전수 감사 (DEF-137 후속)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1214](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1214) |
| **DEF** | 신규 DEF 없음 (감사 결과 소실 정책 없음 — 아래 결론 참조) |
| **담당** | B_Kai (Team A) |
| **생성일** | 2026-10-03 |
| **우선순위** | P2 (refactor/audit) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1143-profiles-rls-audit` (origin/develop `e0e71a3a9` 기준) |

> 워크트리 노트: 전용 워크트리(`b_kai`)에서 `origin/develop` 기준 브랜치 직접 생성
> (`develop` 로컬 체크아웃은 메인 디렉토리가 점유 중 — TASK-1142와 동일한 동등 조치).
> DB freshness: `agent-worktree-init` 시점 OK였으나 그 후 acted 내역 없음 — 본 Task는
> 마이그레이션을 작성하지 않으므로(아래 결론) reset 불필요. RLS 실측은 로컬 DB 직접 수행.

## 조사 방법 (Issue 권장 준수)

- 마이그레이션 grep (`FROM profiles`) + 로컬 DB `pg_policies` 실측 병행.
- bare-`profiles` 참조 판정 쿼리:
  `replace(qual||with_check, 'zen_profiles','') LIKE '%profiles%'`
  (정규식 `FROM\s+profiles([^_]|$)`로 1차 확인 후 위 쿼리로 확정).
- 빈 테이블(`customs_declarations`, `zen_invoice_files` 로컬 0건)은 마커행 삽입 후
  RLS 세션 시뮬레이션(`SET LOCAL role/request.jwt.claims`, TASK-1142 패턴)으로 실측.

## 감사 결과 (테이블별 — DoD "문제 없어도 기재" 준수)

### ① `zen_error_logs` — ✅ 정상 (TASK-1142 수정 유지 확인)

- `Admin full access on zen_error_logs|ALL` 존재 (TC-AUD-05로 회귀 고정).
- bare-`profiles` 참조 없음 (jwt 방식).

### ② `customs_declarations` — ✅ 정상 (조치 불필요)

- 원본 `Allow all access for admin`(FOR ALL, profiles 참조)은 imp049 CASCADE로 소실된 것이 맞음.
- 그러나 **직후일(2026-04-30) `20260430000000_fix_customs_rls.sql`이 이미
  `zen_profiles` 기반 `Admins can view all declarations`(SELECT) +
  `Admins can update declarations`(UPDATE)로 대체** — CASCADE 이전에 커버 확보됨.
- 현재 4개 정책 모두 `zen_profiles`/jwt 기반, bare-`profiles` 참조 0건.
- 잔여 갭 검토: admin DELETE 정책 없음. `src/app/actions/misc/customs.ts`에
  `customs_declarations` 삭제 경로 없음(삭제 UI/API 부재) — 갭 아님으로 판정, 조치 없음.

### ③ `zen_invoice_files` — ✅ 정상 동작 확인 (조치 불필요)

- `org_isolation`·`admins_all` 2건 모두 `profiles` **뷰** 참조이나,
  2026-06-30 생성(뷰 교체 이후)이라 CASCADE 대상이 아니었고, 세션 시뮬레이션 실측 결과
  뷰 경유 평가가 정상 동작함:
  ADMIN 1건 / 소속 화주 1건 / 타사 0건 (마커행 실측, 정리 완료).
- 즉 DEF-137식 "뷰 경유 실패"는 이 테이블에서 발생하지 않음 —
  `profiles` 뷰 자체는 일반 SELECT에 정상 동작하며, DEF-137의 진짜 원인은
  "정책 자체의 CASCADE 소실"이었음이 재확인됨.
- TC-AUD-01~03으로 회귀 고정 (자체 픽스처, CI fresh-DB 호환).

### ④ `customs_adapters` — ✅ 정상

- `Allow select for authenticated users`(USING true). Aiden production 스팟체크(1/1)와 일치.

### 확정 bare-`profiles` 참조 목록 (DB 실측)

- `zen_invoice_files.admins_all`, `zen_invoice_files.org_isolation` — 2건のみ, 모두 ③에서 정상 확인.
- TC-AUD-04가 이 목록을 고정 (추가 소실·신규 참조 발생 시 테스트 실패).

## 결론

- **소실된 정책 없음 → 마이그레이션 작성 없음** (DoD 조건부 항목 해당 없음).
- **신규 DEF 없음.**
- 회귀 테스트 5건 신설 (감사 증적 고정용) + 맵 갱신.

## 착수 체크리스트

- [x] `git fetch origin` + `origin/develop` 기준 브랜치 생성 (전용 워크트리 `b_kai`)
- [x] `./scripts/next-task-number.sh A` → TASK-1143 확인
- [x] `gh issue edit 1214 --add-label status:in-progress`
- [x] 마이그레이션 grep + `pg_policies` 실측 (4건 전수)
- [x] `zen_invoice_files` 세션 시뮬레이션 실측 (ADMIN/소속/타사)
- [x] 회귀 테스트 신설 (behavioral 5건)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1214 원문 대비)

- [x] `profiles` 참조 활성 정책 실측 (`pg_policies` 직접 조회)
- [x] 소실 정책 여부 판정 → 없음 (마이그레이션 조건부 항목 미해당)
- [x] 빈 테이블 마커행 세션 시뮬레이션 실측
- [x] 테이블별 결과 기재 (위 감사 결과)
- [x] 회귀 테스트 + 맵 갱신

## [작업 결과]

- 코드 커밋: `12f98e7416364510c0e6ed0fa0a1a3015bfaa8d0`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 217 passed (217), Tests 1519 passed (1519)
- DoD 항목별 증거:
  - 실측 쿼리·결과: 위 감사 결과 ①~④ (마커행은 검증 후 삭제, DB 잔류 없음)
  - 회귀 테스트: `tests/unit/migrations/task1143-profiles-rls-audit.test.ts`
    TC-AUD-01~05 전량 behavioral — 단독 5/5 PASS (전체 수치 아래)
  - 맵 갱신: `LIVE_REGRESSION_TEST_MAP.md` §21에 TC-AUD-01~05 5행 추가

## [발견 이슈] (R-18)

- (작업 중 발견 시 기재)

## [Aiden 검토]

- (반려 시 사유 기재)

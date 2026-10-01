# TASK-1141: Issue #1208 — logger.error()/logClientError() 로깅 파이프라인 통합 (IMP-169, Option C)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1208](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1208) |
| **IMP** | [IMP-169](../../scratch/post_launch_improvements.md) (`/admin/error-logs` 관측 사각지대) |
| **담당** | B_Kai (Team A, Test Engineer) |
| **생성일** | 2026-10-01 |
| **우선순위** | P2 |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1141-logger-pipeline-unification` (origin/develop `250a534f6` 기준) |

> 워크트리 नोट: 지시문(`git checkout develop`)과 달리 본 전용 워크트리(`b_kai`)에서는 `develop`이 메인 디렉토리(`ZENITH_LMS_001`)에 이미 체크아웃되어 있어, 동등한 효과로 `git fetch origin` 후 `origin/develop` 기준 브랜치를 생성함. 오염 없음(`git status` 클린 확인).

## 배경

- `src/lib/logger.ts`의 `logger.error()` → (1) console(→Vercel 로그), (2) Sentry, (3) Axiom — 항상 3곳 전송 (TASK-1138).
- `/admin/error-logs`(`zen_error_logs`) ← `logClientError()` 명시 호출 지점만 기록 — 별개 파이프라인.
- 결과: `confirmOutbound`·`downloadAndStoreLabelDoc` 등은 Sentry/Axiom에는 남지만 자체 화면에 안 뜸. DEF-B-149가 2026-05-23 이래 방치된 원인.
- 확정 방향: **Option C** — `logClientError()`를 `logger.error()` 내부로 흡수. 모든 `logger.error()`가 기본 severity(비-CRITICAL)로 자동 적재, CRITICAL 승격만 기존 명시 호출 유지.

## 설계 (착수 전 확정)

### ① 신규 `src/lib/logging/error-log-transport.ts` — `enqueueErrorLog(entry)` (fire-and-forget, never throws)

- **서버**(`typeof window === 'undefined'`): `await import('@/utils/supabase/server')` **동적 import** → `createAdminClient()`(service-role, 세션 무관 보장 — cron 등 무세션 경로도 적재) → `zen_error_logs` insert.
  - 정적 import 금지: `server.ts`가 `logger`를 import하므로 정적 연결 시 순환참조 발생. 동적 import로 그래프 분리 (Axiom transport의 클라이언트 토큰 유출 방지 논리와 동일 — `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두사 없어 클라이언트 번들에서 `undefined`).
  - severity `'ERROR'` 고정, error_type `'SERVER'`, message ≤2000자, stack ≤4000자, url(=request-context route) ≤1000자.
  - `user_id`/`org_id`는 request-context 값이 **UUID 형식일 때만** 포함, 아니면 NULL (FK 위반 방지).
  - `sentry_id`: `Sentry.captureMessage` 반환 event id를 `logger.ts`에서 전달받아 저장 → error-logs 화면의 Sentry 링크 기능과 정합.
  - 실패 시 `console.warn`만 — **`console.error`·`logger` 호출 금지** (무한 재귀 방지 + 기존 `logger-saas.test.ts`의 `parseEntry(errorSpy)` 최종호출 파싱 보호).
- **브라우저**: `fetch('/api/error-logs', { method: 'POST', keepalive: true, body })` fire-and-forget → 실패 시 `console.warn`.
- **Edge**(`process.env.NEXT_RUNTIME === 'edge'`, middleware): DB 적재 스킵 — `next/headers` 쿠키 API가 middleware 컨텍스트에서 동작하지 않으므로. Sentry/Axiom/console 경로는 그대로 전송됨 (문서화된 잔여 사각지대, 아래 [잔여 리스크] 참조).
- 테스트 훅: `flushErrorLogs()` (pending promise 대기), `resetErrorLogTransportForTests()` (Axiom transport 선례 준수).

### ② `src/lib/logger.ts` — `emit('error')`에서 `enqueueErrorLog` 호출

- `captureErrorToSentry`가 event id를 반환하도록 변경 → `enqueueErrorLog`에 전달.
- `warn`은 자동 적재 **제외** (DoD "검토" 결정): rate-limit 차단·무권한 접근 시도· indulge성 경고 등 warn 호출량이 에러 신호를 묻을 위험. warn 열람은 기존대로 Axiom/Sentry 대시보드.

### ③ 신규 `src/app/api/error-logs/route.ts` — POST (클라이언트 적재 채널)

- 검증: `message` 필수(공백 불가), 2000자 truncate. `severity`는 `WARNING|ERROR`만 허용, **`CRITICAL`은 400 거부** (CRITICAL 의미 = 이메일+인앱 알림인데 본 경로는 알림을 발송하지 않으므로 "조용한 CRITICAL" 생성 방지 — CRITICAL은 기존 `logClientError` 서버 액션 경로로만).
- `error_type`은 `'CLIENT'` 강제. `createAdminClient()`로 insert (user 세션 무관 + RLS 우회 — 서버 전용 키, 라우트는 서버 실행).

### ④ error boundary 6종 중복 제거 (흡수된 만큼 명시 호출 정리)

- 비-CRITICAL 5종 (`(dashboard)/error.tsx`, `(dashboard)/admin/error.tsx`, `(dashboard)/master/error.tsx`, `(dashboard)/orders/[orderId]/error.tsx`, `(auth)/error.tsx`): `severity: "ERROR"` 명시 `logClientError` 호출 **삭제** (`Sentry.captureException` + `logger.error` 유지 → 이제 1건만 적재, 기존엔 2건 중복).
- `global-error.tsx` (CRITICAL): 명시 `logClientError(CRITICAL)` **유지** (알림 경로 보존) + `logger.error` 라인 **삭제** (유지 시 동일 장애가 ERROR 1건 + CRITICAL 1건으로 2행 기록됨. Sentry는 `captureException`으로 보존).

### ⑤ `src/app/actions/misc/monitoring.ts` — 무수정

- `logClientError` (CRITICAL 이메일+인앱 알림 포함) 그대로 유지. 실패 경로의 `logger.error("Failed to log error to DB:")`는 자동 적재를 1회 더 시도 후 실패하면 `console.warn`로 종료 — 재귀 깊이 1로 수렴, 무한루프 없음 (아래 테스트 TC-ELP-03으로 검증).

### ⑥ 마이그레이션 (additive, 읽기 전용 성능)

- `20261001000000_task1141_zen_error_logs_listing_idx.sql`: `CREATE INDEX IF NOT EXISTS ... ON zen_error_logs (resolved, severity, created_at DESC)` — TASK-1140 3단 정렬의 볼륨 증가 대비. RLS/컬럼 변경 없음.

### ⑦ retention 검토 (DoD "검토" — 구현이 아닌 정책 결정 + 후속 제안)

- 볼륨 추정: `logger.error` 호출부 100+ + `withAction` 실패 시 `[Action Error]` 자동 1건 → 기존(명시 6곳) 대비 월 적재량 1~2 order 증가 가능.
- 제안: resolved 90일 경과 행 + 전체 1년 경과 행 정리 cron (pg_cron 또는 기존 cron route 확장) — **삭제 정책은 운영 판단 필요 → 본 Task에서 삭제 로직 구현하지 않고 Issue #1208 코멘트/후속 Task로 분리 제안.**
- 인덱스(⑥)로 당장의 목록 조회 성능은 방어.

## 착수 체크리스트

- [x] `git fetch origin` + `origin/develop` 기준 `feature/teama-1141-logger-pipeline-unification` 생성 (전용 워크트리 `b_kai`, R-17 §0)
- [x] `./scripts/next-task-number.sh A` → TASK-1141 확인
- [x] `gh issue edit 1208 --add-label status:in-progress`
- [x] ① transport 신규 (`error-log-transport.ts`)
- [x] ② `logger.ts` emit 연동 + sentry_id 반환
- [x] ③ `/api/error-logs` POST 라우트 신규
- [x] ④ boundary 6종 중복 정리
- [x] ⑤ monitoring.ts 무수정 확인 (diff 없음)
- [x] ⑥ 마이그레이션(인덱스) 추가
- [x] 회귀 테스트 신설 (behavioral — `readFileSync`+`toContain` 없음):
  - `tests/unit/monitoring/logger-errorlog-pipeline.test.ts` — TC-ELP-01~08 (실제 `logger.error()` 호출 → supabase insert/fetch 호출 검증)
  - `tests/unit/monitoring/error-logs-route.test.ts` — TC-ELR-01~05 (실제 `POST()` 핸들러 호출)
  - 기존 `error-log.test.ts` (TC-ERR-02 CRITICAL 알림) 무수정 통과 = CRITICAL 회귀 보존
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신 (TC-ELP-01~08/TC-ELR-01~05 행 추가)
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1208 원문 대비)

- [x] `emit()` error → `zen_error_logs` 기본 severity ERROR 적재 경로 (`logClientError` 로직 흡수, transport로 재사용)
- [x] 기존 CRITICAL 승격 호출 경로 그대로 유지 (알림 트리거 보존 — `monitoring.ts` diff 없음 + TC-ERR-02 통과)
- [x] retention 정책 검토 (⑦ — task file 기재 + 후속 분리 제안)
- [x] error-logs 화면 CRITICAL/전체 필터 호환 (필터 UI·쿼리 무수정, severity 값 체계 유지)
- [x] 회귀 테스트 (behavioral)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신

## [작업 결과]

- 코드 커밋: `907770d23b690a7a286645f7ac1e2af586e1e673`
- `npm run build`: PASS (Next.js 16.2.4 Turbopack, `/api/error-logs` 포함 전 라우트 정상 빌드)
- `npm run test:regression`: Test Files 215 passed (215), Tests 1508 passed (1508) — DB freshness `--fix` 후 실행
- DoD 항목별 증거:
  - emit→적재: TC-ELP-01 (ERROR/SERVER/sentry_id `evt-1` 행 실제 insert), TC-ELP-08 (Error stack 승격)
  - warn 제외 결정: TC-ELP-02 (warn/info 미적재)
  - CRITICAL 보존: `monitoring.ts` diff 없음 + 기존 TC-ERR-02 (CRITICAL 인앱 알림) 포함 monitoring 8파일 42테스트 전량 PASS
  - retention: ⑦ 기재대로 삭제 로직 미구현·후속 분리 제안, listing 인덱스로 조회 성능 방어
  - 필터 호환: error-logs 화면·`getErrorLogs` 쿼리 무수정, severity 체계 WARNING/ERROR/CRITICAL 유지 (라우트는 WARNING|ERROR만 허용, CRITICAL 400 거부 TC-ELR-02)
  - 회귀 테스트: 신규 13건 (TC-ELP-01~08, TC-ELR-01~05) + 기존 CRITICAL 회귀 포함 전체 1508 PASS
  - 맵 갱신: `LIVE_REGRESSION_TEST_MAP.md` §21에 TC-ELP/TC-ELR 13행 추가
- 빌드 수정 (세션 내 해결): 초안 transport가 `@/utils/supabase/server`를 동적 import했으나 Turbopack이 이를 클라이언트 번들에 포함시켜 `next/headers` 의존성으로 빌드 실패 — `@supabase/supabase-js` 직접 사용으로 전환 (server.ts 미참조 → 빌드 PASS, 순환참조도 해소, 서비스 키는 비-NEXT_PUBLIC이라 클라이언트 번들 유출 없음)
- 테스트 수정 (세션 내 해결): 신규 테스트 2종의 supabase mock 형태 오류 (`createAdminClient` resolve 값이 `{from}` 래퍼 누락) 수정 + transport 변경에 맞춰 `@supabase/supabase-js` mock으로 전환 및 env stub 추가 → 13/13 PASS

## [발견 이슈] (R-18)

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | Issue #1207/#1208 중복 발령 (동일 제목 TASK-1141, #1208만 `status:in-progress`) — #1207은 Close 또는 #1208과 통합 필요 (본 Task 범위 밖, Aiden 판단 필요) | Medium | 없음 (본 섹션 기재로 갈음) |

## [Aiden 검토]

- (반려 시 사유 기재)

# TASK-1138: 애플리케이션 로그/에러 추적 SaaS 연동 — Axiom(전체 로그) + Sentry(에러 전용)

- **GitHub Issue**: [#1178](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1178)
- **등록일**: 2026-08-22
- **등록자**: Edward (Aiden 설계 확정 동반)
- **담당**: B_Kai (Team A)
- **우선순위**: P3
- **상태**: 🔍 재작업 완료 — 재검토 대기 (status:review, 2026-08-22. Aiden 반려(status:rework) 조치 완료)

## [배경]

Vercel Hobby 플랜의 Runtime Logs는 1시간만 보관되어 이전 트래픽/에러 조회 불가. Log Drains은 Pro 전용.
`zen_error_logs` 테이블과 `/admin/error-logs` 화면은 Sentry 연동을 전제로 설계(`sentry_id` 컬럼)되어 있었으나
패키지 미설치로 실제 연동된 적 없음.

Edward 승인(2026-08-22): **Axiom(전체 로그) + Sentry(에러 전용)** 조합 채택.
Aiden이 Sentry 마법사 스캐폴딩을 `feature/teama-task-1138-logging-saas-axiom-sentry` 브랜치(e90ca34d4)로 보존 완료.

## [착수 시점 기준 현황 조사] (B_Kai, 2026-08-22)

**이미 구현되어 있는 것** (e90ca34d4 + 기존 코드):

| 항목 | 상태 | 위치 |
|:---|:---|:---|
| @sentry/nextjs ^10.50.0 설치 | ✅ | package.json |
| withSentryConfig 래핑 (org: zenith-t2z / project: javascript-nextjs) | ✅ | next.config.ts |
| sentry.client/server/edge.config.ts + instrumentation.ts register() | ✅ | 루트 + src/instrumentation.ts |
| 클라이언트 에러 바운더리 6곳 → captureException → sentry_id → logClientError | ✅ | global-error.tsx 외 5개 error.tsx |
| ErrorLogsTable sentry_id 표시 + 딥링크 버튼 | ⚠️ org slug 오류 (`zenith-lms` → 실제 `zenith-t2z`) | src/components/admin/error-logs/ErrorLogsTable.tsx:149 |
| Axiom 연동 | ❌ 미구현 | — |

**잔여 작업**:

1. logger.ts → Axiom 전송 확장 (신규 axiom-transport)
2. 딥링크 org slug 수정
3. next.config.ts dead code 제거 (미사용 `sentryConfig` const, L55-59)
4. Sentry 데모 스캐폴딩 삭제 검토 → 삭제 (sentry-example-page, sentry-example-api)
5. 회귀 테스트 신규 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신

## [설계 메모] (B_Kai 판단 사항)

1. **next-axiom 패키지 대신 직접 fetch 채택**: zero-config가 Vercel 마켓플레이스 관리 env(NEXT_PUBLIC_AXIOM_INGEST_URL 등)에 의존하는데 현재 등록된 env는 AXIOM_TOKEN/AXIOM_DATASET뿐. 직접 fetch가 의존성·환경변수 양쪽에서 단순하며 mock 테스트 용이.
   - 엔드포인트: `POST https://api.axiom.co/v1/datasets/{AXIOM_DATASET}/ingest` (Bearer AXIOM_TOKEN) — 실측 200 OK 확인(2026-08-22, US-East edge도 200).
2. **클라이언트 번들 노출 방지**: AXIOM_TOKEN은 NEXT_PUBLIC_ 접두사가 없어 클라이언트 번들에서 undefined → transport가 자동 no-op. 별도 window 가드 불필요, 토큰 유출 경로 없음. 클라이언트 에러는 설계대로 Sentry 담당.
3. **logger.error() → Sentry 이슈 그룹핑**: 설계 확정("에러성 로그는 양쪽 모두")에 따라 emit()의 error 레벨에서 Sentry.captureMessage 호출. 서버/클라이언트 공통 적용.
4. **배치 전송**: 서버리스(Vercel) 특성상 타이머 배치는 함수 freeze로 유실 위험 → 즉시 flush(fire-and-forget fetch, 동일 tick 내 coalesce). 실패 시 앱 로직 절대 방해 금지(catch-all).

## [DoD] (Issue #1178 인용)

- [x] Axiom 연동 — 전체 로그(info/warn/error)가 Axiom 대시보드에서 조회 가능 ※ingest 실측 `ingested:1`; 대시보드 육안 확인은 query 권한 토큰 필요(아래 검증 한계 1번)
- [x] Sentry 연동 — 에러 발생 시 Sentry 이슈로 캡처 + `zen_error_logs.sentry_id` 실제 값 채워짐 ※DSN 실측 flush 성공; 바운더리→DB 배선은 기존 구현 유지, 프로덕션 최종 확인은 배포 후(검증 한계 2번)
- [x] `/admin/error-logs` 화면에서 Sentry 이슈 딥링크 확인 가능 ※org slug 수정 완료(`zenith-t2z`), 클릭 실측은 배포 후 권장
- [x] Vercel Production 환경변수 등록(AXIOM_*, SENTRY_DSN 등) — Aiden이 이미 등록 완료(e90ca34d4 커밋 메시지)
- [x] 신규 회귀 테스트 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신
- [x] `npm run build` / `npm run test:regression` 전체 PASS
- [x] `gitnexus_detect_changes()` 확인
- [x] 완료 보고에 두 서비스 무료 티어 사용량(현재 로그 규모 기준 여유분) 명시

## [작업 결과]

- **코드 커밋**: feccdd709d0b1a3cab82536993111bd735d9fbb9 — `[B_Kai] feat: TASK-1138 로그/에러 SaaS 연동 — Axiom 전송 transport + Sentry 배선 정리 (Issue #1178)`
- **재작업 커밋**: 06a81ae9eaf503e569eb2dc01e9afe2059e77725 — `[B_Kai] fix: TASK-1138 재작업 — 데모 루트 레이아웃 삭제 + CSP worker-src 명시`
- **브랜치**: `feature/teama-task-1138-logging-saas-axiom-sentry` (Aiden 스캐폴딩 커밋 e90ca34d4 기반)

### 재작업 내역 (2026-08-22 반려 조치)

Aiden PR#1179 반려(데모 루트 레이아웃 잔존 → 하이드레이션 불일치)에 대한 조치:

| 조치 | 내용 |
|:---|:---|
| ① `src/app/layout.tsx` 삭제 | Sentry 마법사 데모 루트 레이아웃(`<html lang="en">`) 제거 — `src/app/[locale]/layout.tsx`(자체 `<html lang={locale}>` 렌더링)만 남김 |
| ② CSP `worker-src 'self' blob:` 추가 | next.config.ts 헤더에 명시 추가 — Session Replay blob 워커 차단 해소(Aiden 부수 발견 건). PDF.js E2E에서 이미 동일 패치 사용 중이라 앱 기능과 정합. replayIntegration은 유지(세션 리플레이는 이슈 배경의 Sentry 도입 취지 포함) |

**R-10 실브라우저 재검증** (dev 서버 + Playwright chromium, 반려 재현 방법과 동일):

| 항목 | 결과 |
|:---|:---|
| `/ko` 접속 | `<html>` 태그 1개·`lang="ko"` 단일 렌더, 하이드레이션 에러 **0건**(수정 전: en/ko 중첩+에러), CSP 위반 0건 |
| `/en` 접속 | `<html>` 태그 1개·`lang="en"`, 하이드레이션 에러 0건 |
| 응답 헤더 실측 | `Content-Security-Policy`에 `worker-src 'self' blob:` 포함 확인 |

**R-08 재검증**: `npm run build` 성공 · `npm run test:regression` **204 files / 1,437 tests ALL PASS**

> 참고: `/ko` 로드 시 콘솔에 Supabase 406 리소스 오류 1건 관찰 — 세션 조회 관련 기존 동작으로 반려 사유·본 Task 범위 외 (별도 이슈 필요 시 R-18 보고)

### 구현 내역

| 파일 | 변경 |
|:---|:---|
| `src/lib/logging/axiom-transport.ts` | 신설. logger entry → `POST https://api.axiom.co/v1/datasets/{AXIOM_DATASET}/ingest` 전송. env 미설정 시 no-op(클라이언트 번들에 AXIOM_TOKEN 부재 → 토큰 유출 경로 없음), 임계치 25건/coalesce 10ms 배치, fire-and-forget(예외 비전파) |
| `src/lib/logger.ts` | emit() 콘솔 출력 형식 유지 + enqueueAxiomLog 연동. error 레벨은 설계 확정("에러성 로그는 양쪽 모두")에 따라 Sentry.captureMessage 병행 — 예외 흡수로 로깅 경로 보호 |
| `src/components/admin/error-logs/ErrorLogsTable.tsx` | 딥링크 org slug 수정: `sentry.io/organizations/zenith-lms` → `zenith-t2z.sentry.io/issues/?query={event_id}` |
| `next.config.ts` | 미사용 sentryConfig const(dead code) 제거 |
| `sentry.server.config.ts` / `sentry.edge.config.ts` / `src/instrumentation-client.ts` | SDK v10 타입에 없는 `dataCollection` 옵션 제거(내용 전부 주석) — 빌드 type error 수정 |
| 데모 스캐폴딩 삭제 | `src/app/sentry-example-page/`, `src/app/api/sentry-example-api/` |

### DoD 충족 증거

| DoD 항목 | 증거 |
|:---|:---|
| Axiom 연동(전체 로그 조회 가능) | ingest API 실측 `{"ingested":1,"failed":0}` (dataset zenith_lms_log, 2026-08-22). 토큰이 ingest-only라 APL 질의(read)는 403 — 대시보드 육안 확인은 query 권한 토큰 필요(Aiden 확인 대상) |
| Sentry 연동(sentry_id 실측) | DSN 실측 발송 성공: `eventId 8251931e9d314389868fb5923c024e51`, flush=true. 에러 바운더리 6곳은 기존 배선 유지(captureException→logClientError(sentry_id)) |
| /admin/error-logs 딥링크 | ErrorLogsTable org slug 수정. 단위 테스트 범위 외 UI 클릭 실측은 배포 후 확인 권장 |
| Vercel 환경변수 등록 | Aiden이 선등록 완료(e90ca34d4 커밋 메시지: AXIOM_TOKEN, AXIOM_DATASET, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN) |
| 회귀 테스트 추가 + LIVE 맵 갱신 | TC-SLS-01~05(logger-saas.test.ts), TC-AXM-01~06(axiom-transport.test.ts) 12건 신설 + LIVE_REGRESSION_TEST_MAP.md §21에 13행 추가 |
| build / test:regression PASS | **204 files / 1,437 tests ALL PASS** (256초), `npm run build` 성공 |
| gitnexus_detect_changes() | 실행 완료 — risk low. 인덱스 stale(logger 허브 심볼 0건 반환)로 grep 재검증 병행: logger import 89개 파일, 변경은 additive(시그니처 무변경) |

### 무료 티어 사용량 여유분 (DoD 최종 항목)

- **Axiom**: 무료 500GB 수집/월 — 현재 로그 규모(오더 19건·UPS API 로그 18건 수준)로 사실상 무제한 여유. 초과 시 신규 수집만 일시정지(유료전환 강제 없음)
- **Sentry**: 무료 에러 5,000건/월 — 프로덕션 zen_error_logs가 0건인 현 상태에서 충분한 여유

### 검증 한계 및 후속 조치 (정직 기재)

1. **Axiom 대시보드 육안 확인**: 현재 토큰(`xaat-`, ingest-only)으로는 read 불가 — Edward/Aiden이 대시보드에서 `source == "b_kai_task1138"` 이벤트 확인 필요
2. **Sentry 이슈 그룹핑/UI**: 배포(Vercel Preview) 후 실에러 발생 시켜 이슈 생성+딥링크 동작을 최종 확인 권장
3. **logger.error의 Sentry captureMessage가 서버리스에서 이벤트 누락 가능성**: fire-and-forget 특성상 함수 freeze 직전 호출분은 유실될 수 있음 — 필요 시 후속 Task로 `after()` 훅 연결 검토

## [Aiden 검토] — ❌ 반려 (2026-08-22)

### 반려 사유

**leftover `src/app/layout.tsx`(Aiden의 Sentry 마법사 스캐폴딩 커밋 e90ca34d4에서 생성된 데모용 루트 레이아웃)가 정리되지 않아, 실제 브라우저 렌더링에서 React 하이드레이션 불일치(hydration mismatch) 오류가 재현됨.**

- `npm run build`/`npm run test:regression`은 PASS했지만(단위 테스트 영역), 이 결함은 **실제 페이지 렌더링에서만 드러나는 종류**라 유닛 테스트로는 잡히지 않음.
- 이 프로젝트는 `src/app/[locale]/layout.tsx`가 자체적으로 `<html lang={locale}>`/`<body>`를 렌더링하는 구조(루트 레이아웃 역할을 겸함, `src/app/layout.tsx` 없이 동작하던 기존 설계)인데, Sentry 마법사가 데모 페이지(`sentry-example-page`)용으로 `src/app/layout.tsx`(`<html lang="en">`, 데모용 body 클래스 없음)를 별도 생성해뒀음.
- B_Kai가 `sentry-example-page`/`sentry-example-api`는 정확히 삭제했으나, 그 둘이 의존하던 **`src/app/layout.tsx` 자체는 삭제 목록에서 누락**됨.
- 격리 워크트리에서 이 브랜치를 직접 체크아웃해 `npm run dev` + Playwright로 `/ko` 접속 재현 확인:
  - HTML에 `<html lang="en">`(신규 데모 레이아웃)와 `<html lang="ko" class="inter_...variable outfit_...variable...">`(기존 로케일 레이아웃)가 **중첩 출력**됨
  - 브라우저 콘솔에 React 하이드레이션 불일치 에러 재현:
    ```
    A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
    <html lang="en" className="inter_..._variable outfit_..._variable ...">
    -   (실제로는 서버가 렌더링한 값과 클라이언트 값이 어긋남)
      <body className="min-h-full flex flex-col bg-white ...">
    ```
  - 즉 모든 `/{locale}/*` 페이지에서 재현되는 문제로 추정(테스트한 `/ko` 기준)
- **부수 발견(참고, 반려 필수 사유는 아님)**: `instrumentation-client.ts`의 `Sentry.replayIntegration()`이 이 프로젝트 CSP(`worker-src`/`script-src`)에 막혀 `blob:` 워커 생성이 차단됨 — Session Replay가 콘솔 CSP 위반 에러를 내며 실제로는 동작하지 않는 상태. DoD에 Session Replay가 명시 요구사항은 아니었으나, 재작업 시 함께 확인 권장(CSP 예외 추가 또는 replay 옵션 제거).

### 필요 조치

1. `src/app/layout.tsx` 삭제(데모 스캐폴딩 완전 정리 — `sentry-example-page`/`sentry-example-api`와 세트로 함께 삭제됐어야 함)
2. 삭제 후 로컬에서 실제로 `/ko`(또는 임의 locale) 접속해 하이드레이션 에러가 사라졌는지 브라우저 콘솔로 직접 재확인(R-10 — 단위 테스트만으로 재검증 불충분, 이번에 동일 실수 반복 방지)
3. (선택) Sentry Replay CSP 차단 건 — 유지할지, 제거할지 결정 후 반영

### CI 참고

- 이 PR은 `gh pr checks 1179` 확인 결과 **커밋 후 15분 이상 경과에도 체크 항목 자체가 전혀 생성되지 않음**(`gh run list`도 0건) — R-08-1(CI 미트리거) 해당 사례로 판단. 이번 반려는 CI 결과가 아니라 위 로컬 재현(격리 워크트리 + 실제 브라우저 렌더링)에 근거함. 재제출 시 CI가 트리거되는지도 함께 확인 요망.

## [발견 이슈]

없음

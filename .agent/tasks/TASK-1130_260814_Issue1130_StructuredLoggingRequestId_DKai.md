# TASK-1130 — 구조화 로깅 + requestId 컨텍스트 전파 (Issue #1130)

- **작성자**: D_Kai (DeepSeek V4 Flash)
- **날짜**: 2026-08-14
- **브랜치**: `feature/teama-task-1130-structured-logging`
- **커밋**: `0de2c58f7`
- **이슈**: https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1130

---

## 1. 작업 요약

309 문서 §10.6의 AI Agent 진단 격차 해소 — `logger.ts`를 JSON 구조화로 재작성하고
requestId를 미들웨어→다운스트림 전 구간에 전파하는 컨텍스트를 구현. Sentry `setUser()`
연결. 기존 로거 호출부(320곳)는 시그니처 불변 유지.

## 2. 변경 파일

| 파일 | 상태 | 내용 |
| :--- | :--- | :--- |
| `src/lib/logger.ts` | M | JSON 구조화(level/timestamp/message/data) + 컨텍스트 자동 주입(requestId/userId/orgId/route) |
| `src/lib/logging/request-context.ts` | 신규 | store 주입형 순수 모듈 — 클라이언트 번들 no-op 폴백 |
| `src/lib/logging/request-context.server.ts` | 신규 | `server-only` + AsyncLocalStorage, `withRequestContext()` (headers에서 x-request-id 읽기) |
| `src/middleware.ts` | M | requestId 발급→요청/응답 헤더 전파 + 전체 경로 `runWithRequestContext` + Sentry `setUser`/`setUser(null)` |
| `tests/unit/logging/request-context.test.ts` | 신규 | 5케이스 (async 전파/전체 컨텍스트/no-op 폴백/중첩 우선순위/스토어 미주입) |
| `tests/unit/monitoring/logger.test.ts` | M | 기존 4케이스를 JSON 포맷에 맞게 갱신 |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | M | §21 모니터링 섹션에 TC-REQID-01/02 추가 |

## 3. PoC 검증 결과

| 경로 | 결과 |
| :--- | :--- |
| 미들웨어 → Route Handler | ✅ requestId 전파 |
| 미들웨어 → Server Action | ✅ requestId 전파 (실제 폼 제출로 검증) |
| 미들웨어 → Server Component(레이아웃) | ✅ `withRequestContext` 적용 시 전파 |
| 루트 레이아웃 → children 렌더링 | ❌ 비전파 (React 스케줄러가 별도 컨텍스트에서 렌더링 — HTML `data-poc-rid="NONE"` 확정) |

### 설계 의견 (이슈 코멘트 보고 완료 — #issuecomment-5293334646)

- 서버 컴포넌트 렌더링 중 로거 호출은 requestId 없이 출력 (컨텍스트 외부 실행)
- 루트 레이아웃 전역 래핑 미적용 — `headers()` 호출로 인한 dynamic 렌더링 전환 부작용 방지
- 필요 시 해당 레이아웃/페이지에 `withRequestContext` 선택 적용

## 4. 검증 결과

- 타입 체크: 변경 파일 에러 없음 (기존 e2e 파일 에러는 선존 문제, 이번 범위 외)
- **회귀 테스트: 192개 파일 · 1320개 테스트 전체 PASS** (R-08, 로컬 Supabase db reset 후)

## 5. DoD 체크

- [x] logger.ts JSON 구조화
- [x] requestId 컨텍스트 모듈 + middleware 연동
- [x] Sentry setUser() 연결
- [x] Server Action 경로 PoC 검증 보고
- [x] 전체 회귀 테스트 PASS
- [x] 신규 테스트 케이스 + LIVE_REGRESSION_TEST_MAP.md 갱신

## 6. 리뷰 요청

- 리뷰어: Aiden (ZEN_CEO)
- 라벨: `status:review` 요청됨
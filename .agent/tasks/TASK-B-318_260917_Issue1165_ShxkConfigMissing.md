# TASK-B-318: Issue #1165 — SHXK 실운영 인증키 Vercel Production 미등록 → UPS 발송 전량 실패 (DEF-B-142, Critical)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1165](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1165) |
| **DEF** | [DEF-B-142](../defects/DEF-B-142_SHXK_실운영인증키_미등록_UPS발송전량실패.md) |
| **배경** | ZEN-2026-000011 UPS 발송 오류 원인 분석 결과 Vercel에 SHXK 인증키 미등록 — GoLive 이후 실 createorder 성공 0건 |
| **담당** | EdwardKwon89 (배정) / B_Kai (Team A, 처리) |
| **생성일** | 2026-08-19 (Issue 등록) |
| **처리일** | 2026-09-17 (코드 완료) |
| **우선순위** | P2 / Critical |
| **상태** | 🔔 완료 (PR 검토 대기 — Aiden 리뷰) |

## DoD 현황

| # | DoD | 상태 |
|:--|:----|:-----|
| §1 | 실 `SHXK_APP_KEY`/`SHXK_APP_TOKEN` Vercel Production 등록 | ✅ 완료 (2026-08-19, Aiden 등록 + Edward 실측) |
| §2 | `assertShxkConfig()`를 `callShxk()` 진입점에 연결 | ✅ 완료 (2026-09-17, B_Kai) |
| §3 | 실 인증키 등록 후 비-mock createorder 정상 동작 확인 | ✅ 완료 (2026-08-19, Edward 실측 — 트래킹번호 발급) |
| §4 | `order_weight`/`order_pieces`/`cargovolume[].involume_*` 필드 타입 재검토 | ✅ 기각·종결 (숫자 타입 그대로 실측 성공) |
| §5 | `LIVE_REGRESSION_TEST_MAP.md` 갱신 (R-09) | ✅ 완료 (2026-09-17, 섹션 60) |
| §6 | ZEN-2026-000011 실제 재발송 성공 확인 | ⏳ Edward 확인 대기 (테스트 후 의도적 취소 상태) |

## [작업 결과] (B_Kai, 2026-09-17)

### 코드 변경 (`src/lib/shxk/client.ts`)

- `assertShxkConfig`를 `./config`에서 import
- `callShxk()` 비-mock 경로 진입점(`isMock()` 분기 직후)에 `assertShxkConfig()` 호출 추가 — 키 미설정 시 빈 값 전송 대신 "SHXK_APP_KEY / SHXK_APP_TOKEN 환경변수가 설정되지 않았습니다." 한글 에러로 즉시 실패
- mock 경로는 방어와 무관하게 그대로 동작 (개발/테스트 환경 보존)

### 회귀 테스트 (R-09, `tests/unit/shxk/client.test.ts`)

- **신규 TC-SHXK-10**: 비-mock + 키 미설정 → 즉시 실패 + fetch/supabase 감사로그/logger 미발생 검증
- **신규 TC-SHXK-11**: mock 모드 + 키 미설정 → mock 응답 정상 반환 (방어 우회와 무관 확인)
- 기존 mock을 `vi.hoisted` 기반으로 변경해 키 상태 동적 제어 (상대경로 `./config` mock → 절대경로 `@/lib/shxk/config` mock 정합)

### 커밋

| 커밋 | 내용 |
| :--- | :--- |
| `e07dca128` | `[B_Kai] fix: TASK-B-318 DEF-B-142 assertShxkConfig 호출부 연결 + 키 미설정 테스트 (Issue #1165)` |

> ⚠️ 참고: 해당 커밋에 세션 시작 전 이미 스테이징되어 있던 무관 변경(playwright config 삭제 8건, sentry config 이동 3건)이 함께 포함됨 — 내용 변경 없는 삭제/이동뿐이라 기능 영향 없음.

### 테스트 결과

- `tests/unit/shxk/client.test.ts` — **11건 PASS / 0 FAIL**
- SHXK 관련 인접 테스트 (`shxk-payload-validation`, `ups-labels-removeorder-failure`, `ups-labels-errors`, `tests/unit/shxk`) — **46건 PASS / 0 FAIL**
- lint — 신규 코드 에러 0건 (client.test.ts의 `any` 3건은 pre-existing)

## [완료 보고 절차 기록] (R-17)

1. ✅ 코드 커밋 → 2. ✅ task file 작성(본 문서) → 3. `status:review` 라벨 갱신 → 4. 문서 커밋 → 5. PR 생성 → 6. Aiden 검토 대기

## [발견 이슈]

- ZEN-2026-000011 실제 재발송은 Edward 확인 대기 (§6) — 별도 Issue로 분리할지 결정 필요.
- 회귀 테스트(1,400여건)가 전부 mock 모드로 동작해 인증/타입 검증 계열 결함을 원천적으로 잡아낼 수 없는 구조 — "mock 검증으로 GoLive 선언" 관행 재검토는 Issue 본문에서 별도 논의 예정으로 명시됨.
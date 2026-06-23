# Team B — PR 제출 전 표준 DoD 체크리스트

> **문서번호**: TeamB-DOD-v1.0
> **작성일**: 2026-06-22
> **작성자**: Jaison (Claude, Team B 총괄)
> **근거**: Issue #71 (Edward 지시) — PR#66/67 CI 빌드 실패 재발 방지
> **적용 대상**: Dave (DeepSeek V4) · Baker (Big Pickle) · Gale · 모든 Team B AI Agent

---

## 필수 항목 (PR 제출 전 전원 반드시 확인)

| # | 항목 | 확인 방법 | 비고 |
|:-:|:----|:---------|:----|
| 1 | `npm run build` PASS | TypeScript 컴파일 오류 0건 | **PR 제출 전 로컬 실행 필수** |
| 2 | i18n 신규 키 추가 시 4개 언어 파일 중복 확인 | `ko.json` / `en.json` / `ja.json` / `zh.json` 동일 섹션 내 키 중복 없음 확인 | 기존 키를 다른 섹션에 copy-paste 금지 |
| 3 | `npm run test:regression` PASS | 전체 PASS (pre-existing Supabase 2건 제외 허용) | CI와 동일 조건 |
| 4 | task file `[작업 결과]` 코드 커밋 해시 기재 | 실제 커밋 해시 기재 (`(커밋예정)` 기재 후 PR 제출 금지) | R-17 v2.0 |
| 5 | PR 생성 `Closes #이슈번호` 기재 | GitHub Issue 연결 확인 | R-17 v2.0 §7 |

---

## 위반 사례 (경위)

| 날짜 | Agent | 위반 내용 | 영향 |
|:----|:------|:---------|:----|
| 2026-06-21 | Baker (TASK-B-011) | `t` prop 타입 설계 오류 + `ko.json`/`en.json` UpsDailyClose 섹션에 settlement 키 중복 copy-paste | PR#66/67 CI `npm run build` 전체 차단 → Aiden PR#70 핫픽스 직접 수정 |
| 2026-06-21 | Dave (TASK-B-014) | task file `[작업 결과]` 코드 커밋 해시 `(커밋예정)` 미기재 | Jaison 직접 정정 필요 |

---

## 커밋 태그 규칙

| Agent | 태그 |
|:------|:----|
| Dave (DeepSeek V4) | `[DS]` |
| Baker (Big Pickle) | `[BP]` |
| Gale (Gemini) | `[Gale]` |
| Jaison (Claude) | `[Jaison]` |

> 비등록 태그(`[Codex]` 등) 사용 금지. 발견 시 즉시 반려.

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 내용 |
|:----|:----|:------|:----|
| v1.0 | 2026-06-22 | Jaison (Claude) | Issue #71 Edward 지시 반영 — 초안 작성 |

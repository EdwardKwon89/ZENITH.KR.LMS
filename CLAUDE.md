---
tags: ["governance"]
---

# PJT_2026_010 (ZENITH_LMS) — Claude 에이전트 업무 규정

> **문서번호:** Gov-02 | **버전:** v2.0 | **작성일:** 2026-05-12

> [!IMPORTANT]
> 본 문서는 **Claude 에이전트(Aiden)** 전용 규정입니다.  
> 공통 규칙(R-01~R-15, GitNexus, ZEN_A4, SAR)은 아래 GOV_COMMON.md에 정의되어 있습니다.

@GOV_COMMON.md

---

## 🚀 세션 초기화 (Session Initialization, R-02) — Claude 전용

> [!IMPORTANT]
> **신규 세션 시작 필수 절차**:
> 1. PATH 추가: `export PATH=$PATH:/opt/homebrew/bin`
> 2. Supabase 로그인: `rtk supabase login` (브라우저 인증 후 코드 입력)
> 3. 모든 CLI 명령어는 `rtk` 경유 실행 (`rtk <command>`)
> 4. 역할 명세([103_AGENT_ROLES_SPEC.md](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md))와 대상 폴더 인덱스(`000_README.md`) 확인

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-04-16 | Antigravity | 초기 Claude 에이전트 업무 규정 수립 |
| v1.1 | 2026-04-16 | Antigravity | 파일 길이 제한 및 핵심 가드레일 추가 |
| v1.2 | 2026-04-22 | Claude | GEMINI.md R-01~R-12 전체 동기화, SAR 절차, 문서 이원화 체계 보완 |
| v1.3 | 2026-05-08 | Claude (Aiden) | 개선 사항 도출 및 기록 의무 R-15 추가 |
| v2.0 | 2026-05-12 | Aiden (Claude, ZEN_CEO) | GOV_COMMON.md 분리 — 공통 규칙 이관, Claude 전용 내용만 유지 (SAR-2026-05-12-001 반영) |

<!-- gitnexus: GOV_COMMON.md 단일 출처. 재인덱싱 시 `gitnexus analyze --skip-agents-md` 사용 -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ZENITH.KR.LMS** (8530 symbols, 12326 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ZENITH.KR.LMS/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ZENITH.KR.LMS/clusters` | All functional areas |
| `gitnexus://repo/ZENITH.KR.LMS/processes` | All execution flows |
| `gitnexus://repo/ZENITH.KR.LMS/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

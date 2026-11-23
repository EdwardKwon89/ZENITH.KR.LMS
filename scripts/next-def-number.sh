#!/bin/bash
# ZENITH_LMS — 다음 DEF(결함) 번호 자동 산출 (IMP-188 / Issue #1344)
#
# 소유: Team A (scripts/next-def-number.sh)
# Issue #773: DEF 번호 중복 반복 발생 재발 방지.
# Issue #1344 (IMP-188): Issue 제목에 포함된 DEF 번호도 놓치지 않도록
#   `gh issue list --state all --limit 2000 --json title`을 함께 스캔한다.
#
# 스캔 대상 (합집합의 최댓값 + 1):
#   1. .agent/defects/DEF-*.md 파일명
#   2. .agent/ACTIVE_TASK.md · .agent/VIOLATION_TRACKER.md
#   3. supabase/migrations/*.sql 파일명 (defNNN / defBNNN)
#   4. GitHub Issue 제목 (`gh issue list --state all --limit 2000 --json title`)
#
# 폴백 및 한계:
#   - `gh` CLI 미설치·미인증·네트워크 실패 시 stderr에 경고를 출력하고 로컬 파일 기준 결과만 반환한다(exit 0).
#   - `--limit 2000` 상한: 저장소 전체 Issue가 2,000건을 초과하면 오래된 Issue는 잘릴 수 있다.
#   - 보수적 매칭: Issue 제목에 선행·참조 결함 번호(예: `DEF-146 후속`)가 포함된 경우 최댓값이
#     올라갈 수 있으나, 번호 중복 방지를 위해 보수적(큰 번호) 방향을 허용한다.
#   - 패턴 격리: Team A(`DEF-[0-9]+`)는 Team B(`DEF-B-[0-9]+`)와 섞이지 않는다.
#
# 사용법: ./scripts/next-def-number.sh [PREFIX]
#   PREFIX 생략 시 A (Team A) 기본값 — 접두어 없는 DEF-NNN.
#   PREFIX B 지정 시 Team B 신규 독립 순번 DEF-B-NNN (001부터).
#   예: ./scripts/next-def-number.sh     → DEF-126 (기본 Team A)
#       ./scripts/next-def-number.sh A   → DEF-126 (Team A, 접두어 없음)
#       ./scripts/next-def-number.sh B   → DEF-B-001 (Team B, 최초 실행 시)

set -euo pipefail

PREFIX="${1:-A}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$PREFIX" = "A" ]; then
  PATTERN='DEF-[0-9]+'
  MIGRATION_PATTERN='def[0-9]+'
  FORMAT="DEF-%d"
else
  PATTERN="DEF-${PREFIX}-[0-9]+"
  MIGRATION_PATTERN="def${PREFIX}[0-9]+"
  FORMAT="DEF-${PREFIX}-%03d"
fi

ISSUE_TITLES=""
if command -v gh >/dev/null 2>&1; then
  if ! ISSUE_TITLES=$(gh issue list --state all --limit 2000 --json title 2>/dev/null); then
    echo "⚠ 경고: Issue 미조회 — 번호 중복 가능, 수동 확인 필요 (gh issue list 실패)" >&2
    ISSUE_TITLES=""
  fi
else
  echo "⚠ 경고: Issue 미조회 — 번호 중복 가능, 수동 확인 필요 (gh 미설치)" >&2
fi

MAX_NUM=$(
  {
    find "$REPO_ROOT/.agent/defects" -maxdepth 1 -type f -name "DEF-*.md" 2>/dev/null | grep -ohE "$PATTERN" || true
    grep -ohE "$PATTERN" "$REPO_ROOT/.agent/ACTIVE_TASK.md" 2>/dev/null || true
    grep -ohE "$PATTERN" "$REPO_ROOT/.agent/VIOLATION_TRACKER.md" 2>/dev/null || true
    find "$REPO_ROOT/supabase/migrations" -maxdepth 1 -type f -name "*.sql" 2>/dev/null | grep -oihE "$MIGRATION_PATTERN" || true
    if [ -n "$ISSUE_TITLES" ]; then
      printf '%s\n' "$ISSUE_TITLES" | grep -ohE "$PATTERN" || true
    fi
  } | { grep -ohE '[0-9]+$' || true; } | sort -n | tail -1
)

if [ -z "$MAX_NUM" ]; then
  MAX_NUM=0
fi
MAX_NUM=$((10#$MAX_NUM))

NEXT_NUM=$((MAX_NUM + 1))
printf "$FORMAT\n" "$NEXT_NUM"

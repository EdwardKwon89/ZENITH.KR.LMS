#!/bin/bash
# ZENITH_LMS — 다음 TASK 번호 자동 산출 (IMP-188 / Issue #1344)
#
# 소유: Team A (scripts/next-task-number.sh)
# Issue #358: TASK 번호 중복 반복 발생(PR#309/313/331/353 등) 재발 방지.
# Issue #1344 (IMP-188): Task가 GitHub Issue로 먼저 발령된 뒤 상세 파일은 착수 시 생성되므로
#   발령~착수 사이 공백 구간의 번호도 놓치지 않도록 `gh issue list --state all --limit 2000 --json title`을 함께 스캔한다.
#
# 스캔 대상 (합집합의 최댓값 + 1):
#   1. .agent/ACTIVE_TASK.md
#   2. .agent/tasks/TASK-*.md 파일명
#   3. GitHub Issue 제목 (`gh issue list --state all --limit 2000 --json title`)
#
# 폴백 및 한계:
#   - `gh` CLI 미설치·미인증·네트워크 실패 시 stderr에 경고를 출력하고 로컬 파일 기준 결과만 반환한다(exit 0).
#   - `--limit 2000` 상한: 저장소 전체 Issue가 2,000건을 초과하면 오래된 Issue는 잘릴 수 있다(현행 482건).
#   - 보수적 매칭: Issue 제목에 다른 참조 번호(예: `TASK-1150` 본문 언급 등)가 포함된 경우 최댓값이
#     올라갈 수 있으나, 번호 충돌 방지를 위해 보수적(큰 번호) 방향을 허용한다.
#   - 패턴 격리: Team A(`TASK-[0-9]+`)는 Team B(`TASK-B-[0-9]+`)·Team C(`TASK-C-[0-9]+`)와 섞이지 않는다.
#
# 사용법: ./scripts/next-task-number.sh [PREFIX]
#   PREFIX 생략 시 B (Team B) 기본값. Team A는 접두어 없는 TASK-NNN, Team C는 TASK-C-NNN.
#   예: ./scripts/next-task-number.sh B   → TASK-B-101
#       ./scripts/next-task-number.sh     → TASK-B-101 (기본 Team B)
#       ./scripts/next-task-number.sh A   → TASK-101 (Team A, 접두어 없음)

set -euo pipefail

PREFIX="${1:-B}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$PREFIX" = "A" ]; then
  PATTERN='TASK-[0-9]+'
  FORMAT="TASK-%d"
else
  PATTERN="TASK-${PREFIX}-[0-9]+"
  FORMAT="TASK-${PREFIX}-%d"
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
    grep -ohE "$PATTERN" "$REPO_ROOT/.agent/ACTIVE_TASK.md" 2>/dev/null || true
    find "$REPO_ROOT/.agent/tasks" -maxdepth 1 -type f -name "TASK-*.md" 2>/dev/null | grep -ohE "$PATTERN" || true
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

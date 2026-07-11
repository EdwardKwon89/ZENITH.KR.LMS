#!/bin/bash
# ZENITH_LMS — 다음 TASK 번호 자동 산출
#
# Issue #358: TASK 번호 중복 반복 발생(PR#309/313/331/353 등) 재발 방지.
# .agent/ACTIVE_TASK.md와 .agent/tasks/ 양쪽을 모두 스캔해 최대 번호 + 1을 출력한다.
# 두 소스 중 한쪽에만 있는 경우도 있으므로(task file 먼저 생성 vs ACTIVE_TASK.md 먼저 갱신)
# 반드시 둘 다 확인해야 실제 최신 번호를 놓치지 않는다.
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

MAX_NUM=$(
  {
    grep -ohE "$PATTERN" "$REPO_ROOT/.agent/ACTIVE_TASK.md" 2>/dev/null || true
    find "$REPO_ROOT/.agent/tasks" -maxdepth 1 -type f -name "TASK-*.md" 2>/dev/null | grep -ohE "$PATTERN" || true
  } | grep -ohE '[0-9]+$' | sort -n | tail -1
)

if [ -z "$MAX_NUM" ]; then
  MAX_NUM=0
fi
MAX_NUM=$((10#$MAX_NUM))

NEXT_NUM=$((MAX_NUM + 1))
printf "$FORMAT\n" "$NEXT_NUM"

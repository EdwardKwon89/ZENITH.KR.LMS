#!/bin/bash
# ZENITH_LMS — 다음 DEF(결함) 번호 자동 산출
#
# Issue #773: DEF 번호 중복 반복 발생(같은 날 3회 — Team A DEF-121/121/124가
# 각각 Team B의 TASK-B-192/#728, TASK-B-193/#741, TASK-B-197/#778과 충돌) 재발 방지.
# TASK 번호(105_MULTITEAM_GOVERNANCE.md)와 동일하게 v1.0부터 팀 접두사 체계를 적용한다.
#
# .agent/defects/ 파일명뿐 아니라 .agent/ACTIVE_TASK.md·.agent/VIOLATION_TRACKER.md·
# supabase/migrations/*.sql 파일명까지 함께 스캔한다 — 정식 defect 리포트 파일 없이
# 마이그레이션 파일명에만 번호를 쓴 경우(DEF-124/TASK-B-197 사례)도 있었기 때문에
# .agent/defects/ 폴더만 봐서는 실제 최신 번호를 놓칠 수 있다.
#
# 사용법: ./scripts/next-def-number.sh [PREFIX]
#   PREFIX 생략 시 A (Team A) 기본값 — 접두어 없는 DEF-NNN, 기존 DEF-001~125 연속.
#   PREFIX B 지정 시 Team B 신규 독립 순번 DEF-B-NNN (001부터, 기존 DEF-121~124 등은 소급 변경 없음).
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

MAX_NUM=$(
  {
    find "$REPO_ROOT/.agent/defects" -maxdepth 1 -type f -name "DEF-*.md" 2>/dev/null | grep -ohE "$PATTERN" || true
    grep -ohE "$PATTERN" "$REPO_ROOT/.agent/ACTIVE_TASK.md" 2>/dev/null || true
    grep -ohE "$PATTERN" "$REPO_ROOT/.agent/VIOLATION_TRACKER.md" 2>/dev/null || true
    find "$REPO_ROOT/supabase/migrations" -maxdepth 1 -type f -name "*.sql" 2>/dev/null | grep -oihE "$MIGRATION_PATTERN" || true
  } | { grep -ohE '[0-9]+$' || true; } | sort -n | tail -1
)

if [ -z "$MAX_NUM" ]; then
  MAX_NUM=0
fi
MAX_NUM=$((10#$MAX_NUM))

NEXT_NUM=$((MAX_NUM + 1))
printf "$FORMAT\n" "$NEXT_NUM"

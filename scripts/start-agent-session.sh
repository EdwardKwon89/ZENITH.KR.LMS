#!/bin/bash
# ZENITH_LMS — Team B 에이전트 세션 런처
#
# Issue #358 3단계: 사람이 매번 "정확한 워크트리 경로로 cd 하고 나서
# opencode 실행"을 기억해야 한다면 결국 실수로 공유 디렉토리에서
# 켜는 사고가 재발한다(PR#367/#368/#370). 이 스크립트가 그 순서를
# 대신 강제한다 — 페르소나 이름만 넘기면 격리된 워크트리 안에서
# opencode가 켜진다.
#
# 사용법: ./scripts/start-agent-session.sh <dave|baker|mike>

set -euo pipefail

PERSONA="${1:-}"
if [ -z "$PERSONA" ]; then
  echo "사용법: $0 <dave|baker|mike>" >&2
  exit 1
fi

case "$PERSONA" in
  dave|baker|mike) ;;
  *)
    echo "오류: PERSONA는 dave, baker, mike 중 하나여야 합니다 (입력값: $PERSONA)" >&2
    exit 1
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_DIR="$REPO_ROOT/../ZENITH_LMS-worktrees/$PERSONA"

echo "[start-agent-session] $PERSONA 워크트리 준비 중..."
"$REPO_ROOT/scripts/agent-worktree-init.sh" "$PERSONA"

echo "[start-agent-session] $WORKTREE_DIR 에서 opencode 실행"
cd "$WORKTREE_DIR"
exec opencode

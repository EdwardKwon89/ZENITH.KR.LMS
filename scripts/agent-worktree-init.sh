#!/bin/bash
# ZENITH_LMS — Team B 에이전트별 물리적 워크트리 격리
#
# Issue #358 3단계: Dave/Baker/Mike가 동일 로컬 디렉토리를 공유하면서
# 서로의 uncommitted 변경분이 뒤섞이는 사고가 반복됨(PR#353/#367/#368/#370).
# 페르소나별로 완전히 분리된 워킹 디렉토리(git worktree)를 만들어
# 구조적으로 혼입이 불가능하게 만든다.
#
# 매 세션 시작 시 반드시 최초 1회 실행:
#   ./scripts/agent-worktree-init.sh <dave|baker|mike>
#
# 실행 후 안내되는 경로로 cd 해서 작업 시작. 그 디렉토리 안에서
# next-task-number.sh로 채번하고 새 브랜치를 만든다.

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
PARENT_DIR="$(cd "$REPO_ROOT/.." && pwd)"
WORKTREE_ROOT="$PARENT_DIR/ZENITH_LMS-worktrees"
WORKTREE_DIR="$WORKTREE_ROOT/$PERSONA"

mkdir -p "$WORKTREE_ROOT"

echo "[worktree-init] origin fetch 중..."
git -C "$REPO_ROOT" fetch origin

# develop 브랜치는 메인 체크아웃(REPO_ROOT)이 이미 점유 중일 수 있으므로,
# 워크트리는 항상 detached HEAD(origin/develop 시점)로 생성/초기화한다.
# 실제 작업은 여기서 바로 새 feature 브랜치를 checkout -b 하므로 문제없다.
if [ -d "$WORKTREE_DIR" ] && git -C "$REPO_ROOT" worktree list | grep -q "$WORKTREE_DIR"; then
  echo "[worktree-init] 기존 워크트리 재사용: $WORKTREE_DIR"

  # 이전 세션의 미커밋 변경분이 있으면 삭제 대신 stash로 보존(유실 방지)
  if [ -n "$(git -C "$WORKTREE_DIR" status --porcelain)" ]; then
    STASH_MSG="auto-stash-${PERSONA}-$(date +%Y%m%d%H%M%S)"
    echo "[worktree-init] 이전 세션의 미커밋 변경 발견 — stash로 보존: $STASH_MSG"
    git -C "$WORKTREE_DIR" stash push -u -m "$STASH_MSG"
  fi

  # 이전 세션에서 feature 브랜치에 남아있을 수 있으므로 항상 origin/develop 최신 시점으로 복귀
  git -C "$WORKTREE_DIR" checkout --detach origin/develop
else
  echo "[worktree-init] 신규 워크트리 생성: $WORKTREE_DIR"
  git -C "$REPO_ROOT" worktree add --detach "$WORKTREE_DIR" origin/develop
fi

echo ""
echo "[worktree-init] 준비 완료. 아래 디렉토리로 이동해서 작업 시작:"
echo ""
echo "  cd $WORKTREE_DIR"
echo ""
echo "브랜치 생성 예시:"
echo "  TASK_NO=\$(./scripts/next-task-number.sh B)"
echo "  git checkout -b feature/teamb-\${TASK_NO}-<slug>-${PERSONA}"

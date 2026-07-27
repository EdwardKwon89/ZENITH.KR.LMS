#!/usr/bin/env bash
# scripts/insert-commit-hash.sh
#
# Usage: ./scripts/insert-commit-hash.sh <task-file-path>
#
# R-17 완료 보고 시 task file에 현재 HEAD 커밋 해시를 자동 삽입.
# task file 내 다음 패턴 중 첫 번째를 찾아 실제 해시로 치환:
#   - `- 코드 커밋: ` 으로 시작하는 줄의 뒤쪽 <PLACEHOLDER> 또는 TBD
#   - `- \`TBD\` — ` 패턴
#   - `- \`<PLACEHOLDER>\` — ` 패턴
#
# 매칭 실패 시 에러 메시지와 함께 종료 코드 1 반환.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <task-file-path>"
  exit 1
fi

TASK_FILE="$1"

if [ ! -f "$TASK_FILE" ]; then
  echo "Error: File not found: $TASK_FILE"
  exit 1
fi

HASH=$(git rev-parse HEAD 2>/dev/null || true)
if [ -z "$HASH" ]; then
  echo "Error: Could not get HEAD commit hash (not a git repository?)"
  exit 1
fi

# Cross-platform sed: write to temp file then rename (works on both BSD/macOS and GNU/Linux)
do_sed() {
  local expr="$1"
  local file="$2"
  sed "$expr" "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

# Try patterns in order
if grep -qE '^- 코드 커밋: .*<PLACEHOLDER>' "$TASK_FILE"; then
  do_sed "s/^- 코드 커밋: .*<PLACEHOLDER>.*/- 코드 커밋: \`$HASH\`/" "$TASK_FILE"
  echo "Inserted $HASH into $TASK_FILE (pattern: 코드 커밋 <PLACEHOLDER>)"
  exit 0
fi

if grep -qE '^- 코드 커밋: .*TBD' "$TASK_FILE"; then
  do_sed "s/^- 코드 커밋: .*TBD.*/- 코드 커밋: \`$HASH\`/" "$TASK_FILE"
  echo "Inserted $HASH into $TASK_FILE (pattern: 코드 커밋 TBD)"
  exit 0
fi

if grep -qE '^- \`TBD\`' "$TASK_FILE"; then
  do_sed "s/^- \`TBD\`/- \`$HASH\`/" "$TASK_FILE"
  echo "Inserted $HASH into $TASK_FILE (pattern: \`TBD\`)"
  exit 0
fi

if grep -qE '^- .*<PLACEHOLDER>' "$TASK_FILE"; then
  do_sed "s/<PLACEHOLDER>/$HASH/g" "$TASK_FILE"
  echo "Inserted $HASH into $TASK_FILE (pattern: <PLACEHOLDER>)"
  exit 0
fi

echo "Error: No matching placeholder line found in $TASK_FILE"
echo "Expected one of:"
echo "  - \"- 코드 커밋: <PLACEHOLDER>\" or \"- 코드 커밋: TBD\""
echo "  - \"- \`TBD\` — ...\""
echo "  - \"...<PLACEHOLDER>...\""
exit 1

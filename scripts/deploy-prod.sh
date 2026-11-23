#!/bin/bash
# ZENITH_LMS — Vercel 프로덕션 배포 가드 스크립트 (IMP-179)
#
# 2026-10-29 발견: `vercel --prod`는 원격 main이 아니라 "명령을 실행한 로컬 디렉토리"를
# 업로드한다. 공유 체크아웃이 origin보다 21커밋 뒤처진 develop인 채로 배포되어,
# 병합된 TASK-B-343 코드가 빠진 오래된 소스가 약 3분간 프로덕션에 올라갔다.
# 이 스크립트는 (1) 항상 origin/main을 격리 worktree로 체크아웃해 그곳에서 배포하고,
# (2) 배포 전 게이트(main↔develop 동일, 기대 커밋 일치)를 강제하며,
# (3) 배포 후 Ready·alias·HTTP를 검증하고 소스 해시/롤백 대상을 출력한다.
# 절차 상세: docs/00_GUIDE/209_VERCEL_DEPLOYMENT_SOP.md, 211_PRODUCTION_DEPLOY_RUNBOOK.md
#
# ⚠️ 배포는 Edward의 명시적 지시가 있을 때만 실행한다 (209 SOP). 이 스크립트는 그 승인을
#    대체하지 않으며, row count 기준선·마이그레이션 확인(211 §1 G4)은 별도로 수행한다.
#
# 사용법:
#   ./scripts/deploy-prod.sh --dry-run                    # 게이트·worktree 검증까지만, 배포 안 함
#   ./scripts/deploy-prod.sh --expect <main 병합 커밋>     # 기대 커밋과 origin/main 일치 확인 후 배포
#   ./scripts/deploy-prod.sh --allow-diverge --expect <sha>  # main↔develop 트리 차이를 알고도 진행
#
# 종료 코드: 0 성공 / 1 배포 전 게이트 실패(배포 안 함) / 2 환경 오류 / 3 배포 후 검증 실패

set -euo pipefail

ALIAS_HOST="zenith-lms-hazel.vercel.app"
DRY_RUN=0
EXPECT=""
ALLOW_DIVERGE=0
WT=""

die() { echo "[deploy-prod] ✖ $2" >&2; exit "$1"; }
info() { echo "[deploy-prod] $*"; }

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) DRY_RUN=1 ;;
      --allow-diverge) ALLOW_DIVERGE=1 ;;
      --expect) shift; EXPECT="${1:-}"; [ -n "$EXPECT" ] || die 2 "--expect 에 커밋 해시가 필요합니다" ;;
      *) die 2 "알 수 없는 옵션: $1" ;;
    esac
    shift
  done
}

cleanup() {
  if [ -n "$WT" ] && [ -d "$WT" ]; then
    git -C "$SHARED_ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true
    info "임시 worktree 정리 완료"
  fi
}

check_tools() {
  for c in git vercel curl; do
    command -v "$c" >/dev/null 2>&1 || die 2 "필수 명령 없음: $c"
  done
}

# 첫 번째 worktree = 공유(메인) 체크아웃. .vercel/project.json(프로젝트 링크)이 여기에 있다.
locate_shared_root() {
  SHARED_ROOT="$(git worktree list --porcelain | awk '/^worktree /{print substr($0,10); exit}')"
  [ -f "$SHARED_ROOT/.vercel/project.json" ] || die 2 "$SHARED_ROOT/.vercel/project.json 없음 — vercel link 필요"
}

gate_main_sha() {
  git fetch -q origin main develop
  MAIN_SHA="$(git rev-parse origin/main)"
  info "origin/main = ${MAIN_SHA:0:9}"
  if [ -n "$EXPECT" ]; then
    case "$MAIN_SHA" in
      "$EXPECT"*) info "기대 커밋(${EXPECT})과 일치" ;;
      *) die 1 "origin/main(${MAIN_SHA:0:9})이 기대 커밋(${EXPECT})과 다릅니다 — 병합 PR을 다시 확인하세요" ;;
    esac
  else
    info "⚠ --expect 미지정: 병합 커밋 일치 확인을 건너뜁니다 (권장: --expect <main 병합 커밋>)"
  fi
}

# 문서(docs/·scratch/·.agent/)만 다른 경우는 배포 정확성에 영향이 없으므로 통과시키고,
# 코드·마이그레이션 등 비문서 파일이 다르면 릴리즈 PR이 develop 전체를 담았는지 확인하도록 중단한다.
gate_main_equals_develop() {
  local code_diff
  if git diff --quiet origin/main origin/develop; then
    info "main↔develop 트리 동일"; return 0
  fi
  code_diff="$(git diff --name-only origin/main origin/develop | grep -vE '^(docs/|scratch/|\.agent/)' || true)"
  if [ -z "$code_diff" ]; then
    info "main↔develop 차이는 문서뿐 — 통과"
  elif [ "$ALLOW_DIVERGE" -eq 1 ]; then
    info "⚠ main↔develop 코드 차이가 있으나 --allow-diverge 로 진행:"; echo "$code_diff" | head -5 | sed 's/^/    /'
  else
    echo "$code_diff" | head -10 | sed 's/^/    /' >&2
    die 1 "main과 develop의 코드 파일이 다릅니다(릴리즈 PR 누락 가능). 확인 후 --allow-diverge 로 재실행"
  fi
}

prepare_worktree() {
  WT="$(mktemp -d "${TMPDIR:-/tmp}/zenith-deploy.XXXXXX")"
  rmdir "$WT"
  git worktree add --detach "$WT" origin/main >/dev/null 2>&1 || die 2 "worktree 생성 실패"
  [ "$(git -C "$WT" rev-parse HEAD)" = "$MAIN_SHA" ] || die 1 "worktree HEAD 가 origin/main 과 다릅니다"
  [ -f "$WT/.vercelignore" ] || die 1 ".vercelignore 없음 — 업로드 100MB 제한으로 실패합니다 (209 §4)"
  mkdir -p "$WT/.vercel"
  cp "$SHARED_ROOT/.vercel/project.json" "$WT/.vercel/"
  info "배포 소스 worktree 준비: HEAD=${MAIN_SHA:0:9} (origin/main)"
}

previous_prod_url() {
  vercel ls --prod 2>&1 | grep -E "Ready" | grep -oE 'https://[^ ]+\.vercel\.app' | head -1 || true
}

run_deploy() {
  local log="$WT/.deploy.log"
  info "vercel --prod --yes 실행 중..."
  ( cd "$WT" && vercel --prod --yes ) >"$log" 2>&1 || { tail -5 "$log" >&2; die 3 "vercel 배포 명령 실패"; }
  NEW_URL="$(grep -oE 'https://zenith-[a-z0-9]+-[a-z0-9-]+\.vercel\.app' "$log" | head -1)"
  [ -n "$NEW_URL" ] || die 3 "배포 URL을 출력에서 찾지 못했습니다 (로그: $log)"
}

verify_deploy() {
  local i status
  for i in $(seq 1 30); do
    status="$(vercel inspect "$NEW_URL" 2>&1 | awk '$1=="status"{print $0}')"
    case "$status" in *Ready*) break ;; *Error*) die 3 "배포 빌드 Error: $NEW_URL" ;; esac
    sleep 10
  done
  case "$status" in *Ready*) info "V1 빌드 Ready" ;; *) die 3 "배포가 Ready 가 되지 않았습니다: $NEW_URL" ;; esac
  vercel inspect "$NEW_URL" 2>&1 | grep -q "$ALIAS_HOST" && info "V2 alias($ALIAS_HOST) 연결 확인" \
    || die 3 "alias($ALIAS_HOST)가 새 배포에 연결되지 않았습니다"
  local code; code="$(curl -s -o /dev/null -w '%{http_code}' -L "https://$ALIAS_HOST")"
  [ "$code" = "200" ] && info "V3 HTTP 200" || die 3 "HTTP $code (환경변수 확인 — 209 §3)"
}

main() {
  parse_args "$@"
  check_tools
  locate_shared_root
  trap cleanup EXIT
  gate_main_sha
  gate_main_equals_develop
  prepare_worktree
  PREV_URL="$(previous_prod_url)"
  info "롤백 대상(직전 Ready): ${PREV_URL:-확인 불가}"
  if [ "$DRY_RUN" -eq 1 ]; then
    info "DRY-RUN 종료 — 모든 배포 전 게이트 통과, 배포는 실행하지 않았습니다"
    exit 0
  fi
  run_deploy
  verify_deploy
  info "───────── 배포 완료 ─────────"
  info "배포 소스 HEAD : ${MAIN_SHA:0:9} (origin/main)"
  info "배포 URL       : $NEW_URL"
  info "롤백 대상      : ${PREV_URL:-확인 불가}"
  info "남은 확인      : row count 전후 비교(211 §3 V4), 신규 ERROR 로그(V5)"
}

main "$@"

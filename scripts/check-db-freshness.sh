#!/bin/bash
# ZENITH_LMS — 로컬 DB 스키마/시드 최신화 확인
#
# 2026-07-27~28 발견: 로컬 Supabase 인스턴스를 세션 간 계속 재사용하면서
# develop에 새 마이그레이션이 병합돼도 로컬 DB에는 반영이 안 된 채
# 방치되는 사고가 실제로 발생(DEF-128). 이 상태로 "로컬 검증 PASS"를
# 보고하면 CI(매번 fresh DB)와 다른 결과가 나올 수 있어 신뢰할 수 없다.
#
# 이 스크립트는 pending 마이그레이션 존재 여부만 확인한다(자동 적용은
# 하지 않음 — 적용 여부는 각 에이전트가 판단). --fix 옵션 사용 시
# `supabase db reset`(스키마+SQL 시드 전체 재생성) 후
# `scripts/seed-local.ts`(계정/오더 등 데모 픽스처, 멱등)까지 함께 실행한다.
#
# 사용법:
#   ./scripts/check-db-freshness.sh          # 확인만, pending 있으면 exit 1
#   ./scripts/check-db-freshness.sh --fix    # pending 있으면 reset+seed까지 자동 실행

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[db-freshness] 로컬 마이그레이션 상태 확인 중..."

PENDING=$(supabase migration list --local 2>/dev/null | awk -F'|' 'NF>=2 { local=$1; remote=$2; gsub(/ /,"",local); gsub(/ /,"",remote); if (local != "" && remote == "") print local }')
PENDING_COUNT=$(echo "$PENDING" | grep -c . || true)

if [ "$PENDING_COUNT" -eq 0 ]; then
  echo "[db-freshness] OK — pending 마이그레이션 없음. 로컬 DB가 최신 상태입니다."
  exit 0
fi

echo "[db-freshness] ⚠️  pending 마이그레이션 ${PENDING_COUNT}건 발견:"
echo "$PENDING" | sed 's/^/  - /'
echo ""
echo "로컬 DB가 develop 최신 스키마와 어긋나 있습니다 — 이 상태의 로컬 검증 결과는"
echo "CI(fresh DB) 기준과 다를 수 있어 신뢰할 수 없습니다(DEF-128 재발 패턴)."

if [ "${1:-}" = "--fix" ]; then
  echo ""
  echo "[db-freshness] --fix 지정됨 — supabase db reset 실행..."
  supabase db reset --yes
  echo "[db-freshness] scripts/seed-local.ts 실행(계정/오더 등 데모 픽스처, 멱등)..."
  # 로컬 인스턴스의 service_role 키를 자동으로 채워준다(수동 export 필요 없이 바로 동작하도록).
  # SUPABASE_URL이 이미 지정돼 있으면(원격 대상 시딩 등) 그대로 존중하고 덮어쓰지 않는다.
  SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(supabase status -o env 2>/dev/null | grep '^SERVICE_ROLE_KEY=' | cut -d'"' -f2)}" \
    npx tsx scripts/seed-local.ts
  echo "[db-freshness] 완료 — 로컬 DB가 최신 스키마+시드로 재생성됨."
  exit 0
else
  echo ""
  echo "해결: ./scripts/check-db-freshness.sh --fix"
  echo "      (또는 수동으로 'supabase db reset --yes && npx tsx scripts/seed-local.ts')"
  exit 1
fi

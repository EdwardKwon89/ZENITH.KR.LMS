#!/usr/bin/env node
// TASK-B-385 (Issue #1513) — L2 재유입 점검: 저장소 내 증적 신규·변경 탐지 (경고, advisory)
// 설계 확정(PR #1515 §4): 기준 SHA 대비 diff(CI 동일 `pr-checks.yml` 패턴) — 깨끗한 CI 체크아웃에서도
// 커밋된 변경을 본다. 로컬은 작업트리 기준(git status)을 보조로 병용한다.
// 보고: 명령 형태와 건수만(경로는 저장소 상대 경로 한정 — R-21: 절대경로·값 미사용).
//
// 사용법:
//   CI:  BASE_SHA=<pr base sha> node scripts/check-evidence-escape.mjs
//   로컬: node scripts/check-evidence-escape.mjs            (작업트리 기준)
import { execSync } from 'node:child_process';

/** L3(.gitignore)와 동일한 대상 범위 + 원본 증적 확장자 */
const EVIDENCE_EXT = /\.(png|json|xlsx|pdf|txt|webm|jpg|jpeg|mp4|csv)$/i;
const TARGET_PATTERNS = [
  /^docs\/99_Manual\/[^/]+_Result\//, // 5종 폴더류(E2E·UAT·TASK-·AUDIT·FEAT ..._Result) 및 하위
  /^tests\/e2e\/screenshots\//, // screenshots 출력 (설계 확정 편입)
];

/** 대상 경로 필터 (내보내기: 단위 테스트 대상) */
export function filterEvidencePaths(paths) {
  return paths.filter(
    (p) => TARGET_PATTERNS.some((re) => re.test(p)) && EVIDENCE_EXT.test(p),
  );
}

/** `git status --porcelain` 한 줄 → 경로 (이름 바꿈은 새 경로 기준) (내보내기: 단위 테스트 대상) */
export function parsePorcelainLine(line) {
  const raw = line.slice(3);
  if (!raw) return null;
  if (raw.includes(' -> ')) return raw.split(' -> ').pop().replace(/^"|"$/g, '');
  return raw.replace(/^"|"$/g, '');
}

function git(args) {
  // 한글 파일명 인용 이스케이프 방지 (core.quotepath=false — 과거 집계 오류 재발 방지)
  return execSync(`git -c core.quotepath=false ${args}`, { encoding: 'utf-8' });
}

/** 변경 파일 수집: BASE_SHA 지정 시 CI 모드(기준 SHA 대비 diff), 아니면 작업트리 기준 */
export function changedFiles({ baseSha, cwd } = {}) {
  if (baseSha) {
    // 삭제(d)는 정리 행위이므로 제외 — --diff-filter=d (소문자 = 제외)
    const out = git(`diff --name-only --diff-filter=d "${baseSha}"...HEAD`);
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  }
  // 미추적 폴더를 폴더 하나로만 표시하는 문제 방지 (-uall: 내부 파일 전부)
  const out = git('status --porcelain --untracked-files=all');
  return out
    .split('\n')
    .map((l) => parsePorcelainLine(l))
    .filter(Boolean);
}

function main() {
  const baseSha = process.env.BASE_SHA?.trim();
  const files = changedFiles({ baseSha });
  const hits = filterEvidencePaths(files);

  const mode = baseSha ? `기준 SHA 대비 diff (BASE_SHA)` : '작업트리(git status)';
  if (hits.length === 0) {
    console.log(`[check:evidence] OK — 저장소 내 증적 신규·변경 0건 (모드: ${mode}, 대상 파일 ${files.length}건 검사)`);
    process.exit(0);
  }
  // 경고: 건수 + 저장소 상대 경로만 보고 (R-21 — 절대경로·값 미사용)
  console.warn(`[check:evidence] WARN — 저장소 내 증적 신규·변경 ${hits.length}건 (모드: ${mode})`);
  for (const p of hits) console.warn(`  - ${p}`);
  console.warn('[check:evidence] 원본 증적은 헬퍼(evidenceDir)로 저장소 밖 출력이어야 합니다. (설계: PR #1515 §4)');
  process.exit(1);
}

// 단위 테스트에서는 import만, 직접 실행 시에만 main 실행
if (process.argv[1] && process.argv[1].endsWith('check-evidence-escape.mjs')) {
  main();
}

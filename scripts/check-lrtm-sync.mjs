#!/usr/bin/env node
/**
 * 회귀 테스트 맵 ↔ 실제 Vitest 정합성 점검 — R-09 / IMP-186(B) / Issue #1309 (TASK-1150)
 *
 * 점검 항목:
 *   1. 유령 경로(Dead Path): `lrtm-archive/*.md`·`regression-items/TASK-*.md` 내 `tests/...` 경로 실존 여부 (0건 강제)
 *   2. 미등재 Vitest 파일: `tests/` 하위 `*.test.*`·`*.spec.*`(`tests/e2e/`, `tests/poc-*` 제외) 중
 *      `scripts/lrtm-sync-baseline.json` 밖에서 아카이브·신규 항목 어디에도 언급되지 않은 파일
 *   3. E2E 인용 표기: `tests/e2e/` 인용 라인에 `CI 미실행` 또는 `수동` 표기 누락 여부
 *
 * 사용:
 *   node scripts/check-lrtm-sync.mjs                    # advisory: 경고만 출력, exit 0
 *   node scripts/check-lrtm-sync.mjs --strict           # 유령 경로·신규 미등재·E2E 미표기 시 exit 1
 *   node scripts/check-lrtm-sync.mjs --update-baseline  # 허용 목록 갱신 (축소만 허용, 확대 금지)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectVitestFiles, extractTestPaths } from './lib/lrtm-parser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECKLISTS_DIR = join(ROOT, 'docs/08_Self_Audit/Checklists');
const ARCHIVE_DIR = join(CHECKLISTS_DIR, 'lrtm-archive');
const ITEMS_DIR = join(CHECKLISTS_DIR, 'regression-items');
const BASELINE = join(ROOT, 'scripts/lrtm-sync-baseline.json');

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const IN_CI = process.env.GITHUB_ACTIONS === 'true';

if (args.has('--allow-grow')) {
  console.error('✖ lrtm-sync-baseline은 축소만 허용합니다 (--allow-grow 금지, Issue #1309).');
  process.exit(2);
}

function loadDocFiles() {
  const docs = [];
  if (existsSync(ARCHIVE_DIR)) {
    for (const f of readdirSync(ARCHIVE_DIR).filter((n) => n.endsWith('.md')).sort()) {
      docs.push({ rel: `docs/08_Self_Audit/Checklists/lrtm-archive/${f}`, text: readFileSync(join(ARCHIVE_DIR, f), 'utf8') });
    }
  }
  if (existsSync(ITEMS_DIR)) {
    for (const f of readdirSync(ITEMS_DIR).filter((n) => /^TASK-.*\.md$/.test(n)).sort()) {
      docs.push({ rel: `docs/08_Self_Audit/Checklists/regression-items/${f}`, text: readFileSync(join(ITEMS_DIR, f), 'utf8') });
    }
  }
  return docs;
}

const docs = loadDocFiles();
if (docs.length === 0) {
  console.error('✖ lrtm-archive/ 및 regression-items/에 점검할 문서가 없습니다.');
  process.exit(2);
}

const deadPaths = [];
const e2eViolations = [];
const mappedSet = new Set();

for (const doc of docs) {
  const lines = doc.text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const p of extractTestPaths(line)) {
      if (!existsSync(join(ROOT, p))) {
        deadPaths.push({ doc: doc.rel, line: idx + 1, path: p });
      } else {
        mappedSet.add(p);
      }
      if (p.startsWith('tests/e2e/') && !/CI\s*미실행|수동/.test(line)) {
        e2eViolations.push({ doc: doc.rel, line: idx + 1, path: p });
      }
    }
  });
}

const vitestFiles = collectVitestFiles(ROOT);
const unmapped = vitestFiles.filter((f) => !mappedSet.has(f));
const unmappedSet = new Set(unmapped);
const allVitestSet = new Set(vitestFiles);

if (args.has('--update-baseline')) {
  const first = !existsSync(BASELINE);
  const old = first ? [] : JSON.parse(readFileSync(BASELINE, 'utf8')).entries;
  const grow = unmapped.filter((f) => !old.includes(f));
  if (grow.length && !first) {
    console.error(`✖ 허용 목록을 늘리는 갱신은 거부합니다(래칫: 축소만 허용). 신규 미등재 ${grow.length}건:`);
    grow.forEach((f) => console.error(`   - ${f}`));
    process.exit(2);
  }
  const entries = [...unmapped].sort();
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comment:
          'R-09 회귀맵 래칫 허용 목록: 기존 미등재 Vitest 테스트 파일(tests/e2e, tests/poc-* 제외). 축소만 허용. 생성: node scripts/check-lrtm-sync.mjs --update-baseline',
        generatedAt: new Date().toISOString().slice(0, 10),
        totalVitest: vitestFiles.length,
        count: entries.length,
        entries,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`허용 목록 갱신: ${old.length} → ${entries.length}건 (전체 Vitest ${vitestFiles.length}개)`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.warn('⚠ baseline 없음 — `--update-baseline` 으로 먼저 생성하세요.');
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const allowed = new Set(baseline.entries);
const freshUnmapped = unmapped.filter((f) => !allowed.has(f));
const shrinkable = baseline.entries.filter((f) => allVitestSet.has(f) && !unmappedSet.has(f));
const gone = baseline.entries.filter((f) => !allVitestSet.has(f));

console.log('회귀 테스트 맵 정합성 점검 (R-09 / TASK-1150)');
console.log(
  `  Vitest ${vitestFiles.length}개 | 맵 등재 ${vitestFiles.length - unmapped.length}개 | 미등재 ${unmapped.length}개 (허용 목록 ${baseline.entries.length}개) | 유령 경로 ${deadPaths.length}건 | E2E 미표기 ${e2eViolations.length}건`,
);
if (shrinkable.length) console.log(`  ✔ 허용 목록에서 제거 가능(등재됨) ${shrinkable.length}건 → --update-baseline 으로 축소`);
if (gone.length) console.log(`  ℹ 삭제/이동된 허용 항목 ${gone.length}건 → --update-baseline 으로 정리`);

let hasError = false;

if (deadPaths.length) {
  hasError = true;
  console.log(`\n⚠ 유령 경로 (존재하지 않는 테스트 파일) ${deadPaths.length}건:`);
  for (const d of deadPaths) {
    console.log(`   - ${d.doc}:${d.line} → ${d.path}`);
    if (IN_CI) console.log(`::warning file=${d.doc},line=${d.line},title=회귀맵 유령 경로::${d.path} 파일이 존재하지 않습니다.`);
  }
}

if (e2eViolations.length) {
  hasError = true;
  console.log(`\n⚠ E2E 인용 시 'CI 미실행'/'수동' 표기 누락 ${e2eViolations.length}건:`);
  for (const e of e2eViolations) {
    console.log(`   - ${e.doc}:${e.line} → ${e.path}`);
    if (IN_CI) console.log(`::warning file=${e.doc},line=${e.line},title=E2E 수동 표기 누락::${e.path} 인용 시 'CI 미실행' 또는 '수동' 표기가 필요합니다.`);
  }
}

if (freshUnmapped.length) {
  hasError = true;
  console.log(`\n⚠ 신규 미등재 Vitest 파일 ${freshUnmapped.length}건 — regression-items/TASK-*.md 에 등재하세요 (R-09):`);
  for (const f of freshUnmapped) {
    console.log(`   - ${f}`);
    if (IN_CI) console.log(`::warning file=${f},title=회귀맵 미등재 (R-09)::${f} 이(가) regression-items/ 에 등재되지 않았습니다.`);
  }
}

if (hasError) {
  process.exit(STRICT ? 1 : 0);
}
console.log('\nOK — 유령 경로 0건, E2E 표기 누락 0건, 허용 목록 밖 신규 미등재 없음.');

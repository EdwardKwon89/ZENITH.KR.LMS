#!/usr/bin/env node
/**
 * 마크다운 상대 링크 점검 — 문서 이동·아카이브 시 참조 누락 재발 방지 (DEF-145 / IMP-183)
 *
 * 배경: GH#206 #13(2026-07-06)에서 Ds-11 17개 파일을 아카이브하며 "깨지는 링크 없음"으로 확인했으나
 *   실제로는 MASTER_INDEX.md·README.md·303 가이드·Ds_10 4곳이 구 경로를 가리켰다.
 *
 * 래칫: 현재 깨진 링크는 `scripts/doc-links-baseline.json` 에 고정하고, 그 밖의 **신규 깨진 링크**만 경고한다.
 *   허용 목록은 줄어들기만 해야 한다.
 *
 * 사용:
 *   node scripts/check-doc-links.mjs                    # advisory: 경고만, exit 0
 *   node scripts/check-doc-links.mjs --strict           # 신규 깨진 링크가 있으면 exit 1
 *   node scripts/check-doc-links.mjs --update-baseline  # 허용 목록 갱신(축소만; 확대는 --allow-grow)
 *
 * 한계: 마크다운 인라인 링크 `[텍스트](경로)`만 본다(참조형·HTML 링크·코드 블록 내부 제외). 경로에 괄호가
 *   포함된 링크(예: Next.js `(dashboard)` 경로)는 파싱이 부정확할 수 있다. 앵커(#…)는 검사하지 않는다.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'scripts/doc-links-baseline.json');
const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const IN_CI = process.env.GITHUB_ACTIONS === 'true';

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.gitnexus', '.claude', 'orchestration', 'scratch', 'test-results', '_archive', 'archive']);
// 기록용 폴더(아카이브·검토 보고서 원문 — 에이전트가 file:// 절대경로로 쓰는 경우가 많음)는 탐색 문서가 아니므로 제외
const SKIP_PATH_PREFIX = ['docs/archive/', '.agent/archive/', 'docs/08_Self_Audit/Reviews/'];
const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...walk(p));
    } else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function stripFences(text) {
  let inFence = false;
  return text
    .split('\n')
    .map((l) => {
      if (/^\s*(```|~~~)/.test(l)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : l;
    })
    .join('\n');
}

function check() {
  const broken = [];
  for (const f of walk(ROOT)) {
    const rel = relative(ROOT, f).split('\\').join('/');
    if (SKIP_PATH_PREFIX.some((p) => rel.startsWith(p))) continue;
    const text = stripFences(readFileSync(f, 'utf8'));
    for (const m of text.matchAll(LINK)) {
      let t = m[1];
      if (/^(https?:|mailto:|tel:|data:|#)/i.test(t)) continue;
      if (/[<>{}$]/.test(t)) continue;
      if (/^file:/i.test(t)) {
        broken.push({ file: rel, target: t, why: '절대 file:// 링크(다른 환경에서 깨짐)' });
        continue;
      }
      let p = t.split('#')[0].split('?')[0];
      if (!p) continue;
      try { p = decodeURI(p); } catch { /* 그대로 사용 */ }
      const abs = p.startsWith('/') ? join(ROOT, p) : resolve(dirname(f), p);
      if (!existsSync(abs)) broken.push({ file: rel, target: t, why: '대상 없음' });
    }
  }
  return broken;
}

const broken = check();
const key = (b) => `${b.file}::${b.target}`;
const keys = [...new Set(broken.map(key))].sort();

if (args.has('--update-baseline')) {
  const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).entries : [];
  const grow = keys.filter((k) => !old.includes(k));
  const first = !existsSync(BASELINE); // 최초 생성은 허용(래칫은 이후 갱신부터 적용)
  if (grow.length && !first && !args.has('--allow-grow')) {
    console.error(`✖ 허용 목록을 늘리는 갱신은 거부합니다(래칫). 신규 깨진 링크 ${grow.length}건을 먼저 고치세요:`);
    grow.slice(0, 30).forEach((k) => console.error(`   - ${k}`));
    process.exit(2);
  }
  writeFileSync(
    BASELINE,
    JSON.stringify(
      { _comment: '깨진 마크다운 링크 허용 목록(key = 파일::링크). 줄어들기만 해야 한다. 생성: node scripts/check-doc-links.mjs --update-baseline',
        generatedAt: new Date().toISOString().slice(0, 10), count: keys.length, entries: keys },
      null, 2) + '\n',
  );
  console.log(`허용 목록 갱신: ${old.length} → ${keys.length}건`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.warn('⚠ baseline 없음 — `--update-baseline` 으로 먼저 생성하세요.');
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const allowed = new Set(baseline.entries);
const fresh = broken.filter((b) => !allowed.has(key(b)));
const fixed = baseline.entries.filter((k) => !keys.includes(k));

console.log('문서 링크 점검 (상대 링크 대상 실존 여부)');
console.log(`  깨진 링크 ${keys.length}건 (허용 목록 ${baseline.entries.length}건)`);
if (fixed.length) console.log(`  ✔ 허용 목록에서 제거 가능(이제 정상) ${fixed.length}건 → --update-baseline 으로 축소`);
if (fresh.length) {
  console.log(`\n⚠ 신규 깨진 링크 ${fresh.length}건 — 문서를 이동·삭제·아카이브했다면 참조를 grep으로 전수 점검하세요:`);
  for (const b of fresh) {
    console.log(`   - ${b.file} → ${b.target} (${b.why})`);
    if (IN_CI) console.log(`::warning file=${b.file},title=깨진 문서 링크::${b.target} — ${b.why}`);
  }
  process.exit(STRICT ? 1 : 0);
}
console.log('\nOK — 허용 목록 밖의 신규 깨진 링크 없음.');

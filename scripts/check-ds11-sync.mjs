#!/usr/bin/env node
/**
 * Ds-11 ↔ Server Action 동기화 점검 — R-12(명세-코드 동기화 의무) 집행 1단계 (DEF-145 / IMP-183)
 *
 * 무엇을 보는가 (1단계): `src/app/actions/**` 의 `use server` 파일에서 export 되는 함수 이름이
 *   `docs/02_Analysis/Ds_11_API_상세_명세서.md` 본문에 한 번이라도 나오는지.
 *   ※ 이름 언급 여부만 본다 — 언급된 내용의 정확성은 점검하지 않는다(2단계 과제).
 *
 * 래칫(ratchet): 2026-11-13 기준 미반영 함수는 `scripts/ds11-sync-baseline.json` 에 고정(허용 목록).
 *   → 허용 목록 **밖의 신규 미반영**만 경고한다. 허용 목록은 줄어들기만 해야 한다.
 *
 * 사용:
 *   node scripts/check-ds11-sync.mjs                    # advisory: 경고만 출력, exit 0
 *   node scripts/check-ds11-sync.mjs --strict           # 신규 미반영이 있으면 exit 1 (필수 승격 시)
 *   node scripts/check-ds11-sync.mjs --update-baseline  # 허용 목록 갱신 (Ds-11을 채운 뒤 축소 반영용)
 *   node scripts/check-ds11-sync.mjs --update-baseline --allow-grow   # 허용 목록 확대 (PR에서 사유 필수)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACTIONS_DIR = join(ROOT, 'src/app/actions');
const DS11 = 'docs/02_Analysis/Ds_11_API_상세_명세서.md';
const BASELINE = join(ROOT, 'scripts/ds11-sync-baseline.json');
const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const IN_CI = process.env.GITHUB_ACTIONS === 'true';

const FN =
  /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)|export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(?:async|withAction)/g;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function collectActions() {
  const rows = [];
  for (const f of walk(ACTIONS_DIR).sort()) {
    const src = readFileSync(f, 'utf8');
    if (!/['"]use server['"]/.test(src)) continue;
    const rel = relative(ACTIONS_DIR, f).split('\\').join('/');
    for (const m of src.matchAll(FN)) rows.push({ file: rel, name: m[1] || m[2], key: `${rel}:${m[1] || m[2]}` });
  }
  return rows;
}

// 영문·숫자·밑줄·한글 등 "글자"가 이름 바로 앞뒤에 붙어 있지 않을 때만 언급으로 인정 (Python `\b`와 같은 유니코드 의미)
const mentioned = (text, name) =>
  new RegExp(`(?<![\\p{L}\\p{N}_])${name}(?![\\p{L}\\p{N}_])`, 'u').test(text);

if (!existsSync(join(ROOT, DS11))) {
  console.error(`✖ Ds-11 현행 파일이 없습니다: ${DS11} — R-11·R-12 참조 경로 확인 필요`);
  process.exit(2);
}
const ds11 = readFileSync(join(ROOT, DS11), 'utf8');
const rows = collectActions();
const missing = rows.filter((r) => !mentioned(ds11, r.name));
const missingKeys = new Set(missing.map((r) => r.key));
const allKeys = new Set(rows.map((r) => r.key));

if (args.has('--update-baseline')) {
  const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).entries : [];
  const grow = [...missingKeys].filter((k) => !old.includes(k));
  const first = !existsSync(BASELINE); // 최초 생성은 허용(래칫은 이후 갱신부터 적용)
  if (grow.length && !first && !args.has('--allow-grow')) {
    console.error(`✖ 허용 목록을 늘리는 갱신은 거부합니다(래칫: 줄어들기만 허용). 신규 미반영 ${grow.length}건을 Ds-11에 반영하세요:`);
    grow.forEach((k) => console.error(`   - ${k}`));
    console.error('  불가피하면 --allow-grow 를 쓰고 PR 본문에 사유와 후속 IMP 번호를 적으세요.');
    process.exit(2);
  }
  const entries = [...missingKeys].sort();
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comment:
          'R-12 래칫 허용 목록: Ds-11에 이름이 없는 기존 Server Action 함수(key = actions 상대경로:함수명). 줄어들기만 해야 한다. 생성: node scripts/check-ds11-sync.mjs --update-baseline',
        ds11: DS11,
        generatedAt: new Date().toISOString().slice(0, 10),
        total: rows.length,
        count: entries.length,
        entries,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`허용 목록 갱신: ${old.length} → ${entries.length}건 (전체 액션 함수 ${rows.length}개)`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.warn('⚠ baseline 없음 — `--update-baseline` 으로 먼저 생성하세요. 전체 미반영을 신규로 간주하지 않고 종료합니다.');
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const allowed = new Set(baseline.entries);
const fresh = missing.filter((r) => !allowed.has(r.key));
const shrinkable = baseline.entries.filter((k) => allKeys.has(k) && !missingKeys.has(k));
const gone = baseline.entries.filter((k) => !allKeys.has(k));

console.log(`Ds-11 동기화 점검 (R-12, 1단계: 함수명 언급 여부)`);
console.log(`  액션 함수 ${rows.length}개 | Ds-11 언급 ${rows.length - missing.length}개 | 미반영 ${missing.length}개 (허용 목록 ${baseline.entries.length}개)`);
if (shrinkable.length) console.log(`  ✔ 허용 목록에서 제거 가능(이제 Ds-11에 반영됨) ${shrinkable.length}건 → --update-baseline 으로 축소`);
if (gone.length) console.log(`  ℹ 코드에서 사라진 허용 항목 ${gone.length}건 → --update-baseline 으로 정리`);

if (fresh.length) {
  console.log(`\n⚠ 신규 미반영 ${fresh.length}건 — Ds-11(${DS11})에 아래 함수를 반영하세요 (R-12: 같은 PR 안에서 갱신, 불가 시 PR 본문에 사유·후속 IMP):`);
  for (const r of fresh) {
    console.log(`   - src/app/actions/${r.file} : ${r.name}`);
    if (IN_CI)
      console.log(`::warning file=src/app/actions/${r.file},title=Ds-11 미반영 (R-12)::${r.name} 이(가) ${DS11} 에 없습니다. 같은 PR에서 Ds-11을 갱신하거나 PR 본문에 사유와 후속 IMP 번호를 적어 주세요.`);
  }
  process.exit(STRICT ? 1 : 0);
}
console.log('\nOK — 허용 목록 밖의 신규 미반영 없음.');

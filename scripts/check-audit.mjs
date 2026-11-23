#!/usr/bin/env node
/**
 * 운영 의존성 취약점(npm audit) 래칫 점검 — DEF-146
 *
 * 무엇을 보는가: `npm audit --omit=dev` 결과의 (패키지:심각도) 목록.
 *   `scripts/audit-baseline.json` 에 고정된 기존 항목 **밖의 신규·심각도 상승 항목**만 경고한다.
 *   ※ 도달 가능성(실제 악용 여부)은 보지 않는다 — 점검은 신호일 뿐 판단은 사람이 한다.
 * 한계: npm 레지스트리(네트워크)가 필요하다. 응답이 없으면 경고만 하고 exit 0.
 *
 * 사용:
 *   node scripts/check-audit.mjs                     # advisory: 신규만 경고, exit 0
 *   node scripts/check-audit.mjs --strict            # 신규가 있으면 exit 1 (필수 승격 시)
 *   node scripts/check-audit.mjs --update-baseline   # 허용 목록 갱신 (축소만; 확대는 --allow-grow)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'scripts/audit-baseline.json');
const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const IN_CI = process.env.GITHUB_ACTIONS === 'true';
const RANK = { low: 1, moderate: 2, high: 3, critical: 4 };

const r = spawnSync('npm', ['audit', '--omit=dev', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let vulns;
try {
  vulns = JSON.parse(r.stdout).vulnerabilities;
  if (!vulns) throw new Error('vulnerabilities 없음');
} catch (e) {
  console.warn(`⚠ npm audit 결과를 읽지 못했습니다(네트워크/레지스트리 문제 가능): ${e.message}`);
  process.exit(0);
}
const rows = Object.entries(vulns).map(([name, v]) => ({ name, severity: v.severity, direct: !!v.isDirect, fix: !!v.fixAvailable, key: `${name}:${v.severity}` }));
const keys = new Set(rows.map((x) => x.key));

if (args.has('--update-baseline')) {
  const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).entries : [];
  const grow = [...keys].filter((k) => !old.includes(k));
  if (grow.length && existsSync(BASELINE) && !args.has('--allow-grow')) {
    console.error(`✖ 허용 목록을 늘리는 갱신은 거부합니다(래칫). 신규 ${grow.length}건을 먼저 해소하세요:`);
    grow.forEach((k) => console.error(`   - ${k}`));
    process.exit(2);
  }
  const entries = [...keys].sort();
  writeFileSync(BASELINE, JSON.stringify({
    _comment: 'npm audit(--omit=dev) 래칫 허용 목록(key = 패키지:심각도). 줄어들기만 해야 한다. 생성: node scripts/check-audit.mjs --update-baseline',
    generatedAt: new Date().toISOString().slice(0, 10), count: entries.length, entries,
  }, null, 2) + '\n');
  console.log(`허용 목록 갱신: ${old.length} → ${entries.length}건`);
  process.exit(0);
}

if (!existsSync(BASELINE)) { console.warn('⚠ baseline 없음 — --update-baseline 으로 먼저 생성하세요.'); process.exit(0); }
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const allowed = new Set(baseline.entries);
const fresh = rows.filter((x) => !allowed.has(x.key));
const fixed = baseline.entries.filter((k) => !keys.has(k));
const count = (s) => rows.filter((x) => x.severity === s).length;
console.log('운영 의존성 취약점 점검 (npm audit --omit=dev, 래칫)');
console.log(`  현재 ${rows.length}건 (critical ${count('critical')} · high ${count('high')} · moderate ${count('moderate')} · low ${count('low')}) | 허용 목록 ${baseline.entries.length}건`);
if (fixed.length) console.log(`  ✔ 해소·하향된 허용 항목 ${fixed.length}건 → --update-baseline 으로 축소`);
if (fresh.length) {
  console.log(`\n⚠ 신규·심각도 상승 ${fresh.length}건 — 영향(도달 가능성)을 확인하고 업그레이드 또는 PR 본문에 사유를 적으세요:`);
  for (const x of fresh.sort((a, b) => RANK[b.severity] - RANK[a.severity])) {
    console.log(`   - ${x.name} [${x.severity}] ${x.direct ? '직접' : '간접'} 수정가능=${x.fix}`);
    if (IN_CI) console.log(`::warning title=의존성 취약점(DEF-146)::${x.name} ${x.severity} — npm audit 신규/상승`);
  }
  process.exit(STRICT ? 1 : 0);
}
console.log('\nOK — 허용 목록 밖의 신규 취약점 없음.');

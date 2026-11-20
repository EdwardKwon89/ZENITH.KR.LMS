#!/usr/bin/env node
/**
 * 벤더링 의존성 무결성 점검 — DEF-146 / TASK-1157
 *
 * 무엇을 보는가: npm 레지스트리 대신 저장소에 커밋한 `vendor/*.tgz`(file: 의존성)에 대해
 *   ① `package.json` 의 `file:vendor/...` 참조 파일이 실제로 존재하는지
 *   ② 동봉 `.sha256` 파일의 해시와 tarball 실제 SHA-256 이 일치하는지
 *   ③ tarball 안 `package.json` 의 name/version 이 파일명·참조와 일치하고, 알려진 취약점 수정판 이상인지
 *   ④ `Dockerfile` deps 스테이지가 `npm ci` 전에 `vendor/` 를 복사하는지 (없으면 도커 빌드 실패)
 *   ⑤ `vendor/README.md`(출처·해시·수동 점검 문구)가 있는지
 *
 * 한계: npm audit 은 `file:` 의존성을 검사하지 않는다(사각지대). 이 스크립트는 **고정한 파일이 바뀌지
 *   않았는지**만 본다 — 벤더링 패키지 자체의 새 취약점은 자동으로 잡히지 않으므로, 버전 상향 시
 *   `vendor/README.md` 의 수동 점검 절차를 따라야 한다.
 *
 * 사용:
 *   node scripts/check-vendor.mjs            # advisory: 문제를 경고만 하고 exit 0
 *   node scripts/check-vendor.mjs --strict   # 문제가 있으면 exit 1 (필수 승격 시)
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = join(ROOT, 'vendor');
const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');

/** 알려진 취약점 수정판 하한 — 이보다 낮으면 경고 (xlsx: 프로토타입 오염 <0.19.3, ReDoS <0.20.2) */
const MIN_SAFE_VERSION = { xlsx: [0, 20, 2] };

const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
  console.error(`✖ ${msg}`);
}

function ok(msg) {
  console.log(`✔ ${msg}`);
}

function readPackageJson(tgzPath) {
  const r = spawnSync('tar', ['-xOf', tgzPath, 'package/package.json'], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

function cmpVersion(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const allDeps = { ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.devDependencies };
const vendorRefs = Object.entries(allDeps).filter(([, spec]) => String(spec).startsWith('file:vendor/'));

if (vendorRefs.length === 0) {
  console.log('ℹ package.json 에 file:vendor/ 의존성이 없습니다 — 점검 대상 없음.');
  process.exit(0);
}

for (const [name, spec] of vendorRefs) {
  const tgzPath = join(ROOT, spec.slice('file:'.length));
  const relTgz = relative(ROOT, tgzPath);

  // ① 참조 파일 존재
  if (!existsSync(tgzPath)) {
    fail(`${name}: 참조한 ${relTgz} 파일이 없습니다.`);
    continue;
  }

  // ② SHA-256 일치
  const shaFile = `${tgzPath}.sha256`;
  const actual = createHash('sha256').update(readFileSync(tgzPath)).digest('hex');
  if (!existsSync(shaFile)) {
    fail(`${name}: ${relative(ROOT, shaFile)} 가 없습니다(해시 고정 필요).`);
  } else {
    const expected = readFileSync(shaFile, 'utf8').trim().split(/\s+/)[0].toLowerCase();
    if (expected !== actual) {
      fail(`${name}: SHA-256 불일치 — tarball 이 수정되었거나 해시 파일이 낡았습니다.\n   기대(sha256 파일)=${expected}\n   실제(tarball)   =${actual}`);
    } else {
      ok(`${name}: SHA-256 일치 (${actual})`);
    }
  }

  // ③ tarball 내부 메타데이터 + 안전 버전 하한
  const inner = readPackageJson(tgzPath);
  if (!inner) {
    fail(`${name}: tarball 안 package/package.json 을 읽지 못했습니다(손상 여부 확인).`);
  } else {
    if (inner.name !== name) {
      fail(`${name}: tarball 내부 패키지명이 다릅니다 (${inner.name}).`);
    }
    const fromSpec = /(\d+\.\d+\.\d+)/.exec(relTgz)?.[1];
    if (fromSpec && inner.version !== fromSpec) {
      fail(`${name}: tarball 버전(${inner.version})과 파일명 버전(${fromSpec})이 다릅니다.`);
    }
    const min = MIN_SAFE_VERSION[name];
    if (min) {
      const parsed = inner.version.split('.').map(Number);
      if (cmpVersion(parsed, min) < 0) {
        fail(`${name}@${inner.version}: 알려진 취약점 수정판(${min.join('.')}) 미만입니다.`);
      } else {
        ok(`${name}@${inner.version}: 취약점 수정판 하한 ${min.join('.')} 이상`);
      }
    }
  }
}

// ④ Dockerfile deps 단계의 COPY vendor — file: 의존성은 npm ci 전에 파일이 있어야 한다
const dockerfilePath = join(ROOT, 'Dockerfile');
if (existsSync(dockerfilePath)) {
  const dockerfile = readFileSync(dockerfilePath, 'utf8');
  const copyIdx = dockerfile.search(/^COPY\s+vendor\s+\.\/vendor\s*$/m);
  const ciIdx = dockerfile.search(/^RUN\s+npm\s+ci\s*$/m);
  if (copyIdx === -1) {
    fail('Dockerfile: `COPY vendor ./vendor` 가 없습니다 — file: 의존성 때문에 도커 빌드가 실패합니다.');
  } else if (ciIdx !== -1 && copyIdx > ciIdx) {
    fail('Dockerfile: `COPY vendor ./vendor` 가 `RUN npm ci` 뒤에 있습니다 — npm ci 전에 vendor/ 가 필요합니다.');
  } else {
    ok('Dockerfile: npm ci 전에 vendor/ 복사 확인');
  }
} else {
  notes.push('Dockerfile 이 없어 빌드 경로 점검을 건너뜁니다.');
}

// ⑤ 벤더링 문서(출처·해시·수동 점검 문구)
const readmePath = join(VENDOR, 'README.md');
if (!existsSync(readmePath)) {
  fail('vendor/README.md 가 없습니다 — 출처 URL·SHA-256·수동 점검 절차를 남겨야 합니다.');
} else {
  const readme = readFileSync(readmePath, 'utf8');
  const missing = ['https://cdn.sheetjs.com/', 'SHA-256', '수동 점검'].filter((needle) => !readme.includes(needle));
  if (missing.length) {
    fail(`vendor/README.md 에 필수 문구가 없습니다: ${missing.join(', ')}`);
  } else {
    ok('vendor/README.md: 출처 URL·SHA-256·수동 점검 문구 확인');
  }
}

notes.forEach((n) => console.log(`ℹ ${n}`));

if (failures.length) {
  console.warn(`\n⚠ 벤더링 점검에서 ${failures.length}건 문제가 발견되었습니다. (advisory — npm audit 사각지대 보완)`);
  process.exit(STRICT ? 1 : 0);
}

console.log('\n✅ 벤더링 의존성 점검 통과');
process.exit(0);

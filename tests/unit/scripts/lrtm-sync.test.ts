import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parseRegressionItem } from '../../../scripts/lib/lrtm-parser.mjs';

const REPO_ROOT = process.cwd();

function setupTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'zenith-lrtm-test-'));
  mkdirSync(join(dir, 'scripts/lib'), { recursive: true });
  mkdirSync(join(dir, 'docs/08_Self_Audit/Checklists/lrtm-archive'), { recursive: true });
  mkdirSync(join(dir, 'docs/08_Self_Audit/Checklists/regression-items'), { recursive: true });
  mkdirSync(join(dir, 'tests/unit/sample'), { recursive: true });
  mkdirSync(join(dir, 'tests/poc-231'), { recursive: true });
  mkdirSync(join(dir, 'tests/e2e'), { recursive: true });

  copyFileSync(join(REPO_ROOT, 'scripts/lib/lrtm-parser.mjs'), join(dir, 'scripts/lib/lrtm-parser.mjs'));
  copyFileSync(join(REPO_ROOT, 'scripts/build-lrtm-index.mjs'), join(dir, 'scripts/build-lrtm-index.mjs'));
  copyFileSync(join(REPO_ROOT, 'scripts/check-lrtm-sync.mjs'), join(dir, 'scripts/check-lrtm-sync.mjs'));

  writeFileSync(
    join(dir, 'tests/unit/sample/mapped.test.ts'),
    `import { it, expect } from 'vitest';\nit('case 1', () => expect(1).toBe(1));\nit('case 2', () => expect(2).toBe(2));\n`,
    'utf8',
  );
  writeFileSync(
    join(dir, 'tests/unit/sample/legacy.test.ts'),
    `import { it } from 'vitest';\nit('legacy', () => {});\n`,
    'utf8',
  );
  // tests/poc-* 및 tests/e2e/ 는 Vitest 기본 집계/미등재 스캔에서 제외되어야 함
  writeFileSync(join(dir, 'tests/poc-231/isolated.test.ts'), `it('poc', () => {});\n`, 'utf8');
  writeFileSync(join(dir, 'tests/e2e/sample.spec.ts'), `test('e2e', () => {});\n`, 'utf8');

  writeFileSync(
    join(dir, 'docs/08_Self_Audit/Checklists/lrtm-archive/LRTM_ARCHIVE_PART1.md'),
    `### 1. 초기 테스트\n| TC-1 | 설명 | 결과 | \`tests/unit/sample/mapped.test.ts\` |\n`,
    'utf8',
  );
  writeFileSync(
    join(dir, 'scripts/lrtm-sync-baseline.json'),
    JSON.stringify({ entries: ['tests/unit/sample/legacy.test.ts'] }, null, 2),
    'utf8',
  );
  return dir;
}

describe('TASK-1150: LRTM 파서·인덱스 생성·정합성 점검', () => {
  let dir = '';

  beforeEach(() => {
    dir = setupTempRepo();
  });

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('TC-1150-01: parseRegressionItem이 메타데이터와 케이스·파일을 정확히 추출한다', () => {
    const md = `# [TASK-1150] 샘플 (Issue #1309)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-1150 / [#1309](https://example.com) |
| **팀 / 작성일** | Team A / 2026-11-18 |
| **대상 모듈 (231 연동)** | \`scripts/check-lrtm-sync.mjs\`, \`scripts/build-lrtm-index.mjs\` |
| **검증 차원 (231 D1~D9)** | D1, D6 |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-1150-01 | 검증 A | 통과 | \`tests/unit/sample/mapped.test.ts\` | CI (vitest) |
`;
    const parsed = parseRegressionItem('regression-items/TASK-1150.md', md);
    expect(parsed.taskId).toBe('TASK-1150');
    expect(parsed.issue).toBe('#1309');
    expect(parsed.team).toBe('Team A');
    expect(parsed.date).toBe('2026-11-18');
    expect(parsed.modules).toEqual(['scripts/check-lrtm-sync.mjs', 'scripts/build-lrtm-index.mjs']);
    expect(parsed.dimensions).toEqual(['D1', 'D6']);
    expect(parsed.caseIds).toEqual(['TC-1150-01']);
    expect(parsed.caseCount).toBe(1);
    expect(parsed.testFiles).toEqual(['tests/unit/sample/mapped.test.ts']);
  });

  it('TC-1150-02: 존재하지 않는 테스트 경로(Dead Path)를 검출하고 --strict에서 실패한다', () => {
    writeFileSync(
      join(dir, 'docs/08_Self_Audit/Checklists/regression-items/TASK-999_dead.md'),
      `| TC-999-01 | 유령 | 실패 | \`tests/unit/sample/does-not-exist.test.ts\` | CI |\n`,
      'utf8',
    );
    const res = spawnSync('node', [join(dir, 'scripts/check-lrtm-sync.mjs'), '--strict'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('유령 경로');
    expect(res.stdout).toContain('does-not-exist.test.ts');
  });

  it('TC-1150-03: baseline 밖 신규 미등재 파일 검출 및 --allow-grow 거부', () => {
    writeFileSync(join(dir, 'tests/unit/sample/unmapped-new.test.ts'), `it('x', () => {});\n`, 'utf8');
    const res = spawnSync('node', [join(dir, 'scripts/check-lrtm-sync.mjs'), '--strict'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('신규 미등재 Vitest 파일 1건');
    expect(res.stdout).toContain('unmapped-new.test.ts');

    const grow = spawnSync('node', [join(dir, 'scripts/check-lrtm-sync.mjs'), '--update-baseline', '--allow-grow'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(grow.status).toBe(2);
    expect(grow.stderr).toContain('--allow-grow 금지');
  });

  it('TC-1150-04: tests/e2e/ 인용 시 수동 표기 누락 검출 및 tests/poc-* 제외', () => {
    const ok = spawnSync('node', [join(dir, 'scripts/check-lrtm-sync.mjs'), '--strict'], {
      cwd: dir,
      encoding: 'utf8',
    });
    // tests/poc-231/isolated.test.ts 는 제외되므로 0건으로 통과해야 함
    expect(ok.status).toBe(0);

    writeFileSync(
      join(dir, 'docs/08_Self_Audit/Checklists/regression-items/TASK-998_e2e.md'),
      `| TC-998-01 | E2E | 확인 | \`tests/e2e/sample.spec.ts\` |\n`,
      'utf8',
    );
    const bad = spawnSync('node', [join(dir, 'scripts/check-lrtm-sync.mjs'), '--strict'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(bad.status).toBe(1);
    expect(bad.stdout).toContain('E2E 인용 시');
  });

  it('TC-1150-05: build-lrtm-index가 아카이브·신규 항목·실측 Vitest 집계를 생성한다', () => {
    copyFileSync(
      join(REPO_ROOT, 'docs/08_Self_Audit/Checklists/regression-items/TASK-1150_Issue1309_lrtm-sync.md'),
      join(dir, 'docs/08_Self_Audit/Checklists/regression-items/TASK-1150_Issue1309_lrtm-sync.md'),
    );
    const res = spawnSync('node', [join(dir, 'scripts/build-lrtm-index.mjs')], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    const indexMd = readFileSync(join(dir, 'docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md'), 'utf8');
    expect(indexMd).toContain('실측 테스트 파일 수**: **2개**');
    expect(indexMd).toContain('실측 테스트 케이스 수 (`it`/`test` 블록)**: **3건**');
    expect(indexMd).toContain('LRTM_ARCHIVE_PART1.md');
    expect(indexMd).toContain('TASK-1150');
  });
});

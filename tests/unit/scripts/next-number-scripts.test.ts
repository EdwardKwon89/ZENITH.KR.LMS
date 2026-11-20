import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, chmodSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = process.cwd();

function setupSandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'zenith-num-test-'));
  mkdirSync(join(dir, '.agent/tasks'), { recursive: true });
  mkdirSync(join(dir, '.agent/defects'), { recursive: true });
  mkdirSync(join(dir, 'supabase/migrations'), { recursive: true });
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'bin'), { recursive: true });
  writeFileSync(join(dir, '.agent/ACTIVE_TASK.md'), '', 'utf8');
  writeFileSync(join(dir, '.agent/VIOLATION_TRACKER.md'), '', 'utf8');

  copyFileSync(join(REPO_ROOT, 'scripts/next-task-number.sh'), join(dir, 'scripts/next-task-number.sh'));
  copyFileSync(join(REPO_ROOT, 'scripts/next-def-number.sh'), join(dir, 'scripts/next-def-number.sh'));
  chmodSync(join(dir, 'scripts/next-task-number.sh'), 0o755);
  chmodSync(join(dir, 'scripts/next-def-number.sh'), 0o755);
  return dir;
}

function installGhStub(dir: string, titles: string[] | null) {
  const ghPath = join(dir, 'bin/gh');
  if (titles === null) {
    writeFileSync(ghPath, '#!/bin/sh\nexit 1\n', 'utf8');
  } else {
    const json = JSON.stringify(titles.map((title) => ({ title })));
    writeFileSync(ghPath, `#!/bin/sh\nprintf '%s\\n' '${json.replace(/'/g, "'\\''")}'\n`, 'utf8');
  }
  chmodSync(ghPath, 0o755);
}

function runScript(dir: string, scriptName: string, args: string[], withBin = true) {
  const basePath = '/usr/bin:/bin:/usr/sbin:/sbin';
  const envPath = withBin ? `${join(dir, 'bin')}:${basePath}` : basePath;
  return spawnSync('bash', [join(dir, 'scripts', scriptName), ...args], {
    cwd: dir,
    env: { ...process.env, PATH: envPath },
    encoding: 'utf8',
  });
}

describe('IMP-188: next-task-number.sh & next-def-number.sh Issue 제목 스캔', () => {
  let sandboxDir = '';

  beforeEach(() => {
    sandboxDir = setupSandbox();
  });

  afterEach(() => {
    if (sandboxDir) rmSync(sandboxDir, { recursive: true, force: true });
  });

  describe('next-task-number.sh', () => {
    it('1. Issue에만 더 큰 번호가 있을 때 (Team A / Team B 격리 포함)', () => {
      writeFileSync(join(sandboxDir, '.agent/tasks/TASK-100_init.md'), '', 'utf8');
      installGhStub(sandboxDir, [
        '[Team A] TASK-1200: Issue only',
        '[Team B] TASK-B-9999: should not mix with A',
        '[Team C] TASK-C-8888: should not mix with A',
      ]);

      const resA = runScript(sandboxDir, 'next-task-number.sh', ['A']);
      expect(resA.status).toBe(0);
      expect(resA.stdout.trim()).toBe('TASK-1201');
      expect(resA.stderr).toBe('');

      const resB = runScript(sandboxDir, 'next-task-number.sh', ['B']);
      expect(resB.status).toBe(0);
      expect(resB.stdout.trim()).toBe('TASK-B-10000');
    });

    it('2. 파일에만 더 큰 번호가 있을 때', () => {
      writeFileSync(join(sandboxDir, '.agent/tasks/TASK-1350_local.md'), '', 'utf8');
      writeFileSync(join(sandboxDir, '.agent/ACTIVE_TASK.md'), 'TASK-B-400', 'utf8');
      installGhStub(sandboxDir, ['[Team A] TASK-1200: older', '[Team B] TASK-B-350: older']);

      const resA = runScript(sandboxDir, 'next-task-number.sh', ['A']);
      expect(resA.status).toBe(0);
      expect(resA.stdout.trim()).toBe('TASK-1351');

      const resB = runScript(sandboxDir, 'next-task-number.sh', ['B']);
      expect(resB.status).toBe(0);
      expect(resB.stdout.trim()).toBe('TASK-B-401');
    });

    it('3. Issue와 파일 둘 다 번호가 있을 때 합집합 최댓값 + 1 반환', () => {
      writeFileSync(join(sandboxDir, '.agent/tasks/TASK-1155_file.md'), '', 'utf8');
      writeFileSync(join(sandboxDir, '.agent/tasks/TASK-B-360_file.md'), '', 'utf8');
      installGhStub(sandboxDir, ['[Team A] TASK-1158: issue', '[Team B] TASK-B-355: issue']);

      expect(runScript(sandboxDir, 'next-task-number.sh', ['A']).stdout.trim()).toBe('TASK-1159');
      expect(runScript(sandboxDir, 'next-task-number.sh', ['B']).stdout.trim()).toBe('TASK-B-361');
    });

    it('4. gh 실패 또는 미설치 시 stderr 경고와 함께 파일 기준 결과 반환 및 exit 0', () => {
      writeFileSync(join(sandboxDir, '.agent/tasks/TASK-500_file.md'), '', 'utf8');
      installGhStub(sandboxDir, null);

      const resFail = runScript(sandboxDir, 'next-task-number.sh', ['A'], true);
      expect(resFail.status).toBe(0);
      expect(resFail.stdout.trim()).toBe('TASK-501');
      expect(resFail.stderr).toContain('Issue 미조회 — 번호 중복 가능, 수동 확인 필요');

      const resMissing = runScript(sandboxDir, 'next-task-number.sh', ['A'], false);
      expect(resMissing.status).toBe(0);
      expect(resMissing.stdout.trim()).toBe('TASK-501');
      expect(resMissing.stderr).toContain('Issue 미조회 — 번호 중복 가능, 수동 확인 필요');
    });
  });

  describe('next-def-number.sh', () => {
    it('1. Issue에만 더 큰 DEF 번호가 있을 때 (Team A / Team B 격리 포함)', () => {
      writeFileSync(join(sandboxDir, '.agent/defects/DEF-120_old.md'), '', 'utf8');
      installGhStub(sandboxDir, [
        '[Team A] DEF-210 fix',
        '[Team B] DEF-B-045 fix',
      ]);

      const resA = runScript(sandboxDir, 'next-def-number.sh', ['A']);
      expect(resA.status).toBe(0);
      expect(resA.stdout.trim()).toBe('DEF-211');
      expect(resA.stderr).toBe('');

      const resB = runScript(sandboxDir, 'next-def-number.sh', ['B']);
      expect(resB.status).toBe(0);
      expect(resB.stdout.trim()).toBe('DEF-B-046');
    });

    it('2. 파일에만 더 큰 DEF 번호가 있을 때 (migrations 포함)', () => {
      writeFileSync(join(sandboxDir, 'supabase/migrations/20261118_def250_fix.sql'), '', 'utf8');
      writeFileSync(join(sandboxDir, '.agent/defects/DEF-B-080_local.md'), '', 'utf8');
      installGhStub(sandboxDir, ['[Team A] DEF-146 후속', '[Team B] DEF-B-010']);

      expect(runScript(sandboxDir, 'next-def-number.sh', ['A']).stdout.trim()).toBe('DEF-251');
      expect(runScript(sandboxDir, 'next-def-number.sh', ['B']).stdout.trim()).toBe('DEF-B-081');
    });

    it('3. Issue와 파일 둘 다 있을 때 합집합 최댓값 + 1 반환', () => {
      writeFileSync(join(sandboxDir, '.agent/defects/DEF-152_local.md'), '', 'utf8');
      writeFileSync(join(sandboxDir, '.agent/defects/DEF-B-160_local.md'), '', 'utf8');
      installGhStub(sandboxDir, ['[Team A] DEF-155 issue', '[Team B] DEF-B-150 issue']);

      expect(runScript(sandboxDir, 'next-def-number.sh', ['A']).stdout.trim()).toBe('DEF-156');
      expect(runScript(sandboxDir, 'next-def-number.sh', ['B']).stdout.trim()).toBe('DEF-B-161');
    });

    it('4. gh 실패 또는 미설치 시 stderr 경고와 함께 파일 기준 결과 반환 및 exit 0', () => {
      writeFileSync(join(sandboxDir, '.agent/defects/DEF-140_local.md'), '', 'utf8');
      installGhStub(sandboxDir, null);

      const resFail = runScript(sandboxDir, 'next-def-number.sh', ['A'], true);
      expect(resFail.status).toBe(0);
      expect(resFail.stdout.trim()).toBe('DEF-141');
      expect(resFail.stderr).toContain('Issue 미조회 — 번호 중복 가능, 수동 확인 필요');

      const resMissing = runScript(sandboxDir, 'next-def-number.sh', ['B'], false);
      expect(resMissing.status).toBe(0);
      expect(resMissing.stdout.trim()).toBe('DEF-B-001');
      expect(resMissing.stderr).toContain('Issue 미조회 — 번호 중복 가능, 수동 확인 필요');
    });
  });
});

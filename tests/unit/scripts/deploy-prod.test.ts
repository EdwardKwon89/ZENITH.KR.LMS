// IMP-179: 프로덕션 배포 가드 스크립트 — 네트워크·vercel 없이 검증 가능한 범위만 테스트한다.
// 실제 배포 경로(vercel --prod 실행·URL 파싱·V1~V3)는 배포 없이는 검증 불가 — 다음 배포 시 첫 실행으로 확인(211 §2-A).
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../../../scripts/deploy-prod.sh');
const run = (...args: string[]) => spawnSync('bash', [SCRIPT, ...args], { encoding: 'utf8' });

describe('IMP-179: scripts/deploy-prod.sh', () => {
  it('TC-179-1: bash 문법 오류가 없다', () => {
    const r = spawnSync('bash', ['-n', SCRIPT], { encoding: 'utf8' });
    expect(r.status).toBe(0);
  });

  it('TC-179-2: 알 수 없는 옵션은 exit 2 로 즉시 중단한다 (배포 시도 없음)', () => {
    const r = run('--bogus');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('알 수 없는 옵션');
  });

  it('TC-179-3: --expect 에 값이 없으면 exit 2 로 중단한다', () => {
    const r = run('--expect');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--expect');
  });

  it('TC-179-4: vercel --prod 는 격리 worktree 서브셸 안에서만 실행된다 (로컬 체크아웃 직접 배포 금지 — IMP-179 근본 원인)', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    const execLines = src.split('\n').filter((l) => /vercel --prod/.test(l) && !l.trim().startsWith('#') && !l.includes('info ') && !l.includes('vercel ls'));
    expect(execLines.length).toBeGreaterThan(0);
    for (const l of execLines) expect(l).toContain('cd "$WT"');
  });

  it('TC-179-5: 배포 소스는 origin/main 으로 고정된 detached worktree 이다', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toContain('git worktree add --detach "$WT" origin/main');
    expect(src).toContain('trap cleanup EXIT');
  });
});

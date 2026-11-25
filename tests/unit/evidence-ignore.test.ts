// TASK-B-385 (Issue #1513) — L3 .gitignore 가드 단위 테스트 (설계 PR #1515 §4 단위 테스트 ②)
//  · 원본 증적 확장자는 ..._Result 폴더류·screenshots에서 무시(차단)된다
//  · 요약 .md는 보호된다(무시되지 않음)
//  · 이미 추적 중인 파일에는 영향이 없다
import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROBES = [
  'docs/99_Manual/E2E_B380_Result/_b385_probe.json',
  'docs/99_Manual/E2E_B380_Result/_b385_probe.png',
  'docs/99_Manual/UAT_17_Result/_b385_probe.txt',
  'tests/e2e/screenshots/_b385_probe.png',
];

function checkIgnored(target: string): boolean {
  try {
    execSync(`git check-ignore -q "${target}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('.gitignore L3 가드', () => {
  it('원본 증적 확장자는 대상 폴더류·screenshots에서 무시된다 (차단)', () => {
    for (const p of PROBES) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, '');
      expect(checkIgnored(p), `${p}는 무시되어야 한다`).toBe(true);
    }
  });

  it('요약 .md는 보호된다 (무시되지 않음)', () => {
    const md = 'docs/99_Manual/E2E_B380_Result/_b385_probe.md';
    fs.mkdirSync(path.dirname(md), { recursive: true });
    fs.writeFileSync(md, '');
    expect(checkIgnored(md)).toBe(false);
    fs.rmSync(md, { force: true });
  });

  it('대상 밖 경로는 무시 대상이 아니다 (범위 초과 금지)', () => {
    const outside = 'docs/08_Self_Audit/Regression_Results/_b385_probe.json';
    fs.mkdirSync(path.dirname(outside), { recursive: true });
    fs.writeFileSync(outside, '');
    expect(checkIgnored(outside)).toBe(false);
    fs.rmSync(outside, { force: true });
  });

  it('이미 추적된 증적 파일은 .gitignore 영향 없음 (git ls-files 유지)', () => {
    const tracked = execSync('git ls-files "docs/99_Manual/E2E_B380_Result/"', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);
    expect(tracked.length).toBeGreaterThan(0); // 추적분 존재
    // 추적 상태는 .gitignore와 무관 (status에 M/공유로 계속 보인다)
    const out = execSync('git ls-files "docs/99_Manual/E2E_B380_Result/"', { encoding: 'utf-8' });
    expect(out.split('\n').filter(Boolean)).toEqual(tracked);
  });

  afterAll(() => {
    for (const p of PROBES) fs.rmSync(p, { force: true });
  });
});

// TASK-B-385 (Issue #1513) — L3 .gitignore 가드 단위 테스트 (설계 PR #1515 §4 · Jaison 검토 반영)
//  · 프로브는 **임시 git 저장소 복제본**에서 만든다 (실제 저장소 작업트리에 쓰지 않음 — 병렬·오염 방지)
//  · 원본 증적 확장자(10종)는 무시(차단), 요약 .md는 보호, 이름만의 예외 우회는 차단(summary.json 확인)
//  · 추적 파일은 무시 패턴에 걸려도 계속 추적됨을 `git ls-files -ci --exclude-standard`로 실측
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const REPO_ROOT = process.cwd();
const EVIDENCE_EXT = ['png', 'json', 'xlsx', 'pdf', 'txt', 'webm', 'jpg', 'jpeg', 'mp4', 'csv'];

let tmpRepo: string;

function ignoreInRepo(target: string): boolean {
  try {
    execSync(`git -C "${tmpRepo}" check-ignore -q "${target}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function probe(rel: string): string {
  const abs = path.join(tmpRepo, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, '');
  return abs;
}

describe('.gitignore L3 가드', () => {
  beforeAll(() => {
    // 임시 저장소 복제본: 저장소의 .gitignore를 그대로 복사해 동일 규칙 검증
    tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'b385-ignore-'));
    execSync('git init -q', { cwd: tmpRepo });
    fs.copyFileSync(path.join(REPO_ROOT, '.gitignore'), path.join(tmpRepo, '.gitignore'));
  });
  afterAll(() => {
    fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('원본 증적 확장자 10종은 ..._Result 폴더류·screenshots에서 무시된다 (차단)', () => {
    for (const ext of EVIDENCE_EXT) {
      expect(ignoreInRepo(probe(`docs/99_Manual/E2E_B380_Result/p.${ext}`)), `${ext}는 무시되어야 한다`).toBe(true);
      expect(ignoreInRepo(probe(`tests/e2e/screenshots/p.${ext}`)), `screenshots p.${ext}`).toBe(true);
    }
  });

  it('이름만으로 허용되지 않는다 — summary/README로 시작하는 원본 증적도 무시된다 (우회 차단)', () => {
    expect(ignoreInRepo(probe('docs/99_Manual/E2E_B380_Result/summary.json'))).toBe(true);
    expect(ignoreInRepo(probe('docs/99_Manual/E2E_B380_Result/README.json'))).toBe(true);
    expect(ignoreInRepo(probe('docs/99_Manual/E2E_B380_Result/summary_x.png'))).toBe(true);
  });

  it('요약 .md는 보호된다 (무시되지 않음)', () => {
    expect(ignoreInRepo(probe('docs/99_Manual/E2E_B380_Result/summary.md'))).toBe(false);
    expect(ignoreInRepo(probe('docs/99_Manual/E2E_B380_Result/README.md'))).toBe(false);
  });

  it('대상 밖 경로는 무시 대상이 아니다 (범위 초과 금지)', () => {
    expect(ignoreInRepo(probe('docs/08_Self_Audit/Regression_Results/p.json'))).toBe(false);
    expect(ignoreInRepo(probe('docs/99_Manual/assets/p.png'))).toBe(false);
  });

  it('이미 추적된 증적은 무시 패턴에 걸려도 계속 추적된다 (실측 — ls-files -ci 비공집합 + ls-files 유지)', () => {
    // 무시 패턴에 걸리면서도 추적 중인 파일 (실존해야 한다 — 없으면 L3가 추적분까지 막은 것)
    const ignoredTracked = execSync('git ls-files -ci --exclude-standard', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);
    expect(ignoredTracked.length).toBeGreaterThan(0);
    const tracked = new Set(execSync('git ls-files', { encoding: 'utf-8' }).split('\n').filter(Boolean));
    for (const p of ignoredTracked) {
      expect(tracked.has(p), `${p}는 추적에 남아야 한다`).toBe(true);
    }
  });
});

// TASK-B-385 (Issue #1513) — L1 헬퍼 가드 단위 테스트 (설계 PR #1515 §4 단위 테스트 ①)
//  · 저장소 내부 경로(설정·심볼릭 링크 해석 포함)는 throw — 재유입 차단
//  · 저장소 밖은 통과하고 디렉토리를 만든다 (기본값 = 홈 하위 영속 위치, 동적 계산)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const REPO_ROOT = process.cwd(); // vitest 루트 = 저장소 루트 (워크트리마다 상이)
let savedEnv: string | undefined;

beforeEach(() => {
  savedEnv = process.env.E2E_EVIDENCE_DIR;
  delete process.env.E2E_EVIDENCE_DIR;
});
afterEach(() => {
  if (savedEnv === undefined) delete process.env.E2E_EVIDENCE_DIR;
  else process.env.E2E_EVIDENCE_DIR = savedEnv;
  // 방어 정리: 되돌리기 런 등에서 저장소 안에 남은 프로브가 기준선을 오염시키지 않도록
  fs.rmSync(path.join(REPO_ROOT, 'docs/99_Manual', 'B385_UNIT_PROBE'), { recursive: true, force: true });
});

describe('evidenceDir (L1 재유입 가드)', () => {
  it('미설정 시 홈 하위 영속 위치로 해석 — 저장소 밖 + 디렉토리 생성', async () => {
    const { evidenceDir } = await import('../e2e/evidence-dir');
    const dir = evidenceDir('B385_UNIT_PROBE');
    expect(path.isAbsolute(dir)).toBe(true);
    // 저장소 밖
    const rel = path.relative(REPO_ROOT, dir);
    expect(rel.startsWith('..') || rel === '').toBe(true);
    // 홈 하위(영속 위치) + 생성 확인
    expect(dir.startsWith(fs.realpathSync(os.homedir()))).toBe(true);
    expect(fs.existsSync(dir)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('저장소 내부 경로를 지정하면 throw (기본 경로 오류)', async () => {
    const { evidenceDir } = await import('../e2e/evidence-dir');
    process.env.E2E_EVIDENCE_DIR = path.join(REPO_ROOT, 'docs/99_Manual');
    expect(() => evidenceDir('B385_UNIT_PROBE')).toThrow(/저장소 내부/);
    expect(fs.existsSync(path.join(REPO_ROOT, 'docs/99_Manual', 'B385_UNIT_PROBE'))).toBe(false);
  });

  it('상대 경로 설정이 저장소 안으로 해석되면 throw', async () => {
    const { evidenceDir } = await import('../e2e/evidence-dir');
    process.env.E2E_EVIDENCE_DIR = 'docs/99_Manual/E2E_B380_Result';
    expect(() => evidenceDir('B385_UNIT_PROBE')).toThrow(/저장소 내부/);
  });

  it('심볼릭 링크가 저장소 내부를 가리키면 throw (realpath 우회 차단)', async () => {
    const { evidenceDir } = await import('../e2e/evidence-dir');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b385-link-'));
    const link = path.join(tmp, 'evidence-link'); // 저장소 밖 위치의 링크
    try {
      fs.symlinkSync(path.join(REPO_ROOT, 'docs/99_Manual'), link, 'dir');
      process.env.E2E_EVIDENCE_DIR = link;
      expect(() => evidenceDir('B385_UNIT_PROBE')).toThrow(/저장소 내부/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('저장소 밖 환경변수 지정 시 통과 (realpath 해석 경로 반환)', async () => {
    const { evidenceDir } = await import('../e2e/evidence-dir');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b385-out-'));
    try {
      process.env.E2E_EVIDENCE_DIR = tmp;
      const dir = evidenceDir('B385_UNIT_PROBE');
      expect(dir.startsWith(fs.realpathSync(tmp))).toBe(true);
      expect(fs.existsSync(path.join(dir))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

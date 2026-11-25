// TASK-B-385 (Issue #1513) — E2E 증적 출력 경로 공통 헬퍼 (설계 확정: PR #1515 §3)
//
// 규칙(Aiden 확정):
//  · 해석 순서: E2E_EVIDENCE_DIR 환경변수 → 미설정 시 사용자 홈 하위 고정 이름의 영속 위치
//    (동적 계산 — 절대경로 하드코딩 금지, 실제 경로 문자열은 문서에 쓰지 않음)
//  · 저장소 내부 경로는 **throw** (재유입 L1 가드) — realpath로 해석해 심볼릭 링크 우회를 차단
//  · 저장소 루트는 실행 위치 기준으로 동적 계산 (워크트리마다 루트가 다름)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';

// 기존 spec의 dotenv 선례 정합 — 설정 수단: .env.local / CI secret / 셸 환경변수
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/** 홈 하위 고정 이름의 영속 기본 위치 (재부팅·정리로 사라지지 않는 위치) */
function defaultBase(): string {
  return path.join(os.homedir(), '.zenith-e2e-evidence');
}

/** 존재하지 않는 하위 경로까지 포함해 realpath 해석 (심볼릭 링크 우회 방지) */
function realNearest(target: string): string {
  let cur = path.resolve(target);
  for (;;) {
    try {
      return fs.realpathSync(cur);
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return cur;
      cur = parent;
    }
  }
}

/** 실행 위치(cwd) 기준 저장소 루트 탐색 (.git 유무 — 파일형 .git 워크트리 포함) */
function repoRootFromCwd(): string {
  let cur = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(cur, '.git'))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) return cur;
    cur = parent;
  }
}

function isInside(target: string, root: string): boolean {
  const t = path.resolve(target);
  const r = path.resolve(root);
  return t === r || t.startsWith(r + path.sep);
}

function deny(name: string): never {
  // 메시지에 절대경로를 쓰지 않는다 (R-21 — 로그에도 경로 미노출)
  throw new Error(`[evidence-dir] 저장소 내부 경로는 증적 출력으로 사용할 수 없습니다 (name=${name})`);
}

/**
 * 증적 출력 디렉토리 해석. 저장소 밖이 보장된 경로를 돌려주고, 디렉토리를 만든다.
 * 저장소 내부(심볼릭 링크로 해석해도)면 throw 한다.
 */
export function evidenceDir(name: string): string {
  const envBase = process.env.E2E_EVIDENCE_DIR?.trim();
  const base = envBase ? path.resolve(process.cwd(), envBase) : defaultBase();
  const root = realNearest(repoRootFromCwd());

  // 1) 기본 위치 자체가 저장소 내부(또는 그로 해석)면 throw — 설정 오류
  if (isInside(realNearest(base), root)) deny(`${name}:base`);

  // 2) 조합 경로가 저장소 내부(또는 심볼릭 링크로 그로 해석)면 throw
  const dir = path.resolve(base, name);
  if (isInside(realNearest(dir), root)) deny(name);

  fs.mkdirSync(dir, { recursive: true });

  // 3) 생성 후 실제 경로 재검증 (선제 생성된 심볼릭 링크 우회 방지)
  const realDir = fs.realpathSync(dir);
  if (isInside(realDir, root)) deny(name);
  return realDir;
}

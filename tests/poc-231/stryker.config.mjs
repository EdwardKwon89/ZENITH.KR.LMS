/**
 * TASK-1152 (Issue #1316) — 231 §8.1 단계 1 PoC: Stryker 변이 테스트 전용 설정.
 *
 * 변이 대상 3개 파일의 **전담 테스트 파일만** 실행한다(측정 시간 단축).
 *  - `src/lib/orders/ups-registration.ts`(DB 조회)·`src/lib/ups/discount-guard.ts`(DB 조회 4쿼리)는
 *    DB 의존 함수이므로 변이 대상에서 제외한다(231 §8.2 경계 구분, TASK-1152 격리 조건 ⑦).
 *
 * ⚠️ tempDirName을 **리포지토리 밖**(OS 임시 디렉토리)으로 둔다 — 실측 사고 기록:
 *   기본값(`.stryker-tmp`)은 `tests/poc-231/.stryker-tmp/`에 리포지토리 전체 사본을 만든다.
 *   그 상태에서 `npm run test:regression`(기본 `vitest.config.ts`)을 동시에 돌리면
 *   vitest의 `**\/*.{test,spec}.*` glob이 샌드박스 사본까지 수집해
 *   254 파일 → **566 파일**로 오염되고 272건이 "Cannot find module"로 실패한다.
 *   (실제로 2026-11-15 17:10 실행에서 발생 → 아래 조치로 재발 차단)
 *   → 샌드박스를 리포 밖에 두면 PoC가 회귀 스위트에 **구조적으로** 영향을 줄 수 없다
 *     (231 §10 #3 ⓓ "PoC 테스트는 test:regression에서 분리" 이행 강화).
 *
 * 사용법: `npx stryker run tests/poc-231/stryker.config.mjs`
 */
import os from 'node:os';
import path from 'node:path';

export default {
  testRunner: 'vitest',
  vitest: {
    configFile: 'tests/poc-231/vitest.mutation.config.ts',
    // 샌드박스가 리포 밖(OS 임시 디렉토리)에 만들어지면 vitest의 `--related`(git 인덱스 기반)가
    // 변이 대상 파일과 연관된 테스트를 찾지 못한다(실측: "No tests were found").
    // 대상 테스트는 vitest.mutation.config.ts의 include로 이미 6개 파일로 한정했으므로
    // related 탐색을 끄고 그 목록을 그대로 쓴다.
    related: false,
  },
  mutate: [
    'src/lib/logistics/status-machine.ts',
    'src/lib/orders/ups-edit-availability.ts',
    'src/lib/ups/pricing-engine.ts',
  ],
  coverageAnalysis: 'perTest',
  concurrency: 1,
  timeoutMS: 30000,
  timeoutFactor: 2,
  reporters: ['clear-text', 'progress', 'json', 'html'],
  jsonReporter: { fileName: 'tests/poc-231/reports/mutation/mutation.json' },
  htmlReporter: { fileName: 'tests/poc-231/reports/mutation/mutation.html' },
  // 리포지토리 밖 — 회귀 스위트 glob에 절대 걸리지 않는다.
  tempDirName: path.join(os.tmpdir(), 'zenith-lms-poc231-stryker'),
  cleanTempDir: true,
  thresholds: { high: 0, low: 0, break: null },
};

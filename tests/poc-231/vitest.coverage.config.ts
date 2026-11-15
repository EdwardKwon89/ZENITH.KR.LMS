/**
 * TASK-1152 (Issue #1316) — 231 §8.1 단계 1 PoC: 커버리지 기준선 측정 전용 설정.
 *
 * 격리 원칙(231 §10 #3 ⓑ~ⓓ):
 *  - 기존 `vitest.config.ts`·`package.json`·lockfile을 수정하지 않는다(mergeConfig로 상속만 한다).
 *  - 이 디렉토리(`tests/poc-231/`)에 새 파일만 추가한다.
 *  - `npm run test:regression`(=`vitest run`, 기본 config) 대상에서 분리된다 — 별도 `--config`로만 실행.
 *
 * 사용법:
 *   npx vitest run --config tests/poc-231/vitest.coverage.config.ts \
 *     tests/unit/logistics tests/unit/orders tests/unit/ups
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config';

/** 231 §8.2 PoC 대상 ①② — 5개 파일 */
const POC_231_TARGETS = [
  'src/lib/logistics/status-machine.ts',
  'src/lib/orders/ups-edit-availability.ts',
  'src/lib/orders/ups-registration.ts',
  'src/lib/ups/pricing-engine.ts',
  'src/lib/ups/discount-guard.ts',
];

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        enabled: true,
        // 측정만 한다 — 차단 기준(thresholds) 없음 (231 §10 #1 ⓒ)
        all: true,
        include: POC_231_TARGETS,
        reporter: ['text', 'json', 'json-summary'],
        reportsDirectory: './tests/poc-231/reports/coverage',
      },
    },
  }),
);

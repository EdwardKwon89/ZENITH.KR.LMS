/**
 * TASK-1152 (Issue #1316) — 231 §8.1 단계 1 PoC: Stryker 변이 테스트 전용 설정.
 *
 * 변이 대상 3개 파일의 **전담 테스트 파일만** 실행한다(측정 시간 단축).
 *  - `src/lib/orders/ups-registration.ts`(DB 조회)·`src/lib/ups/discount-guard.ts`(DB 조회 4쿼리)는
 *    DB 의존 함수이므로 변이 대상에서 제외한다(231 §8.2 경계 구분, TASK-1152 격리 조건 ⑦).
 *
 * ⚠️ `next build` 타입체크 영향 0을 위해 `ViteUserConfig`로 명시 캐스팅한다
 *   (vitest.coverage.config.ts 상단 주석 참조 — 2026-11-15 CI 실측).
 *
 * 사용법: `npx stryker run tests/poc-231/stryker.config.mjs`
 */
import { mergeConfig, type ViteUserConfig } from 'vitest/config';
import baseConfig from '../../vitest.config';

const mutationOverrides: ViteUserConfig = {
  test: {
    // 계측(instrument)된 코드를 대상으로 실행하므로 커버리지 수집은 끈다.
    coverage: { enabled: false },
    include: [
      'tests/unit/logistics/status-machine.test.ts',
      'tests/unit/orders/ups-edit-availability.test.ts',
      'tests/unit/ups/pricing-engine.test.ts',
      'tests/unit/ups/pricing-engine-tier-dwb.test.ts',
      'tests/unit/ups/task-b302-freight-ceil.test.ts',
      'tests/unit/ups/surge-fee-alpha2.test.ts',
    ],
  },
};

export default mergeConfig(baseConfig as ViteUserConfig, mutationOverrides);

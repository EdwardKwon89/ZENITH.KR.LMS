# TASK-1152: Issue #1316 — 테스트 강화 PoC 단계 1 (모듈 ①② 커버리지·변이 점수 기준선 측정)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1316](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1316) |
| **근거 문서** | [231 테스트 커버리지 전략 가이드](../../docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md) §8.1 단계 1 / §8.2 모듈 ①② / §10 #1~#3 / 부록 D-1 |
| **담당** | B_Kai (Team A) — Worker, Auditor: Aiden (R-01) |
| **착수** | 2026-11-15 KST |
| **우선순위** | P2 (type:feat) |
| **상태** | ✅ 완료 — 검토 대기 (`status:review`) |
| **브랜치** | `feature/teama-poc231-baseline` (origin/develop `128e6e13b` 기준) |
| **PR** | Draft + `do-not-merge` (develop 병합 금지) |

## 목표

모듈 ①② 현행 상태의 **커버리지·변이 점수 기준선**을 **코드 변경 없이** 측정하고,
실DB 테스트 CI 구성·시간·fixture 현황을 조사해 **기준선 보고서(231 부록 D-1)** 로 남긴다.

## 격리 조건 준수 계획 (231 §10 #3 ⓐ~ⓖ)

| # | 조건 | 준수 방법 |
|:-:|:--|:--|
| ⓐ | 모듈 ③(SHXK) 제외, ①②만 | 변이·커버리지 대상 5개 파일 한정 |
| ⓑ | `src/` 무수정, 새 경로에 새 파일만 | `tests/poc-231/` 신규 파일만 추가 (src/ diff 0) |
| ⓒ | LRTM·package.json·lockfile·pr-checks.yml 미수정 | 도구는 `npm install --no-save`(package.json·lockfile 변경 0), LRTM·CI 미수정 |
| ⓓ | PoC 테스트 `test:regression` 분리 | 별도 `--config tests/poc-231/*.config.ts` 로만 실행, 파일명도 `*.config.ts`(테스트 패턴 미해당) |
| ⓔ | Draft PR + `do-not-merge` | PR Draft 생성 + 라벨 |
| ⓕ | Team B 사전 고지 | #1298 게시(회신 없음) → Edward 지시로 격리 전제 선행 |
| ⓖ | 채택 후 반입은 별도 PR | 본 Task는 측정·보고만 |

## 범위

1. 도구 설치 + 동작 확인 — `@vitest/coverage-v8@4.1.4`, `fast-check@4.10.2`, `@stryker-mutator/core@10.1.1`, `@stryker-mutator/vitest-runner@10.1.1` (R-06 문서 대조 완료)
2. 5개 파일 커버리지(라인/분기) + 미커버 분기 목록
3. Stryker 변이 점수 기준선(순수 함수 3개) + 소요 시간
4. 실DB 테스트 CI 구성·시간·fixture 헬퍼 현황 조사 (231 §10 #4 입력)
5. 기준선 보고서 작성 (`docs/08_Self_Audit/` 하위, 한글 R-07)

## DoD

- [x] 격리 조건 ①~⑦ 준수 (PR diff에 `src/`·package.json·lockfile·pr-checks.yml·LRTM 변경 0)
- [x] 5개 파일 커버리지 수치(라인/분기) 및 미커버 분기 목록 기재
- [x] 변이 점수 + 실행 시간 기재, 제외 대상·사유 명시
- [x] 실DB 테스트 CI 현황 조사 결과 기재
- [x] 기준선 보고서 작성, 수치 재현 명령어 포함
- [x] `npm run test:regression` 결과가 PoC 전후 동일(영향 0 증빙)
- [x] R-17 완료 보고 절차 준수 + Draft/`do-not-merge` 유지

## [작업 결과]

### 1. 산출물

| 구분 | 경로 | 커밋 |
|:--|:--|:--|
| 계측 설정 (커버리지) | `tests/poc-231/vitest.coverage.config.ts` | `5a41d8182` |
| 계측 설정 (변이 실행) | `tests/poc-231/vitest.mutation.config.ts` | `5a41d8182` |
| Stryker 설정 | `tests/poc-231/stryker.config.mjs` | `5a41d8182` |
| 산출물 gitignore | `tests/poc-231/.gitignore` (`reports/`, `.stryker-tmp/`) | `5a41d8182` |
| 기준선 보고서 (부록 D-1) | `docs/08_Self_Audit/TestCoverage_231/231_PoC_Baseline_Report_D1_20261115.md` | (문서 커밋) |
| 자기감사 인덱스 등록 | `docs/08_Self_Audit/000_README.md` | (문서 커밋) |

### 2. 측정 결과 (모듈 ①② 5개 파일)

**커버리지** (Node v24.14.0, 전담 테스트 16파일/211케이스, 16.7초)

| 파일 | 구문 | 분기 | 함수 | 라인 |
|:--|--:|--:|--:|--:|
| `status-machine.ts` | 100% | 90.47% | 100% | 100% |
| `ups-edit-availability.ts` | 100% | 100% | 100% | 100% |
| `ups-registration.ts` | 100% | 100% | 100% | 100% |
| `pricing-engine.ts` | 93.52% | 81.19% | 94.73% | 93.98% |
| `discount-guard.ts` | 100% | 72.72% | 100% | 100% |
| **합계** | **95.79%** | **82.14%** | **96.42%** | **96.05%** |

- 미커버 분기 **30/168** — 성격별: 예외 `throw` 가드 7 · null/0원 가드 6 · `??`/`||` fallback 15 · 삼항 2.
  **30개 전부 "데이터가 없거나 0원일 때"의 경로**이며 정상 요율 경로는 포화 상태.

**변이 점수** (순수 함수 3파일, 변이 515개, `concurrency:1`, 7분 28초)

| 파일 | 변이 | Killed | Survived | No coverage | 전체 | 커버 코드만 |
|:--|--:|--:|--:|--:|--:|--:|
| `status-machine.ts` | 117 | 97 | 18 | 2 | 82.91% | 84.35% |
| `ups-edit-availability.ts` | 26 | 25 | 1 | 0 | 96.15% | 96.15% |
| `pricing-engine.ts` | 372 | 275 | 73 | 24 | 73.92% | 79.02% |
| **합계** | **515** | **397** | **92** | **26** | **77.09%** | **81.19%** |

- timeout 0 · error 0. 격리 조치 전/후 2회 독립 실행에서 수치 완전 동일(재현성 확인).
- **라인 96% ↔ 변이 77%의 19%p 격차** — "실행은 되지만 단언이 없는 코드"가 그만큼 존재.
- 주요 생존 변이: 20kg(`:51`)·70kg(`:317`)·oversize(`:171`) 경계 연산자, 제품군 매핑 `:56~62` StringLiteral 7,
  CANCELED/DISPOSED/MASTERED 빈 전이 배열(`:28~31`) 및 `getOrderEditScope` 잠금 플래그 10건.

### 3. 실DB 테스트 CI 현황 (231 §10 #4 입력)

- `Regression Tests` **단일 job**이 DB 준비 + 전체 스위트를 담당. DB 전용 job·shard·재시도 없음.
- CI 실측(run 43613667398): Supabase start 1m45s / `db reset` 31s / `npm ci` 15s / `build` 42s / **`test:regression` 3m22s** / job 6m46s.
- fixture 공용 헬퍼 **없음** — 33개 integration 파일이 각자 구현(`function psql()` 10, 수제 JWT 4, service_role 11).
- 시사점: D3-B·D6 확대 시 job 분리 없이는 피드백 시간이 선형 증가.

### 4. 격리 조건 준수 (231 §10 #3 ⓐ~ⓖ)

| # | 조건 | 확인 |
|:-:|:--|:--|
| ⓐ | 모듈 ③(SHXK) 제외 | 대상 5개 파일 한정 ✅ |
| ⓑ | `src/` 무수정, 새 경로에 새 파일만 | `git diff --name-only 128e6e13b..HEAD -- src/` = **0건** ✅ |
| ⓒ | LRTM·package.json·lockfile·pr-checks.yml 미수정 | 위 4경로 diff **0건**, `npm install --no-save` 사용 ✅ |
| ⓓ | PoC 테스트 `test:regression` 분리 | 회귀 254파일/1834케이스 = 기준선과 동일 ✅ (초기 1회 오염 → 발견 이슈 #1 조치) |
| ⓔ | Draft PR + `do-not-merge` | Draft PR 생성 + 라벨 ✅ |
| ⓕ | Team B 사전 고지 | #1298 게시(회신 없음) → Edward 지시로 격리 전제 선행 |
| ⓖ | 채택 후 반입은 별도 PR | 본 Task는 측정·보고만 ✅ |

### 5. R-08 회귀 검증

```
Test Files  254 passed (254)
     Tests  1834 passed (1834)
  Duration  235.57s   (로컬, Node v24.14.0)
```

- CI 기준선(run 43613667398) **254 파일 / 1834 케이스 / 실패 0** 과 **정확히 일치** → PoC 도입 영향 0.
- 로컬 소요 235.57s vs CI 201.50s 차이는 러너 성능 차이.

### 6. 재현

보고서 §6 참조. 요약: `npx vitest run --config tests/poc-231/vitest.coverage.config.ts <16파일>` → `npx stryker run tests/poc-231/stryker.config.mjs` → `npm run test:regression`.

### 7. 미완/후속

- 231 §10 의사결정(#4 실DB 위치, #6 Gate 2 수치, #13 편입 기준, #16 D3-B)은 **Aiden/Edward 결정 사항** — 본 보고서 §8이 입력값.
- Stryker 상시 도입 시 `vitest.config.ts` `exclude`에 `**/.stryker-tmp/**` 추가 권고(발견 이슈 #1).

## [발견 이슈] (R-18)

### 1. Stryker 기본 샌드박스 위치가 회귀 스위트를 오염시킨다 (격리 설계 결함, 자체 해결)

- **현상**: 첫 `npm run test:regression` 실행에서 **254 파일 대신 566 파일** 수집, 272건 `Cannot find module` 실패.
- **원인**: Stryker 기본 `tempDirName`(`.stryker-tmp`)이 `tests/poc-231/.stryker-tmp/`에 리포지토리 전체 사본을 만들고, 기본 `vitest.config.ts`의 glob(`**/*.{test,spec}.*`)이 그 사본의 테스트 파일까지 수집했다. 파일명 규칙(`*.config.ts`)만으로는 "PoC ↔ 회귀 분리"가 보장되지 않는다.
- **조치(본 Task 내)**: `tempDirName`을 `os.tmpdir()/zenith-lms-poc231-stryker`(리포 밖)로 이동 + `vitest.related: false`(샌드박스가 리포 밖이면 `--related`가 연관 테스트를 못 찾음) + `.gitignore`에 `.stryker-tmp/` 추가.
- **후속 제안**: Stryker를 상시 도입할 경우(`231 §10 #1` 채택 시) `vitest.config.ts`의 `exclude`에 `**/.stryker-tmp/**`를 추가하는 것이 근본 방어다. 본 PoC는 `src/`·`vitest.config.ts` 무수정 조건(ⓑ) 때문에 config 수정 대신 샌드박스 위치 이동으로 해결했다. → 채택 PR에서 함께 반영 권고.
- **보고서 반영**: `231_PoC_Baseline_Report_D1_20261115.md` §1.3 「격리 사고 1」.

### 2. `tests/` 하위 `.ts` 추가만으로 `next build`(프로덕션 빌드)가 깨진다 (격리 설계 결함, 자체 해결)

- **현상**: PR #1318 CI `Regression Tests`가 **`npm run build` 단계에서 실패**해 `test:regression`이 실행조차 되지 않았다(run 43696048503).
  ```
  ./tests/poc-231/vitest.coverage.config.ts:27:3
  Type error: Argument of type 'UserConfig & Promise<UserConfig> & ...' is not assignable to parameter of type 'never'.
  ```
- **원인**: `tsconfig.json`의 `include`가 `**/*.ts`라서 `next build`가 PoC 설정 파일까지 타입체크한다. Next는 `*.test.*`·`*.spec.*`는 제외하지만 **`*.config.ts`는 제외하지 않는다**. 즉 231 §10 #3 ⓑ("새 파일만 추가")를 지켜도 **빌드 영향 0이 자동 보장되지 않는다**. 부차 원인으로 vitest 4의 `defineConfig` 반환 타입이 유니온이라 `mergeConfig` 오버로드가 성립하지 않는다.
- **조치(본 Task 내)**: `baseConfig as ViteUserConfig` 명시 캐스팅 + `defineConfig` 제거 + `coverage.all` 제거(vitest 4 폐기 옵션). **`tsconfig.json`·`package.json`·lockfile은 수정하지 않았다**(격리 조건 ⓑ 유지).
- **검증**: `npx tsc --noEmit`(해당 2파일) 무오류 → `npm run build` 로컬 성공 → `coverage.all` 제거 후 커버리지 수치 완전 동일(96.05 / 82.14 / 96.42 / 95.79).
- **후속 제안**: PoC·도구용 TS를 계속 `tests/`에 둘 경우 ① `tsconfig.json` `exclude`에 `tests/poc-*/**` 추가, 또는 ② 설정 파일을 `.mjs`로 작성(타입체크 대상 아님) 중 하나를 표준으로 확정할 것. → 채택 PR에서 함께 반영 권고.
- **보고서 반영**: `231_PoC_Baseline_Report_D1_20261115.md` §1.3 「격리 사고 2」.

### 3. R-06 Context7 MCP 미가동

- 본 세션에서 `mcp__context7__*` 도구가 노출되지 않아 `npm view`(실제 peer/engine 값) + 공식 문서로 대체했다. 설치·실행 검증까지 완료했으므로 판정에는 영향 없음. 도구 미가동 자체는 별도 확인 필요.

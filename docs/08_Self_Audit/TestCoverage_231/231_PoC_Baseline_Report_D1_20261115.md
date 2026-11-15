# 231 PoC 단계 1 기준선 보고서 (부록 D-1)

> **문서 성격**: [231 테스트 커버리지 전략 가이드](../../00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md) §8.1 단계 1(PoC)의 산출물 **부록 D-1 기준선 보고서**.
> **Task**: [TASK-1152 / Issue #1316](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1316) — 수행 B_Kai, 검증 Aiden(R-01)
> **기준 커밋**: `develop` `128e6e13b` (2026-11-15)
> **측정일**: 2026-11-15 KST
> **상태**: PoC 측정 결과 — **코드 변경 없음**(`src/` 읽기 전용), 채택 여부 미결(§10 결정 대기)

---

## 0. 요약

| 항목 | 결과 |
|:--|:--|
| 커버리지(모듈 ①② 5개 파일, 전담 테스트 기준) | 라인 **96.05%** · 분기 **82.14%** · 함수 96.42% · 구문 95.79% |
| 미커버 분기 | 총 **30개**(분기 168개 중 30개 미실행) — 예외 `throw` 7 · null/0원 가드 6 · `??`/`||` fallback 15 · 삼항 2 |
| 변이 점수(순수 함수 3개 파일, 변이 515개) | **77.09%**(커버된 코드만 **81.19%**) — Killed 397 · Survived 92 · No coverage 26 |
| 순수 함수 변이 소요 시간 | **7분 28초**(순차 `concurrency:1`, 변이 1건당 약 0.87초) |
| 실DB 테스트 CI | **별도 job 없음** — `Regression Tests` 단일 job 안에서 `supabase db reset` 후 전체 스위트 실행 |
| CI `test:regression` 단계 소요 | **3분 22초**(러너) / job 전체 6분 46초 |
| fixture 공용 헬퍼 | **없음** — 33개 integration 파일이 각자 inline fixture(psql `docker exec`, 수제 JWT, service_role) |
| 회귀 영향 (R-08) | **0** — `test:regression` 254 파일 / 1834 케이스 / 실패 0 (PoC 전 CI 기준선과 정확히 일치, §7-6) |

**핵심 판단 근거 4가지**

1. **라인 커버리지 96% ↔ 변이 점수 77%의 19%p 격차.** 5개 파일은 "실행은 되지만 단언이 없는" 코드가 많다. 커버리지 목표만 세우면 이 구간을 놓친다(231 §6).
2. 커버리지 미커버 30개가 **전부 "데이터가 없거나 0원일 때"의 경로**다. ① 예외 `throw` 가드 7개, ② null·0원 가드 6개, ③ `??`/`||` fallback 15개, ④ 삼항 2개. 정상 흐름은 촘촘하고 **실패 흐름이 비어 있다** — 231 §1.1 문제의식 3·4와 일치.
3. 생존 변이 92건 중 가장 위험한 것은 **① 20kg·70kg 중량 경계(`<=`→`<`)와 제품군 매핑(`WW_EXPRESS`→`""`)이 모두 생존**(요금이 조용히 틀어짐), **② CANCELED·DISPOSED·MASTERED의 "전이 불가" 미단언**(취소된 오더가 되살아날 수 있음), **③ `discount-guard.ts`의 tier·freight 요율 경로 미커버**(fail-open 구조와 직결)다.
4. 실DB 테스트는 이미 PR CI에 포함되어 있으나 **`Regression Tests` job 하나에 전부 묶여** 있다. DB 준비(2분 16초)가 job의 33%, 테스트 실행이 50%다. D3-B·D6을 추가하면 **job 분리 없이는 피드백 시간이 선형 증가**한다(231 §10 #4 입력).

---

## 1. 측정 환경과 도구

### 1.1 환경

| 항목 | 값 |
|:--|:--|
| OS / CPU | macOS (arm64) |
| Node.js | v24.14.0 (`package.json` engines `24.x` = CI `node-version: '24'`와 일치) |
| npm | 11.9.0 (Node 24 번들) |
| vitest | 4.1.4 (기존 설치본) |
| Supabase CLI | 2.95.4 (프로젝트 devDependency, CI 고정 2.122.1과 동일 major 2.x) |
| 로컬 DB | `supabase start` + `supabase db reset --yes` (마이그레이션 306개 + seed 4종) |
| 격리 워크트리 | `scripts/agent-worktree-init.sh b_kai` → `ZENITH_LMS-worktrees/b_kai` |
| 브랜치 | `feature/teama-poc231-baseline` (Draft PR + `do-not-merge`) |

### 1.2 도구 설치 (231 §10 #1 승인 버전 고정)

```bash
npm install --no-save --no-audit --no-fund \
  @vitest/coverage-v8@4.1.4 fast-check@4.10.2 \
  @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1
```

- `--no-save` 사용 → **`package.json`·lockfile 변경 0** (231 §10 #3 ⓒ 준수, `git status` clean 확인).
- **R-06 문서 대조**(Context7 MCP 미가동 → `npm view` + 공식 문서로 대체):

| 패키지 | 설치 버전 | peer/engine 실제값 | 판정 |
|:--|:--|:--|:--|
| `@vitest/coverage-v8` | 4.1.4 | peer `vitest: 4.1.4` | ✅ 설치된 vitest 4.1.4와 정확히 일치(최신 5.1.0은 peer 불일치) |
| `fast-check` | 4.10.2 | engine `node >=12.17` | ✅ |
| `@stryker-mutator/core` | 10.1.1 | engine `node >=22` | ✅ (Node 24) |
| `@stryker-mutator/vitest-runner` | 10.1.1 | peer `vitest >=2.0.0`, `core 10.1.1` | ✅ |

- 단계 1에서는 fast-check를 **설치·동작 확인까지만** 한다(속성 기반 테스트는 단계 2, 231 §8.1).

### 1.3 PoC 전용 경로 (기존 파일 무수정)

| 파일 | 용도 |
|:--|:--|
| `tests/poc-231/vitest.coverage.config.ts` | 기존 `vitest.config.ts`를 `mergeConfig`로 상속 + 5개 파일만 계측 |
| `tests/poc-231/vitest.mutation.config.ts` | 변이 대상 3개 파일의 전담 테스트만 실행 |
| `tests/poc-231/stryker.config.mjs` | Stryker 설정(변이 범위·리포터·타임아웃·샌드박스 위치) |
| `tests/poc-231/reports/` | 측정 산출물(gitignore, 재현 명령으로 재생성) |

- 두 vitest config는 파일명이 `*.config.ts`라 vitest 기본 테스트 패턴(`**/*.{test,spec}.*`)에 걸리지 않는다 → **`npm run test:regression` 대상에서 구조적으로 분리**(231 §10 #3 ⓓ).

#### ⚠️ 격리 사고 1건과 구조적 조치 (2026-11-15)

첫 회귀 실행(`npm run test:regression`)이 **254 파일 대신 566 파일**을 수집하고 272건이 `Cannot find module`로 실패했다. 원인은 **Stryker 기본 샌드박스 위치(`.stryker-tmp`, 즉 `tests/poc-231/.stryker-tmp/`)** 였다 — Stryker가 리포지토리 전체 사본을 `tests/` 하위에 만들고, 그 상태에서 기본 `vitest.config.ts`의 glob(`**/*.{test,spec}.*`)이 샌드박스 사본의 테스트까지 수집했다. 즉 **"PoC는 회귀에서 분리된다"는 전제가 파일명 규칙만으로는 지켜지지 않는다.**

| 조치 | 내용 |
|:--|:--|
| 샌드박스를 리포 밖으로 | `tempDirName`을 `os.tmpdir()/zenith-lms-poc231-stryker`로 변경 → 회귀 스위트가 PoC 산출물을 **물리적으로 볼 수 없다** |
| `related` 비활성 | 샌드박스가 리포 밖이면 vitest `--related`(git 인덱스 기반)가 연관 테스트를 찾지 못한다(`No tests were found` 실측). 대상 테스트는 `vitest.mutation.config.ts` include로 6개 파일에 한정했으므로 `related: false`로 그 목록을 그대로 사용 |
| 방어적 gitignore | `tests/poc-231/.gitignore`에 `.stryker-tmp/` 추가(과거 설정·중단된 실행 잔재 대비) |

> 결과적으로 "측정 산출물은 리포지토리 밖 또는 gitignore" + "회귀 glob에 걸릴 수 있는 위치에 테스트 파일을 두지 않는다"는 두 겹의 분리가 확보됐다. 이 조치 후 재측정한 값이 본 보고서 §3·§4의 수치다.

---

## 2. 모듈 경계 (231 §8.2 ①②)

| # | 파일 | 줄 | 함수 | 순수/DB | 변이 대상 |
|:-:|:--|--:|:--|:--|:--|
| ① | `src/lib/logistics/status-machine.ts` | 186 | `canChangeStatus`, `isOrderEditable`, `isOrderPartiallyEditable`, `getOrderEditScope`, `isMasteredStatus` | 순수 | ✅ |
| ① | `src/lib/orders/ups-edit-availability.ts` | 66 | `getUpsEditAvailability` (+ 상수 3) | 순수 | ✅ |
| ① | `src/lib/orders/ups-registration.ts` | 39 | `hasActiveUpsLabel` | **DB**(`zen_ups_labels`) | ❌ 제외 |
| ② | `src/lib/ups/pricing-engine.ts` | 407 | 13개 export(요율·중량·Zone·부가요금 계산) | 순수 | ✅ |
| ② | `src/lib/ups/discount-guard.ts` | 85 | `validateAgencyReverseMargin`, `getMaxAllowedZoneDiscount` | **DB**(4개 요율·할인 테이블) | ❌ 제외 |

**변이 제외 사유** (TASK-1152 격리 조건 ⑦ / 231 §8.2 경계 구분)

- `ups-registration.ts`: 단일 함수가 Supabase 쿼리 1회 후 boolean 반환 — 로직이 사실상 없고, 변이해도 "쿼리 체이닝 mock이 특정 인자로 호출됐는가"만 검증하게 되어 변이 점수가 **테스트 구현 결합도**를 측정하게 된다(의미 없음).
- `discount-guard.ts`: 4개 테이블 조회 후 비율 계산. DB 의존부는 mock 고정이 필요하고, **`error` 미검사(fail-open) 결함**은 변이 테스트가 아니라 실패 주입 테스트(단계 2)로 다루는 것이 맞다.
- 두 파일의 **커버리지**는 측정 대상에 포함했다(제외는 변이에 한정).

---

## 3. 커버리지 기준선 (5개 파일)

### 3.1 수치

측정 조건: **5개 파일을 import하는 테스트 16개 파일 / 211 케이스**만 실행(아래 §3.3). `all: true`로 5개 파일 전체를 계측.

| 파일 | 구문 | 분기 | 함수 | 라인 | 미커버 분기(개) | 미커버 라인 |
|:--|--:|--:|--:|--:|--:|:--|
| `logistics/status-machine.ts` | 100% | 90.47% | 100% | 100% | 2 / 21 | — |
| `orders/ups-edit-availability.ts` | 100% | 100% | 100% | 100% | 0 / 6 | — |
| `orders/ups-registration.ts` | 100% | 100% | 100% | 100% | 0 / 2 | — |
| `ups/pricing-engine.ts` | 93.52% | 81.19% | 94.73% | 93.98% | 22 / 117 | 68, 315, 323, 329, 341, 348, 351, 357, 380 |
| `ups/discount-guard.ts` | 100% | 72.72% | 100% | 100% | 6 / 22 | — |
| **합계** | **95.79%** | **82.14%** | **96.42%** | **96.05%** | **30 / 168** | |

### 3.2 미커버 분기 목록 (성격별)

| 성격 | 위치 | 내용 | 왜 위험한가 |
|:--|:--|:--|:--|
| fallback `||` | `status-machine.ts:57` | `TRANSITION_RULES[current] || []` — 정의되지 않은 상태값 | 상수 테이블이므로 실사용에선 도달 불가(우선순위 낮음) |
| fallback `||` | `status-machine.ts:66` | `ROLE_PERMISSIONS[role] || []` — 미정의 역할 | 역할 추가 시 조용히 "권한 없음"으로 떨어짐 |
| 예외 경로 | `pricing-engine.ts:68` | `productFamilyFromCode` 미매칭 → `'EXPRESS'` 기본값 | 신규 UPS 제품코드가 조용히 EXPRESS 요율로 계산(금전 오류) |
| 예외 경로 | `pricing-engine.ts:315,323,329` | Freight: 최소운임 없음 / 70kg 초과 티어 테이블 공백 / 구간 미매칭 `throw` | 요율 데이터 누락 시 화면·오더등록이 500으로 죽는 경로가 미검증 |
| 예외 경로 | `pricing-engine.ts:341,348,351,357` | Express: 20kg 초과 기준요금 없음 / 티어 공백 / 구간 미매칭 `throw` | 〃 (20kg 경계 = 가장 흔한 실사용 구간) |
| 콜백 | `pricing-engine.ts:380` | oversize 부가요금 **중복 제거** `some()` 콜백 | 서지·오버사이즈 요금이 이중 합산되는 회귀를 못 잡음 |
| 데이터 경로 | `discount-guard.ts:59,63,66,70,73,77` | 3개 테이블 각각의 `if (x.data)` null 경로 + `if (selling > 0)` 0원 경로 | 요율 테이블이 비었거나 판매가가 0원인 경우 비율 계산이 통째로 비는 경로 — **fail-open 결함과 직접 연결** |

> 요약: 미커버 30개를 성격별로 세면 ① **예외 `throw` 가드 7개**(`pricing-engine.ts` — 요율/티어 데이터 누락), ② **null·0원 데이터 가드 6개**(`discount-guard.ts` — `if (x.data)` 3 + `if (selling > 0)` 3), ③ **`??`·`||` fallback 15개**(데이터 결측 시 기본값), ④ **삼항 미적용 분기 2개**(`fuel_surcharge_applicable = false`)다. 즉 **30개 전부가 "데이터가 없거나 0원일 때"의 경로**이며, 정상 요율이 채워진 경로는 이미 포화 상태다. 단계 2(결정표·입력 점검표)가 노려야 할 지점이 바로 이 30개다.

### 3.3 기존 테스트 현황

| 대상 | 전담 테스트 파일 | 케이스(≈) |
|:--|:--|--:|
| `status-machine.ts` | `tests/unit/logistics/status-machine.test.ts` | 48 |
| ↳ 간접 | `tests/unit/logistics/order-update.test.ts`, `order-update-b339.test.ts` | 18 |
| `ups-edit-availability.ts` | `tests/unit/orders/ups-edit-availability.test.ts` | 8 |
| ↳ 간접(UI) | `tests/unit/orders/edit-form-warehoused-unlocked.test.tsx`, `ups-detail-b300/b301/edit-button.test.tsx` | (UI 렌더) |
| `ups-registration.ts` | `tests/unit/orders/ups-registration.test.ts` | 6 |
| `pricing-engine.ts` | `pricing-engine.test.ts`(44), `pricing-engine-tier-dwb.test.ts`(8), `task-b302-freight-ceil.test.ts`(13), `surge-fee-alpha2.test.ts`(4) | 69 |
| `discount-guard.ts` | `tests/unit/ups/discount-guard.test.ts` | 9 |

- 16개 파일 / 211 케이스 실행에 **16.5초**(transform 0.54s · setup 0.79s · import 5.89s · tests 1.59s · environment 6.14s).
- 주목: `pricing-engine.ts`의 69개 케이스에도 불구하고 **예외 `throw` 7개 경로가 전부 미검증**이다. 케이스 수는 많지만 "성공 경로 위주"로 작성돼 있다.

---

## 4. 변이 테스트 기준선 (순수 함수 3개 파일)

### 4.1 결과

측정 조건: 순수 함수 3개 파일 · 변이 **515개** · `coverageAnalysis: perTest` · `vitest.related: false` · `concurrency: 1` · 실행 테스트 6개 파일(133 케이스, 변이 1건당 평균 9.22 케이스).

| 파일 | 변이 수 | Killed | Survived | No coverage | 변이 점수(전체) | 변이 점수(커버된 코드만) |
|:--|--:|--:|--:|--:|--:|--:|
| `logistics/status-machine.ts` | 117 | 97 | 18 | 2 | **82.91%** | 84.35% |
| `orders/ups-edit-availability.ts` | 26 | 25 | 1 | 0 | **96.15%** | 96.15% |
| `ups/pricing-engine.ts` | 372 | 275 | 73 | 24 | **73.92%** | 79.02% |
| **합계** | **515** | **397** | **92** | **26** | **77.09%** | **81.19%** |

- timeout 0건, error 0건 → 순수 함수라 flaky 없음(재현성 확인).
- **재현성 교차 확인**: §1.3의 격리 조치(샌드박스 위치 이동 + `related: false`) **전/후 2회 독립 실행에서 변이 점수·kill/survive/no-coverage 건수가 완전히 동일**했다(77.09 / 397 / 92 / 26). 즉 이 수치는 실행 조건(샌드박스 위치·테스트 선택 방식)에 민감하지 않다.
- **라인 커버리지 96.05% ↔ 변이 점수 77.09%** 의 19%p 격차가 이번 측정의 핵심 신호다. "실행은 되지만 단언이 없는 코드"가 그만큼 있다는 뜻이며, 커버리지 숫자만으로 품질을 판단하면 안 된다는 231 §6의 서술을 실측으로 뒷받침한다.

### 4.2 생존 변이 분석 (92건)

Stryker 리포터의 `mutatorName` 기준 집계(합계 92 = 생존 변이 전량, 누락 0).

| 성격 | 건수 | 위치 (`pricing-engine.ts`는 `:줄`, 그 외는 파일명 명시) | 의미 |
|:--|--:|:--|:--|
| **경계 연산자** (`EqualityOperator` 10) | 10 | `:43`(epsilon 비교), `:51`(**20kg**), `:171`(**oversize 300/400cm**), `:317`(**70kg**), `:326,339,354`(티어 상·하한) | 경계값(20/70kg, 300/400cm, tier_min/max)에서 **정확히 그 값**을 넣는 케이스가 없다. 20kg·70kg는 실사용 최빈 구간이라 금전 영향이 직접적 |
| **`??`/`||` fallback·optional chaining** (`OptionalChaining` 11 + `LogicalOperator` 14) | 25 | `:106,107,117,118,196,228,229,238,242,253,254,290,292,322,350,354,372,373` | `fuelSurcharge`·`product_family`·`direction`·`currency`·`fallbackApplied`가 **null/undefined인 경우**를 아무 테스트도 만들지 않는다 |
| **조건 분기** (`ConditionalExpression` 19) | 19 | `:117,118,292,314,322,326,328,340,347,350,354,356` + `status-machine.ts:107` | 분기 자체를 강제로 고정해도 테스트가 통과 → 두 결과를 구분하는 단언이 없음 |
| **문자열 상수** (`StringLiteral` 9) | 9 | `:56~62`(제품군 매핑 7건), `:311`(`'FREIGHT'` 판별), `status-machine.ts:61`(전이 차단 메시지), `ups-edit-availability.ts:26`(차단 메시지) | `productFamilyFromCode`의 **반환값을 직접 단언하지 않고** 하위 계산 결과로만 간접 검증. 매핑이 틀리면 요율이 조용히 달라진다. 메시지 상수 2건은 문구 변경을 아무도 감지하지 못한다는 뜻 |
| **상태 전이 테이블·플래그** (`ArrayDeclaration` 6 + `BooleanLiteral` 12) | 18 | `status-machine.ts:19,28,29,30,31,37`(TRANSITION_RULES), `:149~153,161~165`(잠금 플래그 10건), `pricing-engine.ts:253,254`(`?? false`) | ① **CANCELED/DISPOSED/MASTERED = 전이 불가**를 단언하는 케이스가 없다(빈 배열을 채워도 통과) ② `getOrderEditScope`의 `lockShipperId`·`lockTransportMode`·`lockMeasuredPackageDims`·`auditEdit` 플래그는 값 검증 없이 구조만 통과 |
| **산술·누적** (`ArithmeticOperator` 5 + `AssignmentOperator` 1) | 6 | `:198,201,244,401` | `costTotal += base + fuel` 류 누적 연산을 `-=`/`-`로 바꿔도 통과 → **원가 합계 단언이 약하다**(판매가 위주 검증) |
| 기타 (`MethodExpression` 2 + `ObjectLiteral` 2 + `ArrowFunction` 1) | 5 | `:42,43,66,231,232,380` | `Math.round` 제거(42), `startsWith`→`endsWith`(66), oversize 중복 제거 콜백(380), 반환 메타 객체 필드(231·232) |
| **합계** | **92** | | |

> 가장 위험한 두 가지: **(a) 20kg·70kg 경계와 제품군 매핑이 모두 생존** — 요금이 1원~수만원 단위로 틀어지는 경로인데 기존 69개 케이스가 잡지 못한다. **(b) 종료 상태(CANCELED·DISPOSED·MASTERED) 전이 금지가 미검증** — 상태머신이 열리면 취소된 오더가 되살아난다.

### 4.3 소요 시간

| 항목 | 값 |
|:--|:--|
| 전체 벽시계 시간 | **7분 28초** (`real 449.29s`) |
| CPU 시간 | user 425.94s / sys 75.60s |
| 변이 1건당 평균 | 약 0.87초 (변이 515건 / 449초) |
| dry-run(계측 전 기준 실행) | 133 케이스 / 4초 (net 21ms, 오버헤드 4,253ms) |

- `fileParallelism: false` + `concurrency: 1` 조건이다. **변이 1건마다 vitest 프로세스를 새로 띄우는 고정 오버헤드(약 4.2초)** 가 지배적이어서, 515건에 7분 28초가 걸린다. 같은 비율이면 변이 900건 규모에서 약 13분이므로 **CI 필수 게이트로 두기 어렵고 수동/야간 실행이 적절**하다는 231 §6·§8.5 결론이 실측으로 확인됐다.
- 병렬화(`concurrency` 증가)하면 줄일 수 있으나, 기존 `fileParallelism: false` 전제(실DB 테스트 데이터 레이스 방지)와 다른 실행 조건이 되므로 **CI 편입 판단용 수치는 본 순차 측정값을 기준**으로 한다.
- 측정 중 다른 작업(회귀 스위트)을 동시에 돌리면 벽시계 시간이 늘어난다. 본 값은 **변이 측정 단독 실행** 조건이다.

### 4.4 제외·한계

- `ups-registration.ts`·`discount-guard.ts` 제외 사유는 §2 참조(DB 의존).
- 변이 점수는 "기존 테스트의 검출력"이며, **목표치가 아니다**. 단계 2에서 결정표·경계값·속성 기반 테스트를 추가한 뒤 같은 명령으로 재측정해 변화량을 비교한다(231 §8.4).
- 생존 변이 92건의 개별 위치·치환 내용은 `tests/poc-231/reports/mutation/mutation.html`(로컬 생성물)에서 확인할 수 있다.

---

## 5. 실DB 테스트 CI 현황 (231 §10 #4 입력)

### 5.1 구성

`.github/workflows/pr-checks.yml` — `Regression Tests` job **하나**가 DB 준비와 테스트를 모두 담당한다. DB 전용 job·분할(shard)·재시도 설정은 없다.

| 순서 | 단계 | 내용 |
|:-:|:--|:--|
| 1 | `supabase/setup-cli` | **2.122.1 고정**(DEF-B-154 — 3.x는 `[inbucket]` 거부) |
| 2 | `supabase start` | 로컬 스택 기동 |
| 3 | `supabase db reset --yes` | 스키마 306개 마이그레이션 + seed 4종(`seed_data.sql`·`seed_rate_card.sql`·`seed_rates_realistic.sql`·`seed_test_fixtures.sql`) |
| 4 | `.env.local` 생성 | `supabase status -o env`의 anon/service_role 키 |
| 5 | `npm ci` / `npm run build` | |
| 6 | `npm run test:regression` | = `vitest run` (**unit + integration 전부**, `fileParallelism:false`) |

### 5.2 실측 시간 (CI run 43613667398, 2026-11-14 성공)

| 단계 | 소요 |
|:--|--:|
| Start local Supabase | 1분 45초 |
| Apply migrations & seed (`db reset`) | 31초 |
| `npm ci` | 15초 |
| `npm run build` | 42초 |
| **`npm run test:regression`** | **3분 22초** |
| **job 전체** | **6분 46초** |

- DB 준비(2분 16초)가 job의 **33%**. 테스트 시간은 50%.
- 로컬 재측정(`supabase start` + `db reset`): reset 36초 — CI와 유사.

### 5.3 fixture 헬퍼 현황

| 항목 | 현황 |
|:--|:--|
| 공용 fixture 헬퍼 | **없음**. 33개 integration 파일이 각자 fixture를 만든다. |
| DB 직접 조작 | 10개 파일이 `function psql()` + `docker exec supabase_db_... psql`로 raw SQL 실행 |
| 인증 fixture | 4개 파일이 수제 JWT 서명(`makeJwt`) — 파일마다 복붙 |
| service_role 사용 | 11개 파일이 `SUPABASE_SERVICE_ROLE_KEY`로 RLS 우회 셋업 |
| 공용 seed 의존 | `supabase/seed_test_fixtures.sql`(562B, 소량) + `seed_data.sql` — **테스트별 전용 fixture는 아님** |
| 자기완결 fixture 원칙 | SAR-2026-07-27-001로 규정됐으나 **공용 헬퍼 부재**로 파일마다 재구현 |

**시사점**: D3-B(RLS/GRANT)·D6(정산 정합)을 확대하면 fixture 코드가 더 늘어난다. 공용 헬퍼(`createTestOrg`, `makeJwt`, `psql`)가 없어 **신규 테스트 1건당 셋업 비용이 높고 flaky 원인 추적도 어렵다** — 231 §8.5의 "실DB 테스트 안정성 전제(B_Kai 의견)"가 실측으로 확인됨.

---

## 6. 재현 명령어

```bash
# 0) 격리 워크트리 + DB 최신화
./scripts/agent-worktree-init.sh b_kai
cd ../ZENITH_LMS-worktrees/b_kai
npx supabase start && npx supabase db reset --yes

# 1) 도구 설치 (package.json·lockfile 미변경)
npm install --no-save --no-audit --no-fund \
  @vitest/coverage-v8@4.1.4 fast-check@4.10.2 \
  @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1

# 2) 커버리지 기준선 (§3)
npx vitest run --config tests/poc-231/vitest.coverage.config.ts \
  tests/unit/logistics/order-update-b339.test.ts tests/unit/logistics/order-update.test.ts \
  tests/unit/logistics/status-machine.test.ts \
  tests/unit/orders/edit-form-warehoused-unlocked.test.tsx tests/unit/orders/ups-detail-b300.test.tsx \
  tests/unit/orders/ups-detail-b301.test.tsx tests/unit/orders/ups-detail-edit-button.test.tsx \
  tests/unit/orders/ups-edit-availability.test.ts tests/unit/orders/ups-registration.test.ts \
  tests/unit/ups/discount-guard.test.ts tests/unit/ups/pricing-engine-tier-dwb.test.ts \
  tests/unit/ups/pricing-engine.test.ts tests/unit/ups/surge-fee-alpha2.test.ts \
  tests/unit/ups/task-b302-freight-ceil.test.ts tests/unit/ups/ups-order-detail-status.test.ts \
  tests/unit/warehouse/ups-pickup-inbound.test.ts
# → tests/poc-231/reports/coverage/coverage-summary.json

# 3) 변이 기준선 (§4)
npx stryker run tests/poc-231/stryker.config.mjs
# → tests/poc-231/reports/mutation/mutation.json
#   (샌드박스는 OS 임시 디렉토리에 생성되므로 회귀 스위트에 영향 없음)

# 4) 회귀 영향 0 확인 (§7-6)
npm run test:regression
# 기대: Test Files 254 passed / Tests 1834 passed (PoC 도입 전 CI 기준선과 동일)
```

---

## 7. 한계·주의

1. **커버리지 수치는 "전담 테스트 16개 파일" 기준**이다. 전체 스위트(254 파일)를 돌리면 간접 커버리지가 일부 늘어난다. 다만 두 결과 모두 **미커버 영역은 예외 경로**로 동일하다(§3.2).
2. 변이 점수는 **파일 3개·변이 515개**에 대한 측정이다. 난수·시간 의존 코드가 없는 순수 함수만 골랐으므로 재현성은 높다(§4.1 교차 확인).
3. `supabase db reset`은 로컬 DB를 파괴한다(R-14에 따른 로컬 한정). 측정 전 `check-db-freshness.sh`를 통과해야 한다.
4. Stryker는 `concurrency: 1`로 측정했다. 병렬화하면 벽시계 시간은 줄지만 `fileParallelism:false` 전제와 달라지므로, **CI 편입 판단용 수치는 본 측정값(순차)을 기준**으로 한다.
5. R-06 대조는 Context7 MCP 미가동으로 `npm view` + 공식 문서로 대체했다(설치·실행 검증 완료).
6. **회귀 영향 0 증빙**(R-08, 231 §10 #3 ⓓ): PoC 설정·산출물이 존재하는 상태에서 `npm run test:regression`을 실행한 결과 —

| 항목 | PoC 전 CI 기준선 (run 43613667398) | PoC 후 로컬 실행 (2026-11-15 17:37) | 판정 |
|:--|:--|:--|:--|
| Test Files | 254 passed | **254 passed** | 동일 |
| Tests | 1834 passed | **1834 passed** | 동일 |
| 실패 | 0 | **0** | 동일 |
| Duration | 201.50s (CI 러너) | 235.57s (로컬) | 참고값(환경 차이) |

   → 파일 수·케이스 수·실패 0이 **정확히 일치**한다. PoC 파일은 회귀 스위트에 수집되지 않는다.
7. **최초 회귀 실행 1회는 오염됐다**(566 파일 수집·272건 실패). 원인과 조치는 §1.3 「격리 사고 1건과 구조적 조치」. 위 표의 수치는 조치 **후** 실행이다.

---

## 8. 231 §10 의사결정에 주는 입력

| §10 | 이번 측정이 주는 입력 |
|:-:|:--|
| #4 실DB 테스트 위치 | 현재 `Regression Tests` 1 job이 모든 실DB를 포함(6분 46초). D3-B/D6 추가 시 **job 분리 없이는 선형 증가** → 별도 job/야간 분리 판단에 이 수치를 쓴다 |
| #6 301 QAM Gate 2 수치 | 5개 파일 라인 96%·분기 82%가 **현행 기준선**. "분기 Y%" 목표를 정하려면 이 82%와 미커버 30개의 성격(전부 실패 경로)을 기준으로 삼아야 한다 |
| #13 실DB 편입 기준 | CI 테스트 3분 22초가 baseline. Riley 제안(5회 반복 ≤30초 추가·flaky 0)의 측정 기준 |
| #16 D3-B 차원 | `discount-guard.ts` 4쿼리 중 2개(tier·freight)가 미커버 → 미니 PoC 대상 선정 근거 |
| #1 도구 | coverage-v8의 `all:true` + 5파일 한정 계측은 **16.5초**(전체 스위트 4분대) — 상시 측정 부담이 낮다는 근거. Stryker는 §4.3 소요 참조 |

---

## 9. 산출물 위치

| 산출물 | 경로 | 커밋 |
|:--|:--|:--|
| 커버리지 JSON | `tests/poc-231/reports/coverage/` | ✗ (gitignore, 재생성 가능) |
| 변이 JSON/HTML | `tests/poc-231/reports/mutation/` | ✗ (gitignore) |
| PoC 설정 3종 | `tests/poc-231/*.config.ts`, `stryker.config.mjs` | ✓ |
| 본 보고서 | `docs/08_Self_Audit/TestCoverage_231/` | ✓ |
| Task file | `.agent/tasks/TASK-1152_261115_Issue1316_PoC231Baseline.md` | ✓ |

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:--|:--|:--|:--|
| v1.0 | 2026-11-15 | B_Kai | 최초 작성 — 231 §8.1 단계 1 기준선 측정(모듈 ①②) |

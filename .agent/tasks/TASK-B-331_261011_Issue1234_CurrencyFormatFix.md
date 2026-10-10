# TASK-B-331: Issue #1234 — 품목 금액 통화 표기 수정 (TASK-B-330 후속)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1234](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1234) |
| **배경** | TASK-B-330(PR#1233) 병합 후 JSJung 로컬 확인에서 표기 결함 발견 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-11 |
| **우선순위** | P3 (Low) |
| **상태** | 🔔 리뷰 대기 |

## 목표

`src/components/orders/ItemsTotalSummary.tsx`의 `formatCurrencyAmount`를 수정해 통화 기호를 제거하고 숫자 뒤에 통화코드를 표기, 소수 자릿수는 통화별 Intl 기본값을 따르게 한다.

| 통화 | 현재 | 목표 |
|:--|:--|:--|
| USD | `$20.00 USD` | `20.00 USD` |
| CNY | `CN¥360.00 CNY` | `360.00 CNY` |
| KRW | `₩50,000.00 KRW` | `50,000 KRW` |
| JPY | `¥1,000.00 JPY` | `1,000 JPY` |

- 범위: 표시 형식만. DB·API·Server Action 변경 없음.
- 이 함수는 등록 화면·상세 화면·품목 모달(단가/합계 열 포함)이 공유하므로 이 함수만 수정하면 세 곳이 함께 반영됨.
- 함수 시그니처 `(amount: number, currency: string): string` 및 `export` 유지.

## DoD

- [x] `formatCurrencyAmount` 교체 (기호 제거·코드 뒤 표기·`minimumFractionDigits`/`maximumFractionDigits` 고정 제거)
- [x] 신규 테스트 `tests/unit/orders/format-currency-amount.test.ts` — 실제 함수 호출 + `toBe` 정확 문자열
- [x] `LIVE_REGRESSION_TEST_MAP.md` §64 신설 (R-09)
- [x] `npm run test:regression` 전체 PASS (R-08)
- [x] `npm run build` 성공
- [x] R-04 LIVE 체크리스트 자가 점검
- [x] R-15 실패 관측성 해당 없음 근거 기재 (순수 표시 코드)

## 전제조건

- 순수 표시 코드. `try/catch`는 유효하지 않은 통화코드용 폴백이므로 유지. R-15 로깅 대상 아님.

## 착수 체크리스트

- [x] 워크트리 `ZENITH_LMS-worktrees/baker` 재사용, `origin/TeamB_Dev`(7ca2b26b2)에서 `feature/teamb-331-iss1234-currency-format` 생성
- [x] 채번 재확인: `next-task-number.sh B` = TASK-B-331, 기존 파일 없음
- [x] 라벨 `status:in-progress` 전환

## [작업 결과]

### 수정 요약

| 구분 | 내용 |
|:-----|:------|
| **이슈** | Issue #1234 |
| **브랜치** | `feature/teamb-331-iss1234-currency-format` (워크트리 `ZENITH_LMS-worktrees/baker` 격리, `origin/TeamB_Dev` 7ca2b26b2 기반) |
| **수정 파일** | `src/components/orders/ItemsTotalSummary.tsx` (`formatCurrencyAmount`) |
| **신규 파일** | `tests/unit/orders/format-currency-amount.test.ts` |
| **문서** | `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` §64 |

### 구현 내용

`formatCurrencyAmount`를 `Intl.NumberFormat('en-US', {style:'currency', currency, currencyDisplay:'code'}).formatToParts(amount)`로 교체.
- `currency`/`literal` 파트를 제거하고 숫자 파트만 이어붙인 뒤 `"${number} ${currency}"`로 조합 → 통화 기호 제거 + 코드 뒤 표기.
- `minimumFractionDigits`/`maximumFractionDigits` 고정 제거 → 통화별 Intl 기본 소수 자릿수(USD/CNY/EUR 2자리, KRW/JPY 0자리) 적용.
- 함수 시그니처·`export` 유지, 호출부(`ItemsTotalSummary`, `UpsPackageItemsModal`)는 미수정 → 세 화면(등록/상세/모달) 동시 반영.
- `try/catch` 폴백 유지(유효하지 않은 통화코드 RangeError 대응).

### 검증 결과

| 항목 | 결과 |
|:-----|:-----|
| 신규 테스트 | **8/8 PASS** (`tests/unit/orders/format-currency-amount.test.ts`) |
| 전체 회귀 | **215 files / 1510 tests ALL PASS** (`npm run test:regression`) — TASK-B-330 대비 +1 file / +8 tests |
| 빌드 | **SUCCESS** (`npm run build`) |
| 독립 되돌리기 검증 | 기존 구현(`.format()`+고정 2자리)으로 임시 원복 → 신규 테스트 **7/8 FAIL** (폴백 케이스 1건만 통과) 확인 후 복원 → 8/8 PASS. 테스트가 실제 수정 대상 검증(비-vacuous) |
| 영향 범위 | `formatCurrencyAmount` 사용처 확인 — `UpsPackageItemsModal`(단가/합계/푸터) 3곳 + `ItemsTotalSummary` 내부 1곳. 기존 `item-totals.test.ts`는 이 함수 미사용 → 영향 없음 |
| 실패 관측성(R-15) | **해당 없음** — 순수 문자열 포맷 함수로 실패 반환값·catch 폐기 패턴이 없음(`catch`는 잘못된 통화코드 폴백이며 에러 객체 미보유). 핵심 지점 알림 기준 미충족 |
| R-04 자가 점검 | `LIVE_REGRESSION_TEST_MAP.md` §64 반영 + 회귀·빌드 PASS. R-10 스크린샷 미요구(2026-07-15 JSJung 결정) |

### 표기 확인 (요구 사양 대조)

| 통화 | before | after |
|:--|:--|:--|
| USD | `$20.00 USD` | `20.00 USD` |
| CNY | `CN¥360.00 CNY` | `360.00 CNY` |
| KRW | `₩50,000.00 KRW` | `50,000 KRW` |
| JPY | `¥1,000.00 JPY` | `1,000 JPY` |

### 커밋

- **코드 커밋**: `227f88425` — `[Baker] fix: TASK-B-331 품목 금액 통화 표기 수정 (Issue #1234)`
  - 포함: `src/components/orders/ItemsTotalSummary.tsx`, `tests/unit/orders/format-currency-amount.test.ts`, `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`
  - task file 미포함(`git show --stat HEAD` 확인).

## [발견 이슈]

없음.

_(부수 관찰 — 담당 Task 범위 밖, 참고용)_ 워크트리 init 스크립트(`scripts/agent-worktree-init.sh`)를 이미 생성된 워크트리 안에서 실행하면 `REPO_ROOT`가 워크트리로 해석되어 `.../ZENITH_LMS-worktrees/ZENITH_LMS-worktrees/<persona>` 하위에 **중첩 워크트리를 생성**한다(이번 세션에서 실수로 baker 중첩 워크트리 1개 생성 → 즉시 `git worktree remove`로 정리). 기존에 정체불명의 중첩 `dave` 워크트리(`.../ZENITH_LMS-worktrees/ZENITH_LMS-worktrees/dave`, detached)가 이미 남아 있는 것도 확인 — 스크립트는 반드시 **메인 체크아웃 루트에서** 실행해야 함. R-18 별도 DEF 보고 대상 여부는 Jaison 판단에 위임.

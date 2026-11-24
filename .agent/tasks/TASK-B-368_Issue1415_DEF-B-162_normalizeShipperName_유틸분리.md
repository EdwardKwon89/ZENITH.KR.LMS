# TASK-B-368 — DEF-B-162 'use server' 액션 파일의 비동기 아닌 export 분리 (#1415)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1415](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1415) (DEF-B-162, High — 병합 차단) |
| 담당 | Mike (Team B) — B-360 소유자 지정 |
| 브랜치 | `feature/teamb-task-b368-iss1415-normalize-shipper-name` (base: `origin/TeamB_Dev` `19403fdec`) |
| 상태 | 🔔 완료 (PR 검토 대기) |
| 선행 확인 | PR #1411 병합·#1366 종료 확인 → `origin/TeamB_Dev = 19403fdec` |
| 기준 | 이슈 본문 [범위] 4항 + [DoD] 6항 (Jaison, 2026-11-22) |

## 채번 확인 (3종 실측)

```bash
find .agent/tasks -name "TASK-B-368*"                          # → 0건
git ls-tree -r origin/TeamB_Dev --name-only | grep "TASK-B-368" # → 0건
gh issue list --state all --search "TASK-B-368 in:title"        # → 본 이슈(#1415) 1건만
./scripts/next-task-number.sh B                                 # → TASK-B-369 (본 이슈 제목의 368이 최대값이라 "다음번" — 즉 368은 본 이슈가 이미 사용 = 중복 아님)
```

> 채번 판단: Jaison 확정 **TASK-B-368**을 사용한다. 3번째 명령의 유일한 일치가 **본 이슈 자신**이므로 "이미 사용된 번호로 작업 금지" 규칙에 저촉되지 않는다(다음 빈 번호는 TASK-B-369).

## [목표]

`'use server'` 파일(`src/app/actions/finance/billing-statements.ts`)의 **비동기 아닌 export `normalizeShipperName`** 을 순수 유틸 모듈로 분리해 **`npm run build` 차단(DEF-B-162)을 해소**한다. Baker의 #1367 PR(#1412·#1413)이 이 PR 병합 후 rebase할 수 있게 **소규모·신속**하게 처리한다.

## [범위] (이것만 — 다른 수정 금지)

1. `src/lib/finance/billing/normalize-shipper-name.ts` 신규 — 규칙은 **현행과 바이트 단위 동일**(`replace(/\s+/g, ' ').trim().toLowerCase()`).
2. `billing-statements.ts`는 해당 유틸을 import(내부 호출 3곳) — 이 파일의 `normalizeShipperName` **export 제거**.
3. 같은 이름을 import하는 테스트·문서 갱신 + Ds-11 §4.3 R-12 정정(서버 액션이 아닌 내부 유틸로 이동).
4. **다른 non-async export 신규 추가 금지** (Jaison: 타입·인터페이스만 존재 확인).

## [DoD] (이슈 본문 — 증거 있는 항목만 `[x]`)

- [x] 분리 후 `npm run build` **성공** + 재현 증거 2종(수정 전 오류 / 수정 후 성공) 핵심 줄
- [x] 유틸 단위 테스트(공백 압축·양끝 제거·소문자·한글/전각 공백·빈 문자열 — 실제 값 단언) + 기존 실DB ADHOC 테스트 변경 없이 PASS
- [x] 되돌리기 표: (a) `trim` 제거 → 단위 FAIL, (b) `toLowerCase` 제거 → 기존 ADHOC 실DB 테스트 FAIL 여부 **실측**(FAIL 안 나면 그대로 기재)
- [x] `npm run test:regression` 전체 PASS + `check:ds11`·`check:lrtm` OK + `regression-items/TASK-B-368_Issue1415_*.md` 등재
- [x] 회귀와 별개로 **`npm run build` 성공** 명시
- [x] 변경 파일 = 유틸 신규 + `billing-statements.ts` + 관련 테스트/문서뿐

## [R-20 영향도 분석] — GitNexus 미연결 → grep 전수 (사실 명시)

`grep -rn "normalizeShipperName" src tests docs` (**GitNexus 미연결 상태라 grep 전수으로 대체**):

| 위치 | 내용 | 조치 |
|:--|:--|:--|
| `src/app/actions/finance/billing-statements.ts:135` | 정의 (`export function`) | **이관 후 export 제거** |
|동일 파일 `:299` `:303` `:488` | 내부 호출 3곳 (후보 필터 2 · 자동완성 그룹집계 1) | import로 전환 (호출 코드 무변경) |
| `tests/integration/task-b360-billing-statements.test.ts:28`,`:510` | import + 정규화 결과 단언 | 새 경로 import 갱신 |
| `docs/02_Analysis/ds11/Ds_11_04_Finance_Settlement.md:227` | 서버 액션처럼 기재 | R-12 정정 |
| `src/` 클라이언트 import | **0건** (Baker PR #1413의 `StatementCreate` 로컬 `normalize()` 사본은 TeamB_Dev 미반영 — Jaison이 Baker에게 별도 지시) | 해당 없음 |


## [작업 결과]

### 착수 절차 실측 (R-17 §0)

```bash
① pwd                                  → <로컬 워크트리>
② git branch --show-current            → feature/teamb-task-b368-iss1415-normalize-shipper-name
   (origin/TeamB_Dev `19403fdec` = PR #1411 병합본에서 생성)
③ ./scripts/check-db-freshness.sh      → OK (pending 0)
④ 라벨                                  → status:open → status:in-progress
⑤ 영향도: grep 전수 (GitNexus 미연결) — 정의 1 · 내부 호출 3 · 테스트 import 1 · Ds-11 문서 1건, **src/ 클라이언트 import 0건**
```

### 변경 (4파일 — 이슈 [범위]와 일치)

| 파일 | 변경 |
|:--|:--|
| `src/lib/finance/billing/normalize-shipper-name.ts` | **신규** — `name.replace(/\s+/g, ' ').trim().toLowerCase()` (**현행과 바이트 단위 동일**, 규칙 주석·3중 일치 경고 포함) |
| `src/app/actions/finance/billing-statements.ts` | **`normalizeShipperName` export 제거** + import 전환 (내부 호출 3곳 `:299`·`:303`·`:488`은 코드 무변경) |
| `tests/unit/finance/task-b368-normalize-shipper-name.test.ts` | **신규 단위 8건** — 압축·양끝 제거·소문자·한글/전각 공백·NBSP·개행탭·빈 입력·RPC 규칙 동일성, **실제 값 단언** |
| `tests/integration/task-b360-billing-statements.test.ts` | import 경로만 새 모듈로 (테스트 본문 무변경) |

- **non-async export 전수 재확인**: `grep '^export ' billing-statements.ts | grep -v 'type\|interface\|async function'` → **0건** (Jaison "다른 non-async export 없음" 확인과 일치, 신규 추가 없음)

### DoD 1 — build 재현 증거 (임시 worktree, `origin/TeamB_Dev` + PR #1412 head 병합)

재현 조합: `git worktree add --detach <임시> origin/TeamB_Dev` → `git merge --ff-only refs/tmp/pr1412`(#1412 head `28ef7c150` — TeamB_Dev를 포함해 **충돌 0**) → `.env.local` 복사 → `npm ci` → `npm run build`.

**① 수정 전 (exit=1)**
```
> Build error occurred
Error: Turbopack build failed with 1 error:
./src/app/actions/finance/billing-statements.ts:135:17
Error: Server Actions must be async functions.
  135 | export function normalizeShipperName(name: string): string {
      |                 ^^^^^^^^^^^^^^^^^^^
  Server Component:
    ./src/app/actions/finance/billing-statements.ts
    ./src/app/[locale]/(dashboard)/shipper/statements/[id]/page.tsx
```
(클라이언트 import 3곳 실측: `StatementsList.tsx`·`StatementDetail.tsx`·`StatementModals.tsx`)

**② 수정 적용 후 (같은 조합, exit=0)**
```
✓ Compiled successfully in 8.6s
Route (app)  … 테이블 정상 출력 / ○ (Static) prerendered / ƒ (Dynamic)
(오류 문구 "Server Actions must be async" 출현 0건)
```
- 적용 파일: `normalize-shipper-name.ts` 신규 + `billing-statements.ts` 교체 → export **0건**·import **1건** 확인 후 build.

### DoD 2 — 단위 테스트 + 기존 실DB 무변경 PASS
- 신규 단위 **8/8 PASS** (`tests/unit/finance/task-b368-normalize-shipper-name.test.ts`)
- 기존 통합 **28/28 PASS** (import 경로만 바꾼 `task-b360-billing-statements.test.ts` — ADHOC 실DB 케이스 포함, **테스트 본문 무변경**)

### DoD 3 — 되돌리기 검증 (2026-11-22 실측 — 임시 변경 → 측정 → 복구)

| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| **(a)** | 유틸에서 `trim()` 제거 | **단위 FAIL 5건** — `양끝 공백`(`' 이름 '` 기대/실측), `전각 공백·NBSP·개행`(`' 가 나 '`), `빈 입력`, `표기 변형 수렴`, `RPC 규칙 동일성` |
| **(b)** | 유틸에서 `toLowerCase()` 제거 | **기존 실DB ADHOC 테스트 FAIL 2건** — `수기 화주: 정규화 일치한 후보만 나온다`·`수기 화주명 자동완성은 대리점만, 정규화 그룹으로 집계` (단위도 6건 FAIL) |
| (복구) | 백업 복원 후 재실행 | **36/36 PASS** (단위 8 + 통합 28) |

> (b)는 "FAIL이 안 나면 그 사실을 그대로 기재"하라는 요청이었으나 **실측상 FAIL** — 표기 변형 매칭(대문자 오더명 ↔ 소문자 청구명)이 양쪽 유틸 의존이라 규칙이 깨지면 실제 매칭부터 깨진다.

### DoD 4~5 — 회귀·점검·빌드

- `npm run test:regression` → **284 files / 2,173 tests 전부 PASS** (직전 283/2,165 대비 +1파일 +8테스트)
- `check:ds11` OK · `check:doc-links` OK · `check:audit` OK · `check:lrtm` OK (신규 regression-items 파일 `TASK-B-368_Issue1415_*.md` 등재 → 등재 185)
- `npm run build:lrtm` 실행 확인(`Vitest 284파일 / 신규 항목 13건`) 후 **인덱스는 커밋 제외** — R-09 v3.10(인덱스는 Aiden이 병합 시점 재생성) + Aiden의 PR #1414(인덱스 재생성)와 중복 방지. 제외 후 `check:lrtm` 재확인 OK
- **`npm run build` 성공**을 회귀와 별개로 명시 (본 결함은 회귀가 아니라 build에서만 잡혔음 — 위 ②)
- `tsc --noEmit` 관련 파일 오류 **0건**

### DoD 6 — 변경 파일 범위
`git diff --name-only origin/TeamB_Dev...HEAD` → **4개뿐**: 유틸 신규 + `billing-statements.ts` + 관련 테스트 2개. (문서 2건은 문서 커밋에서 추가)

### 문서 (R-12)
- `Ds_11_04_Finance_Settlement.md` §4.3 `normalizeShipperName` 항목: Path를 유틸 경로로 정정 + **"내부 유틸 (서버 액션 아님)"** 표기 + 분리 사유(`'use server'`는 async만 export 가능)·규칙 무변경 명시
- 회귀 항목 신규 파일 `regression-items/TASK-B-368_Issue1415_normalize-shipper-name_유틸분리.md` (TC-368-01~05)

### 코드 커밋
- `d8e8239b5` — 유틸 신규·export 제거·단위 테스트·import 경로

### R-10 (에러 로그)
본 변경은 **함수 이동(규칙·시그니처 바이트 단위 동작 무변경)** 으로 신규 오류 경로가 없다. production `/admin/error-logs` 최종 확인은 Team B 방침대로 **병합 후 JSJung 확인** 대상이며, 이 PR의 CI(Regression Tests = `npm run build` 포함)가 build 차단 해소를 증명한다.


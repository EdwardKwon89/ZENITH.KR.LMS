> **작성·검증 안내 (2026-11-23 18:56 KST)**: 담당 B_Kai가 일일 한도 초과로 Holding되어 Edward 지시로 **Aiden이 직접 수행**한 검토입니다(Aiden 지시를 받은 읽기 전용 서브 검토가 작성). **Aiden 원본 대조 완료 항목: Major F1·F2·F3**(`83bb486f` 원본 줄 확인). 나머지 발견(Minor·Info, 읽기 범위 표기)은 서브 검토 결과를 그대로 옮긴 것으로 Aiden이 재확인하지 않았다. 검토 기준: TeamB_Dev `83bb486f`. Refs #1457.

# TASK-1171 — TeamB_Dev 통합 사전 검토 ②: 테스트 38개·회귀 등재 문서

- 검토 기준: `origin/TeamB_Dev` **`83bb486f`** vs `origin/develop` (`git diff --name-only origin/develop...83bb486f -- tests/` = **38개**: 신규 A 29, 수정 M 9)
- 수행: Aiden 직접(B_Kai 일일 한도 Holding, Edward 지시) · 검토 시각 2026-11-23 18:44~19:0x KST · **읽기 전용**(메인 체크아웃 변경 없음, 임시 worktree는 스크립트 실행 후 제거)
- 표기: 확인함(코드 직접 읽음/명령 출력) · 추정 · 미확인. 심각도: Blocker / Major / Minor / Info.
- **Blocker 없음.** Major 3건은 "테스트가 계획된 변경(#1452·#1453)과 충돌하거나, 알려진 모순(#1451 §3)을 검출하지 못하는" 항목이다.

## 1. 읽은 범위 (38개 파일)

읽기 수준: **전문** = 처음부터 끝까지 / **부분** = 제목 전수 + 단언(`expect`) 전수 추출 + 셋업·정리 구간 + (수정 파일은) diff 전체. "부분"의 읽지 않은 부분은 각 항목에 적었다.

| # | 파일 | 줄 | 변경 | 읽기 | 읽지 않은 부분/비고 |
|:-:|:--|:-:|:-:|:-:|:--|
| 1 | e2e/b371-fixture.ts | 250 | A | 전문 | — |
| 2 | e2e/b371-login.ts | 13 | A | 전문 | — |
| 3 | e2e/e2e-27-order-settlement-ui.spec.ts | 148 | A | 전문 | — |
| 4 | e2e/e2e-31-billing-flow-verification.spec.ts | 770 | A | 전문 | 14:4x KST 별도 검토(PR #1445)에서 전문 읽음 |
| 5 | integration/task-b360-billing-statements.test.ts | 705 | A | 부분 | 제목 전수·정리 함수(100~140행)·세션 생성 방식 확인. 28개 케이스의 본문 단언은 **미확인** |
| 6 | integration/task-b360-excel-export.test.ts | 703 | A | 부분 | 제목 전수·정리 구간·약한 단언 위치. 케이스 본문(355~700행) **대부분 미확인** |
| 7 | integration/task-b366-cost-settlement.test.ts | 195 | A | 부분(36~170행 전문) | 1~35행(import·상수)·171~195행(레거시 인보이스 3케이스 본문) 미확인 |
| 8 | integration/task-b367-unmark-cost-settled.test.ts | 154 | A | 부분 | 제목 전수·mock 설정(104행). 본문 미확인 |
| 9 | integration/task-b370-snapshot-safe-view.test.ts | 345 | A | 전문 | — |
| 10 | integration/task-b372-admin-only.test.ts | 169 | A | 전문 | — |
| 11 | integration/task-b375-rls-shipper-agency-select.test.ts | 208 | A | 전문 | — |
| 12 | integration/ups-edit-before-registration.test.ts | 389 | M | 부분 | diff 전체(+5/−1)·약한 단언 위치. 나머지 본문 미확인 |
| 13 | unit/agency/order-rate-snapshots.test.ts | 216 | M | 부분 | diff 전체·제목·단언 전수 |
| 14 | unit/components/billing-confirm-modal-preview.test.tsx | 79 | A | 전문 | — |
| 15 | unit/components/order-settlement/navi-sidebar.test.tsx | 36 | A | 부분 | 제목·단언 |
| 16 | unit/components/order-settlement/order-settlement-detail.test.tsx | 227 | A | 부분 | 제목·단언 전수 |
| 17 | unit/components/order-settlement/order-settlement-list.test.tsx | 134 | A | 부분 | 1~40행·단언 위치 |
| 18 | unit/components/statements/statement-create.test.tsx | 213 | A | 부분 | 1~70행·약한 단언 위치 |
| 19 | unit/components/statements/statement-detail.test.tsx | 177 | A | 부분 | 제목·단언 전수 |
| 20 | unit/components/statements/statements-list.test.tsx | 145 | A | 부분 | 제목·단언 전수 |
| 21 | unit/finance/task-b352-error-locale.test.ts | 170 | M | 부분 | diff(+1)·제목·단언 전수 |
| 22 | unit/finance/task-b360-billable-limits.test.ts | 250 | A | 부분 | 제목 전수. 본문 미확인 |
| 23 | unit/finance/task-b360-excel-data.test.ts | 175 | A | 부분 | 제목 전수. 본문 미확인 |
| 24 | unit/finance/task-b364-cost-integration.test.ts | 154 | A | 부분 | 제목·단언 전수 |
| 25 | unit/finance/task-b366-cost-settlement.test.ts | 284 | A | 부분 | 제목 전수. 본문 미확인 |
| 26 | unit/finance/task-b367-unmark-cost-settled.test.ts | 174 | A | 부분 | 제목 전수. 본문 미확인 |
| 27 | unit/finance/task-b368-normalize-shipper-name.test.ts | 57 | A | 부분 | 제목·단언 전수 |
| 28 | unit/finance/ups-actual-charges-dual-invoice.test.ts | 194 | M | 부분 | diff(+3)·제목·단언 전수 |
| 29 | unit/finance/ups-actual-charges.test.ts | 311 | M | 부분 | diff 전체·제목·단언 전수 |
| 30 | unit/finance/ups-actual-cost.test.ts | 430 | M | 부분 | diff 전체·기대값 두 곳 전후 구간 |
| 31 | unit/i18n/errors-key-sync.test.ts | 181 | M | 부분 | diff 전체. 본문 미확인 |
| 32 | unit/migrations/taskb359-billing-statement-db.test.ts | 696 | A | 부분 | 제목 전수·정리 함수(108~122행)·S4(205~236행)·Q1(311~335행). 나머지 본문 미확인 |
| 33 | unit/migrations/taskb365-cost-settlement-columns.test.ts | 159 | A | 부분 | 1~30행·125~159행 |
| 34 | unit/orders/direct-shipper-ups-snapshot.test.ts | 249 | M | 부분 | diff 전체·단언 |
| 35 | unit/orders/rate-snapshot-refresh.test.ts | 269 | M | 부분 | 제목·단언 전수 |
| 36 | unit/orders/task-b367-settled-cargo-guard.test.ts | 165 | A | 부분 | 제목·단언 전수 |
| 37 | unit/shxk/task-b357-shxk-lib-logging.test.ts | 282 | A | 부분 | 제목·단언 전수 |
| 38 | unit/ups/actual-cost-compute.test.ts | 88 | A | 부분 | 제목·단언 전수 |

- **전문 8개(1~4, 9~11, 14) + 7번 일부, 부분 30개, 완전 미확인 0개.** 부분 읽기 파일은 "본문 미확인"으로 적은 구간을 근거로 "문제 없음"이라고 말하지 않는다.
- 회귀 등재 문서(`regression-items/TASK-B-*.md` 14개)는 **목록·TC 행 수·경로 등재 여부만** 대조했고 본문은 읽지 않았다.

## 2. 금지 패턴 전수 grep (대상 38개, 기준 `83bb486f`)

명령: `git grep -n -E '<패턴>' 83bb486f -- <38개 파일>`

| 패턴 | 결과 |
|:--|:--|
| `test.skip`·`it.skip`·`describe.skip`·`.skip(`·`test.fixme`·`it.todo`·`test.todo`·`xit(`·`xdescribe(`·`xtest(` | **0건** |
| `typeof … === 'function'`·`toBeTypeOf('function')` | **0건** |
| 소스 문자열 단언(`expect(src·source·code·content·text·file…).toContain/toMatch`) | **0건** |
| `readFileSync`·`readFile(`·`fs` import | 5개 위치 — 전부 정상 용도: `errors-key-sync.test.ts:9,18`(messages JSON 로드), `taskb365-…test.ts:6,141`(마이그레이션 SQL을 **재실행**하는 용도 — 소스 문자열 단언 아님), `e2e-27:4`·`e2e-31:10`(증적 파일 쓰기/exceljs `xlsx.readFile` — 다운로드한 산출물 재파싱) |
| `vi.mock(` | 다수(단위 테스트의 의존성 격리) — 통합 테스트(`tests/integration/*`)는 대부분 `@/lib/auth/guards`·`next/cache`만 mock하고 DB는 실DB |
| 약한 단언(`toBeDefined`·`toBeTruthy`·`not.toBeNull` 등) | 위치 전수 확인함. UI 테스트의 `getByText(...).toBeTruthy()`는 `getBy*`가 미존재 시 throw하므로 중복일 뿐 약한 단언이 아님(Info). 약한 단언 문제는 F6 참조 |
| 조기 `return`으로 테스트를 건너뛰는 코드 | 2건 모두 헬퍼 내부(`ups-edit-before-registration.test.ts:140` `if (!rows) return [];`, `task-b360-excel-data.test.ts:97` `if (!res.ok) return;`) — 테스트 본문 skip 아님 |

## 3. 발견 (심각도순)

### F1 [Major · 확인함] 기존 단언이 확정된 정책(MANAGER·OPERATOR 입고 실측 시 스냅샷 갱신)과 반대다
- 위치: `tests/integration/task-b370-snapshot-safe-view.test.ts:326-344`
  - 326행 `it('실측 경로: 패키지를 읽을 수 있는 비소유 MANAGER 는 스냅샷을 덮어쓰지 않는다', …)`
  - 339행 주석 `// 패키지는 MANAGER 권한으로 변경되지만(읽기/쓰기 허용), 스냅샷은 소유자가 아니므로 불변.` / 343행 `expect(Number(price)).toBe(111);`
- 영향: Edward 확정(2026-11-23)에 따라 #1453(C)이 MANAGER·OPERATOR 실측 시 갱신을 허용하면 **이 테스트는 의도대로 실패**한다. #1453 담당(Baker)이 같은 PR에서 이 단언을 바꾸지 않으면 CI가 막힌다.
- 보조: `tests/unit/orders/rate-snapshot-refresh.test.ts`의 TC-SNAP-08/09(비소유 화주·비활성 프로필 거부)는 MANAGER·OPERATOR 역할 케이스가 없다(확인함: 제목 전수). 허용 판단 함수 변경 시 역할별 케이스가 추가되어야 한다.

### F2 [Major · 확인함] 기존 단언이 #1452(B-378)가 바꿀 권한 상태를 "정답"으로 고정한다
- 위치: `tests/unit/migrations/taskb359-billing-statement-db.test.ts`
  - 234행 `expect(psql(\`SELECT has_function_privilege('authenticated','public.next_billing_statement_seq(integer,integer)','EXECUTE')\`)).toBe('t');`
  - 232행 `expect(secdef).toEqual(['create_billing_statement=false', 'next_billing_statement_seq=true']);`
  - 328~334행 `TC-359-Q1b: authenticated의 next_billing_statement_seq 호출은 허용(원자 증분 1→2)`
- 영향: #1452가 채번 함수의 실행 권한·역할 검사를 정렬하면 위 3곳이 실패한다(의도된 실패). Mike(#1452)가 같은 PR에서 갱신해야 한다. 갱신하지 않고 단언을 지우면 권한 회귀를 막는 테스트가 사라지므로 **"허용"에서 "역할별 허용/거부"로 바꾸는 방향**이어야 한다.

### F3 [Major · 확인함] 정산·정산 되돌리기 통합 테스트가 service_role 클라이언트 + 모의 ADMIN 프로필로 실행되어 RLS·역할 경로를 검증하지 못한다
- 위치: `task-b366-cost-settlement.test.ts:89,94-98`(`const serviceClient = createClient(URL, SERVICE_KEY, …)` / `mockValidateUserAction.mockResolvedValue({ supabase: serviceClient, … profile: { …, role: 'ADMIN', … } })`), `task-b367-unmark-cost-settled.test.ts:104-105`(`supabase: serviceClient`).
- 영향: 이 파일들의 제목은 "(실DB)"이지만 서비스 키는 RLS를 우회하고 역할은 테스트가 정한 값이다. **MANAGER 세션으로 `markOrderCostSettled`·`unmarkOrderCostSettled`를 호출했을 때 데이터 권한 때문에 실패하는 경로(#1451 §3의 MANAGER 불일치)는 이 테스트로 검출되지 않는다.** 규칙 1(MANAGER 정산마감)을 이행하는 TASK에서 MANAGER·OPERATOR·ADMIN·SUPER_ADMIN 실제 세션 케이스가 필요하다.
- 비교: `task-b372-admin-only.test.ts`·`task-b375-…test.ts`·`task-b370-…test.ts`·`task-b360-billing-statements.test.ts`(`helpers/db.ts`의 `getUserClient(identity.jwt)`)는 실제 세션을 쓴다 — 좋은 패턴이므로 위 두 파일을 같은 방식으로 맞추면 된다.

### F4 [Minor · 확인함] 트리거 비활성화 후 재활성화가 `try/finally`로 보장되지 않는다 (5곳)
- `e2e/b371-fixture.ts:175,179` · `integration/task-b360-billing-statements.test.ts:114,116,130,134` · `integration/task-b360-excel-export.test.ts:193,197,302,305` · `unit/migrations/taskb359-billing-statement-db.test.ts:110-111,115-116`.
- 패턴: `DISABLE TRIGGER` → `DELETE` → `ENABLE TRIGGER`를 순차 호출한다. 중간 `DELETE`가 오류를 던지면(`execSync` 예외) 로컬 DB에 트리거가 꺼진 채 남는다. CI는 매번 fresh DB라 영향이 없다(추정). 로컬에서 이후 실행된 상태 전이 트리거 테스트(TC-359-ST* 등)가 가려질 수 있다(추정).
- 조치 제안: 정리 함수를 `try { … } finally { ENABLE TRIGGER }`로 감싸거나 공통 헬퍼로 모은다.

### F5 [Minor · 확인함] RLS 테스트 헬퍼가 쿼리 오류를 "0건(차단)"으로 처리한다
- `task-b375-rls-shipper-agency-select.test.ts:143-153` — `if (error) { // GRANT 자체가 없는 역할(anon 등)은 오류도 "0건"으로 간주한다 … return 0; }`.
- 영향: 164~167행의 OPERATOR·anon `toBe(0)`는 쿼리 자체가 오류여도 통과한다. 화주·대리점은 181~182행(정책 재생성 후 `toBe(1)`)으로 쿼리가 실제로 동작함이 입증되어 위험이 줄어든다(확인함). OPERATOR·anon에는 그 대조군이 없다.
- 보조: 이 테스트의 범위는 `zen_ups_actual_charges` 한 테이블이다(범위 자체는 B-375 정의와 일치, #1449 A 참조).

### F6 [Minor · 확인함] 통과해도 의미가 약한 단언
- `task-b372-admin-only.test.ts:141`·`task-b375-…test.ts:198` `await expect(getUpsActualCharges(ORDER)).resolves.toBeTruthy();` — 빈 배열도 truthy라 **0행이어도 통과**한다.
- `task-b372-…test.ts:143`·`task-b375-…test.ts:200` `expect(recon).not.toBeNull();` — 값 내용을 검증하지 않는다.
- 제안: 반환 행 수·`length`로 바꾼다.

### F7 [Minor · 확인함] 수정된 테스트의 제목이 약속하는 단언이 사라졌다
- `tests/unit/orders/direct-shipper-ups-snapshot.test.ts` diff 기준 삭제된 단언: `expect(ordersCall).toBeUndefined()`(TC-258-02), `expect(ordersUpdate).toBeDefined()`(TC-258-03), `expect(from).toHaveBeenCalledWith('zen_orders')`(TC-258-04). 현재 파일에서 `zen_orders`가 나오는 곳은 mock 설정(50·77·96행)뿐이다(grep 확인함).
- 제목(191·206·221행)은 `agency_org_id 미설정`/`agency_org_id 설정`이지만 현재 단언은 스냅샷 INSERT 1회와 `estimateUpsFreight` 인자만 본다. 삭제된 단언 일부는 `.toBeDefined()` 같은 약한 단언이었다(확인함: `getMockImplementation toBeDefined`). 다만 "agency_org_id가 설정/미설정" 의미 단언은 사라졌다.
- 제안: `zen_orders` 갱신 호출 여부(또는 갱신 payload의 `agency_org_id`)를 단언한다.

### F8 [Minor · 확인함(mock)/추정(컴포넌트)] UI 테스트가 실제 i18n 메시지를 검증하지 않는다
- `statement-create.test.tsx:29-53`, `order-settlement-list.test.tsx:16-`, 같은 패턴(`order-settlement-detail`·`statement-detail`·`statements-list`)에서 `next-intl`을 **테스트 파일 안의 한글 사전**으로 mock한다 → `messages/ko.json` 키가 바뀌거나 누락돼도 테스트는 통과한다.
- `billing-confirm-modal-preview.test.tsx:13`는 `useTranslations: () => (key) => key`로 mock하는데 69행에서 `screen.getByText('청구확정')`을 쓴다 → 컴포넌트가 한글 리터럴을 직접 렌더한다는 뜻이다(추정: 컴포넌트 소스는 이 검토에서 읽지 않음, #1456 범위).
- `errors-key-sync.test.ts`는 `Errors` 네임스페이스 키만 로케일 간 대칭을 검증한다(diff 기준, 확인함). 청구서·오더정산 네임스페이스 키 대칭은 단위 테스트로 보장되지 않는다(#1456이 전수 확인).

### F9 [Info · 확인함/추정] E2E 스펙은 CI 환경에서 그대로 실행되지 않을 가능성이 있다
- `e2e-27:13` `const ADMIN_PASSWORD = 'password1234'`, `b371-fixture.ts` `PASSWORD = 'password1234'` — 대문자·기호가 없다. 통합 테스트는 `Password1234!`를 쓰고 `task-b370-…test.ts:13`에 "CI Supabase 정책: 소문자·대문자·숫자·기호 각 1자 이상" 주석이 있다(확인함). E2E는 CI에서 실행되지 않아 문제가 드러나지 않았다(추정).
- `e2e-27:48-53`은 로컬 `seed-local`의 PLATFORM org에 의존한다(DEF-B-164로 이미 등록, 확인함).
- E2E는 이번 운영 반영의 필수 조건이 아니라고 Edward가 정리했으므로 참고 사항이다.

### F10 [Info · 확인함] 정산마감(원가 확정·재계산)과 청구서 금액을 함께 검증하는 테스트가 없다
- 38개 파일 중 `createBillingStatement`·`billing_items_amounts`·`create_billing_statement`와 `recordUpsActualCost`·`recordActualCostAndFinalize`를 **둘 다 쓰는 파일이 0개**다(grep 확인함).
- 영향: #1451 보완 요청 4번(정산마감 후 청구서 금액 원천 일치)은 이 테스트들로 검출되지 않는다. 해당 TASK에서 교차 테스트가 필요하다.

### F11 [Info · 확인함] 로컬 DB 정리 범위
- `taskb359-billing-statement-db.test.ts:117` `DELETE FROM public.zen_billing_statement_seq WHERE period_year = 2026` — 2026년 **전체** 채번 카운터를 지운다. 로컬 개발 DB에 2026년 청구서가 있으면 번호가 다시 시작될 수 있다(CI·fresh DB에는 영향 없음, 추정).

### F12 [Info · 확인함] 수정된 기존 테스트의 변경 평가
- 삭제된 `it()`는 `ups-actual-charges.test.ts`의 `TC-B204-04: AGENCY 권한 허용 → 본인 화주 오더 등록 성공` 1건이며, 같은 위치에 `TC-B204-04: AGENCY 권한 거부 …`가 추가됨 — JSJung 확정 규칙(admin 전용)과 일치(확인함).
- `ups-actual-cost.test.ts`의 `totalCostKrw` 기대값 `195000 → 205500`, `195000 → 208650`: 입력(기본 1000 HKD·유류 200·급증 100 / 기본 1300 HKD, 환율 150)으로 **산술 검증함** — 기본운임만 +7%(1000×150×1.07=160,500 + 45,000 = 205,500, 1300×150×1.07 = 208,650)로 일치. `actual-cost-compute.test.ts`의 기대값(160500, 213000, 1444500, 1539500)도 같은 규칙으로 재계산해 일치함.
- `errors-key-sync.test.ts`는 ko 기준 키 90→110(+20개 추가, 목록 `toEqual`) — 신규 키가 목록으로 고정되어 있어 로케일 누락은 잡힌다.

## 4. LRTM·문서 점검 (격리 worktree `83bb486f`, `node scripts/<스크립트>.mjs` — `npm run`과 동일 명령)

| 점검 | 실행 출력(그대로) |
|:--|:--|
| check:lrtm (`check-lrtm-sync.mjs`) | `Vitest 295개 \| 맵 등재 196개 \| 미등재 99개 (허용 목록 99개) \| 유령 경로 0건 \| E2E 미표기 0건` → **OK** |
| check:ds11 (`check-ds11-sync.mjs`) | `액션 함수 308개 \| Ds-11 언급 183개 \| 미반영 125개 (허용 목록 125개)` → **OK** |
| check:doc-links (`check-doc-links.mjs`) | `깨진 링크 84건 (허용 목록 84건)` → **OK** (허용 목록 밖 신규 0건) |

- 38개 파일의 등재 확인(`docs/08_Self_Audit/Checklists` 경로 언급 grep): **36개 등재, 2개 비등재** — `e2e/b371-login.ts`(테스트가 아닌 헬퍼, 정상), `unit/agency/order-rate-snapshots.test.ts`(수정 파일이며 `lrtm-sync-baseline.json`에 기존 허용 항목 1건 있음 — 이번 PR에서 새로 생긴 누락 아님).
- `regression-items/TASK-B-*.md` 14개의 TC 표 행 수: B-357 5 · B-359 8 · B-360 45 · B-361 34 · B-364 10 · B-365 10 · B-366 19 · B-367 19 · B-368 5 · B-369 19 · B-370 13 · B-371 12 · B-372 6 · B-375 6. TC 행은 하위 케이스를 묶어 적어 테스트 `it` 수와 1:1로 맞지 않는다(예: B-359 TC 8행 ↔ 단위 `it` 35개). 파일 수준 정합은 스크립트가 보장하며, **TC 행 ↔ `it` 개별 대응은 확인하지 않음(미확인)**.

## 5. 실행하지 않은 것
- **전체 회귀(`npm run test:regression`)·개별 vitest·E2E 실행 안 함**(CI에서 Regression Tests 통과 이력, #1448 head `83bb486f` 14:58 KST 7/7). 따라서 테스트가 "통과한다"는 것은 이 검토의 결과가 아니라 CI 결과를 인용한 것이다.
- `npm ci`·`npm run build`·`tsc` 실행 안 함. 스크립트 3종은 `npm run` 대신 `node scripts/*.mjs`로 직접 실행(동일 명령).
- 테스트 본문 일부 미확인(§1 표 참조).

## 6. 종합 의견
- 새로 추가된 테스트의 품질은 전반적으로 높다: 금지 패턴 0건, 통합 테스트 다수가 실제 JWT 세션·실DB를 쓰고, 되돌리기(정책 재생성 후 복구 확인)·행 불변 단언·동시성(병렬 2건 중 1건 성공)·원문 은닉(`DB_SECRET_*` 미포함) 등 차별력 있는 단언이 있다.
- 통합 전에 **테스트 수정 때문에 막을 일은 없다.** 다만 F1·F2는 후속 TASK(#1453·#1452)가 같은 PR에서 반드시 갱신해야 하는 단언이고, F3·F10은 규칙 1·정산마감↔청구서 모순(#1451 보완 요청 3·4번)을 구현할 때 테스트를 추가해야 검출된다.
- F4~F8은 Team B에 후속 개선으로 요청할 수 있다(운영 반영 필수 아님).

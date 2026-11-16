# TASK-B-353 — 오류 메시지 로케일 ①-c: warehouse 액션 + 창고 화면 (#1280 구현 4단계)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1328](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1328) (부모 #1280 — 닫지 않음) |
| 담당 | Mike (Team B) — Baker→Mike 배정 변경(JSJung, 2026-11-1610:56) |
| 브랜치 | `feature/teamb-task-b353-iss1328-error-locale-warehouse` (base: `origin/TeamB_Dev`) |
| 예상 공수 | 5~6h |
| 선행 | B-350·B-351·B-352(PR #1326) 머지 ✔ |

## [목표]

`warehouse.ts`와 `components/warehouse/*`5개 화면에서 사용자에게 보이는 오류가 **항상 현재 로케일 문장**이 되도록 전환 (B-351/B-352와 동일 방식: `trError()` + `Errors` 키 재사용, `withAction()` 미사용).

### 착수 시 실측 (2026-11-16)

```bash
f=src/app/actions/operations/warehouse.ts
grep -nE "(error|message): *[\`'\"]" $f | grep -v "logger\.\|console\." | wc -l   # → 3 (undoDeparture 반환3건)
grep -c "throw new Error" $f                                                        # → 55
grep -rcE "toast\.error\(.*(\\.message|\\.error)" src/components/warehouse          # → 29 (Outbound13·Inbound5·UpsReceive4·Departure4·Pickup3)
```
- throw55건 구성: `User profile not found`×17 · `권한이 없습니다.`×16 · `Failed to fetch …`×10 · `Order not found`×4 · 상태 불일치×6 · 소유권×3
- `Errors` 키 실측 **21개**(지시문 "30키"와 상이 — 실측 기재)
- `err.message` 비노출 전수: toast22 + `setErrorMsg`1 = **23행**
- 리터럴 toast(`toast.*(“...”)`): **4건**(Outbound:193 warning, Inbound:84/152/159 success·info)
- 컴포넌트 내부 `throw new Error("한글 리터럴")`: Inbound:137/168/191 (catch가 err.message 표시 → 함께 전환)

## [DoD]

- [x] 서버 throw55+반환리터럴3 → `trError` — 근거: `warehouse.ts:4` import / `:40~695` (**trError 58건**). 영문·원문 throw 잔존 **0건** (검증: `throw new Error("` =0, `error: "..."` =0)
- [x] 상태/소유 문구 키 설계 — **문장 키10종으로 결정**(파라미터화 아님), 키 수 근거는 [설계 확정]3에 기재
- [x] 호출자 판단표(18 export) + 프로덕션 마스킹 근거 — 아래 작업2 (R-06: Next 16.2.4 로컬 소스 실측)
- [x] 클라이언트 전환 — `err.message` 노출23행·리터럴 toast4·내부 throw3 → generic/키 전환, 잔존 **0건** (grep `err.message`=0, 리터럴 toast=0), 변경 표 아래 작업3
- [x] 관측성 — 반환 지점 `logger.warn` **6건**(`warehouse.ts:517,560,656,660,667,700`) + throw 지점 현 로깅 유지, 알림4기준 판정표 아래 작업4
- [x] 기존 테스트 갱신(약화 없이) 3건 + 사유 표 (아래 테스트 §)
- [x] 신규 테스트 (a)ko·영문 원문 미포함 (b)호출자 계약 (c)4로케일 (d)logger 인자 — `tests/unit/warehouse/task-b353-error-locale.test.ts` **12/12 PASS** (TC-353-1~4)
- [x] 되돌리기 검증 — confirmPickup throw→반환 전환 시뮬레이션 → **1 failed / 11 passed** → 복구 후 **12/12 PASS**
- [x] `npm run test:regression` **Test Files 257 passed (257) / Tests 1891 passed (1891)**(origin/TeamB_Dev rebase 후 재실행) + `npm run build` **EXIT=0** (rebase 전 자체: 255/1,846 PASS)
- [x] 회귀맵 **§87** 등재 — 근거 `LIVE_REGRESSION_TEST_MAP.md:1323` + 헤더 갱신(1,891/257). (지시 지정 §87 준수 — rebase 후 §85/§86 존재 확인)
- [x] diff 범위 — `components/orders/**`·`lib/shxk/*`·`wrapper.ts`·타 액션 파일 **0건** (PR 직전 diff 재확인 예정)
- [x] 파일 길이 — `warehouse.ts` **705줄**(<1,500) · 신규 함수 없음(inline 치환 + 컴포넌트 errT hook 각1줄 ≤50)
- [x] zh/ja 신규 문구 잠정 초안 → **IMP-185에 신규 키 목록 추가** (`scratch/post_launch_improvements.md:2093`)
- [x] R-20 GitNexus — 세션 도구 목록에 **불가** → `grep -rn` 호출처 전수(판단표18행)

## [설계 확정 (착수 중 기재 — 구현 시 일부 변경, 아래 작업1·2가 최종)]

1. **throw 유지(전환0건)** — 전18 export의 호출자가 전부5개 클라이언트 폼이고 다수가 catch-only(로더 `Promise.all`+catch, `confirmPickup`/`cancelPickup` fire-and-forget) → B-352 `addTrackingEvent` 선례대로 throw 유지 + 메시지만 `await trError(...)`.
2. **프로덕션 마스킹 실측(R-06)**: `react-server-dom-turbopack-client.edge.production.js`의 `resolveErrorProd()`가 flight 에러 행을 generic 영문 문구+`digest`로 **교체(메시지 폐기)** → throw된 로케일 문구는 프로덕션 클라이언트에 도달하지 않음 → 클라이언트 catch는 `console.error(err)`+`Errors.generic`으로 통일, 상세 사유는 반환 경로(`res.error`)로만 표시.
3. ~~초안: `status_mismatch`/`own_shipper_scope` 파라미터2키~~ → **구현 중 변경: 문장 키10종** — `{action}` 값이 서버 코드의 한글 리터럴이라 en/zh/ja에 한글이 새기 때문(상세 근거는 작업1). 컴포넌트 리터럴4종 키는 동일.

## [작업 결과]

### 코드 커밋
- 코드 커밋: `e67f3a3295abec2e6c6635adfd176c4c6f349b21`

### 실측 재측정 (지시 grep 그대로, 2026-11-16)

| 대상 | 결과 |
|:--|:--|
| `warehouse.ts` `(error\|message): 리터럴`(logger 제외) | **3** (undoDeparture 반환) |
| `warehouse.ts` `throw new Error` | **55** (profile17·권한15·fetch9·order5·상태6·소유3 — 합계 검증) |
| `warehouse.ts` `err.message` | **0** |
| `components/warehouse` `toast.error(.message\|.error)` | **29** = `err.message` 노출 **22** + `setErrorMsg(err.message)` **1** + `res.error` 유지경로 **7** |
| 리터럴 toast(`toast.*("…")`) | **4** · 컴포넌트 내부 `throw new Error("…")` **3** |
| `Errors` 키(지시문 "30키") | 실측 **21개** → 본 Task 후 **31개** |

### 작업1 — 서버 리터럴 전환 (키 설계 근거 포함)

- **기존 키 재사용**: `profile_not_found`(17)·`permission_denied`(15)·`order_not_found`(5 throw+1 반환).
- **신규10종(문장 키)**: `fetch_failed`1 + 상태7종(`status_outbound_confirm`·`status_cancel_inbound`·`status_ups_register`·`status_ups_undo`·`status_departure_confirm`·`status_departure_cancel`·`status_departure_undo`) + 소유2종(`own_shipper_outbound`·`own_shipper_only`).
- **파라미터화를 버린 근거(키 수 설계)**: 지시는 `{statuses}/{action}` 파라미터화를 제안했으나 **`{action}` 값(출고 확정·입고취소…)은 서버 코드의 한글 리터럴**이라 en/zh/ja 문장에 한글 액션어가 새어 "항상 현재 로케일 문장" 조건을 깬다. 액션어를 키로 빼면(상태문장1+액션어9 = 동일10키) 키 수가 줄지 않으므로 **문장1:1 키10종(파라미터0)**으로 결정 — 문구는 원문과 **완전 동일**이라 기존 `toThrow('WAREHOUSED')`·`toContain('본인 소속')` 단언이 약화 없이 통과.
- **`fetch_failed` 키1개 합침 근거**: 영문 원문의 대상명(warehoused orders/today pickup history…)은 기술 세부이고 사용자 대응(재시도)은 동일.
- 근거: `warehouse.ts:4`(import)·`:40~695`(trError58건).

### 작업2 — 호출자 판단표 (18 export 전수, R-20은 grep으로 대체)

| export 함수 | 호출 컴포넌트:줄 | 호출자 처리 방식 | 조치 |
|:--|:--|:--|:--|
| `getWarehousedOrders` | Outbound:78·UpsReceive:57 (`Promise.all`+try/catch) | catch만 | **throw 유지**+trError |
| `getTodayReleasedOrders` | Outbound:80 (catch) | catch만 | throw 유지 |
| `getPackedOrders` | Outbound:79 (catch) | catch만 | throw 유지 |
| `getReleasedOrders` | Departure:52 (catch) | catch만 | throw 유지 |
| `getTodayDepartureHistory` | Departure:53 (catch) | catch만 | throw 유지 |
| `getPickupOrders` | Pickup:49 (catch) | catch만 | throw 유지 |
| `getTodayPickupHistory` | Pickup:61 (빈 catch·무시) | catch만 | throw 유지 |
| `getTodayUpsHistory` | UpsReceive:58 (catch) | catch만 | throw 유지 |
| `getLatestUpsLabelErrors` | UpsReceive:63 (반환 확인+외부 catch) | 반환+catch | throw 유지(DB fail `logger.error` 현행 유지) |
| `confirmOutbound` | Outbound:181 (`Promise.all`+`every(success)`+else경고+catch) | 반환+catch | throw 유지(B-352 선례) |
| `undoOutbound` | Outbound:140 (`res.success`+else+catch) | 반환+catch | throw 유지 |
| `undoUpsRegistration` | Outbound:250·288·UpsReceive:146 (반환+catch) | 반환+catch | throw 유지 |
| `confirmPickup` | Pickup:80 (`await`뒤 **성공 토스트 무조건**+catch) | **catch만·성공토스트 위험** | **throw 유지 필수** — 반환 전환 시 성공 토스트 회귀(B-352 반려 사례) → TC-353-2 계약 고정 |
| `cancelPickup` | Pickup:96 (동일 구조) | catch만·성공토스트 위험 | throw 유지 필수 |
| `cancelInbound` | Inbound:188 (`result.success`+else(내부 throw)+catch) | 반환+catch | throw 유지 + 내부 throw도 errT화 |
| `confirmUpsRegistration` | UpsReceive:110 (`res.success`+batchResults+catch) | 반환+catch | throw 유지 + pass-through `logger.warn` |
| `confirmDeparture` | Departure:99 (loop `res.success` 카운트+catch) | 반환+catch | throw 유지 |
| `undoDeparture` | Departure:126 (`res.success`+else+catch) | 반환+catch | 가드 throw 유지 + **기존 반환3곳** trError+`logger.warn` |

- **반환 전환 0건** — 지시 원칙("catch만 있으면 throw 유지") 그대로 + `confirmPickup`/`cancelPickup` fire-and-forget 구조상 반환 전환은 호출자 수정이 필수이고 성공 토스트 회귀 위험이 큼.
- **프로덕션 마스킹 근거(R-06, Next 16.2.4 로컬 소스)**: `node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.edge.production.js`의 `resolveErrorProd()` — flight 에러 행(`case "Z"` 및 digest JSON 경로)을 **generic 영문 문구("An error occurred in the Server Components render…")+`digest`로 교체하고 message를 폐기** → **throw된 로케일 문구는 프로덕션 클라이언트에 도달하지 않는다**. 따라서 클라이언트 catch는 `err.message` 대신 `Errors.generic`+`console.error`로 통일(지시 #3 그대로), 상세 사유는 **반환 경로(`res.error`, 데이터라 마스킹 없음)**로만 표시. throw 지점의 trError 문구는 dev·단위테스트·정확문자열 계약 가치로 유지.

### 작업3 — 클라이언트 전환 표 (5개 화면)

| 파일 | 이전 | 이후 | 근거 라인 |
|:--|:--|:--|:--|
| `DepartureConfirmForm.tsx` | `toast.error(err.message\|\|…)`×3 | `console.error(err)`+`errT('generic',{code})` (DATA_LOAD/DEPARTURE_CONFIRM/UNDO_DEPARTURE) | hook `:33` · `:59,:117,:136` |
| `InboundProcessForm.tsx` | err.message×5+`setErrorMsg`1+내부 throw3+리터럴3 | errT generic×9(INBOUND_HISTORY/ORDER_LOOKUP×2/INBOUND_CONFIRM/SAVE/CANCEL) + `t(cargo_found/no_measurements/measurements_saved)` | hook `:27` · `:64,:92,:94,:140,:144,:172,:176,:196,:200` + `:86,:156,:163` |
| `OutboundProcessForm.tsx` | err.message×8+리터럴1 | errT generic×8(DATA_LOAD/UNDO_OUTBOUND/CONFIRM_OUTBOUND/LABEL_ISSUE/LABEL_VOID/UNDO_UPS×2/LABEL_PRINT) + `t(confirm_outbound_partial_failed)` | hook `:50` · `:89,:150,:200,:218,:241,:260,:306,:328` + `:196` |
| `PickupProcessForm.tsx` | err.message×3 | errT generic×3(PICKUP_LOAD/CONFIRM/CANCEL) | hook `:36` · `:53,:86,:102` |
| `UpsReceiveProcessForm.tsx` | err.message×3 | errT generic×3(DATA_LOAD/UPS_REGISTER/UNDO_UPS) | hook `:36` · `:69,:137,:156` |

- **`res.error` 유지경로 7건**(Departure:132·Outbound:146/214/237/256/324·UpsReceive:152)은 **그대로 유지** — 서버 trError 문장을 데이터로 주므로 지시 #3의 "그 문장 표시"에 부합.
- 잔존 검증: `grep -rn "err.message" src/components/warehouse` = **0**, 리터럴 toast = **0**.

### 작업4 — 관측성 + 알림 판정

- **반환 지점 `logger.warn` 6건**: undoDeparture 반환3(`:656,:660,:667`) + pass-through3(`:517,:560,:700`, `if(!result.success)` **내부** — 초판이 if 바깥이라 성공 시에도 로깅하던 것을 발견해 즉시 수정).
- throw 지점: 현 로깅 유지(getLatestUpsLabelErrors `logger.error` 등) — 신규 추가 없음(지시 그대로).
- **알림4기준 판정표**:

| 판정 대상 | ①금전 | ②외부 SLA·접점 | ③침묵성 | ④과거 사사 | 결론 |
|:--|:--|:--|:--|:--|:--|
| `Failed to fetch …`(조회 실패) | 해당 없음 | 라벨·처리 접점 아님(조회 한정) | **미해당** — catch가 즉시 toast(로케일 generic)+`console.error` | — | 로깅+화면 표시로 충분 — **신규 알림 불필요(IMP 미등록)** |
| 출고 확정류(`confirmOutbound`·`confirmDeparture` 등) | 금전 계산 직접 영향 없음(상태/재고) | 배송 접점 가능성 있음 | **미해당** — 실패 즉시 toast(반환 경로는 상세 문구)+이번 `logger.warn`6건 보강 | DEF-138·B-352 계열에서 늦은 실패 관측 이력 | 본 Task 로깅 보강으로 충분 — **신규 알림 구성은 범위 밖·IMP 미등록(의도적 판단)** |

### 테스트

**기존 갱신(약화 없이 — 사유 표)**

| 파일:줄 | 이전 | 이후 | 사유 |
|:--|:--|:--|:--|
| `defb047-…test.ts:126` | `toThrow('Failed to fetch ups label errors')` | `toThrow('데이터를 불러오지 못했습니다…')` | 영문 리터럴 → 로케일 전환에 따른 **정확문자열 갱신**(매칭 방식·엄격도 동일) |
| `warehouse-actions.test.ts:5-7` | `next-intl/server` 키-통과 스텁 | 실 ko 메시지 반환 스텁(+`getLocale`) | 스텁이 `trError` 결과를 키명으로 바꾸던 것 — 문구 단언 자체 불변(`'WAREHOUSED'`·`'PACKED'` 포함 매칭 그대로 PASS) |
| `departure-actions.test.ts:5-7` | 동일 스텁 | 동일 교체 | 동일 |

**신규 `tests/unit/warehouse/task-b353-error-locale.test.ts` — 12/12 PASS**: TC-353-1(a)·TC-353-2(b 계약)·TC-353-3(c 4로케일)·TC-353-4(d logger) — 상세는 DoD·회귀맵 §87.

**되돌리기 검증**: `confirmPickup`의 throw를 반환으로 임시 전환(B-352 회귀 시뮬레이션) → **1 failed / 11 passed**("expected the action to reject but it resolved") → 복구 후 **12/12 PASS**.

### 회귀·빌드 (R-08)

- `npm ci` exit0 · `check-db-freshness.sh` OK (R-08-2)
- `npm run test:regression` → **Test Files 257 passed (257) / Tests 1891 passed (1891)** (437초, `origin/TeamB_Dev` rebase 후 재실행 — Jaison 절차6) · rebase 전 자체 실행 **255/1,846 PASS**
- `npm run build` → **EXIT=0**

### check-R17-DoD 실행 결과

- **환경에 명령 없음**(OpenCode 커맨드=프롬프트 템플릿, 셸 실행 불가) — 지시의 "없으면 없다고 기재" 조항 적용, **수동 대조 완료**: 코드 커밋 → task file[작업 결과]+해시 → `status:review` → (본 문서 커밋) → PR 순서, DoD 전 항목 근거(파일:줄·테스트명) 기재, 플레이스홀더/미체크 0건, PR body에 DoD 체크리스트 예정 — 전 예정.

### 비고

- **GitNexus: 세션 도구 목록에 없어 불가** — R-20 대체로 `grep -rn` 호출처 전수(판단표18행), 심볼 신규 없음(inline 치환).
- **§번호 근거**: 착수 시 작업 tree base가 낙후(§84까지만)라 "마지막 §84"로 판단했으나, `origin/TeamB_Dev` rebase 후 **§85(B-352)·§86(B-346 PR③)** 존재 확인 → 지시의 "§86까지 사용 중·새 섹션 §87"이 정확했음이 입증됨. **§87 준수**(충돌 시 본 섹션만 재번호 원칙과 일치).
- **브랜치 (option2 진행)**: 지시명 `…-iss1328-error-locale-warehouse`가 **Baker stale 체크아웃**(고유커밋0·origin 미push·worktree clean)에 점거 → 착수 중단+코멘트(#issuecomment-6914595632) 후 무답변(2h) → 사전 제안했던 **`-mike` 접미사 부착**으로 진행(타 워크트리 미접촉·이후 `git branch -m`으로 지시명 복귀 가능 — 이슈에 명시 #issuecomment-6916399955).
- **rebase/충돌 해소 (Jaison 절차6)**: 착수 시 HEAD가 `origin/TeamB_Dev` 대비 **17커밋 낙후**(B-352·B-346 미포함) 확인 → `git stash -u` → `origin/TeamB_Dev` 기준 브랜치 생성 → stash pop. 충돌2건: ① `errors-key-sync.test.ts` — **ko.json 실측 기준 40키 합집합으로 배열 재생성**(양쪽 키 보존, 7/7 PASS) ② 회귀맵 — **§85+§86(타 Task)과 §87(본 Task) 양쪽 보존**, 헤더는 최종 회귀 수치로 갱신. messages×4·IMP-185는 자동 병합, stash drop 완료.
- npm ci·DB freshness는 착수 절차대로 완료, 회귀는 `origin/TeamB_Dev` 최신 기준.

## [발견 이슈]

**신규 DEF 미생성** — 기재1건:

| 관찰 | 판정 |
|:--|:--|
| `zh`(missing 511)·`ja`(523)에 `WarehouseInbound`·`WarehousePickup` 네임스페이스 **자체가 없음**(ko/en은 존재) | **기존 결함** — `check:i18n` 상시 FAIL로 이미 노출, ja분은 **DEF-B-156**으로 추적 중. 본 Task는 `WarehouseInbound`에 **신규 블록 생성(신규3키만)** 해 4로케일 키를 보장했고, 네임스페이스 전체 보강(기존 키 포함)은 DEF-B-156 계열 범위 → **중복 DEF 미생성**(IMP-185에도 동일 사실 기재). zh분은 감사가 계속 잡는 상태 — 별도 배정 시 재검토 필요. |

# TASK-B-351 — Issue #1299: `ups-labels.ts` 사용자 오류 로케일 전환 + SHXK 4개 로케일 사전 (PR ①-a-2)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1299](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1299) (부모 #1280 / 선행 TASK-B-350 PR #1294 머지 완료) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-13 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔧 진행 중 (`status:in-progress`) |
| **브랜치** | `feature/teamb-task-b351-iss1299-error-locale-ups-labels` (base `origin/TeamB_Dev` @ `0749d5466`) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-351*"` → **0건** 확인. Jaison 지정 `TASK-B-351` 사용 |
| **범위** | `src/app/actions/operations/ups-labels.ts` + `src/lib/shxk/translate.ts` + `messages/`·테스트·회귀맵. **`ups-actual-*`·`tracking.ts`·`warehouse.ts`·`src/components/**`·`wrapper.ts` 미수정** |

## 1. 접수 확인 — `withAction()` 미사용 (지시대로 B안)

- `src/lib/actions/wrapper.ts`의 `withAction()`은 반환 형태가 `{data,error}`이고 catch에서 `err.message` 원문을 그대로 반환한다 → 이번 PR에서 **사용/수정하지 않았다**(파일 diff 0건).
- 방침: **명시적 `{success:false, error: await trError(...)}` 반환(B안)**. throw 3건 처리는 §4 표 참조.

## 2. 전환 결과 (작업 항목 1~6)

### 2-1. 리터럴 오류 → `trError()` (항목 1)

착수 시 실측: `grep -nE "error: *[\`'\"]|message: *[\`'\"]" src/app/actions/operations/ups-labels.ts | grep -v "logger\."` → **35줄**(이슈 기재 "49건"과 다름 — 명령·실측값 그대로 기재). 35줄 전부를 전환했고, 최종 상태는 §5-2의 grep 출력(0줄)으로 확인.

| 위치(전환 후) | 기존 값 | 전환 후 키 |
|:--|:--|:--|
| `lookupOrderPackages` | `'Order not found'` | `order_not_found` |
| 동일 | `'Failed to fetch packages'` | `packages_not_found` |
| 동일 | `'Order has no packages'` | `order_has_no_packages` |
| `checkLabelPermission` | `'User profile not found'` | `profile_not_found` |
| 동일 | `'권한이 없습니다. ADMIN, …'` | `permission_denied` (상세 role은 로그) |
| `registerUpsOrder`/`previewShxkPayload`/`triggerCreateOrderTest` | `'Destination country code not found'` | `destination_country_not_found` |
| 동일 3곳 | `shipping method not found for product=…, country=KOR, incoterms=…` | `shipping_method_not_found` (내부 값은 로그로만) |
| `registerUpsOrder` | `Failed to save label record: …` | `generic` + `{code:'LABEL_RECORD_SAVE'}` |
| `fetchAndIssueUpsLabel`/`preview`/`fetchShxkTradeDocument`/`void` | `'발급된 라벨이 없습니다.'` 등 | `label_not_found` |
| `fetchAndIssueUpsLabel` | `'Failed to mark packages issued: …'` | `generic` + `{code:'PACKAGES_MARK'}` |
| `fetchAndIssueUpsLabel` | `'라벨 발급 실패 (getnewlabel)'` | `label_issue_failed` |
| 동일 | `'배송 처리는 완료되었으나 …'` | `document_save_failed_after_shipping` (ko 문구 동일) |
| `fetchAndIssueUpsLabel`(docType)/`fetchShxkTradeDocument` | `'발급된 문서 저장 실패'`/`'문서 다운로드/저장 실패'` | `document_save_failed` |
| `cancelUpsRegistration` | `라벨 조회 실패: …` | `generic` + `{code:'LABEL_LOOKUP'}` |
| 동일 | `'취소할 UPS 라벨 레코드가 없습니다.'` | `label_not_found` |
| 동일 | `라벨 레코드 삭제 실패: …` | `generic` + `{code:'LABEL_RECORD_DELETE'}` |
| 동일/`voidUpsLabel` | `intl_ref 복원 실패: …` | `generic` + `{code:'PACKAGES_UNLOCK'}` |
| `voidUpsLabel` | `'Void할 레이블이 없습니다.'` | `label_not_found` |
| 동일 | `레이블 폐기 기록 실패: …` | `generic` + `{code:'LABEL_VOID_RECORD'}` |
| `previewShxkPayload` | `'Unknown action'` | `unknown_action` |
| `fetchShxkTradeDocument` | `res.message \|\| '문서 조회 실패'` | SHXK 사전 번역(§2-4) → 미매칭 시 `document_fetch_failed` |

- `Errors` 키는 설계 4-1의 기존 15키를 재사용하고 **6키 추가**(`profile_not_found`·`destination_country_not_found`·`label_not_found`·`document_save_failed`·`document_save_failed_after_shipping`·`shxk_validation_failed`) → **ko 기준 21키**, 4개 로케일 동일 세트(ⓐ).
- `{fields}`/`{code}` 외 내부 값(상품코드·쿼리)은 파라미터로 넣지 않았다(로그로만).

### 2-2. `err.message`/DB 오류 원문 직노출 제거 (항목 2)

| 위치 | 전환 후 |
|:--|:--|
| `registerUpsOrder` catch | `generic` + `{code:'UNEXPECTED'}`, `logger.error('registerUpsOrder error:', err)` (Error 객체 유지) |
| `fetchAndIssueUpsLabel` catch | `generic` + `{code:'UNEXPECTED'}` |
| `cancelUpsRegistration` catch | `generic` + `{code:'UNEXPECTED'}` |
| `issueUpsLabel` catch | `generic` + `{code:'UNEXPECTED'}` |
| `voidUpsLabel` catch | `generic` + `{code:'UNEXPECTED'}` |
| `previewShxkPayload` catch | `generic` + `{code:'UNEXPECTED'}` |
| `triggerCreateOrderTest` catch | `generic` + `{code:'UNEXPECTED'}` |
| `fetchShxkTradeDocument` catch | `generic` + `{code:'UNEXPECTED'}` |
| `라벨 조회 실패: ${labelsErr.message}` | `generic` + `{code:'LABEL_LOOKUP'}` (원문은 `logger.error` 객체로) |
| `라벨 레코드 삭제 실패: ${deleteErr.message}` | `generic` + `{code:'LABEL_RECORD_DELETE'}` |

- 기존 8곳의 `const message = err instanceof Error ? err.message : 'Unknown error'` 패턴 제거(파일 내 잔존 0건).
- `zen_ups_label_errors` INSERT에는 `orderResult.rawMessage || orderResult.error`를 저장해 **원문 보존** 유지(사용자 반환값에는 미포함).

### 2-3. throw 3건 판정 (항목 3)

| 위치(현재) | 내용 | 판정 | 근거 |
|:--|:--|:--|:--|
| `ups-labels.ts:115` | `PDF 다운로드 실패 (status): url` | **(a) 내부 catch — 그대로 유지** | `downloadAndStoreLabelDoc()` 호출부는 모두 같은 파일의 `try { … } catch (err) { logger.error(...) }` 내부(3곳: `fetchAndSaveLabel`/`fetchAndIssueUpsLabel(docType)`/`fetchShxkTradeDocument`). 프로덕션 호출 컴포넌트 없음(grep: `src/components/**` 호출 0건, 테스트만 직접 호출). |
| `ups-labels.ts:158` | `PDF 업로드 실패: …` | 동일 | 동일 |
| `ups-labels.ts:177` | `문서 메타데이터 저장 실패: …` | 동일 | 동일 |

- 즉 3건 모두 사용자에게 도달하지 않는다(내부 catch + 로그). 반환 전환 불필요.

### 2-4. SHXK 원문 패스스루 + 사전 4개 로케일 (항목 4)

| 위치(현재) | 전환 |
|:--|:--|
| `placeShxkOrder` `createorder` 실패 | `resolveShxkError(orderRes.message, 'shxk_generic', 'CREATEORDER')` → 사용자에는 번역문/일반문구, 원문은 `logger.error` + `zen_ups_label_errors`(`rawMessage`) |
| 동일 duplicate(order_id 없음) | `trError('shxk_generic',{code:'DUPLICATE_ORDER'})`, 원문 로그 |
| `cancelUpsRegistration`/`voidUpsLabel` `removeorder` 실패 | `resolveShxkError(removeRes.message, 'label_void_failed', 'REMOVEORDER')`, 원문 로그 |
| `fetchAndSaveLabel`/`fetchAndIssueUpsLabel(docType)`/`fetchShxkTradeDocument` `getnewlabel` 실패 | `resolveShxkError(res.message, 'document_fetch_failed' 또는 'label_issue_failed', 'GETNEWLABEL*')`, 원문 로그 |
| 반환 `message` 필드 | 실패 경로에서 **원문 미포함**(`rawMessage`는 내부 함수 전용 필드이며 액션 반환값에는 나타나지 않음) |

**`src/lib/shxk/translate.ts` 변경**
- 타입 `{ko,en}` → **`{ko,en,zh,ja}`**, zh는 원문 그대로. 기존 **14개** 트래킹 문구에 zh/ja 추가.
- 관측된 오류 문구 **2건만** 등재: `未找到订单信息`(테스트/이력 확인), `Invalid ShipFrom AddressLine3`(DEF-B-145/146 문서 확인). 추측 문구 추가 없음.
- `translateShxkText` → 4개 로케일 객체 반환, `translateShxkMessage(message, locale)` 신규(미매칭 null), `pickShxkLocaleText`의 ja가 **사전 ja 우선**(이전 en/중문) — `UpsTrackingEventsList`·`lib/shxk/tracking.ts` 표출 개선.
- 매칭 실패 시 호출부에서 `Errors.shxk_generic`/도메인 키로 대체하며 **원문은 반환값에 포함하지 않는다**(테스트 TC-351-01/02/06).

### 2-5. 접두어 교체 (항목 5)

- `SHXK 필수 항목 누락: ${payloadErrors.join(', ')}` → **`trError('shxk_validation_failed', { fields })`** (`ko: "SHXK 사전검증에 실패했습니다: {fields}"`).
- `validate-payload.ts` 문구는 여전히 한글 고정 → 이번에는 미수정, 한계를 **`scratch/post_launch_improvements.md` IMP-184** 및 §7-발견 이슈로 기록(R-15).
- 영향 테스트: `tests/unit/ups/shxk-payload-validation.test.ts`는 `validateShxkPayload()` 반환 문자열을 직접 단언하므로 **변경 불필요**(접두어 단언은 `ups-labels` 호출부 테스트인 TC-351-03으로 신규 검증).

### 2-6. 관측성 (항목 6)

- 반환 전 로그 추가: `lookupOrderPackages`(order/package select error, not found·no packages warn), `checkLabelPermission`(profile warn), `registerUpsOrder`(country/shipping warn, label insert error), `fetchAndIssueUpsLabel`(label warn, SHXK error, doc save error, package mark error), `cancelUpsRegistration`(label warn, delete/unlock error), `voidUpsLabel`(void record/unlock error), `previewShxkPayload`(unknown action warn), `fetchShxkTradeDocument`(SHXK error, doc save error).
- 기존 `logger.error`(removeorder/select/delete/storage 등)는 유지. **ZEN_A4 핵심 지점 알림 판정은 기존 #1181 판정 유지**(신규 판정 없음 — 사용자 실패 알림 대상 신설 없이 로그만 보강).

## 3. 테스트

### 3-1. 신규 테스트 (실측 기반 `toBe`/`toEqual`)

| 파일 | 내용 |
|:--|:--|
| `tests/unit/ups/task-b351-error-locale.test.ts` | TC-351-01~06: SHXK 실측 중문 번역/미매칭 일반문구/사전검증/예외 원문 은닉(+`logger.error` Error 객체 호출)/DB 원문 은닉/removeorder 중문 번역 — 전부 `toBe` + `not.toContain` |
| `tests/unit/i18n/action-error.test.ts` | TC-351-07~08: `next-intl/server`를 **로케일 스위치형 개별 mock**으로 덮어 ko/en/zh/ja **실제 문구** 확인, `{fields}` 치환, `getLocale()` 예외·미지원 로케일 → ko 폴백 |
| `tests/unit/shxk/translate.test.ts` (갱신+추가) | TC-351-09~10: `translateShxkMessage` 2문구 × 4로케일, 미매칭 null, ja 표출이 사전 ja |
| `tests/unit/i18n/errors-key-sync.test.ts` (갱신) | TC-351-11: ko 기준 21키 `toEqual` + en/zh/ja 키 집합 + 플레이스홀더 일치 |

### 3-2. 기존 테스트 의도적 갱신 (사유)

| 파일:줄 | 이전 기대 | 갱신 후 | 사유 |
|:--|:--|:--|:--|
| `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts:281` | `'라벨 발급 실패 (getnewlabel)'` | `'라벨 발급에 실패했습니다.'` | 로케일 키 `label_issue_failed` |
| `tests/unit/ups/task-b327-fetch-trade-document.test.ts:90` | `'未找到订单信息'`(중문) | `'주문 정보를 찾을 수 없습니다'` + 원문 미포함 | SHXK 중문 원문 노출 제거 |
| `tests/unit/ups/ups-labels-split.test.ts:112` | `toContain('createorder failed')` | shxk_generic(ko)+`(코드: CREATEORDER)` `toBe`, 원문 미포함 | 영문 리터럴 제거 |
| 동일 `:205` | `toContain('라벨 레코드가 없습니다')` | `'발급된 라벨이 없습니다.'` `toBe` | `label_not_found` |
| 동일 `:219`, `:316` | `toContain('UPS 라벨 회수 실패(SHXK)')` / `'라벨 발급 실패'` | `'라벨 회수에 실패했습니다.'` / `'라벨 발급에 실패했습니다.'` | 로케일 키 |
| `tests/unit/ups/ups-labels-removeorder-failure.test.ts:71,92` | `toContain('UPS 라벨 회수 실패(SHXK)')` + 원문 포함 단언 | `toBe('라벨 회수에 실패했습니다.')` + **원문 미포함** | SHXK 원문 은닉 |
| `tests/unit/ups/ups-labels-errors.test.ts:51` | `error_message: orderResult.message` 소스 검사 | `orderResult.rawMessage \|\| orderResult.error` | DB 원문 보존 경로 변경 |
| `tests/unit/tracking/defb060-tracking-list-locale.test.tsx` | ko 폴백=중문 원문, ja=en | ko=사전 ko, ja=사전 ja | 사전 4개 로케일 확장 |
| `tests/unit/shxk/translate.test.ts` | `toEqual({ko,en})`, ko/en 폴백, ja=en | 4개 로케일 객체, 사전 폴백, ja=사전 ja | 동일 |

### 3-3. 되돌리기 검증 (실측)

| 검증 | 되돌린 내용 | 결과 | 복구 |
|:--|:--|:--|:--|
| A. SHXK 번역 무력화 | `resolveShxkError`가 매칭 시 **원문을 반환**하도록 변경 | **2 failed / 4 passed** (TC-351-01·06, `expected '未找到订单信息' to be '주문 정보를 찾을 수 없습니다'`) | 원복 후 **6 passed**, 파일 `diff` 동일 확인 |
| B. `err.message` 원복 | `registerUpsOrder` catch를 `return { error: message }`로 원복 | **1 failed / 5 passed** (TC-351-04, `expected 'INTERNAL_SECRET_TOKEN_abc123' to be '…(코드: UNEXPECTED)'`) | 원복 후 **6 passed**, 파일 `diff` 동일 확인 |

## 4. 검증 (DoD)

- [x] 각 작업 항목 1~6 근거(파일:줄·테스트명) — §2
- [x] `ups-labels.ts` 사용자 노출 원문 리터럴 0건 — §5-2의 **실제 command 출력** 기재
- [x] 전체 회귀 PASS — `Test Files 243 passed (243)` / `Tests 1776 passed (1776)`
- [x] `npm run build` 성공 — `BUILD_EXIT=0`, `✓ Compiled successfully in 23.9s`
- [x] diff 범위 준수 — §5-1 (`ups-actual-*`·`tracking.ts`·`warehouse.ts`·`components/**`·`wrapper.ts` 0건)
- [x] 파일 길이 Hard Limit(1,500줄) 이내 — **999줄** (base 901)
- [x] 함수 50줄: **신규 함수 50줄 이하**(`resolveShxkError` 9줄, `translateShxkMessage` 10줄), 기존 초과 함수는 **base에서 이미 초과** — §5-3 표에 base/after 수치 기재

## 5. 근거 수치 (명령 출력 그대로)

### 5-1. diff 범위
```
$ git diff --stat
 .../Checklists/LIVE_REGRESSION_TEST_MAP.md         |  26 ++-
 messages/en.json                                   |   8 +-
 messages/ja.json                                   |   8 +-
 messages/ko.json                                   |   8 +-
 messages/zh.json                                   |   8 +-
 scratch/post_launch_improvements.md                |  13 ++
 src/app/actions/operations/ups-labels.ts           | 216 +++++++++++++++------
 src/lib/shxk/translate.ts                          |  99 ++++++----
 tests/unit/i18n/errors-key-sync.test.ts            |   8 +-
 tests/unit/shxk/translate.test.ts                  |  50 ++++-
 .../tracking/defb060-tracking-list-locale.test.tsx |  10 +-
 .../defb148-ups-label-storage-upload-retry.test.ts |   3 +-
 .../ups/task-b327-fetch-trade-document.test.ts     |   4 +-
 tests/unit/ups/ups-labels-errors.test.ts           |   3 +-
 .../ups/ups-labels-removeorder-failure.test.ts     |  10 +-
 tests/unit/ups/ups-labels-split.test.ts            |  14 +-
 16 files changed, 364 insertions(+), 124 deletions(-)
# 신규(untracked) 3건: task file · tests/unit/i18n/action-error.test.ts · tests/unit/ups/task-b351-error-locale.test.ts

$ git diff --stat | grep -E "ups-actual|tracking.ts|warehouse.ts|components/|wrapper.ts"
(출력 없음)
```

### 5-2. 사용자 노출 리터럴 0건
```
$ grep -nE "error: *[\`'\"]" src/app/actions/operations/ups-labels.ts | grep -v "logger\."
(출력 없음)

$ grep -nE "message: *[\`'\"][A-Za-z가-힣]" src/app/actions/operations/ups-labels.ts | grep -v "logger\."
(출력 없음)

$ grep -cE "error: *[\`'\"]" src/app/actions/operations/ups-labels.ts
14        # 전부 logger.error('... error:', …) 라인 — 사용자 반환 아님

$ grep -n "throw new Error" src/app/actions/operations/ups-labels.ts
115 / 158 / 177  # §2-3 판정 대상 3건
```

### 5-3. 함수 길이 (base vs after, 실측)
| 함수 | base | after | 비고 |
|:--|--:|--:|:--|
| `downloadAndStoreLabelDoc` | 83 | 83 | base 초과 유지(미변경) |
| `registerUpsOrder` | 63 | 72 | base 초과 — 로케일 분기·로그 추가 |
| `fetchAndIssueUpsLabel` | 80 | 100 | base 초과 — SHXK 번역 분기·로그 추가 |
| `cancelUpsRegistration` | 87 | 93 | base 초과 — 동일 |
| `previewShxkPayload` | 54 | 57 | base 초과 — 동일 |
| `fetchShxkTradeDocument` | 50 | 57 | 동일 |
| `voidUpsLabel` | 50 | 52 | 동일 |
| 신규 `resolveShxkError` / `translateShxkMessage` / `actionLocale` | — | 9 / 10 / 13 | 50 이하 |

> 기존 5개 액션은 **base에서 이미 50줄 초과**였다. 이번 Task의 추가 분해(헬퍼 추출)는 변경 범위를 넓히므로 하지 않았고, 수치를 그대로 남긴다. 필요 시 후속 정리 대상.

### 5-4. R-20 영향도 (GitNexus 불가)
- GitNexus: 바이너리·인덱스 모두 없음(`which gitnexus` 없음, `.gitnexus/` 없음) → **불가**. grep 대체:
  - `placeShxkOrder` — 비export 내부 함수. 호출부: `registerUpsOrder`·`triggerCreateOrderTest`(같은 파일).
  - `fetchShxkTradeDocument` — 호출 컴포넌트: `src/components/orders/UpsTradeDocumentActions.tsx:143` 1곳(반환 계약 `{success,url?,error?}` 불변).
  - `issueUpsLabel`/`fetchAndIssueUpsLabel`/`voidUpsLabel` — `src/components/warehouse/OutboundProcessForm.tsx`, `UpsTradeDocumentActions.tsx`(반환 계약 불변, 값만 로케일 문장).
  - `translateShxkText`/`pickShxkLocaleText` — `src/lib/shxk/tracking.ts`, `UpsTrackingEventsList.tsx`(표출 문구만 변경).
  - Blast radius: 반환 계약·DB 스키마·권한·미들웨어 불변, **문구·로그 값만 변경**. Risk: Low.

## 6. [작업 결과]

- **코드 커밋**: `7715d4f55` `[Dave] feat: TASK-B-351 ups-labels 오류 로케일 전환 + SHXK 4개 로케일 사전` (rebase 후 재작성: **`dff6dcc22`**)
- 문서 커밋: 본 task file (rebase 후 재작성: `e2364e1fa` → 재작업 커밋으로 갱신)
- PR: base `TeamB_Dev` / `Closes #1299` (부모 #1280은 닫지 않음)
- 라벨: `status:open` → `status:in-progress` → `status:review`

### 6-3. 🔁 재작업 이력 (Jaison 리뷰 2026-11-13 — 회귀맵 §번호 충돌)

**차단 사유**: PR #1300(Baker, TASK-B-346 PR②)이 먼저 머지되며 `LIVE_REGRESSION_TEST_MAP.md` **§82를 선점** → 본 PR과 충돌(해당 파일만 CONFLICT).

| 단계 | 실행 | 결과 |
|:--|:--|:--|
| 1 | `git fetch origin TeamB_Dev` → `git rebase origin/TeamB_Dev` | base `0749d5466` → **`b45c92915`**(#1300 병합분 포함) |
| 2 | 충돌 해소 | **타 Task(§82 Baker) 섹션 무수정 유지**, 본인 섹션만 **§83으로 재번호**. 충돌 마커 0건 확인 |
| 3 | 회귀맵 헤더 | `1,759 Cases / 242 files` → **`1,776 Cases / 243 files`**(#1300의 1,758/241 위에 본 PR 신규분 합산 — 덮어쓰기 없음) |
| 4 | 회귀 재실행 | `npm run test:regression` → **`Test Files 243 passed (243)` / `Tests 1776 passed (1776)`** (exit 0) |
| 5 | push | `git push --force-with-lease` |

- **코드/테스트 로직 변경 0건** — rebase로 인한 해시 재작성 + 회귀맵 번호/카운트 + task file 표기만 변경.
- Jaison 비차단 메모 반영: zh/ja 초안 검수 건을 **IMP-185**로 등록(§7-8). DB flake는 재실행 2회 연속 PASS로 **DEF 미등록**(§7-4).

### 6-1. 검증 결과

| 검증 | 명령 | 결과 |
|:--|:--|:--|
| 영향/신규 테스트 | `npx vitest run tests/unit/ups tests/unit/shxk tests/unit/i18n tests/integration/defb052-cancel-ups-registration-unlock.test.ts` | `Test Files 53 passed (53)` / `Tests 489 passed (489)` |
| 전체 회귀(R-08) | `npm run test:regression` | **`Test Files 243 passed (243)` / `Tests 1776 passed (1776)`** (exit 0) |
| 빌드 | `npm run build` | `BUILD_EXIT=0`, `✓ Compiled successfully in 23.9s` |
| 타입체크(advisory) | `npx tsc --noEmit` | 기존 174건(변경 파일 0건) — base와 동일 |
| 되돌리기 A (SHXK 원문 누출) | §3-3 | **2 failed / 4 passed** → 복구 6 passed |
| 되돌리기 B (`err.message` 누출) | §3-3 | **1 failed / 5 passed** → 복구 6 passed |

### 6-2. `check-R17-DoD`
본 환경에 `check-R17-DoD` 실행 파일/슬래시 커맨드가 **없음**(`which` 미검출 — TASK-B-345/348/350 동일) → §4 DoD를 수동 대조했다(미체크 0건·placeholder 0건·증거 수치/명령 출력 기재).

## 7. [발견 이슈]

1. **[수치] 이슈 기재 "리터럴 49건" vs 실측 35줄** — 착수 시 `grep -nE "error: *[\`'\"]|message: *[\`'\"]" src/app/actions/operations/ups-labels.ts | grep -v "logger\."` → **35줄**. 이슈의 49건과 차이가 있어(집계 범위·패턴 차이로 추정) **실측값 35를 기준으로 전량 전환**했고, 최종 0줄을 §5-2 출력으로 확인했다.
2. **[테스트 기반] 전역 mock은 ko 고정** — `tests/setup.ts`의 `next-intl/server` mock이 ko를 반환하므로, 로케일별 검증은 `tests/unit/i18n/action-error.test.ts`에서 **개별 로케일 스위치 mock**으로 분리했다. 실제 요청 헤더 경로는 TASK-B-350 §2에서 dev 서버로 실증된 상태(이번 Task에서 재실증 불요 지시).
3. **[i18n 잔여] `validate-payload.ts` 문구가 한글 고정** — `{fields}`에 한글이 섞여 비한국어 사용자에게 노출된다. 이번 지시대로 미수정, **IMP-184**(`scratch/post_launch_improvements.md`)로 등록(R-15).
4. **[CI/회귀] DB 의존 테스트 2건 1회 flake** — 최초 전체 회귀에서 `tests/unit/ups/ups-zone-name-relabel.test.ts` 2건이 실패했으나, 단독 실행 **7/7 PASS**, **재실행 2회 연속 전체 PASS**(rebase 후 포함). 병렬 DB 테스트 경합으로 추정(본 Task 미수정 파일) → **재현되지 않아 DEF 등록 보류**, 재발 시 DEF-B-158+ 등록 대상.
5. **[함수 길이] 기존 액션 함수가 base부터 50줄 초과** — `downloadAndStoreLabelDoc` 83, `registerUpsOrder` 63→72, `fetchAndIssueUpsLabel` 80→100, `cancelUpsRegistration` 87→93, `previewShxkPayload` 54→57. 이번 Task는 문구 분기·로그 추가로 소폭 증가했고, **분해 리팩터링은 범위 외**로 하지 않았다. 신규 함수는 모두 50줄 이하(§5-3).
6. **[범위 확인] `withAction()` 미사용·미수정** — `src/lib/actions/wrapper.ts` diff 0건. 방침(명시적 반환 B안) 준수.
7. **[SHXK] 오류 사전은 관측 2건만** — `未找到订单信息`, `Invalid ShipFrom AddressLine3`. 추가 문구는 실측 확보 후 등재 필요(추측 등재 금지 준수).
8. **[i18n] zh/ja 신규 문구 초안 검수 필요** — `Errors` 신규 6키 + SHXK 오류 사전 2건의 zh/ja 문구는 Dave 초안이다. Jaison 리뷰 메모에 따라 **IMP-185**로 등록(머지 후 JSJung 검수 대상).

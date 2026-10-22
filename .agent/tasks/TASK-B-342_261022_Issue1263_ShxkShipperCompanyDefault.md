# TASK-B-342 — Issue #1263: SHXK createorder `shipper_company`를 기본값(`SHXK_SHIPPER_NAME`)으로 고정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1263](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1263) |
| **담당(Worker)** | Baker (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-10-22 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔔 리뷰 대기 (Issue #1263 `status:review`, PR #1264) |
| **브랜치** | `feature/teamb-342-shxk-shipper-company-default-baker` (base `origin/TeamB_Dev` @ `df8c5b04c`) |
| **채번 확인** | `git ls-tree -r origin/TeamB_Dev --name-only \| grep -oE 'TASK-B-[0-9]+'` → 최대 `TASK-B-341` → **`TASK-B-342` 중복 없음 확인** (착수 직전 재확인 완료) |

## 1. 배경·원인 (As-Is)

TASK-B-341(Issue #1261, JSJung 2026-10-21 결정)이 SHXK `createorder` 페이로드의 `shipper.shipper_name`·`shipper.shipper_company`를 **둘 다 화면 "화주명"**(`zen_orders.shipper_name`)으로 통일했다.

**JSJung 2026-10-22 결정으로 이 결정이 번복된다**: `shipper_name`은 화면 "화주명" 그대로 유지하되, `shipper_company`는 **회사 기본값(환경변수 `SHXK_SHIPPER_NAME`, 기본 `SNTL Korea Co Ltd`)** 으로 고정한다.

`src/lib/ups/label-mapping.ts` `buildShipperPayload()` (TASK-B-341 산출물):

```ts
const shipperDisplayName =
  (order.shipper_name as string)
  || (shipperOrg?.name as string)
  || shipperDefaults.name;

return {
  shipper_name: shipperDisplayName,
  shipper_company: shipperDisplayName,   // ← 회사명 자리에 화주명이 들어가던 상태
  ...
};
```

| SHXK 필드 | TASK-B-341 이후 값 | TASK-B-342 목표 값 |
|:--|:--|:--|
| `shipper_name` | 화면 "화주명" (폴백: `order.shipper_name` → `shipper_org.name` → `shipperDefaults.name`) | **변경 없음** (폴백 체인 그대로) |
| `shipper_company` | 화면 "화주명" (위와 동일) | **`shipperDefaults.name` 고정** (`order.shipper_name`·`shipper_org.name` 폴백 제거) |

## 2. 목표 (To-Be) — JSJung 2026-10-22 결정

```ts
return {
  shipper_name:    shipperDisplayName,   // 폴백 체인 변경 금지
  shipper_company: shipperDefaults.name, // 항상 기본값
  // 나머지 필드 변경 금지
};
```

- `shipperDefaults.name`은 이미 두 호출처(`ups-labels.ts:255` `placeShxkOrder`, `ups-labels.ts:779` `previewShxkPayload` CREATEORDER)에서 `SHXK_SHIPPER_NAME`(`src/lib/shxk/config.ts:17`)로 주입된다 → **호출처·config 수정 불요**.
- "SNTL" 문구 하드코딩 금지 — 환경변수값(`shipperDefaults.name`) 사용이 결정사항.
- 담당자명(`order.shipper_contact_name`)은 계속 SHXK payload 어디에도 보내지 않는다.
- 변경 파일: `src/lib/ups/label-mapping.ts` 1곳 + 테스트. `validate-payload.ts`·DB·화면 변경 없음.

## 3. [R-20] 영향도 분석

> **GitNexus 미사용 사유(이 세션 환경 제약)**: 본 세션에는 `gitnexus_impact` MCP 도구가 노출되지 않았고, 저장소·전역 어디에도 GitNexus CLI 바이너리(`gitnexus`)와 인덱스(`.gitnexus/`)가 존재하지 않는다(`npx --no-install gitnexus` → 미설치). R-20의 "면제 조건 없음"에 따라 생략하지 않고, 아래 grep 기반 **실제 파일 재검증**으로 대체 수행했다.

`shipper_company` 전체 사용처 (grep 전수):

| # | 위치 | 영향 |
|:--|:--|:--|
| 1 | `src/lib/ups/label-mapping.ts:118` (변경 대상) | `shipper_company` 값 변경 → SHXK로 전송되는 값이 바뀜 |
| 2 | `src/app/actions/operations/ups-labels.ts:255` (`placeShxkOrder` → `createorder` 실제 전송) | 위 값이 실제 SHXK API로 전송됨 |
| 3 | `src/app/actions/operations/ups-labels.ts:779` (`previewShxkPayload` CREATEORDER 미리보기) | 미리보기 payload 값 변경 |
| 4 | `src/lib/shxk/validate-payload.ts` | `shipper_company` 검증 항목 **없음** → 검증 결과 불변 (확인 완료) |

- `buildCreateOrderPayload` / `buildShipperPayload` 호출처: `ups-labels.ts:254`·`:778` 2곳뿐 (grep 전수 확인).
- 결과 blast radius: `src/lib/ups/label-mapping.ts` 내부 + 위 2개 호출처의 payload 값. DB 스키마·화면·권한·미들웨어 무관. **Risk: Low**(순수 필드 값 치환, 호출 시그니처 불변).
- 영향 테스트 파일 (grep 전수 — `grep -rn "shipper_company" tests/`):
  `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts`, `tests/unit/ups/ups-labels-mapping.test.ts`, `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts`, `tests/unit/ups/defb054-shipper-company.test.ts` — 4건 전부 갱신 대상.

## 4. 구현

1. `src/lib/ups/label-mapping.ts` — `buildShipperPayload()`의 `shipper_company`만 `shipperDefaults.name`으로 변경.
   - `shipperDisplayName` 폴백 체인(`order.shipper_name` → `shipper_org.name` → `shipperDefaults.name`)은 **그대로 유지** — `shipper_name`에 사용.
   - 나머지 shipper 필드(`countrycode`/`province`/`city`/`street`/`postcode`/`telephone`) 의미 변경 없음.
   - 함수 50줄 이하 유지 (현재 21줄 → 변경 후 동일).

## 5. 테스트 (R-09)

> `toContain`·문자열 소스 검사(mock) 금지 — 실제 함수 호출 + `toBe` 단언으로만 검증한다.

| TC | 내용 | 기대 결과 | 위치 |
|:--|:--|:--|:--|
| TC-342-1 | `shipper_name='ABC Trading'` | `shipper_name='ABC Trading'`, `shipper_company=shipperDefaults.name` | `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts` |
| TC-342-2 | `shipper_name` 빈 값 + `shipper_org.name='MASTER AIR'` | `shipper_name='MASTER AIR'`, `shipper_company=shipperDefaults.name` | 동일 |
| TC-342-3 | 한글 화주명(`'한국무역'`) | `shipper_name`은 한글 그대로, `shipper_company`는 기본값 | 동일 |
| TC-342-4 | `shipperDefaults.name='X CORP'` 주입 | `shipper_company='X CORP'` (환경변수 경로 증명) | 동일 |
| TC-342-5 | `shipper_contact_name='Kim'` | payload shipper 어느 필드에도 없음 | 동일 |
| TC-342-6 | shipper 나머지 필드(`countrycode`/`province`/`city`/`postcode`/`telephone`/`street`) | TASK-B-342 변경 전과 동일 | 동일 |
| TC-342-7 | 실제 서버 액션 `registerUpsOrder()` → `createorder` 전송 payload | `shipper_name='ABC Trading'`, `shipper_company='SNTL'`(=mock된 `SHXK_SHIPPER_NAME`) | 동일 |
| TC-342-8 | 실제 서버 액션 `previewShxkPayload('CREATEORDER')` 미리보기 payload | `shipper_name='ABC Trading'`, `shipper_company='SNTL'` | 동일 |
| TC-342-9 | 레거시 오더(`shipper_name` NULL) | `shipper_name='MASTER AIR'`(조직명 폴백), `shipper_company='SNTL'` | 동일 |
| 기존 갱신 | `task-b341-shxk-shipper-name-unify.test.ts` / `ups-labels-mapping.test.ts` / `task-b324-shxk-shipper-name-override.test.ts` / `defb054-shipper-company.test.ts` | `shipper_company` 기대값 → 기본값 | 기존 4개 파일 |
| 기존 유지 | `tests/unit/ups/shxk-payload-validation.test.ts` | PASS 유지 | 기존 파일 |

> 신규 케이스는 착수 전 DoD(6케이스)보다 **9케이스**로 확장했다 — 서버 액션 실제 경로(TC-342-7~9)와 "나머지 필드 무변경"(TC-342-6)을 추가. R-09(실제 함수 호출 + `toBe`) 준수.

## 6. 되돌리기 검증

- 변경 원복(`shipper_company: shipperDisplayName`) 시 TC-342-1이 FAIL함을 확인하고 FAIL 출력 + 원본 `shasum` 일치를 본 문서에 기록.

**실행 결과 (2026-10-22)**:

| 단계 | 명령 | 결과 |
|:--|:--|:--|
| ① 백업 | `cp src/lib/ups/label-mapping.ts <temp>/task-b342-label-mapping.bak.ts` | 원본 `shasum` = `68d7414be24f82c035d06a6cf0f56d5b2a84da3e` |
| ② 원복 | `sed -i '' 's/    shipper_company: shipperDefaults.name,/    shipper_company: shipperDisplayName,/' src/lib/ups/label-mapping.ts` | 변경 적용 |
| ③ 회귀 실행 | `npx vitest run tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts` | **7 failed / 2 passed** (총 9) — TC-342-1 FAIL 출력: `expected 'ABC Trading' to be 'SNTL Korea Co Ltd'` → 변경 전 상태에서 반드시 깨짐을 증명 |
| ④ 복원 | `cp <temp>/task-b342-label-mapping.bak.ts src/lib/ups/label-mapping.ts` | `shasum` = `68d7414be24f82c035d06a6cf0f56d5b2a84da3e` (①과 일치) |
| ⑤ 재실행 | 동일 vitest 명령 | **9 passed (9)** — 복원 확인 |

## 7. 검증 (DoD)

- [x] `label-mapping.ts` `buildShipperPayload()`에서 `shipper_company`만 `shipperDefaults.name`으로 변경 (함수 50줄 이하 유지)
- [x] 기존 테스트 기대값 전수 갱신 (`grep -rn "shipper_company" tests/` 4개 파일)
- [x] 신규 회귀 테스트 (R-09) 9케이스 — 실제 `buildCreateOrderPayload()` 호출 + `toBe` (DoD 6케이스 → 9케이스로 확장, §5 참조)
- [x] 되돌리기 검증 — FAIL 출력(7 failed / 2 passed) + 원본 `shasum` 일치 기록 (§6)
- [x] `tests/unit/ups/shxk-payload-validation.test.ts` PASS 유지
- [x] `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 갱신 (§57·§73 갱신 + §74 신규 추가)
- [x] R-12: Ds-11 확인 → 해당 없음 명시 (`docs/02_Analysis/Ds_11_API_상세_명세서.md`에 SHXK createorder shipper 매핑 명세 없음)
- [x] R-20: 영향도 분석 (본 문서 §3)
- [x] R-08-2 로컬 DB 신선도 — pending 마이그레이션 **0건**(`npx supabase migration list --local`), `npx tsx scripts/seed-local.ts` 실행 후 시드 무결성 체크 전부 PASS
- [x] ZEN_A4 관측성 — 순수 필드 값 치환(성공/실패 분기 없음, 외부 API 호출 결과는 `placeShxkOrder` 기존 로깅 경로) → 로깅 대상 아님
- [x] ZEN_A4 50줄 준수 — `buildShipperPayload()` 21줄(`src/lib/ups/label-mapping.ts:107-127`)
- [x] R-15 개선 사항 — 전역 `supabase` CLI 의존 건은 기존 **IMP-170**에 등록됨 → 신규 IMP 등록 불필요(§9-1)
- [x] R-10 UI 변경 없음 — 백엔드 매핑 단독. 실제 서버 액션 경로(`registerUpsOrder`/`previewShxkPayload('CREATEORDER')`) 검증으로 대체(TC-342-7~9)
- [x] R-04 자가점검 — base `df8c5b04c` 대비 소스 1(`src/lib/ups/label-mapping.ts`) + 테스트(신규 1, 기존 4 수정) + MAP 1
- [x] R-18 — DEF-B-153 갱신(신규 DEF 작성 아님, 기존 DEF-B-153의 `shipper_company` 해소·잔존 항목 반영)
- [x] `npm run test:regression` 전체 PASS (R-08) — `Test Files 234 passed (234)` / `Tests 1680 passed (1680)`, `npm run build` 성공 (`BUILD_EXIT=0`, `✓ Compiled successfully in 17.2s`)
- [x] TASK-B-341 task file `[작업 결과]`에 "shipper_company 결정은 TASK-B-342에서 번복됨" 한 줄 추가
- [x] DEF-B-153 갱신 (`shipper_company` 해소, `shipper_name`만 잔존)
- [x] `check-R17-DoD` 자가 검증 통과 (2026-10-22) — task file 내 `TBD`·`<PLACEHOLDER>`·빈 값 0건, 미체크 DoD 0건 확인. PR #1264(`Closes #1263`, base `TeamB_Dev`) 생성 완료 — DoD 체크리스트는 PR 본문에 기재

## 8. [작업 결과]

### 8.1 변경 파일

| 파일 | 구분 | 내용 |
|:--|:--|:--|
| `src/lib/ups/label-mapping.ts` | 구현 | `buildShipperPayload()`의 `shipper_company` → `shipperDefaults.name` (1줄). `shipper_name` 폴백 체인·나머지 shipper 필드 무변경 |
| `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts` | 신규 테스트 | TC-342-1~9 (9케이스) |
| `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts` | 기존 테스트 갱신 | `shipper_company` 기대값 → 기본값 |
| `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` | 기존 테스트 갱신 | 동일 |
| `tests/unit/ups/defb054-shipper-company.test.ts` | 기존 테스트 갱신 | 동일 (서버 액션 경로) |
| `tests/unit/ups/ups-labels-mapping.test.ts` | 기존 테스트 갱신 | 동일 |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | 문서 | §57·§73 갱신, §74(TASK-B-342) 신규 |
| `.agent/defects/DEF-B-153_SHXK_shipper_name_화주명전송_명세불일치.md` | 문서 | `shipper_company` 해소 표기·위험 ①②③ 재작성·기존 데이터 영향/권장 조치 보완 |
| `.agent/tasks/TASK-B-341_261021_Issue1261_ShxkShipperNameUnify.md` | 문서 | `[작업 결과]`에 번복 결정 1줄 추가 |
| `.agent/tasks/TASK-B-342_261022_Issue1263_ShxkShipperCompanyDefault.md` | 문서 | 본 문서 |

### 8.2 최종 코드 (변경 후)

```ts
return {
  shipper_name: shipperDisplayName,   // 폴백 체인 그대로 (화면 "화주명")
  shipper_company: shipperDefaults.name, // 항상 회사 기본값 (SHXK_SHIPPER_NAME)
  ...
};
```

### 8.3 검증 결과

| 검증 항목 | 명령 | 결과 |
|:--|:--|:--|
| 영향 테스트 | `npx vitest run <6개 파일>` | `Test Files 6 passed (6)` / `Tests 73 passed (73)` |
| 되돌리기 검증 | §6 ①~⑤ | 7 failed / 2 passed → 복원 후 `shasum` 일치, 9 passed (9) |
| 전체 회귀 (R-08) | `npm run test:regression` | **`Test Files 234 passed (234)` / `Tests 1680 passed (1680)`** (90 skipped 포함 총 1680) |
| 빌드 | `npm run build` | `✓ Compiled successfully in 17.2s`, `BUILD_EXIT=0` |
| DB 최신화 (R-08-2) | `npx supabase start` → `npx supabase migration list --local` → `npx tsx scripts/seed-local.ts` | pending 마이그레이션 0건, 시드 무결성 체크 전부 PASS |

> **R-08-2 참고**: 전역 `supabase` CLI 미설치로 `./scripts/check-db-freshness.sh`는 exit 127이므로 동일 동작을 `npx supabase`로 수행했다(기존 IMP-170 참조). 최초 회귀 실행 시 Docker 미기동으로 DB 의존 테스트 30개 파일이 실패했으나, **코드 결함 아님**(localhost:54322 connection refused)임을 확인 → Docker 기동 + 로컬 Supabase 기동 + 시드 후 전량 PASS.

### 8.4 미변경 확인 (grep 전수)

- `src/app/actions/operations/ups-labels.ts:255`(placeShxkOrder), `:779`(previewShxkPayload) — 이미 `name: SHXK_SHIPPER_NAME` 주입 → **변경 불요**
- `src/lib/shxk/config.ts:17` — `SHXK_SHIPPER_NAME` 정의 → **변경 불요**
- `src/lib/shxk/validate-payload.ts` — `shipper_company` 검증 항목 없음 → **변경 불요**
- DB 스키마·화면·권한·미들웨어 → **변경 없음**
- `docs/99_Manual/E2E_324_Result/R10_SHXK_createorder_payload.md` — 과거 R-10 증거 문서 → **수정 대상 아님(과거 이력 보존)**

- 코드 커밋: `9544d301344dac145739fa55e95d934bf44acc16`
- 문서 커밋: 본 task file · DEF-B-153 · TASK-B-341 task file(번복 표기 1줄)
- PR: #1264 (`feature/teamb-342-shxk-shipper-company-default-baker` → `TeamB_Dev`, `Closes #1263`) — 머지는 JSJung 단독 권한(R-17 v3.0)

## 9. [발견 이슈]

1. **[환경] 전역 `supabase` CLI 미설치** — `scripts/check-db-freshness.sh`가 `supabase` 바이너리를 요구하여 exit 127로 조용히 실패한다. → 기존 **IMP-170**에 이미 등록됨(신규 등록 불필요). 이번 세션에서는 `npx supabase`로 동일 동작을 수행해 우회했다.
2. **[환경] Docker 데몬 미기동 상태에서 회귀 테스트 실패** — DB 의존 테스트 30개 파일이 `connection refused`로 실패하나 이는 코드 결함이 아니다. `npx supabase start` + 시드 후 전량 PASS. → **이번 Task 범위 외** (테스트 환경 표준화는 별도 과제 후보).
3. **[범위 밖] Issue #1261이 여전히 `OPEN`** — 선행 TASK-B-341의 PR #1262는 병합되었으나 Issue 자동 close가 동작하지 않아 `status:review` 라벨과 `OPEN` 상태가 남아 있다. → TASK-B-342와 무관한 별도 후처리 필요(JSJung 확인).
4. **[운영] `shipper_company` 값 변경에 따른 배포 공지 필요 여부** — TASK-B-341 상태로 이미 발급된 라벨/오더는 `shipper_company`가 화주명이고, TASK-B-342 적용 이후 발급분은 `SNTL Korea Co Ltd`가 된다. 동일 오더 재발급 시 값이 달라진다. **운영 공지 필요 여부는 JSJung 판단 사항**(DEF-B-153 "기존 데이터 영향"에 기재).

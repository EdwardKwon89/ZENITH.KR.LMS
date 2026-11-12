# TASK-B-345 — Issue #1277: SHXK createorder `shipper_company` 미전송 (TASK-B-342 결정 번복)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1277](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1277) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-12 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔔 리뷰 대기 (Issue #1277 `status:review`) |
| **브랜치** | `feature/teamb-task-b345-iss1277-shxk-shipper-company-omit` (base `origin/TeamB_Dev`) |
| **채번 확인** | `find .agent/tasks -name "TASK-B-345*"` → 착수 직전 **0건** 확인. Jaison 지정 번호 `TASK-B-345` 사용(스크립트 산출값 `TASK-B-344`와 무관) |

## 1. 배경·원인 (As-Is)

- **JSJung 지시(2026-11-12)**: SHXK `createorder`의 `shipper.shipper_company`를 **설정하지 않는다**(키 자체 미전송).
- 이 지시는 **TASK-B-342(Issue #1263)** 의 "shipper_company = 회사 기본값(`SHXK_SHIPPER_NAME`) 고정" 결정을 **번복**한다.
- SHXK 명세상 `shipper.shipper_company`는 **선택 필드(200자)** 이므로 생략 가능하다.
- 종전 상태: `src/lib/ups/label-mapping.ts` `buildShipperPayload()` return 객체에 `shipper_company: shipperDefaults.name` 이 **고정 전송**되고 있었다.

| SHXK 필드 | TASK-B-342 이후 값 | TASK-B-345 목표 |
|:--|:--|:--|
| `shipper_name` | 화면 "화주명" (폴백: `order.shipper_name` → `shipper_org.name` → `shipperDefaults.name`) | **변경 없음** |
| `shipper_company` | `shipperDefaults.name` 고정 전송 | **키 자체 미전송** (빈 문자열 전송 아님 — JSJung 확정) |

## 2. 목표 (To-Be)

```ts
return {
  shipper_name: shipperDisplayName,
  // shipper_company: 전송하지 않음 (TASK-B-345, JSJung 2026-11-12 결정)
  shipper_countrycode: ...,
  ...
};
```

- `shipperDefaults.name` 파라미터는 **삭제하지 않는다** — `shipper_name` 폴백(`shipperDisplayName`)에서 계속 사용.
- `SHXK_SHIPPER_NAME` 환경변수도 `shipper_name` 폴백용으로만 남는다(설정·호출처 변경 없음).
- `src/lib/shxk/validate-payload.ts`에는 `shipper_company` 검증 항목이 **없음** → 변경 불필요(확인 완료).

## 3. [R-20] 영향도 분석

- 변경 지점: `src/lib/ups/label-mapping.ts` `buildShipperPayload()` return 객체 1줄 제거 + 상단 주석 갱신.
- 호출처: `src/app/actions/operations/ups-labels.ts` `placeShxkOrder`(실제 전송) / `previewShxkPayload('CREATEORDER')`(미리보기) — **payload 키 구성만 변하고 코드 변경 불요**.
- 테스트 영향(grep 전수 `grep -rln "shipper_company" src/ tests/`): 5개 파일.
  `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts`, `task-b341-shxk-shipper-name-unify.test.ts`, `task-b324-shxk-shipper-name-override.test.ts`, `defb054-shipper-company.test.ts`, `ups-labels-mapping.test.ts`.
- `validate-payload.ts`·DB 스키마·화면·권한·미들웨어 무관 → **Risk: Low**.

## 4. 구현

1. `buildShipperPayload()`에서 `shipper_company` 키 제거(빈 문자열/undefined 값 전송 아님).
2. 함수 상단 주석을 "2026-11-12 JSJung 결정으로 shipper_company 는 전송하지 않음(TASK-B-345)"으로 갱신. `shipperDefaults.name`은 `shipper_name` 폴백에 계속 사용한다는 점 명시.
3. 기존 5개 테스트의 `shipper_company` 기대값(`toBe`)을 `not.toHaveProperty('shipper_company')` 로 전환.
4. `LIVE_REGRESSION_TEST_MAP.md` — §57 갱신, §73/§74에 번복 표기, §76(TASK-B-345) 신규 추가.
5. `DEF-B-153`·`TASK-B-342` task file 하단에 2026-11-12 번복 이력 1줄 추기.

## 5. 테스트 (R-09)

> `toContain`(소스 문자열 검사)·`typeof fn === 'function'` 같은 vacuous 단언 금지. 실제 함수 호출 + `toHaveProperty`/`not.toHaveProperty`/`toBe` 로만 단언한다. SHXK 외부 HTTP는 mock(Sandbox 없음).

| TC | 내용 | 기대 결과 | 위치 |
|:--|:--|:--|:--|
| TC-342-1 | `buildCreateOrderPayload` — `shipper_name='ABC Trading'` | `shipper_name` 존재, `shipper_company` 키 부재 | `task-b342-shxk-shipper-company-default.test.ts` |
| TC-342-2 | `shipper_name` 빈 값 + `shipper_org.name='MASTER AIR'` | `shipper_name='MASTER AIR'`, `shipper_company` 키 부재 | 동일 |
| TC-342-3 | 한글 화주명 `'한국무역'` | `shipper_name='한국무역'`, `shipper_company` 키 부재 | 동일 |
| TC-342-4 | `shipperDefaults.name='X CORP'` 주입 | `shipper_company` 키 부재 + 기본값이 다른 필드로 새지 않음 | 동일 |
| TC-342-5 | `shipper_contact_name='Kim'` | shipper 어느 필드에도 없음 | 동일 |
| TC-342-6 | shipper 나머지 필드 | 변경 전과 동일 | 동일 |
| TC-342-7 | `registerUpsOrder()` → mock SHXK `createorder` payload | `shipper_name='ABC Trading'`, `shipper_company` 키 부재 | 동일 |
| TC-342-8 | `previewShxkPayload('CREATEORDER')` | `shipper_name='ABC Trading'`, `shipper_company` 키 부재 | 동일 |
| TC-342-9 | 레거시 오더(`shipper_name` 없음) 실제 등록 경로 | `shipper_name='MASTER AIR'`, `shipper_company` 키 부재 | 동일 |
| TC-341-1~9 | 기존 화주명 통일 케이스 | `shipper_company` 단언만 키 부재로 전환 | `task-b341-shxk-shipper-name-unify.test.ts` |
| TC-B324-1~7 | 기존 오버라이드 케이스 | 동일 전환 | `task-b324-shxk-shipper-name-override.test.ts` |
| DEF-B-054 | 실제 등록 payload | `not.toHaveProperty('shipper_company')` | `defb054-shipper-company.test.ts` |
| EXIST | `ups-labels-mapping.test.ts` DEF-B-054 블록 | 키 부재 단언으로 전환 | `ups-labels-mapping.test.ts` |

## 6. 되돌리기 검증

`buildShipperPayload()`에 `shipper_company: shipperDefaults.name`을 재삽입하면 5개 파일의 `not.toHaveProperty` 단언이 FAIL해야 한다.

## 7. 검증 (DoD)

- [x] createorder payload에 `shipper_company` 키 없음 (회귀 PASS)
- [x] mock 테스트로 외부 HTTP 레이어 검증 (`registerUpsOrder`/`previewShxkPayload` → mock createorder)
- [x] 이력 문서 갱신 (`LIVE_REGRESSION_TEST_MAP.md` §57·§73·§74·§76, `DEF-B-153`, `TASK-B-342`)
- [x] R-08 전체 회귀 PASS

## 8. [작업 결과]

### 8.1 변경 파일

| 파일 | 구분 | 내용 |
|:--|:--|:--|
| `src/lib/ups/label-mapping.ts` | 구현 | `buildShipperPayload()` return 객체에서 `shipper_company: shipperDefaults.name` 제거(1줄) + 상단 주석을 TASK-B-345 사양으로 갱신. `shipper_name` 폴백·나머지 shipper 필드 무변경 |
| `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts` | 테스트 갱신 | TC-342-1~9 의 `shipper_company` `toBe` 단언 → `not.toHaveProperty('shipper_company')` |
| `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts` | 테스트 갱신 | TC-341-1~9 동일 전환 |
| `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` | 테스트 갱신 | 단위 4건 + 서버 액션 3건 동일 전환 |
| `tests/unit/ups/defb054-shipper-company.test.ts` | 테스트 갱신 | 실제 등록 payload 단언을 키 부재로 전환 |
| `tests/unit/ups/ups-labels-mapping.test.ts` | 테스트 갱신 | DEF-B-054 블록 4건 동일 전환 |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | 문서 | §57 갱신, §73·§74 번복 표기, §76(TASK-B-345) 신규 |
| `.agent/defects/DEF-B-153_*.md` | 문서 | 조치 상태·하단 이력에 2026-11-12 번복 1줄 추기 |
| `.agent/tasks/TASK-B-342_*.md` | 문서 | 하단에 2026-11-12 번복 1줄 추기 |

### 8.2 최종 코드 (변경 후)

```ts
return {
  shipper_name: shipperDisplayName,
  // shipper_company: 전송하지 않음 (TASK-B-345, JSJung 2026-11-12 결정)
  shipper_countrycode: (order.shipper_country_code as string) || shipperDefaults.country,
  ...
};
```

`shipperDefaults.name` 파라미터는 `shipperDisplayName` 폴백에서 계속 사용하므로 삭제하지 않았다.

### 8.3 검증 결과

| 검증 항목 | 명령 | 결과 |
|:--|:--|:--|
| 영향 테스트 | `npx vitest run` (UPS 5개 파일) | `Test Files 5 passed (5)` / `Tests 67 passed (67)` |
| 되돌리기 검증 | `shipper_company: shipperDefaults.name` 재삽입 후 동일 명령 | **`Test Files 5 failed (5)` / `Tests 30 failed \| 37 passed (67)`** — `expected {…} to not have property "shipper_company"`. 원복 후 파일 `shasum` = `e9af9192b1c9791f9b3c4015e208232322938588` (재삽입 전과 일치), 재실행 67 passed |
| 전체 회귀 (R-08) | `npm run test:regression` | **`Test Files 236 passed (236)` / `Tests 1687 passed (1687)`** (exit 0) |
| 빌드 | `npm run build` | `BUILD_EXIT=0` |
| 타입체크 (advisory) | `npx tsc --noEmit` | 변경 파일 관련 오류 **0건**. 기존 오류 132건(무관 파일, `.github/workflows/pr-checks.yml`상 비차단 advisory) |
| DB 신선도 (R-08-2) | `npx supabase migration list --local` | pending 마이그레이션 **0건** (Docker 기동 후 `npx supabase start` 완료 상태에서 회귀 실행) |

### 8.4 미변경 확인

- `src/app/actions/operations/ups-labels.ts` (`placeShxkOrder`/`previewShxkPayload`) — payload 구성만 위임, 코드 변경 불요
- `src/lib/shxk/config.ts` `SHXK_SHIPPER_NAME` — `shipper_name` 폴백용으로 유지
- `src/lib/shxk/validate-payload.ts` — `shipper_company` 검증 항목 없음(변경 불요)
- DB 스키마·화면·권한·미들웨어 — 변경 없음

- 코드 커밋: `d3ce96ec3`
- 문서 커밋: 본 task file + `DEF-B-153` + `TASK-B-342` task file
- PR: `Closes #1277`, base `TeamB_Dev`

## 9. [발견 이슈]

1. **[환경] 로컬 Docker/Supabase 미기동** — 최초 회귀 실행 환경에서 `docker: stopped`, `localhost:54322` down 이었다. `open -a Docker` → `npx supabase start` 후 회귀 전량 PASS. 코드 결함 아님(TASK-B-342에서도 동일 현상 기록). → 별도 조치 불요, 환경 표준화는 기존 IMP-170 범위.
2. **[환경] `check-R17-DoD` 명령 부재** — 본 워크트리 PATH에 `check-R17-DoD` 실행 파일/슬래시 커맨드가 없어( `which` 미검출) 명령 자체 실행이 불가했다. 대신 R-17 DoD 체크리스트를 수동 동치 점검했다(DoD 전항목 체크·미완성 표기 0건·증거값 기재·PR diff 내 task file 포함 확인). → 스크립트 미설치 환경 정비는 Jaison 확인 필요.
3. **[범위 밖] 타입 오류 기존 132건** — `tests/unit/warehouse/warehouse-actions.test.ts` 등 무관 파일의 기존 오류. CI에서 advisory(비차단)이며 본 Task 변경 파일에는 오류 없음. → 본 Task 범위 외.

# TASK-B-349 — 아이템 Packing Unit 저장 정합성 실DB 검증

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1281](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1281) |
| 담당 | Mike (Team B) |
| 브랜치 | `feature/teamb-task-b349-iss1281-packing-unit-db-verify` (base: `origin/TeamB_Dev`) |
| 배정 | 2026-11-13, JSJung (배정 코멘트 기준, TASK-B-349 지정) |
| 예상 공수 | 2~3h (검증 중심) |
| 선행 | TASK-B-347(#1279) 머지 완료 ✔ (PR #1286 MERGED) |
| 유형 | **검증 전용 Task — `src/` 코드 수정 금지** (테스트·task file·회귀맵·DEF 문서만 변경) |

## [목표]

아이템 Packing Unit(`item_packing_unit`)이 **등록 → 저장 → 수정화면 표시 → 수정 저장 → SHXK `unit_code` 전송** 전 구간에서 선택값 그대로 유지되는지 **실DB로 검증**(R-14 로컬 Supabase, mock 금지).

- 불일치 발견 시 **수정하지 말고** 근거와 함께 이슈에 보고 (수정 배정은 Jaison).
- 불일치 없으면 회귀 테스트로 고정.
- 의심 지점 (a)~(d) 각각 "문제 있음/없음 + 근거" 판정.

## [DoD]

- [x] `check-db-freshness.sh` 통과 (R-08-2) — `OK — pending 마이그레이션 없음` exit=0 (2026-11-13)
- [x] 신규 테스트 `tests/integration/task-b349-item-packing-unit.test.ts` — 케이스1 RPC 상이 단위 실DB SELECT 일치 — 근거: `:163` (TC-349-01, `toEqual`로 PCE/SET/KG 단언)
- [x] 케이스2 수정 경로 값 보존(SET→SET)·변경(PCE→MTR) — 근거: `:182` (TC-349-02, DB SELECT `toEqual`)
- [x] 케이스3 `edit-defaults` 복원 + 레거시(EA/PCS) 반환값 기록 — 근거: `:198` (실DB 행→`buildOrderEditDefaults` `:225`, EA/PCS/CTN/널 반환 `toEqual`, 옵션 목록 단언 `:240-241`)
- [x] 케이스4 SHXK `unit_code` 일치 + 목록 밖 `PCE` 폴백 고정 — 근거: `:244` (실DB 단위 일치 `:259`, CTN→PCE `:265`, EA→EA `:271`)
- [x] 케이스5 패키지 BOX ↔ 아이템 단위 덮어쓰기 없음 — 근거: `:274` (등록·수정 후 양쪽 DB SELECT)
- [x] fixture afterAll 정리 — 근거: `cleanupFixture` `:72` + `afterAll` `:159` (오더·패키지·아이템·edit_log·프로필·auth.users·조직 삭제)
- [x] **되돌리기 검증** — (A) RPC 마이그레이션 insert 라인 제거+`db reset` → **4 failed / 1 passed**(TC-349-01·03·04·05 FAIL) / (B) `orders.ts:433` 라인 제거 → **2 failed / 3 passed**(TC-349-02·05 FAIL). 각 `git checkout --` 복구 후 **5/5 PASS**, 복구 후 `git diff --stat` 무변경. (마이그레이션 reset 부수 작업: 되돌리기 중 reset이 시드를 지워 `seed-local.ts` 재실행으로 복원 — orders=15 확인)
- [x] 의심 지점 (a)~(d) 판정표 — 아래 "의심 지점 판정표" (근거 포함)
- [x] `npm run test:regression` 전체 PASS — **Test Files 238 passed (238) / Tests 1719 passed (1719)** (2026-11-13, 378초)
- [x] `LIVE_REGRESSION_TEST_MAP.md` **§79** 등재 — 근거: `:1115` + 헤더 카운트 갱신(1,719/238)
- [x] 발견 불일치 → DEF — **없음** (불일치 미발견 — [발견 이슈] "없음")

## [작업 결과]

### 코드 커밋
- 코드 커밋: `47d9ab12360889d6acd8a1530c77b873aaac826c`

### 케이스별 실DB 검증 결과 (전부 PASS)

| 케이스 | 경로 | 결과 | 실측 |
|:--|:--|:--:|:--|
| TC-349-01 | 신규 등록 `createOrder` → RPC `create_order_atomic` → psql SELECT | **PASS** | 아이템3개 단위 PCE/SET/KG가 `zen_order_items`에 정확히 저장 (jsonb 매핑 포함) |
| TC-349-02 | 수정 `updateOrder` → `insertItems` → psql SELECT | **PASS** | 보존(SET→SET) + 변경(PCE→MTR) 모두 DB 반영 |
| TC-349-03 | 실DB 행 → `buildOrderEditDefaults` | **PASS** | 저장값 그대로 복원(EA/PCS/CTN 보존), 널→PCE 폴백, 옵션 목록 단언 |
| TC-349-04 | 실DB 행 → `buildInvoiceFromItems` | **PASS** | `unit_code`=PCE/SET/KG 일치, CTN→PCE 폴백·EA→EA 현행 고정 |
| TC-349-05 | 등록·수정 후 패키지/아이템 DB SELECT | **PASS** | 패키지 BOX 유지 + 아이템 단위 불변 |

### 의심 지점 (a)~(d) 판정표

| 지점 | 의심 | 판정 | 근거 |
|:--|:--|:--:|:--|
| (a) | 패키지 `packing_unit`(BOX)와 아이템 `item_packing_unit` 혼동 | **문제 없음** | TC-349-05(`:274`): 등록·수정 저장 후 패키지 `BOX` 유지 + 아이템 PCE/SET/KG 불변 (양쪽 psql SELECT) |
| (b) | 수정화면 `edit-defaults`가 DB값을 정확히 복원하지 못함 (RHF `register`+동적 `append` 시 기본값 누락) | **문제 없음 (지정 검증 범위)** | TC-349-03(`:198`): 실DB 행 → `buildOrderEditDefaults` → 저장값 그대로(`toEqual`). 호출처 `edit/page.tsx:59` → 폼 바인딩은 `register(\`packages.N.items.K.item_packing_unit\`)` (`OrderRegistrationForm.tsx:180`)로 기본값 객체와 경로 정합. **단: RHF `useFieldArray` 동적 append의 런타임 마운트 레벨은 지정된 케이스3 범위 밖이라 미검증** |
| (c) | 레거시 값(EA·PCS 등)이 옵션에 없어 첫 옵션으로 표시만 바뀌고 저장 시 덮어쓰기 | **문제 없음 (지정 레거시 EA·PCS 기준)** | ① EA·PCS는 현재 SHXK 정본 7개 옵션에 **포함** — `packing-units.ts:11`, `declare-units.ts:15-23`, TC-349-03 단언(`:240`) → 표시 전환 자체가 발생하지 않음 ② 실DB 현황: 기존 아이템 14건 **전부 NULL, 옵션 밖 값 0건**(psql 집계) → 잔존 위험 없음 ③ 널은 `edit-defaults.ts:135`의 `?? 'PCE'`로 폴백(TC-349-03 단언) — B-337 의도된 동작 ④ 신규 입력은 select(`OrderRegistrationForm.tsx:180`)로만 가능 → 목록 밖 값 생성 경로 없음. 목록 밖 임의값의 select DOM 표시·저장 덮어쓰기 레벨은 미검증 범위 기재 |
| (d) | RPC v6의 jsonb 키 매핑 오타 | **문제 없음** | TC-349-01: payload `item_packing_unit` → DB 값 실측 일치. 매핑 소스 `20260816110000_task_b305_create_order_atomic_v6.sql:152-163`(`jsonb_to_recordset` 필드 → insert 컬럼·값) 확인 |

### 회귀 검증 (R-08)

- `npm run test:regression` → **Test Files 238 passed (238) / Tests 1719 passed (1719)** (2026-11-13, 378초) — 신규 5건 포함
- 되돌리기 검증: (A) **4 failed/1 passed** → 복구 후 5/5 PASS, (B) **2 failed/3 passed** → 복구 후 5/5 PASS (상세는 DoD)

### 비고

- **src 코드 무수정**(검증 전용 Task 지시 준수) — 변경 파일은 테스트·회귀맵·task file·(DEF 미생성)뿐. `git diff origin/TeamB_Dev` = 회귀맵 1건 + untracked 신규 테스트/task file.
- 실DB 왕복: 서버 액션·RPC는 실제 실행(service-role 클라이언트), 결과는 psql 직접 SELECT로 단언 (mock은 `validateUserAction`·`next/cache` 한정).
- GitNexus MCP 미가용(세션 도구 목록 없음) — 본 Task는 src 수정0건이라 심볼 영향도 분석 대상 없음.

## [발견 이슈]

없음 (의심 지점 (a)~(d) 모두 불일치 미발견 — DEF 미생성)

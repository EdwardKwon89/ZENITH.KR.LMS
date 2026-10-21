# TASK-B-341 — Issue #1261: SHXK createorder shipper_name·shipper_company를 화면 "화주명"으로 통일

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1261](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1261) |
| **담당(Worker)** | Baker (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-10-21 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔔 리뷰 대기 (Jaison 코드 승인 2026-10-21 — Issue #1261 `status:review`, PR #1262) |
| **브랜치** | `feature/teamb-341-shxk-shipper-name-baker` (base `origin/TeamB_Dev` @ `7012ac96a`) |
| **채번 확인** | `./scripts/next-task-number.sh B` → `TASK-B-341` (착수 직전 재확인 완료) |

## 1. 배경·원인 (As-Is)

SHXK `createorder` 페이로드의 `shipper.shipper_name`이 화면 "담당자명"(`zen_orders.shipper_contact_name`)으로 나가면서, `shipper_company`만 화면 "화주명"(`zen_orders.shipper_name`)으로 나가는 **불일치**가 있었다.

`src/lib/ups/label-mapping.ts:133-142` (수정 전):

```ts
shipper: {
  shipper_name:    (order.shipper_contact_name as string) || shipperDefaults.name,
  shipper_company: (order.shipper_name as string) || (order.shipper_org as ...)?.name as string || shipperDefaults.name,
  ...
}
```

| SHXK 필드 | 수정 전 값 | 화면 대응 | 문제 |
|:--|:--|:--|:--|
| `shipper_name` | `order.shipper_contact_name` → 기본값 | "담당자명" | 요구와 불일치 |
| `shipper_company` | `order.shipper_name` → `shipper_org.name` → 기본값 | "화주명" | 이미 맞음 |

- 화면 "화주명" 입력란 = `src/components/orders/OrderRegistrationForm.tsx:1136` `register('shipper_name')` → `zen_orders.shipper_name` (Issue #1100 / TASK-B-295, 마이그레이션 `20260813020000_iss1100_shipper_name_override.sql`).
- `lookupOrderPackages()`(`src/app/actions/operations/ups-labels.ts:193-200`)가 `zen_orders`를 `select('*')` 하므로 `shipper_name` 컬럼은 이미 payload 빌더에 전달된다.

## 2. 목표 (To-Be) — JSJung 2026-10-21 결정

`buildCreateOrderPayload()`에서 화주명을 **한 번만 해석**해 `shipper_name`·`shipper_company` **양쪽에 동일 적용**한다.

```ts
const shipperDisplayName =
  (order.shipper_name as string)
  || ((order.shipper_org as Record<string, unknown> | undefined)?.name as string)
  || shipperDefaults.name;
```

- 폴백 순서: `order.shipper_name` → `shipper_org.name` → `shipperDefaults.name` (기존 `shipper_company` 체인과 동일)
- **담당자명(`order.shipper_contact_name`)은 SHXK payload 어디에도 보내지 않는다** (JSJung 수용 결정)
- 변경 파일: `src/lib/ups/label-mapping.ts` 1곳. 호출처(`placeShxkOrder`, `previewShxkPayload` CREATEORDER)는 같은 빌더를 쓰므로 수정 불요. `validate-payload.ts`·DB·화면 변경 없음.

## 3. [R-20] 영향도 분석

> **GitNexus 미사용 사유(이 세션 환경 제약)**: 본 세션에는 `gitnexus_impact` MCP 도구가 노출되지 않았고, 저장소·전역 어디에도 GitNexus CLI 바이너리(`gitnexus`)와 인덱스(`.gitnexus/`)가 존재하지 않는다(`npx --no-install gitnexus` → 미설치, `opencode.json`에 gitnexus MCP 미등록). R-20의 "면제 조건 없음"에 따라 생략하지 않고, 아래 grep 기반 **실제 파일 재검증**으로 대체 수행했다.

`buildCreateOrderPayload` 호출처 (grep 전수):

| # | 호출처 | 영향 |
|:--|:--|:--|
| 1 | `src/app/actions/operations/ups-labels.ts:254` (`placeShxkOrder` → `createorder` 실제 전송) | `shipper.shipper_name` 값 변경 → SHXK로 전송되는 값이 바뀜 |
| 2 | `src/app/actions/operations/ups-labels.ts:778` (`previewShxkPayload` CREATEORDER 미리보기) | 미리보기 payload의 `shipper.shipper_name` 값 변경 |
| 3 | `src/lib/shxk/validate-payload.ts:39` `isEmpty(shipper?.shipper_name)` → "발송인 성명 누락" | 값은 여전히 폴백 기본값으로 채워져 **누락 판정 결과 불변** |

- 결과 blast radius: `src/lib/ups/label-mapping.ts` 내부 + 위 2개 호출처의 payload 값. DB 스키마·화면·권한·미들웨어 무관. **Risk: Low**(순수 필드 값 치환, 호출 시그니처 불변).
- `shipper_contact_name`은 SHXK payload에서만 배제되며, DB/화면에서는 그대로 사용된다(`shipper_contact_phone`·`shipper_contact_email`도 동일).

## 4. 구현

1. `src/lib/ups/label-mapping.ts`
   - `buildCreateOrderPayload()`의 shipper 블록을 헬퍼 `buildShipperPayload()`로 추출(ZEN_A4 50줄 준수 — 본 함수는 수정 전 이미 55줄).
   - 헬퍼 내부에서 `shipperDisplayName`을 1회 해석 → `shipper_name`·`shipper_company` 동일 적용.
   - 나머지 shipper 필드(`countrycode`/`province`/`city`/`street`/`postcode`/`telephone`) 의미 변경 없음.

## 5. 테스트 (R-09)

| TC | 내용 | 기대 결과 | 위치 |
|:--|:--|:--|:--|
| TC-341-1 | 실제 `buildCreateOrderPayload` 호출 — `shipper_name='ABC Trading'` + `shipper_contact_name='Kim'` | `shipper_name`·`shipper_company` 모두 `'ABC Trading'` (`toBe`) | `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts` |
| TC-341-2 | `shipper_name` 빈 값 + `shipper_org.name='MASTER AIR'` | 두 필드 모두 `'MASTER AIR'` | 동일 |
| TC-341-3 | 화주명·조직명 모두 없음 | 두 필드 모두 `shipperDefaults.name` | 동일 |
| TC-341-4 | `shipper_contact_name` 값이 payload shipper 어느 필드에도 없음 | 전체 필드 값 스캔 부정 단언 | 동일 |
| TC-341-5 | shipper 나머지 필드(`countrycode`/`province`/`city`/`street`/`postcode`/`telephone`) | TASK-B-341 변경 전과 동일 | 동일 |
| TC-341-6 | 한글 화주명(`'한국무역'`) | 두 필드에 그대로 실림 | 동일 |
| TC-341-7 | 실제 서버 액션 `registerUpsOrder()` → SHXK `createorder` payload | 두 필드 모두 `'ABC Trading'` | 동일 |
| TC-341-8 | `previewShxkPayload('CREATEORDER')` 미리보기 payload | 두 필드 모두 `'ABC Trading'` | 동일 |
| TC-341-9 | 레거시 오더(`shipper_name` 없음) → 실제 등록 경로 | 두 필드 모두 `'MASTER AIR'` | 동일 |
| 기존 | `defb054-shipper-company.test.ts`, `shxk-payload-validation.test.ts` | PASS 유지 | 기존 파일 |

> `toContain`·문자열 소스 검사(mock) 금지 — 실제 함수 호출 + `toBe` 단언으로만 검증한다.
> `LIVE_REGRESSION_TEST_MAP.md` §73과 1:1 대응.

## 6. 되돌리기 검증

- 변경을 원복(`shipper_name`을 `order.shipper_contact_name` 체인으로 되돌림)하면 TC-341-1이 FAIL함을 확인하고 본 문서에 FAIL 출력 인용.
- 원본 보존: 작업 전 `cp` 백업 → 변이 → 테스트 → `cp` 복원 → `shasum` 일치 확인.

**실행 결과 (2026-10-21)**

| # | 변이 | 대상 | 결과 |
|:--|:--|:--|:--|
| a | `shipper_name: shipperDisplayName` → `shipper_name: (order.shipper_contact_name as string) \|\| shipperDefaults.name` | TC-341-1 | `AssertionError: expected 'Kim' to be 'ABC Trading'` → 전체 **8건 FAIL**(TC-341-1~4·6~9) / 1 PASS(TC-341-5, 나머지 shipper 필드 불변 케이스) |
| b | 원본 복원 (`cp /tmp/task-b341-label-mapping.bak.ts`) | 전체 | `shasum` 일치 확인 — `21ab98a429ff0ed28ca0b3314a970df1dcd939ff` (백업·복원 후 동일) → 재실행 **5 files / 64 tests PASS** |

> 원본 보존 방식: 작업 전 `cp` 백업 → 변이 → 테스트 → `cp` 복원 → `shasum` 동일 확인 (TASK-B-340 선례 동일).

## 7. 검증 (DoD)

- [x] `label-mapping.ts` 수정 (shipper 블록만) — `buildShipperPayload()` 헬퍼로 추출(ZEN_A4 50줄 준수: 본 함수 55줄 → 45줄), 나머지 shipper 필드 의미 불변
- [x] 신규 회귀 테스트 (R-09) — 실제 `buildCreateOrderPayload` 호출 + `toBe` 검증 (TC-341-1~6) + 실제 서버 액션 경로 (TC-341-7~9), 총 9케이스 신규
- [x] 되돌리기 검증 — 변경 원복 시 TC-341-1 FAIL 확인(§6), 원본 `shasum` 일치 복원
- [x] 기존 `tests/unit/ups/defb054-shipper-company.test.ts`, `shxk-payload-validation.test.ts` PASS 유지 (5 files / 64 tests PASS)
- [x] `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 갱신 (§73 신설, `TC-341` 11개 ID 확인)
- [x] **R-12** `Ds_11_API_상세_명세서.md` 확인 → **해당 없음**(Ds_11 §11은 UPS 요금 관리 API이며 SHXK createorder payload 필드 매핑 미기재. 외부 API 규격 원문은 `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 116~117행 — `shipper_name`(발송인 성명) 정의 존재. 코드·API 시그니처 변경 없음)
- [x] **R-20** 영향도 분석 — 본 문서 §3 (GitNexus 환경 미구축 사유 명시 + grep 기반 실제 파일 재검증)
- [x] `rtk npm run test:regression` 전체 PASS (R-08) — **233 files / 1671 tests PASS**
- [x] `npm run build` 성공 (exit 0)
- [x] **R-08-2** 로컬 DB 신선도 — pending 마이그레이션 1건(`20261021090000`, TASK-B-340 백필) 확인 → `supabase db reset --yes` + `scripts/seed-local.ts` 실행 후 pending 0건, 회귀 재실행 PASS
- [x] **ZEN_A4 관측성** — 순수 필드 값 치환(성공/실패 분기 없음, 외부 API 호출 결과는 `placeShxkOrder` 기존 로깅 경로) → 로깅 대상 아님
- [x] **R-15** 개선 사항 기록 — `scratch/post_launch_improvements.md`에 **IMP-170** 기재(`check-db-freshness.sh`의 전역 `supabase` CLI 의존 → exit 127로 조용히 실패, `agent-worktree-init.sh`의 `||` 처리로 착수 시 자동 경고도 무력화)
- [x] **R-10** UI 변경 없음 — 백엔드 매핑 단독. 단, 실제 서버 액션 경로(`previewShxkPayload('CREATEORDER')`)로 두 필드 동일 값 검증(TC-341-8)을 스크린샷 대신 테스트 증적으로 첨부
- [x] **R-04** 자가점검 — base `7012ac96a` 대비 소스 1 + 테스트(신규 1, 기존 2 수정) + MAP 1
- [x] **R-18** — DEF-B-153 작성(§9)

## 8. [작업 결과]

- **변경 파일**:
  - 수정: `src/lib/ups/label-mapping.ts` (shipper 블록)
  - 테스트 신규: `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts` (9케이스)
  - 테스트 수정: `tests/unit/ups/ups-labels-mapping.test.ts`, `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` (구 사양 기대값 → TASK-B-341 사양으로 갱신)
  - 문서: `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` (§73), 본 task file, `DEF-B-153`, `scratch/post_launch_improvements.md` (IMP-170)
- **구현 요약**:
  ```ts
  const shipperDisplayName =
    (order.shipper_name as string)
    || (shipperOrg?.name as string)
    || shipperDefaults.name;
  // shipper_name = shipper_company = shipperDisplayName
  ```
  - **담당자명(`order.shipper_contact_name`)은 SHXK payload 어디에도 전송되지 않는다**(JSJung 2026-10-21 결정) — `shipper_contact_phone` 등 다른 연락처 필드는 기존 그대로.
  - 폴백 체인은 기존 `shipper_company`와 동일(`order.shipper_name` → `shipper_org.name` → `shipperDefaults.name`).
- **검증**: 전체 회귀 **233 files / 1671 tests PASS**, build 성공(exit 0), 되돌리기 검증 FAIL 확인 + 원본 `shasum` 일치 복원
- 코드 커밋: `39a8929cfd43f999080137d5fcbde053106b4a31`
- 문서 커밋: 본 task file·DEF-B-153만 (코드 커밋 직후 `scripts/insert-commit-hash.sh`로 갱신)
- **Jaison 검토(2026-10-21) 코드 승인** — PR #1262 코멘트: 구현·범위·CI·테스트 실효성·구 사양 테스트 갱신·DEF-B-153 항목 모두 승인. 보완 요청 3건(헤더 상태 미변경 / §5 테스트 표 불일치·컬럼 구분 깨짐 / R-15 IMP 미기록)을 아래 보완 커밋에서 반영.
  - 보완 ① 헤더 상태 `🔨 진행 중` → `🔔 리뷰 대기`
  - 보완 ② §5 테스트 표를 실제 테스트(TC-341-1~9)·`LIVE_REGRESSION_TEST_MAP.md` §73과 1:1로 정정, 컬럼 구분(`|`) 복구
  - 보완 ③ R-15 — `scratch/post_launch_improvements.md`에 **IMP-170** 기재(§7·§9 참조)

## 9. [발견 이슈]

| # | 내용 | 긴급도 | 상세 보고서 |
|:--|:--|:--|:--|
| 1 | **DEF-B-153**: SHXK 명세상 `shipper_name`은 "발송인 성명"(200자)이나 TASK-B-341 결정으로 회사명(화주명)이 전송됨. ① 명세 의미 불일치 ② 200자 제한 미검증(`validate-payload.ts`에 shipper 필드 길이 검증 없음 — 자유 입력이라 초과값 그대로 전송) ③ 한글 전송 가능(`shipper_name`은 필수 필드라 실패 시 라벨 발급 전체 실패). **Issue 지시("코드로 막지 말고")에 따라 코드 차단 없이 DEF로만 보고** | Low | `.agent/defects/DEF-B-153_SHXK_shipper_name_화주명전송_명세불일치.md` |
| 2 | 기존 오더 중 `shipper_name`이 NULL인 건은 조직명으로 폴백됨(변경 전에는 담당자명이 전송되던 필드) — 의도된 동작이며 확정 불가. 재발급 시 값이 달라지므로 운영 공지 필요 | Low | 본 task file §2·DEF-B-153 "기존 데이터 영향" 참조 |
| 3 | `check-db-freshness.sh`가 전역 `supabase` CLI 부재로 exit 127 — `npx supabase`로 우회 가능. 스크립트가 `npx` 미사용이라 이 환경에서 자동 확인 불가 | Low | **IMP-170** (`scratch/post_launch_improvements.md`) — R-15 기록 완료 |

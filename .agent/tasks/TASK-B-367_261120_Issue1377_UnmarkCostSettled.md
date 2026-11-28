# TASK-B-367 — Issue #1377: 청구서관리 ①-4 정산 되돌리기·주문 수정 잠금 — unmarkOrderCostSettled·updateOrder (설계 Q-G)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1377](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1377) (에픽 #1364 / 설계 기준 `TASK-B-358`, PR #1373 병합) |
| **담당(Worker)** | Baker (Team B) — Jaison 2026-11-20 코멘트로 정식 배정·blocked 해제 |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-20 |
| **우선순위** | P2 (`priority:p2`, `type:feat`) |
| **상태** | 🔔 검토 요청 (`status:review`) |
| **브랜치** | `feature/teamb-task-b367-iss1377-unmark-cost-settled` (base `origin/TeamB_Dev` @ `a1182baed`, PR #1402 병합 반영) |
| **선행 조건** | ✅ #1365 청구서 DB(PR #1397, `zen_billing_statement_items`) 병합 / ✅ #1376 B-366(PR #1396, `cost_settled_locked` 키) 병합 / ✅ develop→TeamB_Dev(PR #1402) |
| **범위** | `unmarkOrderCostSettled` 신규 + `updateOrder` 정산 후 중량·치수 가드(조건부) + `Errors.statement_includes_order` 4로케일 + Ds-11 + 회귀 추적 항목. **DB 마이그레이션 없음** |

## 0. 채번 확인 (착수 직전 실행 — 원문 그대로 기재)

```bash
$ git fetch origin TeamB_Dev develop
$ find .agent/tasks -name "TASK-B-367*"                                  → (출력 없음 — 신규)
$ git ls-tree -r origin/TeamB_Dev --name-only | grep "TASK-B-367"          → (출력 없음, rc=1)
$ gh issue list --state all --search "TASK-B-367 in:title"
1377  OPEN  [Team B] TASK-B-367: 청구서관리 ①-4 정산 되돌리기·주문 수정 잠금 — unmarkOrderCostSettled·updateOrder (설계 Q-G)  team:b, priority:p2, type:feat, status:open  2026-11-20T12:40:51Z
```
→ TASK-B-367은 본 이슈(#1377)에만 사용. 중복 없음. 이슈의 못박힌 번호를 그대로 사용.

## 1. 구현 범위·설계

### 1-1. `unmarkOrderCostSettled(orderId)` (신규 — `src/app/actions/finance/ups-actual-cost.ts`)
- **Admin 전용**(`assertAdmin`, ADMIN_ROLES), **user-session client**(`validateUserAction().supabase`)만 사용 — service_role 우회 금지.
- 순서: Admin 검증 → 오더 조회 → `cost_settlement_status !== 'SETTLED'`이면 `not_found` → `zen_billing_statement_items`를 **오더 기준(어떤 tier든)** 조회 → 1건 이상이면 `statement_includes_order` 거부 → 조건부 UPDATE.
- 조건부 UPDATE: `.eq('id', orderId).eq('cost_settlement_status','SETTLED').select('id')` — 영향 행 0이면 `not_found`/`already` 계열 로그 후 실패. 성공 시 `cost_settlement_status='NOT_SETTLED'`, `cost_settled_at=NULL`, `cost_settled_by=NULL`.
- `{data,error}` 전부 검사. 조회 실패를 "청구서 없음"으로 오인 금지(#1396 수정 1 원칙). 실패 반환 전 `logger.warn`/`logger.error`, catch 원본 에러를 로거에 전달.
- 신규 `Errors` 키 `statement_includes_order` 4로케일 동시 추가(94 → 95), `errors-key-sync` baseline 갱신.

### 1-2. `updateOrder` 정산 후 중량·치수 가드 — Jaison 범위 정정에 따른 **사전 실측**
`src/app/actions/operations/orders.ts:240`이 본문이고 `src/app/actions/orders.ts`는 re-export 한 줄(`export * from './operations/orders'`)임을 확인.

**DELIVERED 도달 가능 상태 전수 (`getOrderEditScope` 실측, `npx tsx` 출력 그대로 기재):**

| 상태 | DELIVERED 도달 | editable (mode=UPS) | editable (mode=AIR/비UPS) |
|:--|:--|:--|:--|
| DELIVERED | 예 | false | false |
| RETURNED | 예 | **true** | **true** |
| CLAIMED | 예 | **true** | **true** |
| HELD | 예 | **true** | **true** |
| WAREHOUSED | 예 | **true** | false |
| REGISTERED | 예 | **true** | **true** |
| SCHEDULED | 예 | **true** | **true** |
| PACKED | 예 | false | false |
| RELEASED | 예 | false | false |
| IN_TRANSIT | 예 | false | false |
| CANCELED | 예 | false | false |
| DISPOSED | 예 | false | false |
| MASTERED | 아니오 | false | false |

- 도달 가능 12개 상태 중 **6개가 editable=true** (RETURNED·CLAIMED·WAREHOUSED[UPS]·HELD·REGISTERED·SCHEDULED). 특히 **직접 전이인 RETURNED/CLAIMED가 editable=true** — Jaison이 우려한 "전부 editable=false → 죽은 코드" 가정은 성립하지 않음.
- 상태 변경 함수(`updateOrderStatus`)에 `cost_settlement_status` 잠금은 없음(grep 전수 확인) → SETTLED 오더가 RETURNED/CLAIMED 등 editable 상태로 전이 가능. 따라서 가드는 **도달 가능한 실코드**.
- **결정**: Jaison 정정 분기 2번(editable=true 경로 존재)에 따라 가드를 추가한다. `src/lib/orders/` 소형 헬퍼에 "SETTLED + 중량/치수 변경 시 `cost_settled_locked` throw"를 두고 `updateOrder`에는 호출 1문장만 추가(파일 1,371줄 → +1~3줄, 함수 50줄 상한 유지). 비중량 필드만 수정하면 통과.

### 1-3. R-20 영향도 분석 (GitNexus MCP 미연결 → grep 전수, Jaison 지시 준수)
- **GitNexus**: `list_mcp_resources` 결과 resources/templates 모두 빈 배열 → 사용 불가. R-20 GitNexus 우선 원칙은 "가능 시" 등식에 따라 grep 전수로 대체(이슈 본문·Jaison 코멘트 명시).
- **공유 파일 사전 확인**: `gh pr list --state open --search "orders.ts"` → 출력 없음(충돌 PR 없음).
- **`updateOrder` 호출처 전수**:

| 구분 | 경로 | 용도 |
|:--|:--|:--|
| export | `src/app/actions/operations/index.ts:3` | 배럴 re-export |
| re-export | `src/app/actions/orders.ts` (한 줄) | `export * from './operations/orders'` |
| **프로덕션 호출** | `src/components/orders/OrderRegistrationForm.tsx:19,837` | 오더 수정 폼 제출 (유일한 UI 호출처) |
| 테스트 | `tests/unit/finance/task-b354-error-locale.test.ts`, `tests/unit/orders/ups-product-guard.test.ts`, `tests/unit/logistics/order-update-b339.test.ts`, `tests/unit/logistics/order-update.test.ts`, `tests/unit/orders/*` (UI mock 다수), `tests/integration/task-b349-item-packing-unit.test.ts`, `tests/integration/iss1075-order-items-rls-insert.test.ts` | 기존 단위/통합 (mock + 실DB) |

- **영향**: 시그니처 변경 없음. 가드는 오더 조회 직후·모든 쓰기 전에 위치 → SETTLED & editable 상태에서 중량·치수 변경 시도만 새로 거부(`cost_settled_locked`). 기존 비SETTLED 수정 흐름은 동일. UI는 새 오류 문구를 `error`로 표시(기존 에러 처리 경로 재사용).

### 1-4. 범위 밖 (명시적 미수정)
- DB 마이그레이션/트리거 추가 없음(TOCTOU는 IMP로 건의 — §4).
- Ds-11 분할 구조는 `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md`(B-366 갱신 파일)에 반영.
- LRTM은 `## N.` 절 추가 없이 `regression-items/TASK-B-367_Issue1377_*.md` 신규 → `npm run build:lrtm` → `npm run check:lrtm`.

## 2. [발견 이슈]
- **IMP-200 신규 등록 — `unmarkOrderCostSettled`의 청구서 포함 검사 TOCTOU**: `zen_billing_statement_items`에 해당 오더가 없음을 확인한 뒤 `zen_orders`를 `NOT_SETTLED`로 갱신하는 사이, 다른 트랜잭션이 같은 오더를 청구서 항목에 삽입하면 "청구서 포함 오더의 정산 해제"가 통과할 수 있다. 애플리케이션 레벨에서는 `order_id` 선조회 + 조건부 UPDATE(`.eq('cost_settlement_status','SETTLED')`)로 **동시 되돌리기**는 1건만 성공하도록 막았으나, **항목 INSERT와의 교차 경합**은 차단하지 못한다. Admin 전용·저확률이라 즉시 사고 위험은 낮음. DB 트리거/제약으로 원자적 방어가 목표. **Jaison 지시에 따라 기존 IMP-198(정산 후 원가 덮어쓰기, 반대 방향)에 덧붙이지 않고 신규 번호 IMP-200으로 등록**했다(`scratch/post_launch_improvements.md`). 본 Task 범위 밖(DB 마이그레이션 없음).
- **환경 메모(코드 무관)**: 로컬 Supabase DB는 여러 워크트리가 공유한다. Mike의 TASK-B-360 워크트리가 남긴 `zen_billing_statements` 잔여 행(`ST-202611-01-0001`, `billed_name='B360 Shipper S'`)이 B-359 채번 동시성 테스트(TC-359-C1, `statement_no` 전역 유일)와 충돌해 회귀가 1건 실패했다. 잔여 행 정리 후 B-359는 35/35, 전체 회귀는 279파일/2100케이스 전부 PASS. B-367 코드와는 무관하며, 본 Task의 신규 테스트도 해당 잔여 행에 의존하지 않는다(전용 `ST-202611-01-367{1,2,3}` 사용).
- **범위 밖 결함 DEF 여부**: 신규 DEF 없음. 위 TOCTOU는 DEF가 아닌 개선(IMP)으로 분류 — 현재 구현이 요구사항(청구서 포함 오더 거부)을 충족하며, 경합은 방어선 강화 사항이기 때문.

## 3. [작업 결과]
- 코드 커밋: `b57ea775c2ff0d23aa58d60e03c08d6c37d26ab5`
- **구현**
  - `unmarkOrderCostSettled(orderId)` 신규 — `src/app/actions/finance/ups-actual-cost.ts:925-971`(47줄, ZEN_A4 50줄 이내). Admin 전용(`assertAdmin` → `ADMIN_ROLES` = `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`), user-session client(`validateUserAction().supabase`)만 사용(service_role 미사용). `NOT_SETTLED` → `not_found`; `zen_billing_statement_items`를 **`order_id` 기준(어떤 tier든)** 조회해 1건 이상이면 `statement_includes_order`; 조회 오류는 "없음"으로 오인하지 않고 `generic{STATEMENT_ITEM_LOOKUP}` 실패; 조건부 UPDATE(`.eq('id').eq('cost_settlement_status','SETTLED').select('id')`)로 동시 되돌리기 1건만 성공, 영향 행 0이면 `not_found`; 모든 `{data,error}` 검사 + 실패 분기마다 `logger.warn/error`(catch 원본 에러 포함).
  - `src/app/actions/finance/index.ts` export 추가.
  - `updateOrder` 정산 후 화물 수정 가드 — 신규 `src/lib/orders/settled-cargo-guard.ts`(30줄) + `src/app/actions/operations/orders.ts:357-360` 호출 1곳. SETTLED & editable 상태에서 패키지별 `length`/`width`/`height`/`gross_weight` 또는 패키지 수가 바뀌면 **모든 쓰기 전** `cost_settled_locked`로 차단. 비중량 필드만 수정하면 통과. 인덱스 기준 비교는 "놓침 없이 과차단만 가능"한 보수적 방향(금전 무결성 우선).
  - 신규 `Errors.statement_includes_order` 4로케일(ko/en/zh/ja) 동시 추가 → 94→95키, `errors-key-sync` baseline 갱신.
- **테스트**: 신규 31건 전부 PASS — 단위 unmark 9 / 가드 10 / **실DB 통합 5**(실제 서버 액션 + 실제 DB fixture) / errors-key-sync 7. `test.skip`·TODO 0건, `readFileSync|toContain|typeof … === 'function'` 0건.
- **되돌리기 검증(구현 유효성 — 실제 FAIL 확인 후 복구)**

  | 되돌린 구현 | 결과 | 복구 후 |
  |:--|:--|:--|
  | `statement_includes_order` 차단 비활성화 | 3 failed / 11 passed | 14/14 PASS |
  | 조건부 UPDATE 술어 `.eq('cost_settlement_status','SETTLED')` 제거 | 1 failed / 8 passed | 9/9 PASS |
  | 조건부 UPDATE 영향 행 0건 체크 비활성화 | 1 failed / 8 passed | 9/9 PASS |
  | 청구서 항목 조회 오류 체크 비활성화 | 1 failed / 8 passed | 9/9 PASS |
  | `updateOrder` 가드 호출 제거 | 2 failed / 8 passed | 10/10 PASS |

- **문서/추적**: Ds-11 두 분할 문서 갱신(`Ds_11_11B_UPS_Agency_Actuals.md` unmark 절, `Ds_11_03_Orders_Warehouse.md` 가드 오류) + baseline 126→125. R-09 v3.10 회귀 항목 신규(`regression-items/TASK-B-367_Issue1377_unmark-cost-settled.md`), `## N.` 절 추가 없음. IMP-200 등록.
- **규모/정적 검사**: `ups-actual-cost.ts` 971줄 / `orders.ts` 1,377줄 / 가드 30줄(모두 <1,500), `git diff --check` OK, 4 JSON 로케일 파싱 OK.

## 4. 검증 (DoD)
- [x] 청구서 포함 오더 unmark → `statement_includes_order`, DRAFT 헤더 삭제(CASCADE)로 해제된 오더 unmark → 성공 (실DB fixture, 5/5)
- [x] SETTLED & editable 상태 오더의 중량·치수 수정 거부(`cost_settled_locked`), 비중량 필드 수정 통과 (실제 `updateOrder` 호출, 10/10)
- [x] 조건부 UPDATE 0행 / 조회 오류 오인 방지 단위 검증 (9/9)
- [x] 영향도 분석 결과 기재(§1-3 `updateOrder` 호출처 전수 — GitNexus MCP 미연결 → grep 전수, Jaison 지시 준수)
- [x] `grep -n "skip\|TODO" <신규 테스트>` 결과 없음 + `readFileSync|toContain|typeof…==='function'` 0건
- [x] 구현 되돌리면 테스트 FAIL 확인 (5건, §3 표)
- [x] 4로케일 Errors 키 95개 동기화 + errors-key-sync PASS (7/7)
- [x] Ds-11 갱신 + `npm run check:ds11` PASS (허용 목록 밖 신규 미반영 0)
- [x] `npm run build:lrtm` + `npm run check:lrtm` PASS (279파일 / 2059정적케이스 / 신규 11건, 유령 경로 0·E2E 표기 누락 0·신규 `## N.` 0)
- [x] 전체 회귀 PASS — `npm run test:regression` → **279파일 / 2100케이스 PASS (exit 0)**
- [x] `npm run build` PASS (exit 0)
- [x] `/admin/error-logs` 신규 ERROR 0건 (로컬 `zen_error_logs` severity=ERROR 0행, B-367 관련 0행 — 라이브 최종 확인은 병합 후 JSJung)
- [x] ZEN_A4 함수 ≤50줄(`unmarkOrderCostSettled` 47줄), 소스 파일 ≤1,500줄(`orders.ts` 1,377줄)
- [x] `check-R17-DoD` 전항목 통과

# TASK-B-329: Issue #1202 — 출고확정 시 zen_inventory_history insert 제거 (DEF-B-149)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1202](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1202) |
| **DEF** | [DEF-B-149](../defects/DEF-B-149_출고확정_재고이력insert실패_inventory_id_NULL.md) |
| **배경** | Edward 지시 → Aiden 1차 분석(2026-09-30) → Jaison이 스키마 추적으로 근본원인 재정의, JSJung이 처리 방향 확정(2026-10-01) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-01 |
| **우선순위** | P1 (High) |
| **상태** | 🔔 완료 (PR 검토 대기) |

## 현재 상태 (Jaison 분석 + JSJung 확정)

`confirmOutbound()`(출고확정) 시마다 `zen_inventory_history` insert가 `inventory_id` NOT NULL 위반으로 매번 실패(조용히 로깅만 되고 삼켜짐, 화면엔 안 보임).

**근본원인**: `zen_inventory`/`zen_inventory_history`는 [`inventory.ts`](../../src/app/actions/operations/inventory.ts)가 관리하는 **SKU 단위 실물 재고 관리 모듈**(`/inventory` 관리자 화면)이고, `inventory_id`는 특정 SKU 재고 레코드를 가리키는 필수 FK다. **UPS 오더는 이 SKU 재고와 전혀 연결되어 있지 않다**(화주 화물을 그대로 포워딩하는 구조라 오더 품목이 `zen_inventory` 레코드에 매핑되지 않음) — `confirmOutbound()`에는 애초에 `zen_inventory` 레코드를 조회/생성하는 로직이 없어 `inventory_id`를 채울 방법이 구조적으로 없었다.

`git log -S "zen_inventory_history" -- warehouse.ts` 확인 결과 최초이자 유일한 도입 커밋(`313301a43`, IMP-074/TASK-070, 초기 스캐폴드 단계)부터 이 상태였던 것으로 추정 — "3주+ 재발"이 아니라 **도입 시점부터 한 번도 성공한 적이 없었을 가능성이 높음**(로그 보존 기간상 09-09부터만 확인 가능했을 뿐).

**JSJung 확정(2026-10-01)**: `zen_inventory` 레코드를 억지로 만들어 연동하지 않고, **`confirmOutbound()`의 이 insert 시도 자체를 제거**한다. 백필 불필요(애초에 정상 작동한 적이 없어 복구할 데이터 자체가 없음). `/inventory` 관리자 화면(SKU 수동 재고 조정 기능)은 이번 작업과 무관하게 그대로 유지.

## 수정 방향 (확정 — 단순 제거)

[`warehouse.ts confirmOutbound()` L163-174](../../src/app/actions/operations/warehouse.ts#L163-L174)의 아래 블록을 **그대로 삭제**:
```ts
const { error: historyError } = await supabase
  .from("zen_inventory_history")
  .insert({
    org_id: orgId,
    transaction_type: "OUTBOUND" as any,
    change_qty: -totalQty,
    result_qty: 0,
    reference_id: orderId,
    remarks: `출고확정: ${order.order_no}`,
    created_by: user.id,
  });

if (historyError) {
  logger.error("confirmOutbound history insert error:", historyError);
}
```

**주의(과설계 금지)**:
- `orgId`/`totalQty` 변수가 이 블록 삭제 후 다른 곳에서 안 쓰이면 함께 제거(미사용 변수 lint 경고 방지) — 단, `orgId`가 `pkgsWithoutIntlRef` 계산 등 다른 로직에 쓰이는지 먼저 확인
- `pkgsWithoutIntlRef` 계산 로직(L154-157)은 이 insert와 무관하므로 **건드리지 않음**
- `zen_inventory`/`zen_inventory_history` 테이블 자체나 `inventory.ts`의 다른 함수(`getInventoryList`, `adjustInventory` 등)는 **전혀 손대지 않음** — 이번 Task는 `confirmOutbound()` 내부 삭제 1건뿐
- 마이그레이션 변경 불필요(테이블 스키마는 그대로, 코드에서 호출만 제거)

## 착수 체크리스트

- [x] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-329-confirm-outbound-inventory-history-removal` 브랜치 생성(전용 워크트리, R-17 §0) — `next-task-number.sh B` 결과를 GitHub Issue 제목 검색으로 교차검증(Issue #1202 제목에 이미 TASK-B-329로 명시)
- [x] 기존 테스트 확인: `tests/unit/warehouse/outbound-ups.test.ts`, `warehouse-actions.test.ts`, `defb046-agency-self-shipper.test.ts` 등에 `zen_inventory_history` insert를 mock/assert하는 부분이 있는지 확인 후 있으면 함께 정리(제거된 동작을 더 이상 기대하지 않도록)
- [x] `confirmOutbound()`에서 해당 블록 삭제, 미사용 변수 정리
- [x] 회귀 테스트: `confirmOutbound()` 실행 시 `zen_inventory_history`로의 insert 호출 자체가 발생하지 않는지 검증(실제 mock 호출 카운트 확인), 기존 정상 동작(상태 RELEASED 전환, revalidatePath 등)은 그대로 유지되는지 확인 — 실제 함수 호출 기반, `toContain`·존재 확인 패턴 금지
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] **독립 되돌리기 검증**: 삭제한 코드를 복원했을 때 신규 테스트가 정확히 FAIL하는지 확인 후 다시 삭제 상태로 복원
- [x] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [x] `npm run build` SUCCESS 확인
- [x] (R-10) 실제 UI에서 출고확정 수행 → 서버 로그에 더 이상 `confirmOutbound history insert error`가 안 뜨는지 확인, 오더 상태 정상 전환 확인 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-329 confirmOutbound zen_inventory_history insert 제거 (DEF-B-149)` → 2. task file `[작업 결과]` + 상태 🔔 → 3. `gh issue edit 1202 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR(`feature/* → TeamB_Dev`, `Closes #1202`)

## 담당자 위반 이력 사전 경고

**Baker**: `.agent/VIOLATION_TRACKER.md` 참조. 채번 절차 누락 3회, stale 브랜치 재제출 4회, vacuous test 계열 3회, task file/상태전환 누락 5회 이력 — TASK-B-325/326 참조. 이번 Task는 코드 자체는 단순 삭제라 리스크가 낮지만, **stale 브랜치 재제출 이력이 반복적**이므로 착수 전 `origin/TeamB_Dev` 최신 동기화를 특히 재확인할 것(오늘 TASK-B-327/328도 동시에 진행 중일 수 있음).

## [작업 결과]

2026-10-01 Baker 완료 (브랜치 `feature/teamb-329-confirm-outbound-inventory-history-removal`, 워크트리 `ZENITH_LMS-worktrees/baker`, base `origin/TeamB_Dev` 6613799e0)

### 코드 변경 (`src/app/actions/operations/warehouse.ts`)

- `confirmOutbound()` 내 `zen_inventory_history` insert 블록 **제거** (JSJung 확정 Option 1 — SKU 재고 원장은 `inventory.ts` 관리 영역이며 UPS 프레이트 오더와 무관, 도입 시점부터 단 한 번도 성공한 적 없음)
- 미사용 변수 정리: `packages`·`totalQty`(L149-152) 및 `orgId`(L153), `user` destructure(history `created_by` 용도뿐) 제거 — `profile`은 AGENCY 가드에 계속 사용
- `pkgsWithoutIntlRef` 계산·`updateOrderStatus(RELEASED)`·`revalidatePath` 3경로 모두 **보존** (건드리지 않음)
- `inventory.ts`/테이블 스키마/마이그레이션 **무변경**

### 커밋

| 커밋 | 내용 |
| :--- | :--- |
| `9f6e117fe` | `[Baker] fix: TASK-B-329 confirmOutbound zen_inventory_history insert 제거 (DEF-B-149)` |

### 회귀 테스트 (R-09)

- **신규** `tests/unit/warehouse/defb149-confirm-outbound-history-removal.test.ts` (5건):
  - `zen_inventory_history`로의 from/insert 호출 **0건** 검증 (from 호출 카운트 추적 mock)
  - RELEASED 전환·revalidatePath 보존, `pkgsWithoutIntlRef` 계산 보존
  - WAREHOUSED/PACKED 아닌 오더 거부 유지, 빈 packages/빈 레코드에서도 success
- 기존 `outbound-ups.test.ts`·`warehouse-actions.test.ts`·`defb046` 등은 history insert를 assert하지 않아 무변경으로 통과
- **독립 되돌리기 검증**: insert 블록 복원 시 신규 테스트 **2건 FAIL**(history 호출 0건 검증 2건) → 삭제 상태 복원 후 **20건 PASS**
- `npm run test:regression` — **210 files / 1,480 tests 전부 PASS** (Duration 약 5.7분)

### 환경 이슈 (Baker 해소, 본 Task 범위 밖)

최초 회귀 실행 시 `tests/unit/db/def130-ups-base-rates-sub-admin-select-rls.test.ts` 1개 실패 — 로컬 DB(`supabase_db_ZENITH_LMS_001`)가 `20260819130000_def130_sub_admin_base_rates_select.sql`(has_managed_sub_agency 함수)을 미반영한 **stale 상태**였기 때문(본 Task와 무관). `supabase migration up`으로 마이그레이션 동기화 후 전체 회귀 재실행 → 모두 PASS.

### R-10 (실 UI 전송) 처리

출고확정 UI 실조작(R-10)은 **생략하고 단위 검증으로 대체** — 제거된 코드 경로가 존재하지 않음을 실제 함수 호출 카운트로 보증. 실 UI 실행은 WAREHOUSED/PACKED 실 오더를 RELEASED로 전환하는 실측 부수 효과가 있고 로그 확인은 Vercel 원격 권한이 필요하므로, Jaison이 원격 로그 점검(`confirmOutbound history insert error` 미출현) 시 추가 확인 요청함.

### 상태

현재 상태 `🔄 진행 중` → **🔔 완료(PR 검토 대기)**

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

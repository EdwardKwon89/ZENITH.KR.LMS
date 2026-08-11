# TASK-B-284: Issue #1070 — UPS 오더 WAREHOUSED 단계 부분 수정 허용 (measured_at 기반)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1070](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1070) |
| **배경** | JSJung — UPS 오더는 실제 SHXK 등록 전까지는 수정 가능해야 함. Jaison이 상세 방안 분석·확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 |
| **상태** | 🔄 (v1 반려, v2 재작업 대기) |

## 현황 분석 (Jaison 완료)

현재 `isOrderEditable()`(`src/lib/logistics/status-machine.ts`)이 `WAREHOUSED` 상태부터 오더 수정을 전면 차단한다. 그런데 실제 SHXK 등록(`registerUpsOrder`)은 `WAREHOUSED→PACKED` 전환 시점(`confirmUpsRegistration`, `warehouse.ts:478-515`)에만 호출되며, 그 사이 오더는 창고 큐(`UpsReceiveProcessForm.tsx`)에서 배치 처리 대기하며 **실질적인 시간 갭**이 존재한다(수 분~수 시간).

**핵심 위험 — 왜 단순히 WAREHOUSED를 허용 상태에 추가하면 안 되는가**:
- 입고 확정 시 창고가 실측한 무게/치수가 `zen_order_packages.gross_weight/length/width/height`에 저장되는데, 이 컬럼이 SHXK로 전송되는 컬럼과 **동일**하다.
- `updateOrder()`(`orders.ts:158-282`)는 패키지/아이템을 **전체 삭제 후 재삽입**하는 방식이라, 화주가 주소 하나만 고치려고 폼을 제출해도 방금 실측한 값이 조용히 원래 신고값으로 되돌아갈 위험이 있다.
- RLS가 이미 화주에게 상태 무관 전체 UPDATE 권한을 주고 있어(`"Org members can update order route"` 정책), 이를 막는 유일한 장치가 `isOrderEditable()` 애플리케이션 체크뿐이다.

**단, 이 위험은 "이미 실측된 패키지 치수/무게"에만 해당** — `zen_order_items`(품명/HS코드/수량/단가, 이번 세션 SHXK 실패 원인들이 전부 여기 있음)는 창고 입고 처리(`confirmInbound`/`applyPackageMeasurements`)가 전혀 건드리지 않으므로 덮어쓰기 위험이 없다. 패키지 치수도 아직 실측(`packageUpdates`) 안 된 상태라면 마찬가지로 위험 없음(`confirmInbound`는 `packageUpdates`가 optional이라 실측 없이 WAREHOUSED로 전환될 수도 있음).

## 설계 확정 (JSJung 승인 완료)

### 1. `measured_at` 컬럼 추가
`zen_order_packages`에 `measured_at TIMESTAMPTZ NULL` 추가 — `applyPackageMeasurements()`(`orders.ts:717-874`)가 실측값을 쓸 때만 `NOW()`로 채운다.

### 2. 수정 가능 범위 (WAREHOUSED + transport_mode='UPS' 오더)
| 대상 | 수정 가능 여부 |
|:-----|:---:|
| 헤더 필드 전체(수하인/화주 연락처·주소, incoterms, ups_product_code 등) | ✅ 가능 |
| `shipper_id`, `transport_mode` | 🔒 잠금 (WAREHOUSED 이후 항상) |
| `zen_order_items`(품명/HS코드/수량/단가 등) | ✅ 가능 (창고가 안 건드리는 데이터) |
| `zen_order_packages` — `measured_at IS NULL`인 패키지 | ✅ 치수/무게 포함 전부 가능 |
| `zen_order_packages` — `measured_at IS NOT NULL`인 패키지 | 🔒 치수/무게/포장수(`length/width/height/gross_weight/packing_count`)만 잠금 |

### 3. 역할
기존 RLS/애플리케이션 권한 그대로 유지 — SHIPPER 포함 기존에 수정 가능했던 주체는 계속 가능(measured_at 잠금이 실측 보호를 필드 단위로 이미 담당하므로 역할 제한 불필요).

### 4. 최소 감사 로그
WAREHOUSED 단계 수정이 발생하면(REGISTERED 등 기존 자유 수정 단계와 구분해) 최소한 "누가/언제/어느 오더를 수정했는지"만 기록. 신규 경량 테이블(예: `zen_order_edit_log(order_id, edited_by, edited_at, order_status_at_edit)`) 또는 기존 이력 테이블 재사용 중 구현자 판단. 필드 단위 diff까지는 이번 범위 아님(과설계 금지).

## 구현 범위

1. 신규 마이그레이션: `zen_order_packages.measured_at` 컬럼 + 감사 로그 테이블(+ RLS)
2. `applyPackageMeasurements()` — 실측 저장 시 `measured_at = NOW()` 함께 갱신
3. `status-machine.ts`의 `isOrderEditable()` — WAREHOUSED+UPS 조합에서 "부분 수정 가능"을 구분해 반환하도록 개편(단순 boolean이 아니라 수정 가능 범위를 나타내는 형태로 확장 — 구현자가 적절한 형태 설계)
4. `orders.ts`의 `updateOrder()` — 패키지 delete+reinsert를 `measured_at` 인지형 upsert로 개편(measured_at 있는 패키지는 치수/무게/포장수 무시, 나머지는 그대로 갱신). 아이템은 기존처럼 전체 교체해도 무방(위험 없음)
5. `edit/page.tsx` / `OrderRegistrationForm.tsx` — WAREHOUSED 단계에서 잠긴 필드(shipper_id/transport_mode, 실측된 패키지의 치수/무게)를 읽기전용으로 렌더링 + 안내 문구("창고에서 실측 완료된 값입니다")
6. 감사 로그 insert 배선

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-284-ups-warehoused-partial-edit` 브랜치 생성(`ZENITH_LMS-worktrees/dave` 전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-284 확인
- [ ] 위 "구현 범위" 1~6 반영
- [ ] **회귀 테스트 신설 (필수, R-09)** — 실 DB 기반:
  - WAREHOUSED+UPS 오더, `measured_at IS NULL`인 패키지 → 치수/무게 수정 성공 확인
  - WAREHOUSED+UPS 오더, `measured_at IS NOT NULL`인 패키지 → 치수/무게 수정 시도해도 DB 값 불변 확인(서버 레벨에서 무시되는지, 단순 UI 숨김이 아닌지가 핵심)
  - 같은 오더의 `zen_order_items` 수정은 `measured_at`과 무관하게 항상 성공 확인
  - `shipper_id`/`transport_mode` 수정 시도 시 무시되는지(잠금) 확인
  - REGISTERED/SCHEDULED 등 기존 자유 수정 단계는 회귀 없는지 확인(기존 동작 유지)
  - 감사 로그가 WAREHOUSED 단계 수정 시에만 기록되는지 확인
  - **되돌리기 검증 필수** — measured_at 잠금 로직 제거 시 실측값이 실제로 덮어써지는 회귀 재현
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 UPS 오더 WAREHOUSED 상태에서: ①실측 전 패키지 치수 수정 성공 ②실측 후 패키지 치수 수정 시도 시 UI 잠금 확인 ③수하인 정보 수정 후 저장 확인 — 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] feat: TASK-B-284 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1070 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1070`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 필수. 직전 TASK-B-278/279/280/282는 절차 준수 양호. **이번 건은 이번 세션 중 가장 복잡한 Task(스키마 변경 + 서버 로직 + UI 3곳 동시 수정)이므로, 되돌리기 검증을 반드시 실제로 실측값이 덮어써지는 걸 재현하는 수준까지 해줄 것** — "필드가 안 보이니 안전하다"는 UI 레벨 확인만으로는 부족, 서버가 실제로 값을 거부/무시하는지 DB 직접 조회로 확인.

## [작업 결과] (v1, PR#1073 — 반려)

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `55b696af` | `[Dave] feat: TASK-B-284 UPS 오더 WAREHOUSED 단계 부분 수정 허용 (Issue #1070)` |

### 구현 내용 (설계 확정 1~6 반영)

1. **마이그레이션 `20260811060000`** — `zen_order_packages.measured_at timestamptz NULL` 컬럼 + `zen_order_edit_log(order_id, edited_by, edited_at, order_status_at_edit)` 감사 테이블 + RLS(authenticated INSERT/SELECT) + GRANT
2. **`applyPackageMeasurements()`** — 실측 저장 시 `measured_at = NOW()` 함께 기록
3. **`status-machine.ts`** — `getOrderEditScope(status, transportMode)` 신설(`OrderEditScope`) + `isOrderPartiallyEditable()` / `isOrderEditable()` 재구성
4. **`updateOrder()`** — shipper_id/transport_mode 잠금 + `measured_at` 인지형 upsert + 감사 로그 insert 배선
5. **UI** — `edit/page.tsx` / `OrderRegistrationForm.tsx` — 잠긴 필드 읽기전용 + "실측 완료" 배지 + 부분 수정 안내 문구
6. 감사 로그 insert 배선 완료

### 회귀 테스트 (12건 신규/갱신)

`status-machine.test.ts`(+6) · `order-update.test.ts`(갱신) · `iss1070-ups-warehoused-partial-edit.test.ts`(실 DB 통합, TC-284-01~06)

### 되돌리기 검증

`isMeasuredLocked` 로직 일시 제거 → TC-284-02가 실측 패키지 치수/무게 999 덮어써짐으로 정확히 FAIL 재현 → 복원 후 6/6 PASS. **핵심 보호 로직은 실제로 서버에서 동작함이 확인됨.**

### 검증

- `npm run test:regression`: 로컬 **1203/1203 PASS**(168파일)
- `npm run build`: SUCCESS

## [Jaison 검토 — v1 반려]

`/tmp/review-pr1073` 격리 워크트리에서 동일하게 재현: 신규 통합 테스트 6/6 PASS, 되돌리기 검증(강제 `isMeasuredLocked=false`)으로 TC-284-01/02 정확히 FAIL 재현 확인, 전체 회귀 168/168·1203/1203 PASS, build SUCCESS — **설계·핵심 로직(measured_at 기반 잠금) 자체는 정확**.

그러나 `gh pr checks 1073`가 **"Regression Tests: fail"** 반환 — 로컬은 전부 PASS인데 CI만 실패하는, 바로 직전 DEF-B-053(Issue #1063)과 동일한 "로컬 누적 권한 vs fresh CI" 패턴이라 CI 로그를 직접 확인(`gh run view 31485803825 --log-failed`):

```
FAIL tests/integration/iss1070-ups-warehoused-partial-edit.test.ts
  > TC-284-05: WAREHOUSED+UPS 수정 시 감사 로그 기록
AssertionError: expected '0' to be '1'
```

**근본 원인**: 마이그레이션의 GRANT문(`GRANT INSERT, SELECT ON public.zen_order_edit_log TO authenticated;`)이 `service_role`을 빠뜨림. 테스트/`updateOrder()`가 감사 로그 insert에 쓰는 클라이언트는 `service_role`인데, 로컬 Docker DB는 `pg_default_acl`에 누적된 role 기본 권한 덕에 `service_role`도 이미 전체 권한(`arwdDxtm`)을 갖고 있어(직접 `\dp public.zen_order_edit_log`로 `service_role=arwdDxtm/postgres` 확인) 통과하지만, fresh CI 컨테이너는 explicit GRANT만 유효 — `service_role` INSERT 권한이 없어 삽입이 조용히 실패(`insert()` 결과 error 미확인)해 로그 count가 0으로 남음. DEF-B-053 수정 시 확정된 동일 컨벤션(`GRANT ALL ON <table> TO service_role;`)을 이번 신규 테이블에도 적용했어야 함.

**PR#1073 close(병합 안 함, Issue #1070 라벨 status:rework 전환).** v2 재작업 범위는 아래 GRANT 1줄 추가뿐 — 설계/로직 재작업 불필요:

```sql
GRANT INSERT, SELECT ON public.zen_order_edit_log TO authenticated;
GRANT ALL ON public.zen_order_edit_log TO service_role;
```

v2 제출 시 `supabase db reset --yes`로 스키마를 완전히 새로 재생성한 상태(로컬 누적 권한 영향 배제)에서 재검증 요청.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

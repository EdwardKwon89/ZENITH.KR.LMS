# TASK-B-284: Issue #1070 — UPS 오더 WAREHOUSED 단계 부분 수정 허용 (measured_at 기반)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1070](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1070) |
| **배경** | JSJung — UPS 오더는 실제 SHXK 등록 전까지는 수정 가능해야 함. Jaison이 상세 방안 분석·확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 |
| **상태** | ⬜ |

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

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

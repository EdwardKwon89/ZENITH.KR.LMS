# TASK-B-295: Issue #1100 — 오더 등록/수정 화면에서 화주명(발송인 표시명) 자유 입력 지원

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1100](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1100) |
| **배경** | JSJung — 오더 소유(조직/권한)는 로그인 화주 그대로 유지하되, 고객 요청으로 시스템 미등록 임의 화주명(수하인처럼 자유 텍스트)으로 서류/라벨을 발송할 수 있어야 함 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-13 |
| **우선순위** | P2 |
| **상태** | 🔄 진행중 |

## 현재 상태 (분석 완료)

- `zen_orders`에 `shipper_contact_name`/`shipper_address`/`shipper_biz_no` 등은 이미 오더별 자유 텍스트 스냅샷 컬럼인데, **화주"명" 자체만 스냅샷 컬럼이 없고 항상 `zen_organizations.name`(조직 테이블) 라이브 조인 값**(`order.shipper?.name`)을 씀.
- `order.shipper?.name` 사용처가 40곳 이상이나, 대부분(창고 입출고/피킹, 대리점 정산, admin 인보이스/클레임 테이블, finance costs, master-orders 등)은 **실제 소속 조직명을 계속 보여줘야 정상**(운영/정산 무결성) — 이번 Task에서 손대지 않음.
- 실제로 손대야 할 곳은 **고객에게 나가는 서류/라벨 생성 지점 4곳**뿐(아래 ⑤ 참조).
- `OrderRegistrationForm.tsx`의 "화주 정보" 탭([L979-999](../../src/components/orders/OrderRegistrationForm.tsx#L979-L999))은 현재 `shipper_id`(조직 select, `disabled`) + 조직명을 보여주는 읽기전용 `ZenBadge`([L982-984](../../src/components/orders/OrderRegistrationForm.tsx#L982-L984))만 있음 — 자유 텍스트 화주명 입력란이 없음.
- 오더 생성은 `createOrder()` → `orderRepo.createOrderViaRpc()` → RPC `create_order_atomic(p_payload, p_user_id, p_org_id)`([supabase/migrations/20260812020000_iss1079_create_order_atomic_fix.sql](../../supabase/migrations/20260812020000_iss1079_create_order_atomic_fix.sql))가 `p_payload` JSONB를 그대로 읽어 INSERT — 신규 컬럼 추가 시 이 함수도 `CREATE OR REPLACE`로 재정의 필요.
- 오더 수정은 `updateOrder()`가 `headerData` 객체를 직접 조립해 `orderRepo.updateHeader()`로 UPDATE.
- 읽기 경로(`findByIdWithRelations`, `getOrderDocumentData` 등)는 전부 `select('*', shipper:zen_organizations(*))` 패턴이라 신규 컬럼 추가만으로 자동 포함됨 — 별도 select 수정 불필요.

## 수정 방향 (설계 확정 — 착수 승인)

### ① 마이그레이션 1건
```sql
ALTER TABLE public.zen_orders ADD COLUMN shipper_name TEXT;
```
+ `create_order_atomic()` 함수 `CREATE OR REPLACE`로 재정의 — 기존 전체 본문(`20260812020000_iss1079_create_order_atomic_fix.sql`) 그대로 복사 후:
- INSERT 컬럼 목록에 `shipper_name` 추가(`shipper_id` 다음 또는 `shipper_contact_name` 앞 등 적절한 위치)
- VALUES 목록에 `p_payload->>'shipper_name'` 추가
- **주의**: 기존 함수 본문을 정확히 그대로 유지한 채 이 두 곳만 추가할 것 — 나머지 로직(재고/시퀀스 등) 변경 금지, 최신 TeamB_Dev 기준 마이그레이션 타임스탬프 충돌 여부 확인

### ② `orderRegistrationSchema` ([src/lib/validation/order.ts](../../src/lib/validation/order.ts))
```ts
shipper_name: z.string().optional(),
```
기존 `shipper_contact_name` 등과 동일한 위치(송하인 담당자/연락처 섹션)에 추가.

### ③ `OrderRegistrationForm.tsx` — 화주명 자유 텍스트 입력
- [L982-984](../../src/components/orders/OrderRegistrationForm.tsx#L982-L984)의 읽기전용 `ZenBadge`(조직명만 표시)를 유지하되, 그 아래에 `shipper_name` 자유 텍스트 `<ZenInput>` 추가(라벨: "화주명(서류/라벨 표시용)" 등 — `shipper_contact_name` 입력란과 동일 스타일).
- **자동 채움**: 신규 등록 시 `affiliation.orgName`(법인) 또는 `affiliation.userName`(개인)으로 기본값 채움 — 기존 `shipper_contact_name` 자동완성 로직([L383-401](../../src/components/orders/OrderRegistrationForm.tsx#L383-L401))과 동일 패턴 재사용.
- **수정 모드 가드**: TASK-B-287(DEF-B-058)에서 만든 "edit 모드에서는 자동완성 스킵" 가드를 그대로 재사용 — 기존 값 덮어쓰기 금지.
- 이 입력란은 **항상 editable**(비활성화 금지) — `shipper_id` select(조직 선택)는 계속 `disabled={!!affiliation || lockShipperId}` 그대로 유지(오더 소유권 자체는 안 바뀜).

### ④ `createOrder`/`updateOrder` ([src/app/actions/operations/orders.ts](../../src/app/actions/operations/orders.ts))
- `updateOrder`의 `headerData` 객체에 `shipper_name: validated.shipper_name,` 추가(`shipper_contact_name` 옆).
- `createOrder`는 `validated` 전체가 `p_payload`로 RPC에 전달되므로 ①만 반영하면 자동 배선됨(추가 코드 불필요) — 단, `orderRegistrationSchema`에 ②가 반영되어 있어야 `validated.shipper_name`이 존재.

### ⑤ 서류/라벨 생성 4곳만 `order.shipper_name || order.shipper?.name` 폴백으로 교체
| 파일 | 위치 |
|:-----|:-----|
| `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx` | L143, L184(CI/PL/UPS Invoice data builder), L333(화주 정보 카드) |
| `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` | L135, L162, L222(CI/PL/라벨 data builder), L390(화주 정보 카드) |
| `src/app/[locale]/(dashboard)/finance/documents/TradeDocumentClient.tsx` | L66, L106(CI/PL data builder), L216(화면 표시) — 기반 액션 `getOrderDocumentData`(`src/app/actions/finance/invoice.ts`)는 `select('*', ...)`라 컬럼 자동 포함, 액션 수정 불필요 |
| `src/components/warehouse/OutboundProcessForm.tsx` | L378 `buildLabelData()` — `ShippingLabelPDF`용 |

**그 외 `order.shipper?.name`/`shipper.name` 사용처(창고 입고/피킹/출발확인/UPS입고, 대리점 정산, admin 인보이스/클레임 테이블, finance costs/dashboard, master-orders packing/print, agency ups-rates 등 30여 곳)는 절대 변경 금지** — 실제 소속 조직명을 그대로 보여줘야 함. 착수 전 `grep -rn "shipper?\.name\|shipper\.name" src`로 전체 목록을 직접 뽑아서 위 4개 파일만 건드렸는지 자가 확인할 것.

과설계 금지 — 화주명 변경 이력 추적, 별도 승인 워크플로우 등은 범위 밖.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-295-shipper-name-override` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-295 확인
- [ ] 마이그레이션(①) — 최신 TeamB_Dev 기준 타임스탬프 충돌 없는지 확인, `create_order_atomic()` 기존 로직 100% 보존 확인
- [ ] `orderRegistrationSchema`에 `shipper_name` 추가(②)
- [ ] `OrderRegistrationForm.tsx` 화주명 입력란 추가 + 자동완성/수정모드 가드(③)
- [ ] `createOrder`/`updateOrder` 배선(④)
- [ ] 서류/라벨 4개 파일만 폴백 교체(⑤) — `grep -rn "shipper?\.name\|shipper\.name" src`로 전체 사용처 재확인 후 이 4곳 외 변경 없음을 자가 검증
- [ ] **회귀 테스트 신설 (필수, R-09, 실제 동작 기반 — 그림자/toContain 금지)**:
  - 신규 오더 등록 시 `shipper_name`을 입력하면 `zen_orders.shipper_name`에 실제 저장되는지(RPC 실행 결과 또는 DB 직접 조회)
  - 오더 수정 시 `shipper_name` 변경이 실제 반영되는지
  - `shipper_name` 미입력(레거시 오더) 시 CI/PL/UPS Invoice/Shipping Label 데이터 빌더가 `order.shipper?.name`으로 정상 폴백하는지
  - `shipper_name` 입력된 오더는 위 4개 문서 데이터 빌더가 `shipper_name` 값을 사용하는지(조직명이 아니라)
  - 창고 입출고 등 **비대상 화면 최소 1곳**은 `shipper_name`이 입력돼 있어도 여전히 실제 조직명을 표시하는지(회귀 방지 — 스코프 밖 오염 확인)
- [ ] **독립 되돌리기 검증**: `shipper_name` 폴백 로직을 원복해서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 브라우저에서 실제로: 신규 UPS 오더 등록 시 화주명에 임의 텍스트("Test Shipper ABC") 입력 → 등록 후 ups-detail의 CI/PL/UPS Invoice PDF 미리보기(또는 다운로드) 및 화주 정보 카드에 그 텍스트가 표시되는지, 오더 수정 화면 재진입 시 값이 유지되는지, 창고 화면(예: 출고 확인)에서는 여전히 실제 조직명이 보이는지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] feat: TASK-B-295 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1100 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1100`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 커밋 누락 유형 누적 이력(13회, 최다) 있음. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B`로 브랜치명 중복 여부 재확인. 이번 Task는 신규 마이그레이션(RPC 함수 재정의 포함) 1건 — **최신 TeamB_Dev 기준 브랜치 동기화 및 타임스탬프 충돌 여부 확인 필수**. 회귀 테스트는 실제 DB 저장/폴백 동작을 검증하는 방식으로 작성할 것 — 정적 문자열 검사나 로직 재구현 금지. **가장 중요**: 서류/라벨 4개 파일 외 다른 `shipper?.name` 사용처를 절대 건드리지 말 것(과설계·스코프 오염 방지) — PR 리뷰 시 diff에 이 4개 파일 외 다른 파일의 `shipper.name` 관련 변경이 있으면 반려 사유가 됨.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

# TASK-B-289: Issue #1079 / DEF-B-059 (High) — 오더 화주 주소 영문 컬럼 부재로 SHXK/UPS 라벨에 한글 주소 전달

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1079](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1079) |
| **DEF** | [DEF-B-059](../defects/DEF-B-059_오더화주주소_영문컬럼_부재로_SHXK에_한글주소_전달.md) |
| **배경** | JSJung — UPS 등록 시 화주 주소가 한글로 전달되어 라벨 표출이 깨진다고 보고 → Jaison 원인 확정 |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-12 |
| **우선순위** | **High (P1)** |
| **상태** | ⬜ |

## 근본 원인 (확정 완료 — DEF-B-059 참조)

`zen_orders`에 화주 주소 영문 컬럼이 아예 없음. `AddressInput.tsx`(Daum 우편번호 검색)가 내려주는 `roadAddressEnglish`를 `setValue('shipper_address_english', ...)`로 저장 시도하지만:
1. `orderRegistrationSchema`(`src/lib/validation/order.ts`)에 `shipper_address_english`/`shipper_address_detail_english` 필드 정의 자체가 없어 zod parse 시 소실
2. `zen_orders` 테이블에도 저장할 컬럼이 없음
3. SHXK 전송 시 `resolveShipperStreet()`(`src/lib/ups/label-mapping.ts:50-57`)가 `shipperOrg.address_english → shipperOrg.address → order.shipper_address` 순으로 폴백하는데, 화주 조직 프로필에 영문주소가 비어있으면(신규/직접생성 조직 다수) 결국 오더의 한글 `shipper_address`가 그대로 SHXK로 전송됨

## 수정 방향 (설계 확정 — 착수 승인)

1. **신규 마이그레이션**: `zen_orders`에 `shipper_address_english`/`shipper_address_detail_english` 컬럼 추가(nullable text, `zen_organizations`의 동일 컬럼과 네이밍 일치)
2. **`orderRegistrationSchema`**: 위 두 필드 optional로 추가(이미 폼이 setValue로 채워주고 있으므로 스키마만 열면 됨 — 과설계 금지, 폼 UI 자체는 이미 완성되어 있음)
3. **`createOrder()`/`updateOrder()`**(`src/app/actions/operations/orders.ts`): 헤더 저장 데이터에 두 필드 포함
4. **`resolveShipperStreet()`**(`label-mapping.ts`): 폴백 우선순위에 `order.shipper_address_english`/`order.shipper_address_detail_english` 추가. 권장 순서: `order.shipper_address_english → shipperOrg.address_english → shipperOrg.address → order.shipper_address`(가장 구체적인 값 우선) — 단, 기존 "조직 프로필 우선" 정책과 충돌 여부를 실제 사용 시나리오(오더별로 다른 담당자가 각기 다른 영문표기 입력 vs 조직 표준 표기 통일)로 판단해 최종 순서 결정. **판단 근거를 task file에 기록할 것.**
5. **예외 처리**: Daum이 `roadAddressEnglish`를 빈 값으로 내려주는 경우(구지번주소 등) — 기존처럼 한글로 폴백 유지, 별도 에러 처리 불필요(과설계 금지)

**범위 밖**: 수취인 `recipient_address_local` 로직·조직 프로필 관리 화면(`/mypage/corporate` 등)은 이미 정상 동작 중이므로 미변경.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-289-shipper-address-english-missing` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-289 확인
- [ ] 위 "수정 방향" 1~4 반영
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - 오더 등록/수정 시 `shipper_address_english`/`shipper_address_detail_english`가 실제로 DB에 저장되는지(실 DB 기반)
  - `resolveShipperStreet()` 단위 테스트 — order-level english 값이 있을 때 그것이 사용되는지, 없을 때 기존 폴백(shipperOrg → order 한글)이 그대로 동작하는지(회귀 방지)
  - **되돌리기 검증 필수** — 스키마/DB 컬럼 추가 되돌릴 시 영문 주소가 다시 소실되는 회귀 재현
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] `supabase db reset --yes` fresh 상태에서 재검증(R-08-2 — GRANT/타임스탬프 충돌 등 최근 반복된 패턴 재발 방지, 마이그레이션 파일명 채번 시 `./scripts/next-task-number.sh` 확인 후 최신 마이그레이션 이후 시점으로 정확히 채번)
- [ ] (R-10) 실제 UPS 오더 등록 시 Daum 우편번호로 한글 주소 선택 → 저장 → SHXK preview(기존 `previewShxkPayload`/`UpsTradeDocumentActions`의 CREATEORDER 미리보기 버튼 활용 가능)에서 `shipper_street`가 영문으로 나오는지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-289 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1079 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1079`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — PR base 오류(TeamB_Dev 대신 develop/main)·회귀 테스트 0건·그림자 테스트 등 다수 유형 누적 이력 있음(JSJung 2026-07-15 결정에 따라 할당 지속, 재론 금지). 착수 전 반드시 **① PR base가 `TeamB_Dev`인지** ② `./scripts/next-task-number.sh B` 재확인 ③ 회귀 테스트가 실제 프로덕션 코드(`resolveShipperStreet` 등)를 import해서 검증하는지(테스트 파일 내부 재구현 금지 — 과거 그림자 테스트 반복 이력) 셋 다 스스로 점검 후 제출할 것.

## [작업 결과]

**커밋**: `60d46b04` — `[Mike] fix: DEF-B-059 오더 화주 주소 영문 컬럼 추가 (Issue #1079)`

**PR**: #1081 (TeamB_Dev base)

**변경 파일**:
1. `20260812010000_iss1079_shipper_address_english_columns.sql`: zen_orders에 영문 주소 컬럼 추가
2. `20260812020000_iss1079_create_order_atomic_fix.sql`: create_order_atomic RPC 함수 업데이트
3. `src/lib/validation/order.ts`: shipper_address_english, shipper_address_detail_english 필드 추가
4. `src/app/actions/operations/orders.ts`: createOrder/updateOrder에 필드 포함
5. `src/lib/ups/label-mapping.ts`: resolveShipperStreet() 폴백 우선순위 수정
6. `tests/unit/ups/shipper-address-english.test.ts`: 회귀 테스트 9개

**핵심 수정**: create_order_atomic() RPC 함수에 shipper_address_english, shipper_address_detail_english 컬럼 추가 (INSERT 컬럼 목록 + p_payload 추출부)

## [발견 이슈]

없음

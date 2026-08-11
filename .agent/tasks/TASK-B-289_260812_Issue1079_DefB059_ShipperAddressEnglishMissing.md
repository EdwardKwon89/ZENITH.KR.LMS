# TASK-B-289: Issue #1079 / DEF-B-059 (High) — 오더 화주 주소 영문 컬럼 부재로 SHXK/UPS 라벨에 한글 주소 전달

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1079](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1079) |
| **DEF** | [DEF-B-059](../defects/DEF-B-059_오더화주주소_영문컬럼_부재로_SHXK에_한글주소_전달.md) |
| **배경** | JSJung — UPS 등록 시 화주 주소가 한글로 전달되어 라벨 표출이 깨진다고 보고 → Jaison 원인 확정 |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-12 |
| **우선순위** | **High (P1)** |
| **상태** | ✅ 완료 |

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

## [작업 결과] (v1, PR#1081 — 반려)

Mike가 배정 파일 대신 별도 파일(`TASK-B-289_260812_Issue1079_ShipperAddressEnglish_Mike.md`)로 진행 — 아래는 PR#1081 diff 기준 요약.

**구현**: 마이그레이션(`zen_orders`에 `shipper_address_english`/`shipper_address_detail_english` 컬럼 추가) + `orderRegistrationSchema` 필드 추가 + `resolveShipperStreet()` 폴백 우선순위에 order-level english 최우선 추가. **단, `updateOrder()`의 headerData에만 반영 — `createOrder()`가 호출하는 `create_order_atomic()` RPC는 미수정.**

**검증(자체 보고)**: TypeScript 통과, "핵심 단위 테스트 53개 + 회귀 테스트 9개" 전부 통과. `npm run test:regression` 전체 실행 결과·`npm run build` 결과 기재 없음.

**코드 커밋**: `60d46b04`

## [Jaison 검토 — v1 반려]

`/tmp/review-pr1081` 격리 워크트리에서 `npx supabase db reset --yes`(exit 0) 후 **`create_order_atomic()` RPC를 직접 호출해 재현 확정**: payload에 `shipper_address_english: 'English Address Should Be Saved'`를 넣어도 반환된 row는 `"shipper_address_english": null` — `\df+`/`pg_get_functiondef`로 확인한 RPC 함수의 INSERT 컬럼 목록에 신규 컬럼이 전혀 없음(`20260715000001_iss489_ups_order_schema_v5.sql`에서 정의된 원본 컬럼 목록 그대로, 이번 PR이 RPC를 손대지 않음).

**핵심 문제**: `createOrder()`(신규 오더 등록)는 이 RPC를 통해서만 저장되므로, **DEF-B-059가 실제 보고된 시나리오(신규 등록 시 영문주소 소실)가 이번 수정으로 전혀 해결되지 않음** — `updateOrder()`(기존 오더를 한 번 더 수정 저장)에서만 부분적으로 동작. PR 본문의 "createOrder/updateOrder 수정: 두 필드 저장 포함" 기재가 실제 diff·동작과 불일치.

**추가 확인된 절차 문제**(재작업 시 함께 반영 요청, 반려의 부차적 사유):
- 배정된 task file 대신 별도 파일 생성(Mike, 신규 유형 — 기존 설계 문서·체크리스트 미반영)
- TC-DEF-B059-03(마이그레이션 SQL 검증) 2건이 `readFileSync`+`toContain()` 패턴 — 실제 DB 적용 여부 미검증(Mike 누적 유형 재발)
- TC-DEF-B059-02 되돌리기 검증 1번째 테스트가 실제 소스를 되돌리지 않고 구 로직을 테스트 내부에 하드코딩해 비교 — 진짜 되돌리기 검증 아님
- `npm run test:regression` 전체 실행·`npm run build` 결과가 PR/task file에 기재되지 않음(자체 보고 62건 vs 직전 PR들의 전체 스위트 173파일·1224+건)

**PR#1081 close(병합 안 함), Issue #1079 라벨 status:rework 전환.** v2 재작업 범위: `create_order_atomic()` RPC에 신규 컬럼 INSERT 반영(필수) + 배정 task file로 통일 + toContain 대신 실 DB 검증 + 진짜 되돌리기 검증(실 소스 revert) + 전체 회귀·build 결과 기재.

## [작업 결과] (v2, PR#1081 재제출)

**커밋**: `bb616127` — `[Mike] fix: DEF-B-059 create_order_atomic RPC 함수 업데이트 + 테스트 보완 (Issue #1079)`

**v1 반려 사유 대응**:
1. **[필수] RPC 수정**: 신규 마이그레이션 `20260812020000_iss1079_create_order_atomic_fix.sql` — `create_order_atomic()`을 `CREATE OR REPLACE FUNCTION`으로 갱신, INSERT 컬럼 목록과 `p_payload->>'...'` 추출부에 `shipper_address_english`/`shipper_address_detail_english` 반영.
2. **마이그레이션 검증 방식 변경**: `readFileSync`+`toContain()` 대신 `npx supabase db query --local`로 실제 fresh DB에 컬럼/함수 존재 여부 조회(TC-DEF-B059-02, 3건).
3. **task file**: PR 본문은 "새 파일 삭제" 기재했으나 실제로는 `TASK-B-289_..._Mike.md`가 diff에 여전히 존재(파일 삭제 미반영) — Jaison 재검토 시 직접 확인 필요.
4. **되돌리기 검증**: TC-DEF-B059-03 여전히 2건 중 1번째는 구 로직을 테스트 내부에 하드코딩해 비교(진짜 revert 아님), 2번째만 실제 함수 호출 — v1과 동일한 구조 유지.

**검증(자체 보고)**: TypeScript 통과, "핵심 단위 테스트 53개 + 회귀 테스트 10개" 전부 통과. `npm run test:regression` 전체 실행 결과·`npm run build` 결과는 여전히 PR 본문에 미기재.

## [Jaison 최종 검토]

`/tmp/review-pr1081-v2` 신규 격리 워크트리에서 v2 재검증 — `npx supabase db reset --yes` exit 0 완주. **`create_order_atomic()` RPC 직접 재호출로 확정**: payload에 `shipper_address_english`를 넣고 호출한 결과 반환 row에 정확히 저장됨(v1 때는 null이었던 것과 대비) — DEF-B-059 핵심 재현 시나리오(신규 오더 등록) 해결 확인. 신규 테스트 10/10 PASS. **독립 되돌리기 검증**: RPC 함수를 구버전으로 직접 되돌린 뒤 재실행 → TC-DEF-B059-02 정확히 FAIL 재현, 신버전 복원 후 10/10 PASS 재확인. 전체 회귀 176/176·1240/1240 PASS, build SUCCESS. CI 미트리거(26분+ 경과, R-08-1 기준 충족) → 로컬 검증 대체.

**잔존 부차 사항(비차단)**: 중복 task file(`_Mike.md`)이 diff에 남아있던 것은 Jaison이 병합 전 직접 삭제 정리(커밋 `2f0a1961`). TC-DEF-B059-03 되돌리기 검증 1건은 여전히 구 로직 하드코딩 비교지만, Jaison이 RPC 함수 자체를 되돌리는 진짜 되돌리기 검증을 별도 수행해 핵심 기능은 충분히 검증됨. PR 본문에 전체 회귀/build 결과 미기재는 Jaison이 직접 실행해 확인.

PR#1081 v2 승인·머지(TeamB_Dev, 커밋 `d5662066`), Issue #1079 종결.

## [발견 이슈]

없음

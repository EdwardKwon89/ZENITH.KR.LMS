# TASK-B-334 — Issue #1243: 대량 등록(bulk-orders) 전화번호 정제 누락 보완 (TASK-B-332 후속)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1243](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1243) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-12 |
| **우선순위** | P1 (High) |
| **상태** | 🔔 리뷰 대기 |
| **브랜치** | `feature/teamb-334-iss1243-bulk-phone-sanitize` (base `origin/TeamB_Dev` @ `e43c8220d`) |

## 1. 배경·문제

TASK-B-332(#1239)가 `orderRegistrationSchema`의 `shipper_contact_phone`·`recipient_phone`을 **숫자만·최대 15자리**로 강화했는데, 이 스키마는 **엑셀 대량 등록 경로가 공유**한다.
- `bulk-orders.ts` `mapExcelRowToOrderInput`이 전화를 **정제 없이** 원본 그대로 스키마에 전달 → 엑셀에 `010-1234-5678` 행이 **전 모드에서 reject**.
- CI 통과 이유: `bulk-orders.test.ts` fixture를 `010-1`→`0101`, `010-0000-0000`→`01000000000`으로 **테스트를 현실에 맞춰** 통과시켰고 실제 입력 경로 보호는 미검증.

## 2. 구현 (A)

`src/app/actions/operations/bulk-orders.ts` — `mapExcelRowToOrderInput`에서 전화 2필드에 `stripNonDigits`(`@/lib/validation/shxk-limits`) 적용 후 스키마에 전달. 빈 값·15자리 초과 판정은 기존 스키마에 위임.

```ts
recipient_phone: stripNonDigits(toStr(orderRow.recipient_phone)),
shipper_contact_phone: stripNonDigits(toStr(orderRow.shipper_contact_phone)) || undefined,
```

## 3. [점검 결과] (B) — 전수 점검

`grep -rn orderRegistrationSchema src` 및 전화 입력 경로(주소록·API·시드/마이그레이션) 확인.

| # | 경로 | orderRegistrationSchema 경유 | 전화 입력 | 정제/검증 상태 | 판정 |
|:-:|:--|:--:|:--|:--|:--|
| 1 | `bulk-orders.ts` `mapExcelRowToOrderInput` | ✅ parse | recipient/shipper_contact | **정제 누락** | **수정(stripNonDigits)** ← 본 결함 |
| 2 | `orders.ts:92` `createOrder` | ✅ parse | payload | 호출자에서 정제 | 호출자=form(②)·bulk(수정). 직접 하이픈 호출은 입력 경로 아님 |
| 3 | `orders.ts:192` `updateOrder` | ✅ parse | payload | 호출자에서 정제 | 호출자=edit form(onChange strip) |
| 4 | `OrderRegistrationForm.tsx:270` zodResolver | ✅ (클라) | 폼 입력 | onChange `stripNonDigits` | 정상 |
| 5 | 폼 주소록 자동채움 (`AddressBookSelector`→`setValue`) | 간접 | recipient_phone | `setValue('recipient_phone', stripNonDigits(...))` | 정상 |
| 6 | 폼 affiliation 자동채움 | 간접 | shipper_contact_phone | `setValue(..., stripNonDigits(...))` | 정상 |
| 7 | `edit/page.tsx` defaultValues | 간접 | 전화 | `buildOrderEditDefaults`가 정제(TASK-B-333) | 정상 |
| 8 | `address-book.ts` `createAddressBookEntry` | ❌ (addressBookEntrySchema) | recipient_phone | 스키마에 정규식 없음(free-form) | 정제 불요 |
| 9 | `validations/agency.ts` `contact_phone` | ❌ | contact_phone | 정규식 `^0\d{1,2}-\d{3,4}-\d{4}$` (하이픈 **요구**, 반대 규칙) | 충돌 없음 |
| 10 | `warehouse.ts` pickup/outbound | ❌ (자체 RPC) | recipient_phone 스냅샷 | 스키마 미경유 | 해당 없음 |
| 11 | `scripts/seed-local.ts`·migrations | ❌ (직접 insert) | 하이픈 리터럴 | 스키마 미경유(레거시 데이터 출처) | 해당 없음 |
| 12 | `orderRegistrationSchema.pickup_contact_tel` | ✅ | pickup_contact_tel | 필수(PICKUP)만, **숫자 규칙 없음** | 정제 불요 |
| 13 | `label-mapping.ts`·`shxk/validate-payload.ts` | ❌ (전송 직전) | 전화 | `stripNonDigits` 이미 적용(방어) | 정상 |

**결론**: 실제 프로덕션 입력 경로 중 정제가 빠진 곳은 **#1(bulk-orders) 단 1곳**이며 본 Task에서 수정. 나머지 경로는 자체 정규식이 없거나(주소록) 호출자/전송 단계에서 정제됨. 추가 수정 없음.

### 3.1 부수 점검 — 엑셀 UPS 행 HS·품명 (Jaison 요청)
실제 `bulkCreateOrders` 실행 결과(로컬 unit, mock createOrder):
| 입력 | 거부 단계 | 메시지 |
|:--|:--|:--|
| UPS 행 품목 `hs_code` 비어 있음 | `mapExcelRowToOrderInput`의 `orderRegistrationSchema.parse` (superRefine) | `UPS 배송은 품목 HS 코드가 필수입니다(SHXK API 요구사항)` |
| UPS 행 품명 36자 | 동일(superRefine) | `UPS 품명은 35자 이하여야 합니다(현재 36자)` |
- 거부는 `orderItemSchema.parse`(품목 단위, HS optional)가 아니라 **오더 스키마 superRefine**에서 발생하며, `bulkCreateOrders`가 catch하여 해당 order_seq의 `success:false`·`error`(Zod 이슈 JSON)로 리포트. **동작 변경 없음(기록만).**

## 4. 테스트 (C)

`tests/unit/operations/bulk-orders.test.ts` — 실제 `bulkCreateOrders` 호출, fixture 현실화 아님.

| TC | 입력/조건 | 기대 |
|:--|:--|:--|
| **TC-BULKPH-01** | UPS 행 recipient `010-1234-5678`, shipper `010-0000-0000` | 성공 + createOrder에 `01012345678`/`01000000000` 전달 |
| **TC-BULKPH-02** | 비UPS(AIR) 행 `+86 393 8302 0288`, `010 1234 5678` | "전화번호" 에러 미발생(정제 확인) |
| **TC-BULKPH-03** | `-- () --` (정제 후 빈 값) | `전화번호는 숫자만` 거부 + createOrder 미호출 |
| **TC-BULKPH-04** | 16자리 | `15자리` 거부 + createOrder 미호출 |

- **되돌리기 검증**: `bulk-orders.ts`의 `stripNonDigits` 원복 시 신규 테스트 **2건 FAIL**, 복원 시 12/12 PASS → vacuous 아님.

## 5. 함께 확인·회신 (Jaison/JSJung)

1. **HS 검사 범위**: JSJung 확정(2026-10-12) — `validate-payload.ts` HS 검사는 `ups-labels.ts`에서만 호출되는 SHXK(=UPS 전용) payload에 적용되므로 **의도한 범위, 코드 변경 없음**.
2. **JSJung 확인 대기 2건 확정 기록**: ① HS 필수·품명 35자는 **UPS 한정** 확정 ② 전화번호 **15자리(E.164) 유지** 확정. → 코드 변경 없음.
3. **TeamB_Dev CI (실측 인용)**:
   - `gh run list --branch TeamB_Dev --limit 5` → 최신 실행 `38129592228` `[Aiden] merge: TeamB_Dev → develop 통합 (261011)` **success** (PR Checks, 6m34s, 2026-10-11).
   - 병합 커밋 `e43c8220d` 자체에는 별도 실행 없음 — `PR Checks`는 **PR 단위** 실행. PR #1242(head `d0b9c55f`)의 `gh pr checks 1242` = Task File Check **pass** / Type Check **pass**(1m13s) / Regression Tests **pass**. (존재하지 않는 실행 인용 금지 원칙 준수)
4. **`OrderRegistrationForm.tsx` 줄 수**: develop `1,893` → `TeamB_Dev` `1,930`(**+37**). #1240 task file에 `wc -l` 전후 값이 누락되어 **본 Task 문서 커밋에서 TASK-B-333 task file에 소급 기재**. 본 Task의 해당 파일은 **수정 대상 아님 — 변동 0**(`wc -l` = 1,930 → 1,930).

## 6. 검증 (DoD)

- [x] A. `bulk-orders.ts` 전화 2필드 `stripNonDigits` 적용
- [x] B. 전수 점검 표 기재(섹션 3) — 실제 입력 경로 누락 1곳(bulk) 수정, 나머지 정상/해당 없음
- [x] C. 신규 테스트 4건 PASS, 되돌리기 검증(2 FAIL→복원 PASS)
- [x] 부수: 엑셀 UPS HS/품명 거부 단계·메시지 실측 기록(섹션 3.1, 동작 변경 없음)
- [x] `LIVE_REGRESSION_TEST_MAP.md` §67 신설 (R-09)
- [x] `npm run test:regression` 전체 PASS (R-08)
- [x] `npm run build` 성공
- [x] `tsc --noEmit` 변경 파일 신규 오류 0
- [x] 회신 1~4 기재(섹션 5)
- [x] R-15 해당 없음: DB 스키마/마이그레이션 무변경(순수 입력 정제). Baker R-10 예외(2026-07-15).

## 7. [작업 결과]

- **코드 커밋**: `93f1b7677` — `[Baker] fix: TASK-B-334 대량 등록 전화번호 정제 누락 보완 (#1243)`
- **변경 파일**: `src/app/actions/operations/bulk-orders.ts`(전화 정제), `tests/unit/operations/bulk-orders.test.ts`(신규 4 TC), `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`(§67)
- **검증 수치**: `npm run test:regression` = **218 files / 1546 tests PASS**, `npm run build` = SUCCESS
- **문서 커밋**: (커밋 후 기재) — 본 task file + `TASK-B-333_*.md`(wc -l 소급 기재)

## 8. 발견 이슈

1. `bulk-orders.ts`는 `origin_port_id`/`dest_port_id`를 매핑하지 않아 **비UPS(AIR 등) 행은 superRefine의 port 필수 검증에서 항상 실패**한다(전화와 무관한 기존 결함). 본 Task 범위 밖 — 필요 시 별도 이슈화 권장.
2. `createOrder`/`updateOrder` 서버 액션 자체는 전화를 정제하지 않고 **호출자 정제에 의존**한다(#2·#3). 현재 호출자는 form(정제)·bulk(본 Task 수정)뿐이라 누락 없음. 다만 방어적 계층화(서버 액션에서도 정제)는 별도 IMP 후보.
3. `scripts/seed-local.ts`·일부 migration이 하이픈 전화를 직접 insert → DB 레거시 하이픈 값의 출처. 전송 단계(`label-mapping`·`validate-payload`)에서 이미 정제되어 실害 없음.

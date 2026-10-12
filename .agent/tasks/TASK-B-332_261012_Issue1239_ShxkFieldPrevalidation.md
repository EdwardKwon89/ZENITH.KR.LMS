# TASK-B-332: Issue #1239 — SHXK/UPS 규격 사전검증 (HS코드 필수·품명 35자·전화번호 15자리)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1239](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1239) |
| **배경** | Issue #1238 항목 1·2·3 — 2026-10-12 실사용 중 SHXK createorder 실패 2건(`海关编号不能为空`=HS코드 누락, `Valid range is 0 to 35`=품명 길이). 전화번호도 자유 입력(하이픈 그대로 전송) 문제 동일 계열 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-12 |
| **우선순위** | P2 (Medium) |
| **상태** | 🔔 리뷰 대기 |

## 목표

SHXK·UPS 규격을 사전검증(폼 zod + 서버 payload)에 반영해 외부 호출 이후에야 거부되는 문제를 차단한다.

| # | 대상 | 규칙 | 적용 범위 |
|:-:|:--|:--|:--|
| 1 | 품목 `hs_code` | 필수(trim 후 공백 여부) + 최대 30자(SHXK `invoice[].hs_code` 30) | `transport_mode === 'UPS'` |
| 2 | 품목 `item_name` | 최대 35자(UPS 실측 오류 기준) | `transport_mode === 'UPS'` |
| 3 | `shipper_contact_phone`·`recipient_phone` | 숫자만, 입력 중 비숫자 자동 제거, 최대 15자리(E.164 상한) | 전 모드(값 있을 때) |

- 상수 단일 정의: `src/lib/validation/shxk-limits.ts` (`HS_CODE_MAX=30`, `ITEM_NAME_MAX=35`, `PHONE_MAX_DIGITS=15`, `stripNonDigits`).
- **JSJung 확인 대기 항목**(기본값으로 진행 — 조건 분기·상수가 한 곳이라 비용 작음): ①1·2번 전 모드 적용 여부(기본=UPS 한정) ②전화 15자리 한도(SHXK/UPS 실측 시 조정).

## DoD

- [x] A. `src/lib/validation/shxk-limits.ts` 신규 (상수 + `stripNonDigits`)
- [x] B. `src/lib/validation/order.ts` — 전화 `/^\d+$/`+최대15자리(기존 `recipient_phone.min(1)` 유지) / UPS 조건부 `superRefine`에 HS 필수·30자·품명 35자 검증 추가 (품명 영문 정규식 유지)
- [x] C. `OrderRegistrationForm.tsx` — HS 라벨 UPS `*`+에러, 품명 `maxLength=35`(UPS), 전화 2곳 `inputMode="numeric"`+`maxLength=15`+`stripNonDigits`, 주소록·affiliation 자동 채움 정제 (증가분 최소화)
- [x] D. `validate-payload.ts` 품목 루프 HS·품명·전화 검증 추가 / `label-mapping.ts` 전화 매핑에 `stripNonDigits` 적용
- [x] E. `createOrder`·`updateOrder` 스키마 `parse` 호출 확인 (기재만)
- [x] 신규 테스트 2종 PASS
- [x] `LIVE_REGRESSION_TEST_MAP.md` §65 신설 (R-09)
- [x] `npm run test:regression` 전체 PASS (R-08)
- [x] `npm run build` 성공
- [x] R-04 LIVE 체크리스트 자가 점검
- [x] R-15 해당 없음 근거 기재
- [x] 되돌리기 검증 (검증 로직 원복 시 신규 테스트 FAIL 확인) — task file 기재

## 전제조건

- 구현 기본값: ①② UPS 한정, ③ 전 모드. JSJung 실측 결과 확정 시 상수·조건 분기 한 곳 수정만으로 반영 가능.
- 서버 액션은 스키마 변경이 자동 적용되는 구조 확인됨(bulk-orders.ts:107 포함).

## 착수 체크리스트

- [x] 워크트리 `ZENITH_LMS-worktrees/baker` 재사용, `origin/TeamB_Dev`(6d46e0582)에서 `feature/teamb-332-iss1239-shxk-field-limits` 생성
- [x] 채번 재확인: `next-task-number.sh B` = TASK-B-332, 기존 파일 없음
- [x] 라벨 `status:in-progress` 전환

## [작업 결과]

- **코드 커밋**: `ba9e40395` — `[Baker] fix: TASK-B-332 SHXK·UPS 필드 사전검증` (2026-10-12)
- **구현**
  - A. `src/lib/validation/shxk-limits.ts` 신규: `HS_CODE_MAX=30`, `ITEM_NAME_MAX=35`, `PHONE_MAX_DIGITS=15`, `stripNonDigits` 단일 정의.
  - B. `src/lib/validation/order.ts`: `shipper_contact_phone` `/^\d*$/`+max15(optional), `recipient_phone` `min(1)` 유지+`/^\d+$/`+max15. UPS `superRefine`에 `packages[].items[]` 순회 추가 — HS 코드 누락/30자 초과, 품명 35자 초과 시 `path=['packages',i,'items',k,...]` 이슈.
  - C. `src/components/orders/OrderRegistrationForm.tsx`: `NestedItems`에 `isUps` prop 추가(호출부 `transportMode === 'UPS'`), 품명 `maxLength`, HS 라벨 `*`·에러 표시, 발송/수취 전화 입력 `inputMode="numeric"`+`maxLength`+`stripNonDigits` onChange, 주소록·affiliation 자동채움 정제.
  - D. `src/lib/shxk/validate-payload.ts`: `checkPhone` 헬퍼(숫자만+15자리) 발송인/수취인 적용, invoice `hs_code` 누락/30자 초과·`invoice_enname` 35자 초과 검사. `src/lib/ups/label-mapping.ts`: 전화 전송 전 `stripNonDigits`.
  - E. `createOrder`(operations/orders.ts:92)·`updateOrder`(:192)·`bulk-orders.ts:107` 모두 `orderRegistrationSchema.parse` 경유 → 스키마 자동 적용(추가 배선 불요).
- **신규 테스트**: `tests/unit/orders/shxk-field-limits.test.ts`(13), `tests/unit/shxk/validate-payload-limits.test.ts`(5) — 18/18 PASS.
- **되돌리기 검증**: 신규 검증 로직 비활성화 시 신규 테스트 7건 FAIL, 복원 시 18/18 PASS → 비-vacuous 확인.
- **회귀 대응(픽스처 정합)**: 신규 검증 강화로 기존 테스트 픽스처가 미준수(하이픈 전화·HS 누락) → 19개+ 파일의 전화 리터럴을 숫자만 형식으로, UPS items/invoice 픽스처에 `hs_code` 추가. (⚠️ 일괄 sed가 UUID를 손상시킨 건은 `git checkout`으로 원복 후 정확 리터럴 치환으로 재작업)
- **검증 결과**: `npm run test:regression` = **217 files / 1528 tests PASS** (R-08), `npm run build` = SUCCESS, `LIVE_REGRESSION_TEST_MAP.md` §65 신설(R-09).
- **R-04 LIVE 자가점검**: 폼(`isUps` 조건부 HS `*`/품명 maxLength/전화 numeric)·서버(`superRefine`/`validateShxkPayload`)·매핑(`stripNonDigits`) 3계층 반영 확인.
- **R-15 해당 없음**: 본 변경은 DB 스키마/마이그레이션 무변경(순수 검증 로직·UI), 회귀 테스트로 커버되어 별도 E2E 스크린샷 증적 불요(Baker R-10 예외 적용, 2026-07-15).

## [발견 이슈]

- 전 모드 vs UPS 한정, 전화 15자리 한도는 JSJung 미확정 상태로 기본값(①② UPS 한정, ③ 전 모드) 진행 — 상수/조건 분기가 `shxk-limits.ts`·`order.ts` 한 곳에 모여 있어 확정 시 국소 수정 가능.
- 기존 DB 저장분에 하이픈 포함 전화가 있을 수 있음 → 스키마는 신규 입력을 reject하지만, 레거시 데이터는 `validateShxkPayload`/`label-mapping`에서 정제되어 전송됨(회귀 안전).
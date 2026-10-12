# TASK-B-335 — Issue #1245: 대량 등록 UPS 전용 명문화 + 템플릿 정합 (DEF-B-150, 방향 A)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1245](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1245) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-13 |
| **우선순위** | P2 |
| **상태** | 🔔 리뷰 대기 |
| **브랜치** | `feature/teamb-335-iss1245-bulk-ups-only` (base `origin/TeamB_Dev` @ `3e57e3400`) |

## 1. 배경·문제 (DEF-B-150, JSJung 결정 2026-10-13: 방향 A)

TASK-B-334(PR #1244)에서 발견: 엑셀 대량 등록 템플릿 샘플 자체가 **어떤 모드로도 등록 불가**.
- 비UPS 행은 스키마가 port 필수인데 템플릿·매핑에 port 없음 → 항상 실패.
- 템플릿 샘플 `transport_mode='AIR'`(안내대로 입력 시 실패), `shipper_contact_phone` 컬럼 부재, 빈 HS/국가/우편번호/도시, 패키지 `GENERAL` → UPS 행도 실패.
- 거부 사유가 Zod 이슈 JSON 문자열로 노출되어 읽기 어려움.

## 2. 구현 (A)

- `src/app/actions/operations/bulk-orders.ts`
  - 행 루프 선두(패키지 조회 전)에 모드 검사: `const transportMode = (toStr(orderRow.transport_mode) || BULK_SUPPORTED_MODE).toUpperCase();` + 비UPS면 `throw new Error('대량 등록은 UPS 오더만 지원합니다 (현재 transport_mode=…)')`. **해당 행만 실패, 배치는 계속.**
  - `BULK_SUPPORTED_MODE = 'UPS'` 모듈 내부 상수(`'use server'` 파일은 async 함수만 export 가능 → `export` 불가). `mapExcelRowToOrderInput`의 `|| 'AIR'` 제거, 정규화된 `transportMode`를 파라미터로 전달.
  - `mapExcelRowToPackageInput`: `content_type: normalizeUpsContentType(toStr(pkgRow.content_type), BULK_SUPPORTED_MODE)` — 기존 `@/lib/orders/edit-defaults` 재사용(신규 구현 금지).
  - `formatBulkError`: `z.ZodError`면 `경로: 메시지; …`, 그 외는 `err.message`.
- `src/lib/excel/bulk-order-template.ts`: `shipper_contact_phone` 컬럼 추가(헤더 29→30) + UPS 통과 샘플(`content_type='NONDOC'`, `hs_code='8471300000'`, 국가/우편번호/도시/화주 연락처 채움). 헤더·샘플은 `BULK_ORDER_HEADERS`·`BULK_ORDER_SAMPLE`·… 상수로 추출해 테스트 재사용.
- `src/components/orders/BulkOrderUploadModal.tsx`: 안내 3줄 추가 + 미리보기 `transport_mode` 공란을 `UPS (기본)`으로 표기.
- **범위 밖 준수**: 비UPS 지원(port 컬럼·코드→UUID) 미구현, `createOrder` 시그니처·`orderRegistrationSchema` 규칙 무변경, `OrderRegistrationForm.tsx` 무변경(`wc -l` 1,930 → 1,930, diff 0).

## 3. [재현 결과] (실측)

`generateBulkOrderTemplate()` → `XLSX.read` → 3시트 `sheet_to_json` → `bulkCreateOrders`(`createOrder` mock). 임시 재현 스펙으로 실행 후 삭제.

| 시나리오 | 관측 |
|:--|:--|
| 템플릿 그대로(샘플 `AIR`) | `success:false`, `createOrder` **0회**, error가 Zod 이슈 **JSON 문자열** — `Please select a valid origin port` + `…dest_port_id` (결함 #1·#2·#7 재현) |
| `transport_mode`만 `UPS`로 강제 | 여전히 `success:false` — `recipient_country_code`·`recipient_zipcode`·`recipient_city`·`shipper_contact_phone`·`packages.0.items.0.hs_code` 필수 위반 (결함 #3·#5·#6 재현) |

→ Jaison 분석 표(#1~#7)와 일치. 재현 후 임시 파일 `tests/unit/operations/b335-repro.test.ts` 삭제.

## 4. 테스트 (C)

`tests/unit/operations/bulk-orders.test.ts` — 실제 `bulkCreateOrders` 호출(라운드트립은 실제 템플릿 파싱).

| TC | 입력/조건 | 기대 |
|:--|:--|:--|
| **TC-BULKUPS-01** | AIR 행 + UPS 행 혼합 | AIR만 `success:false`·`대량 등록은 UPS 오더만 지원합니다`·`transport_mode=AIR`, UPS 성공, `createOrder` 1회 |
| **TC-BULKUPS-02** | `transport_mode` 공란 / ` ups ` | UPS 정규화, `createOrder.transport_mode='UPS'` |
| **TC-BULKUPS-03** | `content_type` 공란/`GENERAL`/`DOC` | `NONDOC`/`NONDOC`/`DOC` |
| **TC-BULKUPS-04** | 템플릿 라운드트립 | 샘플 행 `success:true`, `transport_mode='UPS'`, `content_type='NONDOC'`, hs_code 有, 국가 `US`, `ups_product_code='WW_SAVER_NONDOC'`(≠`'WWE'`) |
| **TC-BULKUPS-05** | UPS 행 HS 누락 | error가 `packages.0.items.0.hs_code: UPS 배송은 품목 HS 코드가 필수입니다…`, `{`·`"code"` 미포함 |
| **TC-BULKPH-02** (수정) | UPS 행 `+86 393 8302 0288` / `010 1234 5678` | 정제되어 성공, `createOrder`에 `8639383020288`/`01012345678` |

- **TC-BULKPH-02 변경 사유**: 원래 "AIR 행 전화 정제"였으나 AIR가 이제 사전 거부되어 **전제 소멸**. 삭제·약화 아니라 UPS 행 정제 케이스로 수정.
- **되돌리기 검증(4종 직접 수행)**:
  - (a) 모드 검사 제거 → TC-BULKUPS-01 FAIL
  - (b) 템플릿 샘플 `AIR`로 되돌림 → TC-BULKUPS-04 FAIL
  - (c) `normalizeUpsContentType` 제거(원 `|| 'GENERAL'`) → TC-BULKUPS-03 FAIL
  - (d) **보완**: 샘플 `ups_product_code`를 `'WWE'`로 되돌림 → TC-BULKUPS-04 FAIL(`toBe('WW_SAVER_NONDOC')`)
  - 각각 단독 FAIL 확인 후 복원 → 17/17 PASS. vacuous 아님.
- **DEF-B-151 보완**: 샘플 `ups_product_code`가 DB(`zen_ups_products`) 실존 코드인지 라운드트립 테스트가 `toBe('WW_SAVER_NONDOC')`로 고정. DB 실측(인용): `docker exec supabase_db_ZENITH_LMS_001 psql -U postgres -Atc "select product_code from zen_ups_products where product_code='WW_SAVER_NONDOC'"` → `WW_SAVER_NONDOC`. 정본 상수(전체 실존 코드 집합)는 코드베이스에 **부재**(`pricing-engine.ts`의 `PRODUCT_FAMILY_MAP`은 prefix→family 매핑이라 정본 집합이 아님) → **(나) 방식 생략, DB 실측으로 대체**.

## 5. 검증 (DoD)

- [x] 구현 1~5 (모드 검사 / content_type 정규화 / formatBulkError / 템플릿 UPS 통과 / 안내문·미리보기)
- [x] 테스트 1~5 + TC-BULKPH-02 수정 (17/17 PASS)
- [x] 되돌리기 검증 4종 직접 수행·기재(섹션 4, (d)=보완)
- [x] **보완(반려)**: 템플릿 샘플 `ups_product_code` `'WWE'`→`'WW_SAVER_NONDOC'`(DB 실존 코드, 라운드트립 `toBe` 검증 + 되돌리기 (d))
- [x] **R-18**: 발견 이슈를 `DEF# 포함 표`로 기재 + `DEF-B-150`(대량 등록)·`DEF-B-151`(미존재 product_code 무음 통과) 보고서 작성
- [x] `LIVE_REGRESSION_TEST_MAP.md` §68 신설 + §67 TC-BULKPH-02 설명 갱신 (R-09)
- [x] `npm run test:regression` 전체 PASS (R-08) — **218 files / 1551 tests**
- [x] `npm run build` 성공
- [x] `tsc --noEmit` 변경 파일 신규 오류 0
- [x] **R-12**: `docs/03_Design/_archive/ds_11/` 명세서에 대량 등록(bulkCreateOrders) 전용 엔드포인트/시트 규격 없음(오더 생성만 `transport_mode` optional로 기술) → 문서 변경 불요. 근거: `Ds_11_API_상세_명세서.md:126`, `Ds_11_DETAIL_ORDER.md:28`에 createOrder `transport_mode`만 존재.
- [x] **R-04** 자가점검: diff는 base `origin/TeamB_Dev` 대비 4파일(코드 3 + 테스트 1) + 본 task file + MAP.
- [x] **R-15 해당 없음**: DB 스키마/마이그레이션 무변경(순수 입력 처리·UI 문구). Baker R-10 예외(2026-07-15, 스크린샷 미요구).
- [x] `OrderRegistrationForm.tsx` 줄 수 변동 0 (`wc -l` 1,930 → 1,930)

## 6. [작업 결과]

- **코드 커밋**: `fcee5a6a5` — `[Baker] fix: TASK-B-335 대량 등록 UPS 전용 명문화 + 템플릿 정합 (#1245)`
- **보완 코드 커밋**: `d104ba447` — `[Baker] fix: TASK-B-335 템플릿 샘플 ups_product_code WW_SAVER_NONDOC 교체 (Issue #1245)` (반려 대응)
- **변경 파일**: `src/app/actions/operations/bulk-orders.ts`, `src/lib/excel/bulk-order-template.ts`, `src/components/orders/BulkOrderUploadModal.tsx`, `tests/unit/operations/bulk-orders.test.ts`, `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`(§67 갱신·§68 신설), `.agent/defects/DEF-B-150_*.md`·`DEF-B-151_*.md`
- **검증**: `npm run test:regression` **218 files / 1551 tests PASS**, `npm run build` 성공, `tsc --noEmit` 변경 파일 오류 0
- **PR**: [#1246](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1246) — base `TeamB_Dev`

## 7. [발견 이슈]

| DEF# | 결함 | 긴급도 | 보고서 | 상태 |
|:--|:--|:--|:--|:--|
| **DEF-B-150** | 엑셀 대량 등록 — 비UPS 행 전량 실패 + 제공 템플릿이 어떤 모드로도 등록 불가 | Medium | [`.agent/defects/DEF-B-150_대량등록_비UPS실패_템플릿불일치.md`](../defects/DEF-B-150_대량등록_비UPS실패_템플릿불일치.md) | **본 Task에서 해결**(방향 A) |
| **DEF-B-151** | 미존재 `ups_product_code`(예 `WWE`) 무음 통과 → `saveOrderRateSnapshot`이 `if(!product)return`으로 조용히 건너뛰어 **운임 스냅샷 없는 UPS 오더** 생성(오타 시 API 단계 실패가 아님) | Medium | [`.agent/defects/DEF-B-151_대량등록_미존재_ups_product_code_운임스냅샷_무음누락.md`](../defects/DEF-B-151_대량등록_미존재_ups_product_code_운임스냅샷_무음누락.md) | 보고서만(별도 Task 미발령) |
| — | `formatBulkError`는 Zod 오류에만 경로 포맷 적용(비Zod 오류는 `err.message`) | Low | (본 task 파일) | 범위 밖 |

> **정정**: 본 보완의 계기 — 초기 task file의 "오타 시 API 단계에서 실패" 기재는 **사실과 다름**(실제는 무음 통과·스냅샷 누락). `DEF-B-151`로 정정·보고.
> **참고**: 비UPS 대량 등록 영구 미지원(방향 A) — 향후 필요 시 port 컬럼 + 코드→UUID 매핑을 별도 IMP로.

# TASK-B-333 — Issue #1240: 수정 화면 화주명·주소·패키지 CONTENT(DOC/NONDOC) 저장값 복원

- **이슈**: #1240 (상위 #1238 항목 4·5)
- **브랜치**: `feature/teamb-333-iss1240-edit-defaults` (base `origin/TeamB_Dev`)
- **담당**: Baker (Team B)
- **라벨**: status:in-progress → status:review
- **유형**: fix / p2

## 1. 배경·증상 (이슈 본문)

수정(edit) 화면 진입 시 저장된 값이 복원되지 않거나 공백으로 표시된다.

- **항목 4**: 화주명·화주 주소(영문 포함)가 수정 화면에서 빈 값으로 표시됨.
- **항목 5**: UPS 오더의 패키지 CONTENT가 빈 값(공백)으로 표시됨. (저장값이 `GENERAL`인데 select 옵션은 `DOC`/`NONDOC` 두 개뿐)

## 2. 재현 결과 (REQUIRED FIRST STEP)

로컬 Supabase DB(`supabase_db_ZENITH_LMS_001`) 실측 + 코드 정적 확인.

### 2.1 DB 실측 (UPS 오더)

```
UPS 패키지 content_type 분포: NONDOC 9 / DOC 2 / GENERAL 1   → GENERAL 1건 존재(select 공백 렌더 대상)
UPS 오더 11건 중: shipper_name 세팅 5건, shipper_address_english 세팅 3건
UPS 오더 수하인/발송인 전화 비숫자(하이픈 등) 포함: 11건 / 10건
```

재현 표본(실측):

| order_no | content_type | shipper_name | shipper_address_english | recipient_phone |
| :-- | :-- | :-- | :-- | :-- |
| UPS-SEED-AGENCY-001 | **GENERAL** | `Test Shipper XYZ` | (빈값) | `010-9999-0212` |
| ZEN-2026-000003 | DOC | (빈값) | (빈값) | `+8639383020288` |
| ZEN-2026-000005 | DOC | (빈값) | (빈값) | `+8639383020288` |

### 2.2 코드 정적 확인

- `src/app/[locale]/(dashboard)/orders/[orderId]/edit/page.tsx`의 `defaultValues`가 `shipper_name`·`shipper_address_english`·`shipper_address_detail_english` **키를 아예 생성하지 않음** → RHF 초기값 없음 → 화주명/영문주소 공백(항목 4).
- 패키지 매핑이 `content_type: pkg.content_type ?? 'GENERAL'` → UPS인데 저장값이 `GENERAL`이면 select(옵션 `NONDOC`/`DOC` 2개)에서 매칭 옵션 없음 → 공백 렌더(항목 5).
- 부수 발견: 레거시 전화값에 하이픈/`+` 포함(TASK-B-332에서 입력은 정제하나 DB 저장분은 잔존) → edit 진입 시 그대로 노출.

**가설 검증 결과: 이슈 본문 가설과 일치(항목 4·5 모두 재현).** → 착수 계속.

## 3. 원인

1. `edit/page.tsx` defaultValues 누락 필드 3종.
2. UPS CONTENT 정규화 부재(저장 enum `GENERAL`이 UPS select 도메인 밖).
3. 레거시 전화값 미정제(부수).

## 4. 조치

| # | 파일 | 변경 |
| :-: | :-- | :-- |
| 1 | `src/lib/orders/edit-defaults.ts` (신규) | `buildOrderEditDefaults`(누락 필드 추가·전화 정제·UPS content_type 정규화), `resolveShipperAddressDefaults`(수정 모드 저장 주소값), `normalizeUpsContentType` |
| 2 | `edit/page.tsx` | 인라인 defaultValues → `buildOrderEditDefaults(order)` 호출 |
| 3 | `OrderRegistrationForm.tsx` | ① 화주 `AddressInput` defaultValues를 `resolveShipperAddressDefaults`로 교체 + `shipperToggled` 상태(수정 모드에서 사용자가 토글하기 전까지 저장값 우선) ② 패키지 추가 시 UPS → `content_type: 'NONDOC'` ③ UPS 모드에서 GENERAL/기타 잔존값을 `NONDOC`으로 보정하는 effect |

## 5. 테스트 (신규)

`tests/unit/orders/edit-defaults.test.ts` — 14 케이스 (TC-EDTDF-01~12 + 필수용 세부).

- 항목 4: 화주명·영문주소 보존(TC-EDTDF-01/09), 토글 후 manual/auto 우선(TC-EDTDF-10/11).
- 항목 5: UPS GENERAL→NONDOC(TC-EDTDF-02), DOC 유지(TC-EDTDF-03), 비UPS 유지(TC-EDTDF-04/08), 순수함수(TC-EDTDF-07).
- 부수: 레거시 전화 정제(TC-EDTDF-05/06), 신규 등록 회귀(TC-EDTDF-12).

## 6. 검증

- [x] 재현 확인 (2.1·2.2, 가설 일치)
- [x] 신규 테스트 PASS (14/14) + 기존 4종(30/30)
- [x] 되돌리기 검증: `normalizeUpsContentType` UPS 분기 원복 시 신규 테스트 **2건 FAIL**, 복원 시 14/14 PASS → 비-vacuous
- [x] `npm run test:regression` 전체 PASS (**218 files / 1542 tests** — 신규 1파일/14건 포함)
- [x] `npm run build` SUCCESS
- [x] `npm run tsc --noEmit`: 변경 파일 신규 오류 0
- [x] MAP §66 신설 (R-09)
- [x] R-04 LIVE 자가점검: 폼 defaultValues(항목 4)·content_type select 도메인(항목 5)·전화 정제 3계층 확인
- [x] R-15 해당 없음: DB 스키마/마이그레이션 무변경(순수 helper·UI), 회귀 테스트 커버 (Baker R-10 예외, 2026-07-15)

## 7. 발견 이슈

- UPS CONTENT 정규화는 **표시 시점**(수정 진입)/패키지 추가 시점에서 수행 — 저장 스키마 enum은 `GENERAL|DOC|NONDOC` 유지(비UPS·호환). UPS 저장 시 `GENERAL`이 다시 쓰이지 않도록 폼에서 차단.
- `resolveShipperAddressDefaults`는 폼 내부 상태(토글 여부)에 의존 → 수정 화면에서 사용자가 직접 값을 바꾸면 저장값 우선순위가 해제된다(의도).

## 8. 커밋 / PR

- 코드 커밋: `f10e83f8f5e5773a7682a96ca4703e20613cb1f4` — `[Baker] fix: TASK-B-333 수정 화면 화주명·주소·CONTENT 저장값 복원 (#1240)`
  - 변경 파일(5): `src/lib/orders/edit-defaults.ts`(신규), `.../orders/[orderId]/edit/page.tsx`, `src/components/orders/OrderRegistrationForm.tsx`, `tests/unit/orders/edit-defaults.test.ts`(신규), `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`
- 문서 커밋(본 task file): `e5728e6805b0f4bdc06b5ed22902100d0937075d`
- PR: #1242 (base `TeamB_Dev`) — https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1242 — CI 3종 PASS (Task File 8s / Type Check 1m13s / Regression 6m14s)


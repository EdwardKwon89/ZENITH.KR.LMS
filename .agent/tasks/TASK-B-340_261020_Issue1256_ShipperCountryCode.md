# TASK-B-340 — Issue #1256: UPS 수정 화면 화주 "주소" 공백 — 국가코드 빈 값 처리·저장 방지·기존 데이터 정정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1256](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1256) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-20 |
| **우선순위** | P2 |
| **상태** | 🔔 리뷰 대기 |
| **브랜치** | `feature/teamb-340-iss1256-shipper-country-code` (base `origin/TeamB_Dev` @ `978341a9`) |

## 1. 배경·원인

UPS 오더 수정 화면에서 화주 "주소"가 비어 보인다. DB에는 주소가 있으나 `shipper_country_code`가 `''`(빈 문자열)로 저장된 행이 원인. 화면은 국가를 `|| 'KR'`로 보정 표시하지만, 한국 주소(roadAddress) 초기화는 `=== 'KR'` 엄격 비교라 `''`에서 주소를 채우지 않았다.

- 표시: `AddressInput.tsx` 63·82행 `=== 'KR'`
- 기본값: `edit-defaults.ts` 87행·184행 `??` (빈 문자열 통과)
- 저장: `order.ts:62` `z.string().optional().default('KR')` (`.default`는 undefined만 대체)

## 2. [재현 결과] (수정 전)

### 2-1. 로컬 DB (`supabase_db_ZENITH_LMS_001`)

```
SELECT shipper_country_code IS NULL, coalesce(code,'<NULL>'), count(*), count(*) FILTER (WHERE address<>'')
FROM zen_orders WHERE transport_mode='UPS' GROUP BY ...
f||3|3
t|<NULL>|1|0
f|KR|7|7
```

→ UPS 11건 중 `''` 3건(모두 주소 있음) / `NULL` 1건(주소 없음) / `KR` 7건 (Issue 본문과 일치).

주소 있는 `''` 3건:

```
ZEN-2026-000015|경기 성남시 분당구 대왕판교로351번길 6|...
ZEN-2026-000040|서울 강남구 선릉로 823|...
ZEN-2026-000041|경기 성남시 수정구 수정남로326번길 4-6|...
```

### 2-2. 실제 `AddressInput` 렌더 (수정 전, 재현 테스트 실행)

`tests/unit/components/address-input-empty-country.test.tsx` — `country_code:''` + 한국 주소:

```
× TC-340-A: country_code 빈 문자열 + 한국 주소 → "주소" 입력에 주소가 표시된다
AssertionError: expected '' to be '경기 성남시 수정구 수정남로326번길 4-6' // Object.is equality
Tests  1 failed | 2 passed (3)
```

→ 수정 전에는 "주소" 입력값이 `''`임을 확인(재현 성립). `'KR'`(회귀)·`'US'` 케이스는 통과.

### 2-3. 빈 값 저장 경로 확인

- **② 수기입력 모드(실제 원인)**: `OrderRegistrationForm.tsx`의 `clearShipperInfoFields`가 `SHIPPER_INFO_FIELDS`에 포함된 `shipper_country_code`를 `setValue(f, '')`로 비운다(294~295행). 이 값이 스키마 `.default('KR')`를 통과해 `''`로 저장된다. 스키마 테스트에서 `''` 미변환을 재현(`expected '' to be 'KR'`).
- **③ hidden input(원인 아님)**: `mode='rhf'`로 `country_code:''`를 렌더해 hidden input 값을 확인 → `{"value":"KR"}`. `countryCode` state가 `|| 'KR'`로 초기화되므로 hidden input 자체는 `''`을 만들지 않는다.
- 결론: 저장 원인은 **② + 스키마 통과**이며, 표시 결함은 ③이 아니라 `AddressInput`의 엄격 비교다. (코드 수정은 지시대로 표시·기본값·스키마·마이그레이션만 수행)

## 3. AddressInput 사용처 전수 (수정하지 않음)

| # | 파일:행 | `defaultValues.country_code` 유입 | `''` 유입 가능 | 이번 변경 영향 |
|:--|:--|:--|:--|:--|
| 1 | `src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx:141` | 미전달(undefined) | 불가 | 없음(이미 KR) |
| 2 | `src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form.tsx:164` | `shipper.org.country_code`(DB) | 가능(DB `''`) | `''`이면 이제 KR 주소도 표시(의도). 다른 국가 불변 |
| 3 | `src/app/[locale]/(dashboard)/mypage/corporate/page.tsx:247` | `org?.country_code \|\| 'KR'` | 불가(이미 `\|\|`) | 없음 |
| 4 | `src/components/orders/OrderRegistrationForm.tsx:1179` (화주) | `resolveShipperAddressDefaults(...).country_code` | 가능(수정 전 `''`) | 기본값 함수에서 KR로 정정 + AddressInput도 방어 |
| 5 | `src/components/orders/OrderRegistrationForm.tsx:1292` (수하인) | `watch('recipient_country_code') \|\| 'KR'` | 불가(이미 `\|\|`) | 없음(recipient 로직 불변) |
| 6 | `src/components/orders/OrderRegistrationForm.tsx:1379` (픽업) | `watch('pickup_country_code') \|\| 'KR'` | 불가(이미 `\|\|`) | 없음 |

> `src/app/[locale]/(dashboard)/agency/shippers/new/address-input.tsx`는 **별도 로컬 컴포넌트**로 `@/components/common/AddressInput`과 무관 — 대상 아님.

## 4. 구현

1. `src/components/common/AddressInput.tsx` — `normalizedDefaultCountryCode = defaultValues.country_code || 'KR'` 도입, 63행(roadAddress 초기화)·82행(동기화)에서 사용. 다른 국가 코드 동작 불변.
2. `src/lib/orders/edit-defaults.ts` — 화주 2곳 `??` → `||` (87행 `buildOrderEditDefaults`, 184행 `resolveShipperAddressDefaults`). `recipient_country_code` 불변.
3. `src/lib/validation/order.ts` — `shipper_country_code: z.string().optional().transform(v => v?.trim() ? v.trim() : 'KR')`. 출력 타입 `string` 유지(build 확인).
4. `supabase/migrations/20261021090000_task_b340_backfill_shipper_country_code.sql` — `''` + 주소 있음 행만 `KR`로 백필. `NULL`·주소 없음 불변, 멱등.

## 5. 테스트

| TC | 내용 | 위치 |
|:--|:--|:--|
| TC-340-A/B/C | 실제 `AddressInput` 렌더 — `''`+한국주소 표시 / `'KR'` 회귀 / `'US'` 해외 입력·한국 검색칸 없음 | `tests/unit/components/address-input-empty-country.test.tsx` |
| TC-340-DEF | `buildOrderEditDefaults`·`resolveShipperAddressDefaults` — `''`/`null`→KR, `'JP'`→JP, recipient 불변 | `tests/unit/orders/edit-defaults.test.ts` (추가만) |
| TC-340-SCH | 실제 `orderRegistrationSchema.safeParse` — `''`/`'  '`/미지정→KR, `'JP'`→JP, `' KR '`→KR | `tests/unit/orders/shipper-country-schema.test.ts` |
| TC-340-MIG-①/② | 마이그레이션 SQL 파일 실제 읽어 실DB 실행 — `''`+주소만 KR, 나머지 불변 / 재실행 `UPDATE 0` | `tests/integration/task-b340-backfill-country.test.ts` |

## 6. 되돌리기 검증 4종 (직접 수행, FAIL 출력 인용)

| # | 변이 | 대상 | 결과 |
|:--|:--|:--|:--|
| a | `AddressInput`을 `defaultValues.country_code === 'KR'` 엄격 비교로 원복 | TC-340-A | `× TC-340-A` → `AssertionError: expected '' to be '경기 성남시 수정구 수정남로326번길 4-6'` / `1 failed \| 2 passed` |
| b | `edit-defaults` 2곳을 `??`로 원복 | TC-340-DEF | `× buildOrderEditDefaults…`, `× resolveShipperAddressDefaults…` → `expected '' to be 'KR'` (2건) / `2 failed \| 14 skipped` |
| c | 스키마 `transform` 제거(`.default('KR')` 원복) | TC-340-SCH | `× "" → "KR"`, `× "  " (공백) → "KR"`, `× " KR " → "KR"` → 3 failed / `3 passed` |
| d | 마이그레이션 WHERE에서 `COALESCE(shipper_address,'') <> ''` 제거 | TC-340-MIG-① | `AssertionError: expected 'UPDATE 2' to contain 'UPDATE 1'` / `1 failed \| 1 passed` |

> **원본 보존 방식**: 변이 대상 파일을 작업 전 `cp`로 `/tmp`에 백업 → 변이 → 테스트 → `cp` 복원 → **`shasum` 동일 확인**. 4건 모두 복원 후 체크섬 일치를 확인했다(주소: `AddressInput.tsx` `aa279f02…`, `edit-defaults.ts` `65965539…`, `order.ts` `96349e6c…`, 마이그레이션 `dd25d4cc…`).

## 7. 검증 (DoD)

- [x] 구현 1~4 (표시·기본값·스키마·마이그레이션)
- [x] 재현(수정 전) — DB 건수·렌더 실패 출력 인용(섹션 2)
- [x] 테스트 2~5 작성·PASS (신규 4파일 / 13케이스)
- [x] 되돌리기 4종 수행·FAIL 인용 + `cp`/`shasum` 원본 보존(섹션 6)
- [x] 마이그레이션 로컬 적용 전/후: `shipper_country_code=''` **3건 → 0건** (UPS 기준, 전체 `''` 0건)
- [x] `LIVE_REGRESSION_TEST_MAP.md` **§72** 신설 (`grep -n "TC-340"` 결과 6개 ID 확인)
- [x] `npm run test:regression` 전체 PASS — **231 files / 1641 tests**
- [x] `npm run build` 성공 (exit 0) — `shipper_country_code` 출력 타입 `string`, zodResolver 영향 없음
- [x] `tsc --noEmit` `src/` 신규 오류 **0**
- [x] **R-12**: 외부 API(SHXK) 변경 없음 — `label-mapping.ts`의 `|| defaults.country`는 그대로. `Ds_11` 확인 후 **해당 없음**
- [x] **R-15 관측성**: 순수 표시 보정·기본값·스키마 변환·데이터 백필로 로깅 대상 아님(사용자 오류 아님, 조용한 실패 아님)
- [x] **R-04** 자가점검: base `978341a9` 대비 소스 3 + 마이그레이션 1 + 테스트(신규 4, 기존 1 추가) + MAP 1
- [x] **R-18**: DEF-B-152 작성(섹션 9)

## 8. [작업 결과]

- **변경 파일**:
  - 수정: `src/components/common/AddressInput.tsx`, `src/lib/orders/edit-defaults.ts`, `src/lib/validation/order.ts`
  - 신규: `supabase/migrations/20261021090000_task_b340_backfill_shipper_country_code.sql`
  - 테스트 신규: `tests/unit/components/address-input-empty-country.test.tsx`, `tests/unit/orders/shipper-country-schema.test.ts`, `tests/integration/task-b340-backfill-country.test.ts`
  - 테스트 추가: `tests/unit/orders/edit-defaults.test.ts` (기존 케이스 수정 없음)
  - 문서: `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` (§72), 본 task file, `DEF-B-152`
- **검증**: 전체 회귀 **231 files / 1641 tests PASS**, build 성공, `src/` 타입 오류 0
- 코드 커밋: `3f500d8d070e57ba1228b645487ebe1fe3566081`
- 문서 커밋: 본 task file·DEF-B-152만 (코드 커밋 직후 `scripts/insert-commit-hash.sh`로 갱신)

## 9. [발견 이슈]

| # | 내용 | 긴급도 | 상태 |
|:--|:--|:--|:--|
| 1 | **DEF-B-152**: 화주 국가코드 `''` 저장 → 수정 화면 주소 공백. 표시·기본값·스키마 3중 원인 + 기존 데이터 3건 | Medium | TASK-B-340으로 해결 |
| 2 | 수기입력 모드 `clearShipperInfoFields`가 `shipper_country_code`까지 `''`로 비운다 — 스키마 변환으로 저장은 막았으나, UI상 국가를 다시 선택해야 하는 동작 자체는 유지(이번 범위 밖) | Low | 관찰만(코드 수정 안 함) |
| 3 | `value`+`register` 병용 hidden input(AddressInput 131~132행)은 React 제어 경고 소지가 있으나, hidden 값은 `KR`로 정상임을 실측(원인 아님) | Low | 관찰만 |

# DEF-B-152: 화주 국가코드 빈 문자열('') 저장 — UPS 수정 화면 화주 "주소" 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 보고(2026-10-20) "UPS 수정 화면에서 화주 주소가 비어 있다" → Jaison 원인 분석 후 TASK-B-340(Issue #1256) 배정, Baker가 로컬 DB·실제 렌더로 재현·확정 |
| **긴급도** | Medium (고객 화면 표시 결함. 저장 데이터 손상·라벨 발급 영향 없음 — SHXK 전송은 빈 값을 KR로 처리) |
| **발견일** | 2026-10-20 |
| **조치 상태** | TASK-B-340(Issue #1256)로 해결 |

## 현상

UPS 오더 수정 화면에서 화주 "주소" 입력이 비어 보인다. DB에는 주소가 저장되어 있다.
국가 선택 표시는 "대한민국(KR)"으로 보이지만 주소만 공백이다.

로컬 DB 실측(수정 전, UPS 11건): `shipper_country_code` = `''` **3건**, `NULL` 1건, `'KR'` 7건.
`''` 3건은 모두 `shipper_address`·영문 주소·우편번호·시/도/시/군/구가 저장되어 있었다
(`ZEN-2026-000015`, `ZEN-2026-000040`, `ZEN-2026-000041`).

## 근본 원인 (3중)

1. **표시**: `src/components/common/AddressInput.tsx`
   - 국가 표시·state 초기화는 `defaultValues.country_code || 'KR'`(54행 계열)·`useState`에서 보정되지만,
   - `roadAddress` 초기화(63행)와 `address` 동기화(82행)는 `defaultValues.country_code === 'KR'` **엄격 비교**라
     `''`이면 한국 주소를 채우지 않는다 → 화면은 KR인데 주소만 빈 상태.
2. **기본값**: `src/lib/orders/edit-defaults.ts`
   - `order.shipper_country_code ?? 'KR'`(87행), `saved?.country_code ?? 'KR'`(184행) — `??`는 `null`/`undefined`만
     대체하고 `''`은 그대로 통과시킨다.
3. **저장**: `src/lib/validation/order.ts`의 `shipper_country_code: z.string().optional().default('KR')`
   - Zod `.default()`는 `undefined`일 때만 작동 → `''`/공백이 그대로 저장된다.
   - 수기입력 모드에서 화주 필드를 비우면 `''`이 제출되어 이 경로로 저장될 수 있다(추정 경로 재현 결과는 TASK-B-340 task file 참조).

## 영향 범위

- UPS 수정 화면에서 화주 주소가 공백으로 보여 사용자가 주소를 다시 입력하거나, 저장 시 빈 주소로 덮어쓸 위험.
- SHXK 전송은 `(order.shipper_country_code) || shipperDefaults.country`로 이미 KR 처리 → **라벨 발급 영향 없음**.
- `recipient_country_code`는 별도 로직이며 이 결함과 무관(변경하지 않음).

## 권장 조치 (DoD) — TASK-B-340에서 이행

- [x] `AddressInput`: 빈 국가코드를 `'KR'`로 간주해 `roadAddress` 초기화·동기화 (다른 국가 동작 불변)
- [x] `edit-defaults`: `??` → `||` (화주 기본값 2곳)
- [x] 스키마: `''`/공백/undefined → `'KR'`, 다른 값은 trim 유지 (`.default` → `transform`)
- [x] 기존 데이터: `''` + 주소 있음 행만 `KR`로 백필하는 멱등 마이그레이션(`NULL`·주소 없음 행 불변)
- [x] 회귀 테스트: 실제 렌더 / 기본값 / 스키마 / 실DB 마이그레이션

## 파일 소유권 확인

`src/components/common/AddressInput.tsx`, `src/lib/orders/edit-defaults.ts`, `src/lib/validation/order.ts` 모두 Team B 주도 파일 → **Team B 담당**

# TASK-B-264: Issue #1023 — DEF-B-038 UPS 할인율 cargo_type ALL 폴백 누락 + /admin/ups-rates 목록 개편

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1023](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1023) |
| **배경** | JSJung 1차 요청(/admin/ups-rates 할인율 cargo_type 표시 + Zone 통합 matrix) 설계 논의 중 DEF-B-038 발견(오늘 병합된 #1018/#1021 코드가 JSJung 확정 규칙과 다름) — 통합 배정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-10 |
| **우선순위** | P1 (DEF-B-038) + P2 (UI 개편) |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## JSJung 확정 cargo_type 적용 규칙 (Source of Truth)

| 등록한 cargo_type | 적용 대상 |
|:---|:---|
| `ALL` | 모든 상품 일괄 (Express DOC/NON_DOC, Saver DOC/NON_DOC, Expedited, Flight 전부) |
| `DOC` | Express/Saver의 DOC 상품만. Expedited/Flight 미적용 |
| `NON_DOC` | Express/Saver NON_DOC + **Expedited/Flight에도 적용** |

## Part 1 — DEF-B-038: freight.ts cargo_type 폴백 (P1)

`src/app/actions/ups/freight.ts`의 AGENCY_DISCOUNT(`zen_agency_pricing_policies`)·SHIPPER_DISCOUNT(`zen_agency_shipper_zone_discounts`) 조회 2곳이 현재 정확히 일치하는 cargo_type 1건만 조회(폴백 없음) → `ALL` 등록해도 Express/Saver 할인율 0%, `NON_DOC` 등록해도 Expedited/Flight 할인율 0%. 우선순위 폴백 조회로 교체:

- DOC 상품 → `['DOC','ALL']`, NON_DOC 상품 → `['NON_DOC','ALL']`, BOTH(Expedited/Flight) → `['NON_DOC','ALL']` (DOC 후보 제외)
- `.in('cargo_type', candidates)` 1회 조회 후 배열 순서로 "구체적 값 우선 → ALL 폴백" 선택
- 동일 패턴 SHIPPER_DISCOUNT에도 적용

## Part 2 — /admin/ups-rates 목록 UI 개편

- `AgencyPolicyTable`(`ups-rates-client.tsx:663-747`)을 `(agency_org_id, cargo_type)` 기준 pivot — 1행 = Zone별 할인율 컬럼 matrix
- "구분"(cargo_type 배지) + "적용서비스" 컬럼: ALL→"전체 상품(Express/Saver/Expedited/Flight)", DOC→"Express/Saver DOC만", NON_DOC→"Express/Saver NON_DOC + Expedited/Flight"
- `zones` prop 추가 전달(`ups-rates-client.tsx:286`)
- 연관 버그: `openEdit()`(144-153) agencyPolicies 분기가 cargo_type 무시하고 필터링 — pivot과 함께 cargo_type 필터 추가

## 회귀 테스트 (R-09)

**Part 1 (freight.ts, 핵심)**: ALL/DOC/NON_DOC 단독 + NON_DOC+ALL 동시(폴백 우선순위) 케이스, SHIPPER_DISCOUNT 동일, 되돌리기 검증(폴백 제거 시 ALL→Express/Saver 0% 재현)
**Part 2 (UI)**: pivot 그룹핑, cargo_type 행 분리, 적용서비스 매핑, openEdit cargo_type 필터 되돌리기 검증

## 완료 보고 절차 (R-17)

1. 코드 커밋 → 2. task file `[작업 결과]` + 🔔 → 3. ACTIVE_TASK.md → 4. issue 라벨 → 5. PR(`Closes #1023`)

## [작업 결과]

**작성자**: Dave | **작성일**: 2026-08-10 | **상태**: 🔔 (검토 요청)

### 구현 (코드 커밋 `1a4d1e30`)

**Part 1 — DEF-B-038 (P1): `src/app/actions/ups/freight.ts` cargo_type 폴백**

- `candidateCargoTypes()` 헬퍼 추가: DOC→`['DOC','ALL']`, NON_DOC→`['NON_DOC','ALL']`, BOTH(Expedited/Flight)→`['NON_DOC','ALL']`(DOC 후보 제외)
- AGENCY_DISCOUNT(`zen_agency_pricing_policies`)·SHIPPER_DISCOUNT(`zen_agency_shipper_zone_discounts`) 조회 2곳을 `.in('cargo_type', candidates)` 1회 조회 후 배열 순서로 "구체적 값 우선 → ALL 폴백" 선택으로 교체
- 기존 동작(정확 일치 1건만 조회) 대비: `ALL` 등록 시 Express/Saver 할인 적용, `NON_DOC` 등록 시 Expedited/Flight에도 적용

**Part 2 — `/admin/ups-rates` 목록 개편 (`ups-rates-client.tsx`)**

- `AgencyPolicyTable`을 `(agency_org_id, cargo_type)` 기준 pivot으로 전환 — 1행 = 대리점×화물유형, Zone별 할인율을 컬럼으로 펼친 matrix
- "구분"(cargo_type 배지) + "적용서비스" 컬럼 추가 (ALL→"전체 상품(Express/Saver/Expedited/Flight)", DOC→"Express/Saver DOC만", NON_DOC→"Express/Saver NON_DOC + Expedited/Flight")
- `zones` prop 전달 추가 (`ups-rates-client.tsx:286`), `AgencyPolicy` 인터페이스에 `cargo_type`/`zone_id`/`zone` 추가
- 연관 버그 수정: `openEdit()`(145-158) agencyPolicies 분기가 cargo_type 무시하고 필터링하던 것 → `(agency_org_id, cargo_type)` 동시 필터로 수정

### 회귀 테스트 (코드 커밋 `1a4d1e30`)

- `freight-actions.test.ts` — 기존 TC-UPS-FREIGHT-03 3건을 `.in()` 쿼리 검증으로 갱신 + **TC-UPS-FREIGHT-04 폴백 8건 신설**:
  - ALL만 등록 → DOC/NON_DOC/BOTH(Expedited) 전부 할인 적용
  - DOC만 등록 → DOC만 적용, NON_DOC 0%
  - NON_DOC만 등록 → NON_DOC+Expedited 적용, DOC 0%
  - NON_DOC+ALL 동시 → BOTH는 NON_DOC 우선
  - SHIPPER 할인 동일 4케이스
- `ups-rates-client-pivot.test.tsx` (신규) — TC-UPS-RATES-PIVOT-01 pivot 그룹핑/적용서비스 텍스트/Zone 컬럼 3건 + TC-UPS-RATES-PIVOT-02 openEdit cargo_type 필터 1건

**되돌리기 검증 (vacuous test 방지)**
- Part 1: 폴백 로직 제거 후 `ALL만 등록 → DOC 상품 할인 0.1` 테스트 FAIL (`+0` 수신 — DEF-B-038 정확히 재현) → 15건 FAIL 확인 후 복원
- Part 2: openEdit cargo_type 필터 제거 후 DOC 수정 폼에 ALL 정책 z2 할인율 `'12'` 혼입 확인(테스트 FAIL) → 복원

### 검증 수치

- UPS 관련 테스트: freight 28건 + pivot 4건 = 32/32 PASS
- **전체 회귀: `npm run test:regression` 1060/1060 PASS (153 파일)**
- `npm run build` — Compiled successfully (17.8s) — 최초 빌드에서 `candidateCargoTypes` export(`'use server'` 비동기 제약) 오류 발생, export 제거 후 SUCCESS

## [발견 이슈]

없음


## [발견 이슈]

_(없으면 "없음")_

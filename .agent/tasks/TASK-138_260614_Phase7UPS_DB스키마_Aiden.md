# TASK-138 — Phase 7 SPR-01: UPS DB 스키마 설계 및 Migration

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-138 |
| **생성일** | 2026-06-14 |
| **할당 Agent** | Aiden (Claude) |
| **우선순위** | P1 |
| **전제조건** | An-12 설계 확정 ✅ |
| **관련 IMP** | IMP-110 |
| **브랜치** | `feature/ups-spr01-aiden-db-schema` |
| **상태** | 🔔 |

---

## [목표]

Phase 7 UPS 특송 서비스 전용 DB 스키마를 설계하고 Migration 파일을 작성한다.
An-12 §3 설계 기반으로 신규 테이블 6종 + 기존 테이블 3종 확장.

---

## [작업 범위]

### 신규 Migration 파일 (6종)

| 파일명 | 내용 |
|:------|:----|
| `ups_001_zones.sql` | `zen_ups_zones` + `zen_ups_zone_countries` + RLS |
| `ups_002_products.sql` | `zen_ups_products` + RLS + 초기 4개 제품 시드 |
| `ups_003_base_rates.sql` | `zen_ups_base_rates` + RLS |
| `ups_004_fuel_surcharges.sql` | `zen_ups_fuel_surcharges` + RLS |
| `ups_005_other_charges.sql` | `zen_ups_other_charges` + RLS |
| `ups_006_flight_plans.sql` | `zen_ups_flight_plans` + RLS |

### 기존 테이블 확장 Migration (1종)

| 파일명 | 내용 |
|:------|:----|
| `ups_007_existing_tables_extend.sql` | `zen_organizations.volumetric_divisor`, `zen_orders` 4개 컬럼, `zen_order_packages` REF_NO 5개 컬럼 |

### TypeScript 타입 정의 (1종)

| 파일명 | 내용 |
|:------|:----|
| `src/types/ups.ts` | UpsZone, UpsProduct, UpsBaseRate, UpsFuelSurcharge, UpsOtherCharge 인터페이스 |

### 회귀 테스트 신규 케이스 (R-09)

`src/__tests__/ups/schema-integrity.test.ts` — 신규 테이블 존재 여부 + RLS 정책 검증 기본 TC 3건 이상

---

## [설계 확정]

An-12 §3 기준으로 설계 확정됨 (2026-06-14 Edward 승인).
주요 결정 사항:
- 원가/판매가 분리 관리: 모든 요율 테이블에 `selling_price` + `cost_price` 2개 컬럼
- 부피중량상수: `zen_organizations.volumetric_divisor` (5000/5500/6000) — 원가는 시스템 고정 6000
- PKG REF_NO: `domestic_ref_no` (직접배송) + `intl_ref_no` (UPS 국제번호) 별도 컬럼
- intl_ref_locked: 국제번호 발부 후 변경 불가 잠금 Boolean
- AGENCY 역할 관련 테이블(`zen_agency_rate_overrides`, `zen_agency_shippers`)은 Team B(TASK-139) 담당

---

## [DoD]

- [x] Migration 파일 7종 작성 완료 (`supabase/migrations/ups_001~007`)
- [x] 각 테이블 RLS 정책 적용 (ADMIN/MANAGER 쓰기, 역할별 읽기)
- [x] `zen_ups_products` 초기 6개 제품 시드 데이터 포함 (WWExpress Doc/NonDoc, Saver Doc/NonDoc, Expedited, Flight)
- [x] `src/types/ups.ts` TypeScript 인터페이스 정의 (9개 인터페이스 + FreightCalcInput/Result)
- [x] `npx supabase db reset` 정상 완료 확인 (전체 migration 순차 적용)
- [x] `npm run test:regression` 신규 TC 13개 PASS — 전체 329/329중 323 PASS (6 fail은 기존 결함 TC-POLICY-03/04/06/07, DEF-065 등록)
- [x] 코드 커밋 해시: `aca457e`
- [x] DoD 자가 검증 `check-R17-DoD` 실행 완료

---

## [작업 결과]

**코드 커밋**: `aca457e` — [Claude] feat: TASK-138 Phase 7 UPS DB 스키마
**빌드**: ✅ PASS (supabase db reset 전체 migration 순차 적용 완료)
**회귀 테스트**: 323 / 329 PASS — 신규 TC-UPS-01~05 (13개) 전량 PASS. 6 FAIL은 TC-POLICY-03/04/06/07 기존 결함(DEF-065 등록, TASK-138 범위 외)

**작업 내용**:
- `ups_001~007` migration 7종 생성 (zen_ups_zones, zone_countries, products, base_rates, fuel_surcharges, other_charges, flight_plans + 기존 테이블 확장)
- 각 테이블 RLS: ADMIN/MANAGER ALL, AGENCY/CORPORATE/INDIVIDUAL SELECT(활성만)
- `zen_ups_products` 시드 6종 (WWExpress Doc/NonDoc, Saver Doc/NonDoc, Expedited, Flight)
- `src/types/ups.ts`: 9개 인터페이스 + FreightCalcInput/Result 타입
- `tests/integration/p7-ups-schema.test.ts`: TC-UPS-01~05 (13개 TC) 신규

---

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-065 | TC-POLICY-03/04/06/07 — db reset 후 SEA/WM 통합 테스트 실패 | Medium | `.agent/defects/DEF-065_TC-POLICY_SEA_WM_실패.md` |

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
| **상태** | ⬜ |

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

- [ ] Migration 파일 7종 작성 완료 (`supabase/migrations/ups_001~007`)
- [ ] 각 테이블 RLS 정책 적용 (ADMIN/MANAGER 쓰기, 역할별 읽기)
- [ ] `zen_ups_products` 초기 4개 제품 시드 데이터 포함
- [ ] `src/types/ups.ts` TypeScript 인터페이스 정의
- [ ] `npx supabase db reset` 정상 완료 확인
- [ ] `npm run test:regression` 전체 PASS (신규 TC 포함)
- [ ] 코드 커밋 해시: (작성 후 기재)
- [ ] DoD 자가 검증 `check-R17-DoD` 실행 완료

---

## [작업 결과]

_(완료 후 기재)_

**코드 커밋**: TBD
**빌드**: TBD
**회귀 테스트**: TBD / TBD PASS

---

## [발견 이슈]

_(없음)_

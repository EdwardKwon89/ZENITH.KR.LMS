# TASK-212 — 시드 데이터 보완: AGENCY RLS/입고재계산/volumetric_divisor/트래킹/화주인보이스 검증용 데이터 누락

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-212 |
| **GitHub Issue** | [#888](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/888) |
| **생성일** | 2026-07-27 |
| **할당 Agent** | Aiden (직접 처리 — 설계 판단 불필요한 기계적 시드 보강, seed 파일은 관례적으로 Team A 소관) |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **커밋 태그** | `[Claude]` |
| **상태** | 🔔 |

---

## [배경]

2026-07-27 완성도 점검 중, TeamB_Dev→develop 배치 병합(PR#884)으로 반영된 핵심 수정사항(AGENCY RLS, 입고 시 중량/부피 재계산 등)이 **실제 시드 데이터로는 재현·검증이 안 되는 상태**임을 로컬 DB 직접 조회로 확인. Edward 지시로 보완 Task 등록 및 Aiden 직접 처리.

## [확인된 결손]

1. `zen_orders.agency_org_id`가 채워진 오더 0건 — AGENCY 세션 rate_snapshot RLS(SELECT/UPDATE/INSERT) 재현 불가
2. UPS 오더의 `zen_order_packages` 치수(L/W/H) 사실상 전무 — 부피중량 재계산 검증 불가
3. `zen_organizations.volumetric_divisor` 26개 조직 전부 기본값(5000) — 5500/6000 변형 케이스 없어 DEF-B-016 재현 불가
4. `zen_tracking_configs` UPS provider 표본 부족(기존 1건은 API/MockCarrier)
5. 로그인 가능한 화주 계정(shipper@zenith.kr, test_shipper@zenith.kr) 인보이스 0건

## [부수 발견 — DEF-128]

작업 중 **로컬 Supabase DB가 2026-07-22~07-27 사이 추가된 마이그레이션 20개 이상을 전혀 반영하지 못한 상태**(schema_migrations 테이블에 해당 버전 기록 자체 없음, `supabase migration up --local`로 뒤늦게 일괄 적용)임을 발견 — 별도 결함(DEF-128)으로 등록 예정. 이 세션 전체에서 수행한 로컬 검증들이 실제로는 최신 RLS 정책이 반영 안 된 stale DB 기준이었을 가능성 있음(단, 회귀 테스트 자체는 자기완결형 fixture라 CI 기준으로는 문제 없었음 — SAR-2026-07-27-001 대응 방식 덕분).

## [조치]

`scripts/seed-local.ts`에 신규 함수 2개 추가:
- `seedUpsAgencyOrder()`: SNTL Sub-Agency Test 소속·TestShipper 화주의 UPS 오더(`UPS-SEED-AGENCY-001`) + 패키지(3kg, 40x30x25cm — volumetric > actual) + rate snapshot(`metadata.platform.totalSellingPrice` 포함) + UPS tracking config 생성. SNTL Sub-Agency Test의 `volumetric_divisor`를 5500으로 변경(기본값 아닌 케이스 확보)
- `seedShipperInvoices()`: shipper@zenith.kr(Global Shipper Corp)·test_shipper@zenith.kr(TestShipper) 소속 인보이스 각 1건 생성

`seed()` 메인 흐름에 두 함수 호출 추가(`seedOrders` 다음).

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-128 | 로컬 Supabase DB가 20개+ 마이그레이션 미반영 상태로 장기 방치 | Medium | 별도 보고서 작성 예정 |

---

## DoD

- [x] `scripts/seed-local.ts`에 픽스처 함수 2개 추가 + `seed()` 흐름 연결
- [x] 로컬 실행(`npx tsx scripts/seed-local.ts`) 후 실제 DB 조회로 5개 결손 항목 전부 채워짐 확인
  - `UPS-SEED-AGENCY-001`: agency_org_id 채워짐, volumetric_divisor=5500, 패키지 3kg/40x30x25cm, rate snapshot totalSellingPrice=249577, tracking config UPS
  - `INV-SEED-SHIPPER-001`(Global Shipper Corp)·`INV-SEED-TESTSHIPPER-001`(TestShipper) 인보이스 생성 확인
- [x] `npm run build` PASS
- [x] `npm run test:regression` 전체 PASS (134 files / 886 tests) — 단, 최초 실행 시 `supabase migration up --local` 미실행 상태(DEF-128)로 5건 FAIL 발견 → 마이그레이션 적용 후 재실행하여 전체 PASS 확인
- [x] 기존 시드/테스트 데이터 회귀 없음 확인(`verifySeedData()` 기존 체크 전부 PASS 유지)
- [ ] task file 작업 결과 최종 커밋 해시 기재(문서 커밋 시 갱신)
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

`scripts/seed-local.ts`에 `seedUpsAgencyOrder()`·`seedShipperInvoices()` 추가, `seed()` 흐름에 연결. 로컬 DB 직접 조회로 5개 결손 항목 전부 해소 확인. 작업 중 로컬 DB의 마이그레이션 20개+ 미반영 문제(DEF-128)를 부수 발견, `supabase migration up --local`로 해소 후 재검증 — 빌드 PASS, 회귀 134 files/886 tests 전체 PASS. 코드 커밋 해시는 아래 커밋 참조.

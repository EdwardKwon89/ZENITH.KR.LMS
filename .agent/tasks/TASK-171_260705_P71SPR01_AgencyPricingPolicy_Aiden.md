# TASK-171 — Phase 7.1 SPR-01: UPS Agency 할인율 정책 스키마 (IMP-145)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-171 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | Aiden (Claude, ZEN_CEO) — Edward 지시로 Team A 세션 직접 구현 |
| **Worker / Auditor** | Aiden(구현) / Aiden(자가검증, 회귀 393/393 PASS) — **Auditor 분리 생략 사유**: Edward가 본 세션에서 직접 "Team A가 수행" 지시, 별도 구현 Agent 미투입. 최종 승인은 Edward 단독. |
| **우선순위** | P1 |
| **전제조건** | 없음 (An-14 설계 승인) |
| **관련 IMP** | IMP-145 |
| **브랜치** | `feature/teama-phase71-ups-rate-management` |
| **커밋 태그** | `[Aiden]` |
| **상태** | 🔔 |

---

## [목표]

An-14(`docs/02_Analysis/An_14_Phase7_UPS요금관리_설계보완.md`) §3-1·3-2·3-3·3-7 기준 스키마를 구현한다.

## [작업 범위]

1. `zen_agency_pricing_policies` 신규 — Admin이 설정하는 대리점별 UPS 할인율 (R3)
2. `zen_agency_other_charges` 신규 — 대리점별 부가요금(OC) 오버라이드 (R8)
3. `zen_agency_rate_overrides` — `trg_agency_rate_override_calc_cost` BEFORE INSERT/UPDATE 트리거로 `cost_price` 자동계산(판매가×(1-할인율)), Agency가 보낸 값 무시. 정책 미등록 대리점은 등록 자체 차단.
4. `zen_ups_other_charges` — SNTL 원자료 대조로 확인된 현지통관/기타 부가수수료 4종(`DUTY_AMOUNT`·`TARIFF_LINES_FEE`·`INTL_PROCESSING_FEE`·`DISBURSEMENT_FEE`) 신규 시드
5. `fn_get_ups_agency_selling_price`·`fn_get_ups_agency_other_charge_price` SECURITY DEFINER 함수 — 화주 세션이 Agency의 `cost_price`/`discount_rate`(내부 정보)를 보지 않고 `selling_price`만 조회 가능하도록 함수 내부에서 호출자 검증(service_role·ADMIN/MANAGER·본인 대리점·소속 화주만 허용)

## [설계 확정]

An-14 §3, §0-1(SNTL 원자료 대조) 기준. 별도 📝 설계의견 단계 불요 — 문서 확정 내용 그대로 구현.

## [DoD]

- [x] `zen_agency_pricing_policies` 테이블 + RLS(ADMIN/MANAGER ALL, AGENCY 본인 SELECT만) 생성
- [x] `zen_agency_other_charges` 테이블 + RLS(ADMIN/MANAGER ALL, AGENCY 본인 ALL) 생성
- [x] `trg_agency_rate_override_calc_cost` 트리거 — 정책 미등록 시 INSERT 차단 확인
- [x] 트리거 — cost_price 자동계산(판매가×(1-할인율)) 확인, Agency 입력값 무시 확인 (INSERT/UPDATE 둘 다)
- [x] OC 4종 신규 시드(`fuel_surcharge_applicable=false`) 확인
- [x] SECURITY DEFINER 함수 2종 — service_role/ADMIN/본인/소속화주 외 접근 차단 로직 포함
- [x] `supabase gen types typescript --local` 재생성 → `src/types/supabase.ts` 반영
- [x] TC-UPS-AGPOL-01~05 신규 (`tests/integration/p71-ups-agency-pricing.test.ts`) 전량 PASS
- [x] `npm run test:regression` 전체 PASS — **393/393**
- [x] `LIVE_REGRESSION_TEST_MAP.md` TC-UPS-AGPOL-01~05 등재 + 헤더 갱신(393 Cases)
- [x] `npx tsc --noEmit` — 신규 파일 관련 신규 오류 0건 확인(기존 pre-existing 오류 8건과 무관 확인)
- [x] `supabase db reset --local` 전체 재생성 후 회귀 재확인
- [x] 코드 커밋 해시 기재 (하단 [작업 결과])
- [x] IMP_PROGRESS.md IMP-145 🔔 갱신
- [x] ACTIVE_TASK.md TASK-171 상태 🔄→🔔 반영

## [작업 결과]

| 파일 | 변경 내용 |
|:----|:---------|
| `supabase/migrations/20260705100000_imp145_ups_agency_pricing_policy.sql` | 신규 테이블 2종 + RLS + 트리거 + OC 4종 시드 + SECURITY DEFINER 함수 2종 |
| `src/types/supabase.ts` | `supabase gen types` 재생성 (신규 테이블 타입 반영) |
| `tests/integration/p71-ups-agency-pricing.test.ts` | TC-UPS-AGPOL-01~05 신규 (서비스 롤 실 DB 통합 테스트) |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | §37 신규 등재 + 헤더 갱신 |
| `scratch/IMP_PROGRESS.md` | IMP-145 행 추가 |
| `.agent/ACTIVE_TASK.md` | TASK-171 상태 반영 |

**검증 증적**:
- `npm run test:regression` → **393/393 PASS** (신규 5건 포함, 기존 388건 전량 유지)
- `npx tsc --noEmit` → 신규 코드 관련 오류 0건 (기존 8건은 본 작업과 무관한 pre-existing 이슈)
- `supabase db reset --local` → 전체 마이그레이션 재생성 성공, 트리거/함수 정상 등록 확인

**코드 커밋**: `ac2e81c` `[Claude] feat: TASK-171 IMP-145 UPS Agency 할인율 정책 스키마`

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음.

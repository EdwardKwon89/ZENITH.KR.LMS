# TASK-B-269: Issue #1035 / DEF-B-042 — UPS 유류할증료 실데이터 미반영(placeholder 고정)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1035](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1035) |
| **DEF** | [DEF-B-042](../defects/DEF-B-042_UPS유류할증료_실데이터미반영_placeholder값사용.md) |
| **배경** | JSJung이 UPS 공식 "90일 유류 할증료 이력" 캡처 제공 → Jaison이 구현 DB와 대조, 값이 약 3배 낮은 placeholder임을 확정 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-10 |
| **완료일** | 2026-08-10 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 근본 원인 (Issue #1035 / DEF-B-042 참조)

`supabase/migrations/20260628000000_ups_seed_data.sql:79-92`가 `CURRENT_DATE` 기준 "이번 주"에 하드코딩 placeholder(`selling_rate=0.185, cost_rate=0.155`)를 매 DB reset마다 자동 삽입 — 실제 UPS 공지값(2026/08/10 기준 46.75%)이 한 번도 반영된 적 없음. `zen_ups_fuel_surcharges`에 현재 1주(2026-08-10)만 존재, 과거 이력 전무.

`pricing-engine.ts:190-206, 325-344`가 이 값을 견적/원가 계산에 직접 사용 → 실 청구·정산까지 영향(DEF-B-041과 달리 표시 전용 아님).

## UPS 공식 발표 실데이터 (반영 대상, 13주)

| 효력 발생일(월요일) | 할증료 |
|:---|:---:|
| 2026-08-10 | 46.75% |
| 2026-08-03 | 46.25% |
| 2026-07-27 | 44.75% |
| 2026-07-20 | 40.50% |
| 2026-07-13 | 39.25% |
| 2026-07-06 | 39.00% |
| 2026-06-29 | 39.25% |
| 2026-06-22 | 42.25% |
| 2026-06-15 | 43.75% |
| 2026-06-08 | 43.25% |
| 2026-06-01 | 50.25% |
| 2026-05-25 | 50.25% |
| 2026-05-18 | 49.50% |

## 수정 방향 (설계 확정 — 착수 승인)

**[JSJung 확인 완료, 2026-08-10]**: "판매할증은 의미가 없다, UPS 공지값 그대로 사용" — `selling_rate = cost_rate = UPS 공지값`으로 마진 없이 동일 적용 확정. 기존 placeholder의 selling/cost 차등(18.5%/15.5%)은 이번 수정으로 폐기.

1. **신규 마이그레이션 추가**(seed 스크립트 직접 수정 금지 — 이미 병합된 시드 스크립트는 과거 재현성을 위해 그대로 두고, 후속 마이그레이션으로 실데이터를 upsert):
   - `zen_ups_products` 전체 상품(현재 7종) × 13주 각각에 대해 `INSERT ... ON CONFLICT (product_id, effective_week) DO UPDATE SET selling_rate = EXCLUDED.selling_rate, cost_rate = EXCLUDED.cost_rate`로 값을 덮어씀.
   - `product_id IS NULL`(전체 적용) 행도 동일하게 13주 upsert.
   - **`selling_rate`와 `cost_rate` 값**: 위 확정에 따라 두 컬럼 모두 이미지의 UPS 공지값과 동일하게 삽입(예: 2026-08-10 → selling_rate=0.4675, cost_rate=0.4675). 상품별/판매·원가 구분 없이 13주 전부 동일 로직 적용.
   - `effective_week` 값은 실제 날짜(2026-05-18 ~ 2026-08-10)로 고정 삽입 — seed처럼 `CURRENT_DATE` 기반 동적 계산 사용 금지(과거 이력이므로 고정일이 맞음).
2. **재발 방지**: 이번 마이그레이션이 추후 DB reset 시에도 유지되도록(기존 seed 스크립트는 `ON CONFLICT DO NOTHING`이라 이번 마이그레이션이 나중에 실행되면 값이 정확히 덮어써지는지 마이그레이션 실행 순서/타임스탬프 확인 — 파일명 타임스탬프가 seed 스크립트(`20260628...`)보다 뒤여야 함).
3. **화면 구조 변경 없음** — 데이터 교정 + 재발방지용 마이그레이션 추가가 전부. `pricing-engine.ts` 로직 자체는 변경하지 않음(주차 선택 로직은 정상 동작 확인만).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-269-fuel-surcharge-real-data` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/baker` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-269 확인
- [ ] 신규 마이그레이션 작성 — 13주 × 전 상품(개별 7종 + NULL 전체) upsert, `selling_rate = cost_rate = UPS 공지값`(JSJung 확정, 위 "수정 방향" 참조)
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - DB reset 후 `zen_ups_fuel_surcharges`에 13주 이력이 정확한 날짜·값으로 존재하는지 검증(실 DB 쿼리 기반 통합 테스트)
  - `pricing-engine.ts`가 특정 조회일 기준 올바른 주차(effective_week ≤ 조회일 중 최신)를 선택하는지 기존 테스트(`pricing-engine.test.ts`) 통과 확인 — 로직 미변경이므로 회귀 확인 위주
  - **되돌리기 검증 필수** — 신규 마이그레이션 제거 시 기존 18.5%/15.5% 단일 placeholder로 복귀하는지 확인 후 결과를 task file에 기재
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) `/admin/ups-rates` 유류할증 탭에서 13주 이력이 화면에 정확히 표시되는지 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-269 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1035 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1035`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-265는 3중 결함(로직+DB트리거+RPC)을 단일 시도로 절차 정확히 준수하며 완료 — 동일 수준 기대. `selling_rate` 정책은 위 확정대로 진행하면 됨(추가 확인 불필요).

## [작업 결과]

- **커밋**: `f7abfbff` `[Baker] fix: TASK-B-269 Issue #1035/DEF-B-042 UPS 유류할증료 placeholder(18.5%/15.5%) → UPS 공지 실데이터 13주 반영 (2026-05-18~08-10, 최신 46.75%)` — `supabase/migrations/20260810140000_ups_fuel_surcharge_real_data.sql` + `tests/unit/migrations/defb042-fuel-surcharge-real-data.test.ts` (2 files, +141)
- **마이그레이션** `20260810140000_ups_fuel_surcharge_real_data.sql`:
  - `CREATE TEMP TABLE fuel_weeks (effective_week date, rate numeric) ON COMMIT DROP` — 13주 실데이터(2026-05-18~2026-08-10) 정의
  - Postgres UNIQUE는 NULL을 서로 다른 값으로 취급 → `ON CONFLICT`로 기존 `product_id IS NULL` 행을 덮어쓸 수 없음 → **13주 해당 기존 NULL 행을 먼저 DELETE** 후 재삽입(placeholder 제거)
  - `selling_rate = cost_rate = UPS 공지값`(JSJung 확정) — NULL(전체) 1행 + zen_ups_products 8종, 총 117행 = 13주 × 9
  - 실제 상품은 **8종**(DB 실측, task 문서의 7종과 상이 — `CROSS JOIN zen_ups_products`로 동적 커버)
  - 파일명 타임스탬프(`20260810140000`)가 시드(`20260628...`)보다 뒤 → DB reset 시 시드 placeholder 삽입 후 이 마이그레이션이 덮어씀(재발 방지 확인)
- **테스트** `tests/unit/migrations/defb042-fuel-surcharge-real-data.test.ts` — **TC-269-01~06 6건 ALL PASS**:
  - TC-269-01: 13주 NULL 행 값 정합(2026-08-10=0.4675 ... 2026-05-18=0.4950)
  - TC-269-02: 상품 행(WW_EXPRESS_NONDOC @ 2026-08-10 = 0.4675/0.4675)
  - TC-269-03: 총 행 수 117 = 13주 × (상품 8종 + NULL 1)
  - TC-269-04: 전 행 selling_rate = cost_rate
  - TC-269-05: placeholder 잔존 0건(0.185/0.155 없음)
  - TC-269-06: 조회 로직 — 최신 유효 주차 2026-08-10, 0.4675/0.4675 (pricing-engine의 `.lte(effective_week, refDate)` 선택 재현)
- **회귀**: `npm run test:regression` → **157/157 files · 1093/1093 tests ALL PASS** / `npm run build` **SUCCESS** (24.3s)
- **되돌리기 검증**: 신규 마이그레이션 제거 후 `db reset` → 2026-08-10 단일 placeholder(0.185/0.155, 7행) 복귀 확인 → 복원 후 117행/13주 확인
- **tsc**: 57 errors 전부 pre-existing(베이스와 동일 확인), 신규 파일 0건
- **(R-10) 브라우저 검증**: admin@zenith.kr 로그인 → `/ko/admin/ups-rates` 유류할증 탭 — **13주 전체(2026-05-18~2026-08-10), 117행 표시, 2026-08-10 46.8%** (표시 반올림), placeholder(18.5%/15.5%) 미표시 확인. 스크린샷 `/tmp/r10-269-1-login.png`, `/tmp/r10-269-3-fuel-tab.png`, `/tmp/r10-269-4-final.png`
  - 참고: 로그인 실패 1회는 `db reset` 후 `scripts/seed-local.ts` 미실행으로 admin 계정 부재가 원인 — 시드 실행 후 해결 (테스트 DB 관리 이슈, 코드 결함 아님)

## [발견 이슈]

- 없음 (Task 범위 내)
- 참고: task 문서에 zen_ups_products 7종이라 기재되어 있으나 실제 DB는 8종(UPX_DOC 미존재, WW_SAVER_DOC/WW_SAVER_NONDOC 포함) — migration은 `CROSS JOIN`으로 동적 대응하여 영향 없음

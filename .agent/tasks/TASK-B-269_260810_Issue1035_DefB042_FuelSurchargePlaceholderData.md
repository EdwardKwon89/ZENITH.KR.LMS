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

1. **신규 마이그레이션 추가**(13주 실데이터 upsert):
   - `zen_ups_products` 전체 상품 × 13주 각각에 대해 `INSERT ... ON CONFLICT (product_id, effective_week) DO UPDATE SET selling_rate = EXCLUDED.selling_rate, cost_rate = EXCLUDED.cost_rate`로 값을 덮어씀.
   - `product_id IS NULL`(전체 적용) 행도 동일하게 13주 upsert(단, UNIQUE 제약의 NULL 처리상 ON CONFLICT가 매칭되지 않으므로 DELETE 후 INSERT 필요 — v1에서 정확히 구현됨, 이 부분은 v2에서도 그대로 유지).
   - **`selling_rate`와 `cost_rate` 값**: 두 컬럼 모두 이미지의 UPS 공지값과 동일하게 삽입(예: 2026-08-10 → selling_rate=0.4675, cost_rate=0.4675).
   - `effective_week` 값은 실제 날짜(2026-05-18 ~ 2026-08-10)로 고정 삽입.
2. **[v2 필수 — v1 반려 사유, 설계 지시 정정]** ~~"seed 스크립트 직접 수정 금지"~~ **이 지시를 철회합니다.** `supabase/migrations/20260628000000_ups_seed_data.sql`은 `CURRENT_DATE` 기준 "이번 주"에 fuel_surcharge placeholder(0.185/0.155)를 삽입하는데, `db reset`은 매번 전체 migration을 재실행하므로 이 INSERT도 매 reset마다 실제 wall-clock 날짜로 재실행됩니다. 13주 고정 데이터만 추가해서는 2026-08-17(다음 월요일)부터 이 seed가 13주 범위 밖의 새 placeholder를 계속 만들어내고, `getUpsFuelSurcharge()`가 "effective_week ≤ 오늘 중 최신"을 선택하므로 **이 placeholder가 매주 실제 UPS 데이터보다 우선 적용되어 픽스가 자동으로 원복됩니다**(Jaison이 트랜잭션 시뮬레이션으로 재현 확인, PR#1037 리뷰 코멘트 참조). → `20260628000000_ups_seed_data.sql`의 fuel_surcharges INSERT 2건에 `WHERE NOT EXISTS (SELECT 1 FROM public.zen_ups_fuel_surcharges)` 조건을 추가해, 이번 마이그레이션 적용 후에는 seed가 더 이상 아무것도 삽입하지 않도록 수정할 것.
3. **화면 구조 변경 없음** — `pricing-engine.ts` 로직 자체는 변경하지 않음(주차 선택 로직은 정상 동작 확인만).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-269-fuel-surcharge-real-data` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/baker` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-269 확인
- [ ] 신규 마이그레이션 작성 — 13주 × 전 상품(개별 7종 + NULL 전체) upsert, `selling_rate = cost_rate = UPS 공지값`(JSJung 확정, 위 "수정 방향" 참조)
- [ ] `20260628000000_ups_seed_data.sql`의 fuel_surcharges INSERT 2건에 `WHERE NOT EXISTS (...)` 조건 추가(v2 필수 항목, 위 "수정 방향" 2번 참조)
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - DB reset 후 `zen_ups_fuel_surcharges`에 13주 이력이 정확한 날짜·값으로 존재하는지 검증(실 DB 쿼리 기반 통합 테스트)
  - **총 행수 카운트 등 테이블 전체를 대상으로 하는 assertion은 13주 범위로 필터링해서 작성할 것** — 무조건적 `SELECT COUNT(*) FROM zen_ups_fuel_surcharges`(필터 없음)은 seed 재실행과 충돌 가능성이 있어 지양(v1 반려 사유)
  - `pricing-engine.ts`가 특정 조회일 기준 올바른 주차(effective_week ≤ 조회일 중 최신)를 선택하는지 기존 테스트(`pricing-engine.test.ts`) 통과 확인 — 로직 미변경이므로 회귀 확인 위주
  - **되돌리기 검증 필수** — 신규 마이그레이션 제거 시 기존 18.5%/15.5% 단일 placeholder로 복귀하는지 확인 후 결과를 task file에 기재
  - **신규 권장**: seed의 `WHERE NOT EXISTS` 조건 추가 후, 13주 범위 밖의 미래 주차(예: 2026-08-17)로 CURRENT_DATE를 시뮬레이션했을 때 placeholder가 더 이상 생성되지 않음을 확인(트랜잭션 내 직접 INSERT 시도 후 조건이 막는지, 또는 seed 로직 자체를 psql로 직접 재현)
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) `/admin/ups-rates` 유류할증 탭에서 13주 이력이 화면에 정확히 표시되는지 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-269 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1035 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1035`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-265는 3중 결함(로직+DB트리거+RPC)을 단일 시도로 절차 정확히 준수하며 완료 — 동일 수준 기대. `selling_rate` 정책은 위 확정대로 진행하면 됨(추가 확인 불필요).

## [Jaison 검토] v1 반려 (PR#1037, 2026-08-10)

13주 실데이터 값·구조(NULL 컬럼 DELETE+INSERT 우회 포함)는 정확했으나, 신규 회귀 테스트 3건(총행수/mismatch/leftover 무조건 카운트)이 2026-08-17부터 매주 fresh reset 시 결정적으로 FAIL하도록 설계됨 — 더 심각하게는 seed 스크립트의 `CURRENT_DATE` 기반 placeholder가 매주 실제 데이터보다 최신으로 선택되어 **이 픽스 자체가 매주 자동 원복**되는 구조적 결함 확인(트랜잭션 시뮬레이션으로 재현, PR#1037 코멘트 참조). 원인은 제가 최초 설계에서 "seed 스크립트 수정 금지"로 지시한 데 있음 — 위 "수정 방향" 2번으로 지시 정정. PR 반려·close, 병합 없음. v2 착수 가능(승인 완료, 재확인 불필요).

## [작업 결과]

### v1 (PR#1037 — Jaison 반려: 매주 자동 원복 시한폭탄)

- **커밋**: `f7abfbff` `[Baker] fix: TASK-B-269 Issue #1035/DEF-B-042 UPS 유류할증료 placeholder(18.5%/15.5%) → UPS 공지 실데이터 13주 반영 (2026-05-18~08-10, 최신 46.75%)` — `supabase/migrations/20260810140000_ups_fuel_surcharge_real_data.sql` + `tests/unit/migrations/defb042-fuel-surcharge-real-data.test.ts` (2 files, +141)
- **마이그레이션** `20260810140000_ups_fuel_surcharge_real_data.sql`:
  - `CREATE TEMP TABLE fuel_weeks (effective_week date, rate numeric) ON COMMIT DROP` — 13주 실데이터(2026-05-18~2026-08-10) 정의
  - Postgres UNIQUE는 NULL을 서로 다른 값으로 취급 → `ON CONFLICT`로 기존 `product_id IS NULL` 행을 덮어쓸 수 없음 → **13주 해당 기존 NULL 행을 먼저 DELETE** 후 재삽입(placeholder 제거)
  - `selling_rate = cost_rate = UPS 공지값`(JSJung 확정) — NULL(전체) 1행 + zen_ups_products 8종, 총 117행 = 13주 × 9
  - 실제 상품은 **8종**(DB 실측, task 문서의 7종과 상이 — `CROSS JOIN zen_ups_products`로 동적 커버)
  - 파일명 타임스탬프(`20260810140000`)가 시드(`20260628...`)보다 뒤 → DB reset 시 시드 placeholder 삽입 후 이 마이그레이션이 덮어씀(재발 방지 확인)
- **테스트** `tests/unit/migrations/defb042-fuel-surcharge-real-data.test.ts` — TC-269-01~06 6건 PASS:
  - TC-269-01: 13주 NULL 행 값 정합(2026-08-10=0.4675 ... 2026-05-18=0.4950)
  - TC-269-02: 상품 행(WW_EXPRESS_NONDOC @ 2026-08-10 = 0.4675/0.4675)
  - TC-269-03: 총 행 수 117 = 13주 × (상품 8종 + NULL 1)
  - TC-269-04: 전 행 selling_rate = cost_rate
  - TC-269-05: placeholder 잔존 0건(0.185/0.155 없음)
  - TC-269-06: 조회 로직 — 최신 유효 주차 2026-08-10, 0.4675/0.4675 (pricing-engine의 `.lte(effective_week, refDate)` 선택 재현)
- **회귀**: `npm run test:regression` → **157/157 files · 1093/1093 tests ALL PASS** / `npm run build` **SUCCESS** (24.3s)
- **되돌리기 검증**: 신규 마이그레이션 제거 후 `db reset` → 2026-08-10 단일 placeholder(0.185/0.155, 7행) 복귀 확인 → 복원 후 117행/13주 확인
- **tsc**: 57 errors 전부 pre-existing(베이스와 동일 확인), 신규 파일 0건
- **(R-10) 브라우저 검증**: admin@zenith.kr 로그인 → `/ko/admin/ups-rates` 유류할증 탭 — **13주 전체(2026-05-18~2026-08-10), 117행 표시, 2026-08-10 46.8%** (표시 반올림), placeholder(18.5%/15.5%) 미표시 확인

### v2 (Jaison 반려 대응 — PR#1037 → 반려 → 재작업)

- **반려 사유** (Jaison 2026-08-10, Critical): seed `20260628000000_ups_seed_data.sql`이 `CURRENT_DATE` 기반 "이번 주" placeholder를 매 `db reset`마다 재삽입 → PR#1037 마이그레이션의 13주 범위(≤2026-08-10)를 벗어난 **2026-08-17부터 placeholder가 살아남아 매주 자동 원복**되고, `getUpsFuelSurcharge()`(`rates.ts:73`)가 `effective_week ≤ 오늘` 중 최신을 선택하므로 placeholder가 실제 데이터보다 항상 최신으로 선택되는 결함.
- **커밋**: `cc38b85b` `[Baker] fix: TASK-B-269 v2 — seed placeholder 매주 자동 원복 결함 차단` (3 files, +95/-19)
- **수정 3건** (Jaison 요청 v2 + 실질 차단 보강):
  1. **seed 가드** (Jaison 요청 v2-1): `20260628000000_ups_seed_data.sql`의 fuel_surcharges 두 INSERT를 `DO ... IF NOT EXISTS (SELECT 1 FROM zen_ups_fuel_surcharges)` 블록으로 래핑 — 테이블에 이미 데이터가 있으면 placeholder 삽입 차단. (개별 `WHERE NOT EXISTS`는 첫 INSERT 실행 후 두 번째가 스킵되는 순차 함정이 있어 DO 블록으로 단일 검사)
  2. **값 기반 DELETE** (실질 원복 차단 보강): `20260810140000_ups_fuel_surcharge_real_data.sql` 상단에 `DELETE FROM zen_ups_fuel_surcharges WHERE selling_rate = 0.185 AND cost_rate = 0.155` 추가 — **fresh reset에서 seed는 빈 테이블에 먼저 실행되어(20260628 < 20260810) seed 가드만으론 placeholder가 여전히 삽입되므로, 주차와 무관하게 placeholder 값을 값으로 즉시 제거**해 절대 살아남지 못하게 함.
  3. **테스트 보강**:
     - TC-269-03/04/05: Jaison 요청대로 **13주 범위 필터**(`BETWEEN '2026-05-18' AND '2026-08-10'`)로 미래 주차 추가에 견고하게 재작성
     - **TC-269-07 (신설)**: 시간흐름 시뮬레이션 — (a) 실데이터 존재 시 seed fuel INSERT 재실행 → NOT EXISTS 가드로 placeholder 미생성 (행수 불변) (b) 미래 주차(2026-08-17) placeholder 강제 삽입 → 재현 확인(1행) (c) 값 기반 DELETE 로직 적용 → 제거 확인(0행, 행수 불변)
- **회귀**: `npm run test:regression` → **157/157 files · 1094/1094 tests ALL PASS** (v1 대비 +1 = TC-269-07) / `npm run build` **SUCCESS** (28.9s)
- **tsc**: 57 errors 전부 pre-existing, 신규/변경 파일 0건
- **DB 검증**: fresh `db reset` 후 `117행 · 13주 · placeholder 0건` (seed placeholder 삽입 → 값 기반 DELETE 제거 → 실데이터 13주 확인)
- **(R-10) 브라우저 검증**: 유류할증 탭 — **13주 전체·117행·2026-08-10 46.8% 표시, placeholder(18.5%/15.5%) 미표시** 재확인 (스크린샷 `/tmp/r10-269-4-final.png`)

## [발견 이슈]

- 없음 (Task 범위 내)
- 참고: task 문서에 zen_ups_products 7종이라 기재되어 있으나 실제 DB는 8종(UPX_DOC 미존재, WW_SAVER_DOC/WW_SAVER_NONDOC 포함) — migration은 `CROSS JOIN`으로 동적 대응하여 영향 없음

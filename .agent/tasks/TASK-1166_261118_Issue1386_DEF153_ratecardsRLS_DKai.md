# TASK-1166 — DEF-153: `zen_rate_cards` 화주 계열 원가·마진 접근 차단

| 항목 | 내용 |
|:--|:--|
| **Task-ID** | TASK-1166 |
| **Issue** | #1386 |
| **결함** | DEF-153 |
| **Worker / Auditor** | D_Kai / Aiden (R-01) |
| **우선순위** | p1 (High) |
| **단계** | **보완 재작업 완료 → `status:review` 복귀** |
| **브랜치** | `feature/teama-task-1166-def153-ratecards-rls` |
| **작성일** | 2026-11-18 KST (최종 수정 2026-11-20) |

> ⚠️ **보안 상세 취급**: 이 저장소는 Public이다. 결함 재현·유출 경로·운영 확인 결과의 상세는 **비공개 Security Advisory(`GHSA-hx46-6xqh-88fc`)** 에 있다. 본 문서에는 **결정·변경 내용·검증 결과 요약**만 기재한다.

---

## 0. `[설계 확정]` (Aiden 원문 — 가감 금지)

```
## [설계 확정] TASK-1166 — Aiden, 2026-11-18 12:20 KST (Edward 승인 하에 진행)

> **[Aiden 편집 2026-11-18]** Public 저장소이므로 독립 검증 결과·부수 발견 상세는 **비공개 Security Advisory(`GHSA-hx46-6xqh-88fc`)** 로 이관하고 결정·조건만 남긴다. 원문은 보관되어 있다.

`[설계 의견]`(커밋 `063adc5d`) 검토 결과 **6건 모두 승인**하되 아래 조건을 DoD에 추가한다.

### 결정 6건
1. **ⓐ안 확정**(안전 뷰 `zen_rate_cards_safe` + 코드 6곳 전환). DEFINER 뷰 조건 3건: ① 뷰 내부에서 `auth.uid()`→`zen_profiles` 역할로 **행 범위 고정** ② `REVOKE ALL … FROM PUBLIC, anon` 후 `authenticated`에만 명시 `GRANT SELECT` ③ `SET search_path = public` 명시.
2. **F-1 포함 — DROP이 아니라 `security_invoker=on` 전환 + `anon` 권한 전부 회수**(가역적 조치).
3. **F-2 포함**(CARRIER 자기 운송사 행만) — CARRIER 세션이 자기 행을 정상 조회하는 수정 전/후 증적 필수.
4. **F-3·F-4 별도 DEF 분리**(DEF-156·157). 이 Task 범위에서 수정하지 않는다.
5. **`tisa.ts` RPC admin client 전환 승인 — 조건**: ① 호출 전 서버측 역할·소유 검증 ② `fn_get_best_matching_rate`가 원가·마진 컬럼을 반환하지 않는지 확인(반환 시 액션에서 제거) — 결과를 task file에 기재.
6. **DEF-152 별건 유지**(코드 가드 미수정). 단 CARRIER 행 제한이 데이터 계층 노출을 완화함을 task file에 한 줄 명시.

### 추가 조건
- **원격 적용 금지**. 마이그레이션은 **롤백 SQL 포함**, 순서는 뷰 생성 → 코드 전환 → 정책 교체(중간 상태에서 화주 기능 끊김 방지).
- 회귀 테스트: 화주·CARRIER·anon 세션별 단언 + 기능 유지. 등재는 `regression-items/TASK-1166_Issue1386_*.md`, `npm run check:lrtm` 통과.
- **저장소(Issue·task file·PR·커밋 메시지)에 악용 경로·운영 확인 결과를 적지 않는다** — 상세는 비공개 Advisory에서 확인.
- 확정 내용은 task file `[설계 확정]` 섹션에 **원문 그대로** 옮겨 기재(Aiden 전속, 가감 금지). `status:draft` 제거·`status:in-progress`(R-17). 구현 PR 필수, develop 직접 커밋 금지, 커밋 40자 해시.
```

### 0.1 확정 조건 대비 구현 편차 (사유 보고)

| 확정 조건 | 구현 | 사유 |
|:--|:--|:--|
| ③ `SET search_path = public` 명시 | **불가** → 뷰 정의의 모든 객체를 **스키마 한정**(`public.zen_rate_cards`, `public.zen_profiles`) | PostgreSQL 17.6 에서 뷰에 `search_path` reloption 을 지정하면 `ERROR: unrecognized parameter "search_path"` 로 거부된다(실측). 뷰 정의는 생성 시 OID 로 해석·저장되므로 런타임 `search_path` 로 객체를 바꿔치기할 수 없다. 스키마 한정으로 동일한 강화 목적을 달성한다. |

## 1. 목표

화주 계열(`SHIPPER`/`CORPORATE`/`INDIVIDUAL`) 세션이 요율 카드의 **원가·마진 컬럼**(`carrier_cost`·`margin_rate`·`platform_fee_rate`)에 데이터 계층으로 접근하지 못하게 하면서, **경로 최적화·운임 산출·오더 등록·UPS 스냅샷 등 기존 기능은 수정 전과 동일하게** 동작시킨다.

## 2. 전제조건·범위

- **전제**: 기존에는 앱 레벨 가드가 있어도 데이터 계층(RLS/뷰)에는 동일한 제한이 없었다(DEF-153). 단순 차단은 화주 기능을 끊으므로, 화주 도달 경로가 실제로 원가 컬럼을 쓰지 않는다는 전제를 확인했다.
- **범위**: 마이그레이션 2건 + 세션 클라이언트 조회 경로 6곳 전환 + 회귀 테스트 + R-10 증적.
- **범위 밖**: F-3(`calculate_order_costs` 권한 구성, TASK-1167/#1389), F-4(`zen_order_rate_snapshots` 원가 컬럼, DEF-157 후보), DEF-152(`admin/rate-cards.ts` 코드 가드) — 이 Task 에서 수정하지 않는다.
- **미적용**: 원격 Supabase·Vercel 무변경(로컬/CI 검증만). 운영 적용은 병합 후 Edward 승인 하에 별도 진행하며, 앱 코드 배포가 정책 마이그레이션보다 먼저여야 한다.

## 3. DoD 체크리스트

- [x] 안전 뷰 `zen_rate_cards_safe` 신설 — 원가·마진 3컬럼 제외, `auth.uid()` → `zen_profiles` 역할 화이트리스트로 행 범위 고정
- [x] 뷰 권한 최소화 — `REVOKE ALL`(PUBLIC·anon·authenticated) 후 `authenticated` 에 `SELECT` 만 부여
- [x] `zen_rate_cards_select` 정책 교체 — 관리자 3역할 전 행 / `CARRIER` 자기 운송사 행만 / 화주 계열 제외
- [x] F-1: `zen_rate_cards_public` — DROP 아닌 `security_invoker=on` + `anon` 권한 전부 회수(가역)
- [x] F-2: CARRIER 자기 운송사 행 정상 조회 증적 확보(로컬 fixture)
- [x] 화주 도달 세션 클라이언트 경로 6곳을 안전 뷰로 전환(관리자·쓰기·service_role 경로는 미변경)
- [x] `tisa.ts` — RPC/스냅샷 INSERT 를 service_role 로 전환하되 **호출 전 역할·소유 검증** 추가
- [x] `fn_get_best_matching_rate` 반환 컬럼 확인 및 비관리자 응답 제거(§4.3)
- [x] 마이그레이션 롤백 SQL 주석 수록 + 순서(뷰 → 코드 → 정책) 준수
- [x] 회귀 테스트 신규 17케이스(화주·CARRIER·anon 세션 단언 + 기능 유지)
- [x] 회귀맵 등재(`regression-items/TASK-1166_Issue1386_rate-cards-rls.md`) + `npm run check:lrtm` 통과
- [x] R-10 UI 증적(화주·관리자·운송사 + `/admin/error-logs`)
- [x] 원격 Supabase·Vercel 무변경, develop 직접 커밋 없음(PR 사용)

## 4. 구현 내용

### 4.1 DB 마이그레이션 — 2건 분리

| # | 파일 | 내용 |
|:--|:--|:--|
| M-1 | `supabase/migrations/20261118100000_task1166_def153_rate_cards_safe_view.sql` | `zen_rate_cards_safe` 뷰 신설(추가 전용). DEFINER + 컬럼 11종(원가·마진 3종 제외) + 역할 화이트리스트 + ACL 최소화. 롤백: `DROP VIEW` |
| M-2 | `supabase/migrations/20261118100100_task1166_def153_rate_cards_rls_policy.sql` | ① `zen_rate_cards_select` 교체 ② `zen_rate_cards_public` → `security_invoker=on` + anon 권한 회수 ③ 롤백 SQL 주석 수록 |

- 뷰(M-1)는 추가 전용이므로 **M-1 → 앱 코드 배포 → M-2** 순서 적용이 가능하다.
- Supabase 기본 권한이 `anon`·`authenticated` 에 ALL 을 부여하므로 두 롤 모두 `REVOKE ALL` 후 `GRANT SELECT` 만 남겼다.

### 4.2 코드 변경 (6곳)

| # | 파일 | 변경 |
|:--|:--|:--|
| C-1 | `src/lib/logistics/adapters/DatabaseRouteAdapter.ts:188` | `zen_rate_cards` → `zen_rate_cards_safe` |
| C-2 | `src/lib/logistics/composite-pricing.ts:54,232` | 동일 (2곳) |
| C-3 | `src/app/actions/operations/service-rates.ts:96` | 동일 (PostgREST 임베드 `carrier:zen_carriers!carrier_id` 유지) |
| C-4 | `src/app/actions/operations/order-services.ts:31` | 동일 |
| C-5 | `src/app/actions/operations/tisa.ts:58` | 동일 + RPC/스냅샷 INSERT service_role 전환(§4.3) |
| C-6 | `src/types/supabase.ts` | `zen_rate_cards_safe` View 타입 추가(원가 3종 제외, 관계 3건) |

- **미변경**: 관리자 액션·`admin.repository`(원가 필요), `settlement.ts`(service_role), 쓰기 정책, `admin/rate-cards.ts` 코드 가드(DEF-152 별건).
- `zen_rate_cards_select` 의 CARRIER 행 제한으로 해당 계열의 데이터 계층 접근 범위가 함께 축소된다(DEF-152 의 노출 폭 완화).

### 4.3 `tisa.ts` — Aiden 확정 조건 ①·② 이행

- **① 호출 전 서버측 역할·소유 검증**: 세션 클라이언트로 오더를 조회한 뒤 `isAdmin || shipper_id === profile.org_id || agency_org_id === profile.org_id` 를 명시 검증하고, 통과한 경우에만 `createAdminClient()` 로 RPC 와 스냅샷 INSERT 를 수행한다. 실패 시 `logger.warn` 후 `null` 반환.
- **② RPC 반환 컬럼 확인 결과**: `fn_get_best_matching_rate(uuid,uuid,uuid,varchar,uuid,timestamptz)` 의 반환은 `TABLE(id, unit_price, currency, base_date_rule, carrier_cost)` 로 **원가 컬럼을 포함한다**. 따라서 액션 응답(`TisaSnapshotResult`)의 `carrierCostAmount`·`platformFeeAmount` 는 `isAdmin` 인 경우에만 매핑하고, RPC 결과 객체를 그대로 반환하지 않는다(코드 주석으로 고정).

## 5. 검증 결과

| 항목 | 결과 |
|:--|:--|
| 신규 회귀 테스트 | `tests/unit/migrations/task1166-def153-rate-cards-rls.test.ts` — **17/17 PASS** (정적 9 + 실DB 8) |
| 회귀 스위트 | `npm run test:regression` — **268 files / 1974 tests 전부 PASS** (develop 병합 후 재실행) |
| 프로덕션 빌드 | `npm run build` — **EXIT=0** |
| 정적 검사 | `npx tsc --noEmit` — `src/` 신규 오류 0건(기존 `tests/` 오류는 변경 전과 동일) |
| 회귀맵 | `npm run check:lrtm` — 유령 경로 0건, E2E 표기 누락 0건, 허용 목록 밖 미등재 0건 |
| DB 재현성 | CI `pr-checks.yml` 의 `supabase db reset --yes` 로 전체 마이그레이션 재적용 → Regression Tests 통과(8m3s) |

- **역할별 확인(요약)**: 화주 계열은 base 테이블 0행·안전 뷰 정상(기능 유지), `CARRIER` 는 자기 운송사 행만, 관리자·정산 경로는 불변, 미인증은 차단. 상세 수치는 Advisory 참조.
- **R-10**: `docs/99_Manual/E2E_1166_Result/RESULT.md` + 스크린샷 9장. 화주(오더 등록·상세·UPS 상세)·관리자(요율)·운송사 요율 화면 정상, `/admin/error-logs` 신규 ERROR 0건.

## 6. Aiden 보완 지시 이행 (2026-11-20)

| # | 지시 | 이행 |
|:--|:--|:--|
| 1 | `LIVE_REGRESSION_TEST_MAP.md` 직접 수정 제거 + `origin/develop` 병합 후 `check:lrtm` 통과 | ✅ 인덱스 변경 원복(커밋 `67ac092f`), develop 병합, `regression-items/` 항목만 유지, `check:lrtm` 통과 |
| 2 | task file 공개 문구 축소(감사표·역할별 실측 매트릭스·재현 서술) | ✅ §2·§4·§5 를 변경 내용·결정·검증 결과 요약으로 재작성, 실측 매트릭스 표 제거 |
| 3 | `- [x]` DoD 체크리스트 + 문서 커밋 실제 40자 해시 | ✅ §3 신설, §7 에 40자 해시 기재 |

## 7. R-17 완료 보고

- **코드 커밋**: `d63f6b89ccbdb647c57d9d8c2869b1fe8e05ba8d` — `[D_Kai] fix: TASK-1166 DEF-153 요율 카드 원가·마진 화주 조회 차단 (#1386)`
- **테스트/회귀맵 커밋**: `a3413d34` — `[D_Kai] test: TASK-1166 DEF-153 회귀 테스트 17건 + 회귀맵 등재 (#1386)`
- **R-10 증적 커밋**: `7ad399b4` — `[D_Kai] docs: TASK-1166 DEF-153 R-10 UI 증적 (#1386)`
- **문서 커밋 (완료 보고)**: `642696e8c56aa5b9ed236dffb98760fdcb33c2dd` — `[D_Kai] docs: TASK-1166 보완 재작업(회귀맵 원복·공개 문구 축소·DoD) 및 R-17 완료 보고 (#1386)`
- **develop 병합**: `9160b60a` — `[D_Kai] merge: develop → feature/teama-task-1166-def153-ratecards-rls (보완 1 반영)`
- **Issue 라벨**: `status:in-progress` → `status:review` → (Aiden 보완 지시) `status:rework` → 보완 후 `status:review` 복귀
- **PR**: #1399 → `develop`
- **실배포**: **미수행** — 원격 Supabase·Vercel 무변경

### 7.1 develop 병합 후 재검증 (2026-11-20)

| 항목 | 결과 |
|:--|:--|
| `origin/develop` 병합 | `9160b60a` — TASK-1158/TASK-1161/TASK-1167 반영, **`src/` 변경 0건**(테스트·스크립트·마이그레이션·문서만) |
| `npm run test:regression` | **268 files / 1974 tests 전부 PASS**, EXIT=0 |
| `npm run build` | **EXIT=0** |
| `npm run check:lrtm` | 유령 경로 0건 · E2E 표기 누락 0건 · 허용 목록 밖 미등재 0건 |
| 로컬 마이그레이션 | `npx supabase migration up --local` — develop 의 `20261119000500` 포함 최신 상태 |

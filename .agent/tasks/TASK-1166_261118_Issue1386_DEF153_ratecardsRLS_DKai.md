# TASK-1166 — DEF-153: `zen_rate_cards` SELECT RLS 화주 세션 원가·마진 조회 차단

| 항목 | 내용 |
|:--|:--|
| **Task-ID** | TASK-1166 |
| **Issue** | #1386 |
| **결함** | DEF-153 |
| **Worker / Auditor** | D_Kai / Aiden (R-01) |
| **우선순위** | p1 (High) |
| **단계** | **`[설계 확정]` 완료 → 구현 진행** |
| **브랜치** | `feature/teama-task-1166-def153-ratecards-rls` |
| **작성일** | 2026-11-18 KST |

> ⚠️ **보안 상세 취급**: 이 저장소는 Public이다. 실측 결과·유출 경로·부수 발견의 상세는 **비공개 Security Advisory(`GHSA-hx46-6xqh-88fc`)** 로 이관되었고, 본 문서에는 **결정·조건·요약값만** 기재한다. PR 본문·커밋 메시지·테스트 설명에도 악용 경로를 적지 않는다.

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
| ③ `SET search_path = public` 명시 | **불가** → 뷰 정의의 모든 객체를 **스키마 한정**(`public.zen_rate_cards`, `public.zen_profiles`) | PostgreSQL 17.6에서 `ALTER VIEW … SET (search_path = …)`는 `ERROR: unrecognized parameter "search_path"`로 거부됨(실측). 뷰 정의는 생성 시 OID로 해석·저장되므로 런타임 `search_path`로 객체를 바꿔치기할 수 없다. 스키마 한정으로 동일한 강화 목적을 달성한다. |

## 1. 목표

화주 계열(`SHIPPER`/`CORPORATE`/`INDIVIDUAL`) 세션이 `zen_rate_cards`의 **원가·마진 컬럼**(`carrier_cost`·`margin_rate`·`platform_fee_rate`)에 접근할 수 없게 하면서, **경로 최적화·운임 산출·오더 등록 등 기존 기능은 수정 전과 동일하게** 동작시킨다.

## 2. 기준선 (로컬 fixture, 요약)

| 확인 항목 | 결과 |
|:--|:--|
| 화주 세션 → base 테이블 원가·마진 컬럼 | 조회 가능 (DEF-153 성립) |
| 미인증 세션 → 공개 뷰 | 조회 가능 (F-1) |
| CARRIER 세션 → 타 운송사 카드 | 조회 가능 (F-2) |

> 상세 요청·응답·수치는 Security Advisory 참조. 본 문서·PR에는 요약값만 기재한다(Aiden 공지 2026-11-18).

## 3. 전수 목록 — `zen_rate_cards`를 **세션 클라이언트**로 직접 읽는 경로

**R-20**: GitNexus `ZENITH.KR.LMS` 인덱스는 `indexedAt 2026-08-01`, **920 commits behind** → `grep` + `Read`로 재검증(`src/` 내 `zen_rate_cards` 참조 33건 전수 확인).

| # | 파일:라인 | 진입 함수 | 클라이언트 | 도달 역할 | 조회 컬럼 | 원가 컬럼 필요? |
|:--|:--|:--|:--|:--|:--|:--|
| P-1 | `routing.ts:37` → `DatabaseRouteAdapter.ts:188` | `getRouteOptions` | 세션 | 화주·ADMIN/MANAGER | `tiers` | ❌ |
| P-2 | `routing.ts:42,92` → `composite-pricing.ts:54` | `TISARateMatcher.matchRateCard` | 세션 | 동일 | `tiers, currency` | ❌ |
| P-3 | `composite-pricing.ts:232` | `calculateCompositePricing`(단일 세그먼트) | 세션 | 동일 | `tiers, currency` | ❌ |
| P-4 | `service-rates.ts:96` | `getAvailableServiceRates` | 세션 | 로그인 사용자 | `id, carrier_id, transport_mode, tiers, currency` + `carrier` 임베드 | ❌ |
| P-5 | `order-services.ts:31` | 오더 서비스 저장(요율 유효성) | 세션 | 화주(소유)·ADMIN/MANAGER | `id, is_active, valid_from, valid_until` | ❌ |
| P-6 | `tisa.ts:57` | `getOrderRateSnapshot` | 세션 | 화주(스테이크홀더)·ADMIN/MANAGER | `valid_from, valid_until` | ❌ |
| P-7 | `admin/rates.ts:271` → `admin.repository.ts:429` | `getRateCards` | 세션 | ADMIN/MANAGER/CARRIER(가드 있음) | `select('*')` | ✅ |
| P-8 | `admin/rate-cards.ts:150` | `getRateCards` | 세션 | **가드 없음 (DEF-152, 별건)** | 원가 3컬럼 포함 | ✅ |

**세션 클라이언트가 아닌 경로(영향 없음)**: `settlement.ts:293`은 `createAdminClient()`(service_role). 쓰기 경로(`admin/rates.ts`, `admin/rate-cards.ts`, `admin.repository.ts`)는 별도 정책을 쓰므로 변경하지 않는다.

## 4. 권고안 (확정) — ⓐ 안전 뷰 + 코드 6곳 전환

## 5. 구현 상세 (완료)

### 5.1 DB 마이그레이션 — 2건 분리 (Aiden "뷰 생성 → 코드 전환 → 정책 교체" 순서 조건 반영)

| # | 파일 | 내용 |
|:--|:--|:--|
| M-1 | `supabase/migrations/20261118100000_task1166_def153_rate_cards_safe_view.sql` | `zen_rate_cards_safe` 뷰 신설(추가 전용). DEFINER + 컬럼 11종(원가·마진 3종 제외) + 행 범위 `auth.uid()` → `zen_profiles.role` 7역할 + `REVOKE ALL FROM PUBLIC/anon/authenticated` → `GRANT SELECT TO authenticated`. 롤백: `DROP VIEW`. |
| M-2 | `supabase/migrations/20261118100100_task1166_def153_rate_cards_rls_policy.sql` | ① `zen_rate_cards_select` 교체(관리자 3역할 전 행 / CARRIER 자기 운송사 행만 / 화주 계열 제외) ② `zen_rate_cards_public` → `security_invoker=on` + anon·authenticated 권한 회수 후 SELECT만 ③ 롤백 SQL 주석 수록 |

- 뷰(M-1)는 추가 전용이므로 **M-1 → 앱 코드 배포 → M-2** 순서 적용이 가능하다.
- **ACL 보정(Aiden 조건 ②)**: Supabase 기본 권한(`ALTER DEFAULT PRIVILEGES`)이 `anon`·`authenticated`에 ALL을 부여하므로, 두 뷰 모두 `REVOKE ALL`을 `authenticated`에도 수행한 뒤 `GRANT SELECT`만 남겼다(적용 후 `authenticated=r` 확인).

### 5.2 코드 변경 (6곳 — 전부 완료)

| # | 파일 | 변경 |
|:--|:--|:--|
| C-1 | `src/lib/logistics/adapters/DatabaseRouteAdapter.ts:188` | `zen_rate_cards` → `zen_rate_cards_safe` |
| C-2 | `src/lib/logistics/composite-pricing.ts:54,232` | 동일 (2곳) |
| C-3 | `src/app/actions/operations/service-rates.ts:96` | 동일 (PostgREST 임베드 `carrier:zen_carriers!carrier_id` 유지 — 실측 정상) |
| C-4 | `src/app/actions/operations/order-services.ts:31` | 동일 |
| C-5 | `src/app/actions/operations/tisa.ts:58` | 동일 + RPC/스냅샷 INSERT 를 service_role 로 전환(아래 상세) |
| C-6 | `src/types/supabase.ts` | `zen_rate_cards_safe` View 타입 추가(원가 3종 제외, 관계 3건) |

**C-5 상세 — Aiden 확정 조건 ①·②**

- **① 호출 전 서버측 역할·소유 검증**: 세션 클라이언트로 오더를 조회한 뒤 `isAdmin || order.shipper_id === profile.org_id || order.agency_org_id === profile.org_id` 를 **명시 검증**하고, 통과한 경우에만 `createAdminClient()` 로 `fn_get_best_matching_rate` RPC와 `zen_order_rate_snapshots` INSERT를 수행한다. 실패 시 `logger.warn` 후 `null` 반환.
- **② RPC 반환 컬럼 확인 결과**: `fn_get_best_matching_rate(uuid,uuid,uuid,varchar,uuid,timestamptz)` 의 반환은 `TABLE(id uuid, unit_price numeric, currency varchar, base_date_rule varchar, **carrier_cost numeric**)` — **원가를 반환한다**. 따라서 액션 응답(`TisaSnapshotResult`)에는 `carrierCostAmount` 를 `isAdmin` 인 경우에만 매핑하고, 비관리자 경로에서는 RPC 결과 객체를 그대로 반환하지 않는다(코드 주석으로 고정).

**변경하지 않는 것**: 관리자 액션·`admin.repository`(원가 필요), `settlement.ts`(service_role), 쓰기 정책, `admin/rate-cards.ts` 코드 가드(DEF-152 별건). **CARRIER 행 제한으로 해당 액션의 데이터 계층 노출은 완화**된다(화주 세션 0행, CARRIER 자기 행).

### 5.3 확정 조건 대비 편차

| 확정 조건 | 구현 | 사유 |
|:--|:--|:--|
| DEFINER 뷰 ③ `SET search_path = public` 명시 | **불가** → 뷰 정의의 모든 객체를 스키마 한정(`public.*`) | PostgreSQL 17.6 은 뷰에 `search_path` reloption 을 허용하지 않음(`ERROR: unrecognized parameter "search_path"`, 실측). 뷰 정의는 생성 시 OID 로 해석·저장되므로 런타임 `search_path` 로 객체를 바꿔치기할 수 없다. |

### 5.4 수정 후 실측 (로컬 PostgREST · psql 역할 시뮬레이션)

| 세션 | `zen_rate_cards`(base) | `zen_rate_cards_safe`(뷰) | 비고 |
|:--|:--|:--|:--|
| 화주(CORPORATE) | **0행** | **전 행 조회 정상** | 원가 컬럼 요청 시 `42703 column does not exist` |
| 관리자(ADMIN) | 전 행 조회 정상(불변) | 전 행 | 원가 편집 기능 유지 |
| CARRIER | **자기 운송사 행만** | 전 행(안전 컬럼) | 타 운송사 0행 |
| AGENCY | 0행 | **0행**(권한 확대 없음) | 뷰 화이트리스트 미포함 |
| anon(미인증) | 0행 | **42501 permission denied** | `zen_rate_cards_public` 도 42501 |

### 5.5 회귀 테스트

| 구분 | 내용 |
|:--|:--|
| 신규 | `tests/unit/migrations/task1166-def153-rate-cards-rls.test.ts` — **17 케이스**(정적 9 + 실DB 8) |
| 기존 갱신 | mock 기반 5개 파일의 테이블명 단언을 `zen_rate_cards_safe` 로 갱신: `tests/unit/logistics/database-route-adapter-dberror.test.ts` · `tests/unit/logistics/freight-calculator.test.ts` · `tests/unit/logistics/rate-card-port-matching.test.ts` · `tests/integration/p6-db-01.test.ts` · `tests/integration/rou-01.test.ts` |
| 등재 | `docs/08_Self_Audit/Checklists/regression-items/TASK-1166_Issue1386_rate-cards-rls.md` · `npm run check:lrtm` 통과 |

## 6. R-10 결과

`docs/99_Manual/E2E_1166_Result/RESULT.md` · 스크린샷 9장. 화주·관리자·운송사 화면 정상, `/admin/error-logs` 신규 ERROR 0건.
CARRIER 양성 증적은 로컬 1행 임시 매핑 후 캡처·즉시 원복(자기 운송사 3행만 표시 확인).

## 7. R-09 / 검증 수치

| 항목 | 결과 |
|:--|:--|
| 신규 테스트 | 17/17 PASS |
| 회귀 스위트 | `npm run test:regression` — **265 files / 1957 tests 전부 PASS** (14분 3초, EXIT=0) |
| 프로덕션 빌드 | `npm run build` — **EXIT=0** (Next.js 16.4.6 Turbopack) |
| 정적 검사 | `npx tsc --noEmit` — `src/` 오류 0건(기존 `tests/` 오류 214건은 변경 전과 동일) |
| DB 재현성 | `npx supabase migration up --local` 2건 적용 성공. CI(`pr-checks.yml:151`)는 `supabase db reset --yes` 로 전체 마이그레이션을 처음부터 재적용한다. |

## 8. 범위 밖 (별건)

| ID | 내용 | 처리 |
|:--|:--|:--|
| F-3 | `calculate_order_costs` 권한 구성 | **TASK-1167 / #1389 (Riley)** — 상세는 비공개 Advisory |
| F-4 | `zen_order_rate_snapshots` 원가 컬럼 화주 노출 | DEF-157 후보 — Aiden 배정 대기 |
| DEF-152 | `admin/rate-cards.ts` 코드 가드 공백 | 별건 유지 |

## 9. R-17 완료 보고

- 코드 커밋: `d63f6b89ccbdb647c57d9d8c2869b1fe8e05ba8d`
- 문서 커밋: (본 커밋)
- 브랜치: `feature/teama-task-1166-def153-ratecards-rls`
- 검증: 회귀 스위트 결과 · build 결과 · R-10 증적은 위 §6·§7 참조
- 이슈 라벨: `status:in-progress` → `status:review`

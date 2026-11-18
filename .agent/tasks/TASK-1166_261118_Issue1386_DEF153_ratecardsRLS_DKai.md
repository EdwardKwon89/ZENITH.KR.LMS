# TASK-1166 — DEF-153: `zen_rate_cards` SELECT RLS 화주 세션 원가·마진 조회 차단

| 항목 | 내용 |
|:--|:--|
| **Task-ID** | TASK-1166 |
| **Issue** | #1386 |
| **결함** | DEF-153 (`.agent/defects/DEF-153_zen_rate_cards_RLS_화주_원가마진_조회노출.md`) |
| **Worker / Auditor** | D_Kai / Aiden (R-01) |
| **우선순위** | p1 (High) — D_Kai 대기열 #1336(p2)보다 우선 |
| **단계** | **`[설계 의견]` — Aiden `[설계 확정]` 대기. 구현 착수 금지 (R-11)** |
| **브랜치** | `feature/teama-task-1166-def153-ratecards-rls` (base `origin/develop` `2e5a9ba6`) |
| **작성일** | 2026-11-18 KST |
| **워크트리** | `~/WorkSpace/ZENITH_LMS-worktrees/d_kai` |

---

## 1. 목표

화주 계열(`SHIPPER`/`CORPORATE`/`INDIVIDUAL`) 세션이 `zen_rate_cards`의 **원가·마진 컬럼**(`carrier_cost`·`margin_rate`·`platform_fee_rate`)에 접근할 수 없게 하면서, **경로 최적화·운임 산출·오더 등록 등 기존 기능은 수정 전과 동일하게** 동작시킨다.

## 2. 수정 전 기준선 실측 (로컬 Supabase, 2026-11-18)

로컬 DB는 `supabase db reset` + `npm run db:seed` 상태이며 `zen_rate_cards` **24건**이다. PostgREST에 실제 로그인 토큰으로 직접 호출했다(브라우저에서 anon key + 본인 토큰만으로 동일 재현 가능).

| # | 세션 | 요청 | 결과 |
|:--|:--|:--|:--|
| R-1 | 화주 `shipper@zenith.kr` (CORPORATE) | `GET /rest/v1/zen_rate_cards?select=id,carrier_cost,margin_rate,platform_fee_rate` | **200 · 24건 전량** — `carrier_cost` 5.80/0.70/4.00…, `margin_rate` 12.00/15.00, `platform_fee_rate` 5.00 |
| R-2 | **anon (미인증)** | `GET /rest/v1/zen_rate_cards?...` | **200 · 0건** (RLS 정상 차단) |
| R-3 | **anon (미인증)** | `GET /rest/v1/zen_rate_cards_public?select=id,carrier_cost,margin_rate,platform_fee_rate` | **200 · 24건 전량** ← **신규 발견 (F-1)** |
| R-4 | 운송사 `carrier@zenith.kr` | `GET /rest/v1/zen_rate_cards?select=id,carrier_id,carrier_cost,margin_rate` | **200 · 24건 / 서로 다른 `carrier_id` 9개** ← **신규 발견 (F-2)** |
| R-5 | 화주 | `GET /rest/v1/zen_order_rate_snapshots?select=carrier_cost_amount,platform_fee_amount` | 200 · 3건(자기 조직 오더) — 로컬 시드 값은 `null` ← **신규 발견 (F-4)** |

**원인(확정)**: `zen_rate_cards_select` 정책이 `ADMIN, ZENITH_SUPER_ADMIN, MANAGER, SHIPPER, CORPORATE, INDIVIDUAL, CARRIER`에게 **조직·소유 조건 없이** 전 행을 허용한다(`20260601020000_fix_tisa_shipper_visible.sql:146-157`, 원본 `20260529150000_fix_route_rls_corporate_individual.sql:30-40`). 이 정책은 UAT-02-03에서 **경로 최적화가 CORPORATE/INDIVIDUAL 세션에서 동작하도록** 의도적으로 넓힌 것이다.

## 3. 전수 목록 — `zen_rate_cards`를 **세션 클라이언트**로 직접 읽는 경로

**R-20**: GitNexus `ZENITH.KR.LMS` 인덱스는 `indexedAt 2026-08-01`, **920 commits behind** → 지침대로 `grep` + `Read`로 재검증했다(`src/` 내 `zen_rate_cards` 참조 33건 전수 확인).

| # | 파일:라인 | 진입 함수 | 클라이언트 | 도달 역할 | 조회 컬럼 | 원가 컬럼 필요? |
|:--|:--|:--|:--|:--|:--|:--|
| P-1 | `src/app/actions/operations/routing.ts:37` → `src/lib/logistics/adapters/DatabaseRouteAdapter.ts:188` | `getRouteOptions` | **세션**(`validateUserAction`) | 화주(오더 접근 가능자)·ADMIN/MANAGER | `tiers` | ❌ |
| P-2 | `src/app/actions/operations/routing.ts:42,92` → `src/lib/logistics/composite-pricing.ts:54` | `calculateCompositePricing` → `TISARateMatcher.matchRateCard` | **세션** | 동일 | `tiers, currency` | ❌ |
| P-3 | `src/lib/logistics/composite-pricing.ts:232` | `calculateCompositePricing`(단일 세그먼트 분기) | **세션** | 동일 | `tiers, currency` | ❌ |
| P-4 | `src/app/actions/operations/service-rates.ts:96` | `getAvailableServiceRates` (오더 등록 폼) | **세션** | 로그인 사용자 전체 | `id, carrier_id, transport_mode, tiers, currency` + `carrier:zen_carriers!carrier_id(name, org_id)` 임베드 | ❌ |
| P-5 | `src/app/actions/operations/order-services.ts:31` | 오더 서비스 저장(요율 유효성 이중 검증) | **세션** | 화주(오더 소유)·ADMIN/MANAGER | `id, is_active, valid_from, valid_until` | ❌ |
| P-6 | `src/app/actions/operations/tisa.ts:57` | `getOrderRateSnapshot` (UPS 오더 상세) | **세션** | 화주(오더 스테이크홀더)·ADMIN/MANAGER | `valid_from, valid_until` | ❌ |
| P-7 | `src/app/actions/admin/rates.ts:271` → `src/lib/repositories/admin.repository.ts:429` | `getRateCards` | **세션** | ADMIN/MANAGER/CARRIER(`:255` 가드) | **`select('*')`** (원가 포함) | ✅ |
| P-8 | `src/app/actions/admin/rate-cards.ts:150` | `getRateCards` | **세션** | **가드 없음 (DEF-152, 별건)** | `carrier_cost, margin_rate, platform_fee_rate` 포함 | ✅ |

**세션 클라이언트가 아닌 경로(영향 없음)**

| 파일 | 클라이언트 | 비고 |
|:--|:--|:--|
| `src/lib/finance/settlement/settlement.ts:293` | `createAdminClient()` (service_role) | RLS 우회, 변경 불필요 |
| 쓰기 경로 `admin/rates.ts:193,214` · `admin/rate-cards.ts:56,66,95,116,136` · `admin.repository.ts:369,392,399,411` | 세션 + 정책(`zen_rate_cards_admin_all`·`carrier_rate_cards_insert/update`) | 읽기 정책과 분리, 변경 불필요 |

**DB 객체(함수·뷰) 경유**

| 객체 | 보안 속성 | EXECUTE/GRANT | 원가 노출 |
|:--|:--|:--|:--|
| `fn_get_best_matching_rate(uuid,uuid,uuid,varchar,uuid,timestamptz)` | **INVOKER**(`prosecdef=false`) — RLS 적용 | `anon`, `authenticated` | 반환에 `carrier_cost` 포함하나 **RLS가 막으면 0행** → 화주 정책 제거 시 함께 차단됨. 단 `tisa.ts:139`가 호출하므로 **화주 경로의 RPC 결과가 0행이 되면 스냅샷 자동 생성이 깨진다** → §5.2에서 대응 |
| `zen_rate_cards_public` (VIEW) | **DEFINER**(`reloptions` 없음, owner `postgres`) | `anon`·`authenticated`에 **SELECT/INSERT/UPDATE/DELETE/TRUNCATE** | **전 컬럼 + 원가·마진** ← **F-1** |
| `calculate_order_costs(uuid)` | **DEFINER** | `anon`·`authenticated` | `platform_fee_amount` 반환 + `zen_order_costs` 쓰기, 소유권 검사 없음 ← **F-3** |

## 4. 대안 비교

| 평가축 | **ⓐ 안전 뷰 + 코드 전환** | ⓑ admin client 전환 + 화주 정책 제거 | ⓒ 컬럼 단위 GRANT |
|:--|:--|:--|:--|
| 원가 차단 강도 | **강** — 화주는 base 테이블 0행, 뷰는 안전 컬럼만 | 중 — 정책은 강하지만 service_role 우회 경로가 코드에 상존 | 강 (컬럼 단위) |
| 방어 심층성 | **높음** — action 가드가 뚫려도(DEF-152류) RLS가 2차 차단 | **낮음** — 액션이 뚫리면 admin client가 전부 반환 | 높음 |
| 회귀 위험 | **낮음** — 화주 경로 6곳만 뷰로 전환, admin 경로 무변경 | 중 — `getAvailableServiceRates`·`routing`에 역할 가드가 없어 노출면 확대 | **높음** — `findRateCards`의 `select('*')`가 42501로 실패, admin 액션 전면 수정 필요 |
| 마이그레이션 위험 | 낮음 (뷰 1개 + 정책 1개) | 낮음 (정책 1개) | 중 (GRANT 조합, 타 액션 광범위 영향) |
| 타입/코드 파급 | 뷰 타입 추가(1곳) + 조회 6곳 | 없음 | 타입·액션 다수 |
| PostgREST 임베드 | **가능(실측 확인)** — 뷰에서 `carrier:zen_carriers!carrier_id` 정상 해석 | 해당 없음 | 해당 없음 |

**권고: ⓐ안.** 근거는 ① 화주 경로 6곳 모두 **원가 컬럼을 쓰지 않는다**(§3 표) ② 뷰에서 PostgREST 임베드가 동작함을 실측으로 확인 ③ DEF-152(코드 가드 공백)가 남아 있어도 RLS가 2차 방어선으로 유지된다.

## 5. 권고안 상세 (ⓐ)

### 5.1 DB 마이그레이션 초안 (신규 1건)

```sql
-- TASK-1166 / DEF-153 — zen_rate_cards 화주 원가·마진 접근 차단
-- 1) 화주 계열 안전 뷰: 원가·마진 컬럼 제외, 역할 화이트리스트로 행 범위 고정
CREATE OR REPLACE VIEW public.zen_rate_cards_safe AS
SELECT id, carrier_id, transport_mode, currency, tiers,
       valid_from, valid_until, is_active, created_at,
       origin_port_id, dest_port_id
FROM public.zen_rate_cards
WHERE (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (
  ARRAY['ADMIN','ZENITH_SUPER_ADMIN','MANAGER','SHIPPER','CORPORATE','INDIVIDUAL','CARRIER']
);

REVOKE ALL ON public.zen_rate_cards_safe FROM anon;
GRANT SELECT ON public.zen_rate_cards_safe TO authenticated;

-- 2) base 테이블 SELECT 정책: 화주 계열 제외 (+ CARRIER 자기 운송사 행만 — F-2 동시 해소안)
DROP POLICY IF EXISTS zen_rate_cards_select ON public.zen_rate_cards;
CREATE POLICY zen_rate_cards_select ON public.zen_rate_cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
        AND zen_profiles.role = ANY (ARRAY['ADMIN','ZENITH_SUPER_ADMIN','MANAGER'])
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'CARRIER'
      AND carrier_id IN (
        SELECT id FROM public.zen_carriers
        WHERE org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
      )
    )
  );

-- 3) zen_rate_cards_public: DEFINER 뷰 → security_invoker (미인증 전량 조회 차단, F-1)
ALTER VIEW public.zen_rate_cards_public SET (security_invoker = on);
REVOKE ALL ON public.zen_rate_cards_public FROM anon;
GRANT SELECT ON public.zen_rate_cards_public TO authenticated;

NOTIFY pgrst, 'reload schema';
```

> 뷰는 **DEFINER**여야 한다(화주가 base 테이블 0행이 되므로 `security_invoker` 뷰로는 행이 보이지 않음). 대신 **뷰 정의의 역할 화이트리스트**로 행 범위를 고정하고, `anon` GRANT를 회수해 미인증 접근을 차단한다. 이 조합이 동작함은 §5.4 드라이런으로 확인했다.

### 5.2 코드 변경 목록 (최소)

| # | 파일 | 변경 |
|:--|:--|:--|
| C-1 | `src/lib/logistics/adapters/DatabaseRouteAdapter.ts:188` | `zen_rate_cards` → `zen_rate_cards_safe` |
| C-2 | `src/lib/logistics/composite-pricing.ts:54,232` | 동일 (2곳) |
| C-3 | `src/app/actions/operations/service-rates.ts:96` | 동일 (임베드 조인 유지 — 실측 확인) |
| C-4 | `src/app/actions/operations/order-services.ts:31` | 동일 |
| C-5 | `src/app/actions/operations/tisa.ts:57` | 동일. **P-6 대응**: `:139`의 `fn_get_best_matching_rate`는 INVOKER라 화주 세션에서 0행이 되므로, **스냅샷 자동 생성(RPC 호출)만 admin client로 전환**하고 반환 형태는 기존처럼 `isAdmin` 게이트 유지 |
| C-6 | `src/types/supabase.ts` | `zen_rate_cards_safe` View 타입 추가(`npx supabase gen types typescript --local` 재생성 또는 수동 추가) |

**변경하지 않는 것**: admin 액션 2종·`admin.repository`(원가 컬럼 필요), `settlement.ts`(이미 service_role), 쓰기 정책.

### 5.3 롤백 SQL

```sql
DROP VIEW IF EXISTS public.zen_rate_cards_safe;
DROP POLICY IF EXISTS zen_rate_cards_select ON public.zen_rate_cards;
CREATE POLICY zen_rate_cards_select ON public.zen_rate_cards
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.zen_profiles
                 WHERE zen_profiles.id = auth.uid()
                   AND zen_profiles.role = ANY (ARRAY['ADMIN','ZENITH_SUPER_ADMIN','MANAGER','SHIPPER','CORPORATE','INDIVIDUAL','CARRIER'])));
ALTER VIEW public.zen_rate_cards_public RESET (security_invoker);
GRANT ALL ON public.zen_rate_cards_public TO anon;
NOTIFY pgrst, 'reload schema';
```

### 5.4 드라이런 실측 (로컬, 임시 뷰 생성 → 검증 → DROP)

권고안의 뷰 정의를 **그대로** 임시 뷰로 만들어 PostgREST로 검증했다(검증 후 `DROP VIEW` 완료, 로컬 DB 원상복구).

| 세션 | `select=id` (안전 컬럼) | `select=id,carrier_cost` |
|:--|:--|:--|
| anon | **42501 permission denied** | — |
| `shipper@zenith.kr` | **24행** | **42703 `column ... does not exist`** |
| `carrier@zenith.kr` | 24행 | 42703 |
| `admin@zenith.kr` | 24행 | 42703 |
| `agency@zenith.kr` | **0행** (권한 확대 없음) | — |
| 화주 + `carrier:zen_carriers!carrier_id(name,org_id)` 임베드 | **정상 해석** (`{"name":"DHL Express",...}`) | — |

## 6. 기능 유지 검증 계획 (구현 단계)

1. **경로 최적화**: 화주 계정으로 UPS 오더 → `getRouteOptions` 실행 → 수정 전/후 옵션 수·`total_cost`·`segments` 동일함을 비교(로컬 캡처).
2. **오더 등록 폼**: `/ko/orders/new`에서 `getAvailableServiceRates` 호출 → 운송 옵션 목록·금액 동일.
3. **오더 서비스 저장**: 요율 유효성 검증 통과/실패 케이스 그대로.
4. **UPS 오더 상세**: `/ko/orders/{id}/ups-detail` 스냅샷 카드 — 화주에게 원가·마진 미표시, 관리자에게 기존대로 표시.
5. **관리자/운송사**: `/ko/admin/rates`·`/ko/admin/rate-cards`에서 원가·마진 편집·조회 정상.
6. **R-10**: 화주·관리자·운송사 UI 스크린샷 + `/admin/error-logs` 신규 ERROR "확인 — 無".

## 7. R-09 회귀 테스트 계획

| ID(안) | 검증 | 방식 |
|:--|:--|:--|
| TC-1166-01 | 마이그레이션 정적 검증: 정책 role 목록에 화주 계열 부재, 뷰 컬럼에 원가 3종 부재 | 파일 파싱 단위 테스트 |
| TC-1166-02 | 화주 세션 `zen_rate_cards` 원가 컬럼 조회 차단 | 실DB(로컬) PostgREST/`set role` — `42501`/`42703` 단언 |
| TC-1166-03 | 화주 세션 `zen_rate_cards_safe` 안전 컬럼 조회 성공 | 실DB |
| TC-1166-04 | anon `zen_rate_cards_public` 차단 | 실DB |
| TC-1166-05 | 관리자·MANAGER·CARRIER 조회 불변(운송사는 자기 카드만) | 실DB |
| TC-1166-06 | 뷰 컬럼 화이트리스트 고정(원가 컬럼 추가 시 실패) | 스키마 단언 |

> 회귀맵 등재는 **#1387 머지 상태에 따라** `docs/08_Self_Audit/Checklists/regression-items/TASK-1166_Issue1386_*.md`로 한다(Aiden 2026-11-18 코멘트). 머지 전이면 섹션 번호를 임의 부여하지 않고 Aiden 확인.

## 8. 관련 발견 (R-18) — **별건 후보**

| ID | 내용 | 심각도 | 근거 |
|:--|:--|:--|:--|
| **F-1** | `zen_rate_cards_public`이 **DEFINER 뷰**(`security_invoker` 미설정) + `anon`에 SELECT/INSERT/UPDATE/DELETE/TRUNCATE GRANT → **미인증 사용자가 원가·마진 전량 조회**. 앱 코드에서 미사용(타입 정의만 존재) | **High** | R-3 실측 24건 |
| **F-2** | `CARRIER` 세션이 **9개 운송사 24건 전량**의 `carrier_cost`·`margin_rate` 조회 → 경쟁사 원가 노출 | **High** | R-4 실측 |
| **F-3** | `calculate_order_costs(uuid)`가 **SECURITY DEFINER** + `anon`/`authenticated` EXECUTE + **소유권 검사 없음** → 임의 `order_id`로 비용 계산·`zen_order_costs` 쓰기 가능. `platform_fee_amount` 반환 | **Critical(정적)** — 실행 검증은 미수행 | `pg_get_functiondef`, EXECUTE ACL |
| **F-4** | `zen_order_rate_snapshots`의 `order_members_can_view_rate_snapshots` 정책이 화주 org 멤버에게 `carrier_cost_amount`·`platform_fee_amount` 컬럼을 노출(액션은 `isAdmin` 게이트로 숨김). 로컬 시드 값은 `null` | Medium | R-5 |

**권고**: F-1은 이번 Task의 마이그레이션에 **포함**(같은 테이블·같은 유출 축이라 남기면 차단이 무의미). F-2는 **한 줄 조건**으로 함께 해소 가능하나 CARRIER 화면 영향 확인 필요. F-3·F-4는 **별도 DEF**(DEF-156/157 후보)로 분리 요청.

## 9. Aiden 결정 요청 (구현 전 확정 필요)

1. **ⓐ안 채택** 여부(§4 권고) — 뷰 이름 `zen_rate_cards_safe`·컬럼 화이트리스트(§5.1) 승인.
2. **F-1 포함** 승인: `zen_rate_cards_public`을 `security_invoker=on`으로 전환(또는 **DROP**). 앱 미사용이므로 DROP이 더 단순하나, WBS 6.7.1.3 의도(CARRIER 마스킹)를 남기려면 ALTER.
3. **F-2 포함** 여부: CARRIER 정책을 자기 운송사 행으로 제한(§5.1 2항). 미포함 시 CARRIER는 계속 경쟁사 원가를 본다.
4. **F-3/F-4 분리** 승인 및 DEF 번호 부여(`next-def-number.sh` → **DEF-156**).
5. **`tisa.ts` RPC 전환**(C-5) 승인 — 화주 세션에서 `fn_get_best_matching_rate`가 0행이 되므로 스냅샷 자동 생성만 admin client로 바꾼다. 이 부분은 "소스 변경 최소화" 범위에 포함된다고 판단한다.
6. **DEF-152**(`admin/rate-cards.ts getRateCards` 가드 공백)는 이번에 고치지 않는다는 원칙 유지 확인 — RLS 수정으로 데이터 계층은 0행이 되지만 코드 가드는 별건.

## 10. 예상 공수 / 다음 단계

- 예상: **0.4 MD** (마이그레이션 0.15 + 코드 6곳 0.1 + 실DB 회귀 테스트 0.1 + R-10/문서 0.05)
- 다음 단계: Aiden `[설계 확정]` → 이슈 라벨 `status:draft` → `status:in-progress` → 구현 → R-09/R-10 → R-17 완료 보고(PR 본문 `Closes #1386`).

### R-06 대체 근거 (Context7 미가용)

이 세션에는 Context7 MCP가 노출되지 않았다. 대신 ① PostgreSQL 17.6 공식 문서의 뷰 보안 의미(`security_invoker`, PG 15+ 도입) ② **로컬 실DB 드라이런**(§5.4)으로 대체 검증했다. 확정 구현 시 Aiden이 Context7 대조를 요구하면 해당 시점에 수행한다.

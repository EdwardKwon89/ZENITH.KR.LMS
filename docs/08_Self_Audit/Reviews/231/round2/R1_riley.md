<!-- agent=Riley round=R1 label=Riley (Antigravity/Gemini 4 Argon Medium) [review/plan] secs=250 -->
# 문서 231 (v0.2) 교차 검증 의견 — Riley (CPO·CIO)

> **검토자**: Riley (CPO(Chief Product Officer, 최고제품책임자)·CIO(Chief Information Officer, 최고정보책임자) 겸임)
> **검토 대상**: [231_TEST_COVERAGE_STRATEGY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md) v0.2

---

## 점검 1. 반영표 대조 (의견 왜곡·누락 검증)

### 결론
- **Riley 1차 보고서 원문 대조 불가(미확인) 및 파일 빈 파일(0바이트) 오류 확인**: 현재 워크스페이스의 [riley_review.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Reviews/231/riley_review.md)는 0바이트(빈 파일)이며, 첨부 자료의 `##### 자료: riley_review.md` 섹션 역시 본문이 비어 있어 원문과 부록 C의 1:1 문구 대조는 **미확인**으로 표기한다.
- 단, 부록 C에 기재된 Riley 제안 21건(`#1, #3, #4, #6, #7, #8, #10, #12, #13, #14, #19, #20, #21, #23, #24, #26, #28, #29, #32, #33, #34, #35, #36`)이 v0.2 본문에 누락·왜곡 없이 반영되었는지 대조한 결과, **2건(`#3`, `#26`)에서 본문 반영 누락·축소**가 확인되었다.

### 근거
1. **원문 파일 상태 (확인)**: [riley_review.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Reviews/231/riley_review.md) 열람 결과 0바이트 빈 파일임(확인). ([bkai_review.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Reviews/231/bkai_review.md#L6)에서도 제출 당시 `riley_review.md` 미존재를 기록함 — 확인).
2. **부록 C `#3` ("D3를 D3-A/D3-B로 분리 — §3, §4.3, §5.2 반영") 부분 누락 (확인)**:
   - §3, §4.3, §5.2에는 `D3-A` / `D3-B`로 분리되었으나, **§8.3**(단계 3 공정성 조건: `"예: D1 3건, D3 2건..."`)과 **§10 #2**는 여전히 구 명칭 `D3`으로 남아 있어 D3-A(라우팅·앱)와 D3-B(실DB RLS(Row-Level Security, 행 단위 접근 보안)·GRANT(데이터베이스 권한 부여)) 중 무엇을 뜻하는지 모호하다.
3. **부록 C `#26` ("PoC ②를 UPS `pricing-engine.ts`+`discount-guard.ts`로 특정 — §8.2, §10 #2 반영") 본문 불일치 (확인)**:
   - §8.2 표에는 두 파일이 특정되었으나, **§5.2 커버 맵 예시 표**의 첫 행은 `"운임 엔진(UPS)"`로만 적혀 있고 D3-B·D8 칸이 `-`(해당 없음)로 표기되어 있다. 반면 [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L9-L44)는 `zen_agency_pricing_policies`, `zen_ups_base_rates` 등 4개 테이블을 실DB 조회하므로 D3-B와 D8이 `-`가 될 수 없다.

### 수정 제안
- [riley_review.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Reviews/231/riley_review.md) 원본이 다른 브랜치/워크트리에 있다면 복구해 커밋하거나, 부록 C 상단 주석에 파일 유실 경위를 명시할 것.
- §8.3의 `"D3 2건"`을 `"D3-A 1건, D3-B 1건(또는 D3-B 2건)"`으로 명시하고, §5.2 커버 맵 예시에서 `pricing-engine.ts`(순수 계산)와 `discount-guard.ts`(DB 조회 포함)를 행 분리하거나 D3-B/D8 표기를 정정할 것.

---

## 점검 2. v0.2 신규 서술의 사실 검증

### 결론
코드·설정·문서 인용은 직접 파일을 열어 **확인**했으며, 대부분 사실과 일치하나 **3건의 사실/원인 설명 부정확**이 확인되었다. `DEF-B-*` 파일 및 GitHub Issue 원본은 로컬 워크트리에 존재하지 않아 코드 주석·회귀 맵 인용 외에는 **미확인**이다.

### 근거 (확인 / 틀림 / 미확인 구분)
1. **코드 및 설정 사실 확인 (맞음 — 확인)**:
   - [vitest.config.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/vitest.config.ts#L1-L28): `coverage` 설정 블록 없음, `L26`에 `fileParallelism: false` 존재 **확인**.
   - [package.json](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/package.json#L1-L75): `@vitest/coverage-v8`, `fast-check`, `@stryker-mutator/*` 미설치 **확인**.
   - [audit-i18n.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/scripts/audit-i18n.ts#L9-L54): `BASELINE = 'en.json'` 대비 타 로케일 JSON의 키 대칭성(missing/extra)만 비교하며 코드 내 `useTranslations` 호출 대조 기능 없음 **확인**.
   - [LIVE_REGRESSION_TEST_MAP.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md#L1-L1129): 정확히 **1,129줄**로 [GOV_COMMON.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/GOV_COMMON.md#L301)의 문서 Hard Limit(1,000줄) 초과 **확인**.
   - [pr-checks.yml](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.github/workflows/pr-checks.yml#L76): CI에서 `supabase db reset --yes` 실행 **확인**.
   - [301_QUALITY_ASSURANCE_MANUAL.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/301_QUALITY_ASSURANCE_MANUAL.md#L40): Gate 2 통과 기준 `"단위 테스트 80% 이상 및 자가 검증(SAR) 완료"` 문구 모호성 **확인**.
   - [307_NEW_PROJECT_CPO_REVIEW.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/307_NEW_PROJECT_CPO_REVIEW.md#L48-L51): §2.2 `"i18n 서버/클라이언트 에러 코드 분리 아키텍처"` 존재 **확인**.
   - PoC(Proof of Concept, 개념 증명) 대상 파일 7개 및 줄 수·내용 **확인**:
     - [status-machine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/logistics/status-machine.ts#L46-L178) (186줄): `canChangeStatus`, `getOrderEditScope`, 한글 에러 리터럴(`L61`, `L70`), `TASK-B-284 (Issue #1070)`·`TASK-B-339 (Issue #1254)` 주석 **확인**.
     - [ups-registration.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/orders/ups-registration.ts#L25-L39) (39줄): `hasActiveUpsLabel(supabase, orderId)`가 `zen_ups_labels`를 조회함 **확인**.
     - [pricing-engine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/pricing-engine.ts#L1-L407) (**407줄**, 순수 함수): `L34` `Issue #1123`, `L47` `DEF-095`, `L75` `DEF-B-044 (Issue #1044)` 주석 **확인**. (일반 [rate-engine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/logistics/rate-engine.ts#L1-L43) **43줄** **확인**).
     - [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L3-L85) (85줄): `SupabaseClient`를 주입받아 4개 테이블 조회 및 `L21` 한글 에러 리터럴 반환 **확인**.
     - [label-mapping.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/label-mapping.ts#L55-L86) (179줄): `Issue #1251`, `DEF-B-145`, `DEF-B-146`, `DEF-B-059` 주석 **확인**.
     - [validate-payload.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/shxk/validate-payload.ts#L1-L77) (77줄): `TASK-B-277 (#1052)`, `TASK-B-283 (#1069 / DEF-B-055)`, `TASK-B-332 (#1239)`, `TASK-B-337 (#1251)` 주석 및 한글 에러 반환 **확인**.
     - [shxk-limits.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/validation/shxk-limits.ts#L8-L16) (24줄): `HS_CODE_MAX=30`, `ITEM_NAME_MAX=35`(SHXK(중국 3PL 특송 중계 API 플랫폼) 500자 vs UPS 35자), `PHONE_MAX_DIGITS=15`(SHXK 100자 vs E.164 15자리) 주석 **확인**.

2. **사실/원인 서술 부정확 3건 (틀림/부정확 — 확인)**:
   - **① §1.1-5 및 §3 D3-A의 `DEF-085` 인용 부정확**: v0.2는 `DEF-085`를 "`proxy.ts`↔`rbac.ts` 역할별 계층 간 계약 단절"의 대표 결함으로 인용했다. 그러나 실제 [DEF-085_proxy_warehouse_authguard_누락.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.agent/defects/DEF-085_proxy_warehouse_authguard_누락.md#L14-L35)를 열람한 결과, 원인은 역할(Role)별 권한 불일치가 아니라 비인증/공통 경로 `ALLOWED_PATHS`에 `/warehouse`가 빠져 로그인 페이지로 리다이렉트된 단순 경로 누락이었다(현재 [proxy.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/auth/proxy.ts#L199)는 `orgType !== 'PLATFORM'` 분기 안의 `isAllowedPath`로 구조가 변경됨). 반면 `rbac.ts`의 `STATIC_PERMISSIONS`와 `proxy.ts`의 화이트리스트가 어긋난 실제 사건은 **Issue #688**(`SUB_ADMIN` 역할 라우팅 버그 — [AGENTS.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/AGENTS.md#L97), [306_NEW_PROJECT_REUSE_REVIEW.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/306_NEW_PROJECT_REUSE_REVIEW.md#L74)에서 확인)이다.
   - **② §4.7-8의 `proxy.ts` 로케일 목록과 `rbac.ts` 하드코딩 불일치 누락**: [routing.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/i18n/routing.ts#L6)와 [rbac.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/auth/rbac.ts#L32)를 확인한 결과, `proxy.ts`는 `routing.locales`를 참조하는 반면 `rbac.ts`의 `normalizePath`(`L32`)는 `const locales = ['ko', 'en', 'zh', 'ja']`를 별도 하드코딩하고 있다. §4.7-8이 `proxy.ts`만 언급하면 `rbac.ts`와의 로케일 배열 이원화 사각지대를 놓친다.
   - **③ §7-1의 `105_DOMAIN_KNOWLEDGE.md` 최신성 전제 오류**: §7-1은 테스트 도출 근거 우선순위로 `명세(Ds-11·105) > Issue AC`를 두었으나, 실제 [105_DOMAIN_KNOWLEDGE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/105_DOMAIN_KNOWLEDGE.md#L164-L195)를 [status-machine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/logistics/status-machine.ts#L10-L41)와 대조한 결과 **105 문서가 코드보다严重하게 뒤처져(stale) 있다**(확인):
     - 상태 누락: 코드에는 `DISPOSED`, `CLAIMED`가 있으나 105 §3-1/3-2에는 없음.
     - 전이 불일치: 코드 `WAREHOUSED`는 `REGISTERED, SCHEDULED, PACKED, RELEASED, HELD, RETURNED`로 전이 가능하나(`L13`), 105 §3-2(`L169`)는 `PACKED, HELD, RETURNED`만 허용.
     - 역할 누락: 코드에는 `AGENCY` 역할 권한(`L38`)과 `SUB_ADMIN` 등 14개 역할([rbac.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/auth/rbac.ts#L8-L23))이 있으나, 105 §3-3/§5-2에는 8개 역할만 존재.
     - 수정 가능 여부 충돌: 코드(`L134-L145`)는 `WAREHOUSED + UPS` 전체 수정을 허용하나, 105 §3-4(`L194`)는 `WAREHOUSED`를 무조건 수정 불가(Read-only)로 규정.

3. **미확인 항목 (원본 파일 부재 — 미확인)**:
   - `.agent/defects/` 내 `DEF-B-*` 84건 및 `DEF-061~064`, `DEF-066`, `DEF-067`, `DEF-077`, `DEF-078`, `DEF-080`, `DEF-083`, `DEF-084`, `DEF-088`, `DEF-095`, `DEF-096`, `DEF-098`, `DEF-099`, `DEF-132` 개별 마크다운 파일은 현 워크트리에 존재하지 않아 원본 열람 **미확인**(단, `DEF-096`·`DEF-128`·`DEF-137`·`DEF-B-142`·`DEF-B-149`는 [GOV_COMMON.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/GOV_COMMON.md#L82-L307) 및 [106_QUALITY_GATEWAY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/106_QUALITY_GATEWAY_GUIDE.md#L75) 본문 기록으로 간접 확인).
   - `SAR-2026-07-27-001` 원본 파일 부재(**미확인**, [GOV_COMMON.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/GOV_COMMON.md#L88) 인용만 확인).

### 수정 제안
- §1.1-5 및 §3 D3-A에서 `DEF-085`의 설명을 `"비인증/공통 경로 allowlist 누락"`으로 구분하고, 역할×라우트 불일치의 주 근거는 `Issue #688`로 명시할 것.
- §4.7-8에 "`proxy.ts`(`routing.locales`)와 `rbac.ts`(`normalizePath` 내 로케일 배열) 간 로케일 정의 단일화 점검"을 추가할 것.

---

## 점검 3. 내부 모순·실행 불가

### 결론
v0.2 내부 조항 및 현행 R-17 거버넌스와 충돌하여 **즉시 실행이 불가능하거나 잘못된 테스트를 양산하는 구조적 모순 3건**이 확인되었다.

### 근거
1. **§7-1 (105 명세 최우선 도출) vs §8.1 단계 1a (결정표 선행 문서화) — 부실 명세 기반 테스트 도출 모순**:
   - 점검 2-2-③에서 확인했듯 [105_DOMAIN_KNOWLEDGE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/105_DOMAIN_KNOWLEDGE.md#L164-L195)의 상태머신 명세는 현행 코드([status-machine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/logistics/status-machine.ts#L10-L145)) 및 최신 확정 정책(`TASK-B-339`, `WAREHOUSED+UPS` 수정 허용 등)과 정면으로 다르다.
   - 이 상태에서 §7-1(`명세(Ds-11·105) > Issue AC` 우선순위)을 그대로 적용해 단계 1a(① `status-machine.ts` 결정표 작성)를 수행하면, 에이전트가 최신 정상 로직을 결함으로 판정하거나 구 명세 기준으로 잘못된 테스트를 작성하게 된다.
2. **§7-2 ("고위험 모듈은 구현자와 다른 주체가 테스트 도출·검토") vs R-17 단일 Assignee 워크플로우 충돌**:
   - [GOV_COMMON.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/GOV_COMMON.md#L158-L200) R-17은 1개 GitHub Issue에 1명의 담당 Agent(assignee)를 배정해 코드 커밋부터 테스트·회귀 통과(`check-R17-DoD`), PR 생성까지 단일 브랜치/워크트리에서 완결하는 구조다.
   - 또한 R-17 §0(워크트리 격리) 및 R-19(다중팀 파일 소유권)상 타 에이전트가 진행 중인 브랜치나 task file을 직접 수정할 수 없다. 따라서 고위험 모듈 작업 시 "누가, 어느 시점에, 어떤 Issue/PR 단위로 테스트를 도출·커밋하는지" 실행 절차가 비어 있어 현행 R-17 하에서는 작동 불가하다.
3. **§8.2 (`discount-guard.ts` PoC 포함) vs §4.5/§4.8 (D8 관측성·에러 코드 단언) 누락 모순**:
   - [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L9-L55)를 직접 확인한 결과, `supabase.from(...)` 호출 4곳 모두 `{ data }`만 구조 분해하고 **`error`를 전혀 받지 않아 DB 장애나 RLS 차단 시 조용히 `null`(검증 통과/제한 없음)을 반환하는 치명적 무음 실패(Silent Failure) 결함**을 안고 있다. 또한 `L21`은 한글 문장을 하드코딩 반환한다.
   - 그럼에도 §8.2 표는 모듈 ②의 해당 차원을 `D1·D2·D6`으로만 기재하고 `D8(관측성)`과 `D3-B`를 누락했다. ([ups-registration.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/orders/ups-registration.ts#L34-L36)는 `if (error) throw`로 방어하지만 `logger.error` 호출은 없음).

### 수정 제안
1. **단계 1a 선행 조건 추가**: §8.1 단계 1a의 ①번 착수 전에 **"`105_DOMAIN_KNOWLEDGE.md` §3(상태 전이·역할·수정 가능 범위)을 최신 확정 이슈(`#1070`, `#1254` 등) 기준으로 현행화"**하는 작업을 선행 조건으로 못 박고, §7-1의 우선순위를 `"최신 확정 Issue AC(R-12에 따라 105/Ds-11에 동기화된 것) = 명세(105·Ds-11)"`로 정비할 것.
2. **§7-2 고위험 모듈 분리 절차 구체화**: R-17과 충돌하지 않도록 두 가지 실행 경로 중 하나로 명시할 것:
   - **(방안 A — 선행 Spec PR)**: Issue를 분리하여 Breaker(Auditor)가 먼저 `실패하는 테스트(it.todo 또는 skip 처리) + 결정표` PR을 머지한 뒤, Worker가 구현 Issue에서 통과시킴.
   - **(방안 B — 단일 Issue 내 1차 커밋 게이트)**: 모든 모듈에 동일하게 Worker가 **1차 커밋(결정표 + 테스트 코드만, `src/` 미수정)**을 푸시해 Draft PR 단계에서 Aiden/CPO가 결정표를 먼저 승인한 후 **2차 커밋(`src/` 구현)**을 진행하도록 통일.
3. **§8.2 모듈 ② 차원 보완**: 모듈 ②의 해당 차원에 `D8`(및 DB 조회 경계에 대한 에러 처리 검증)을 추가하고, `discount-guard.ts`의 DB `error` 무시 문제를 PoC 검증 타겟으로 명시할 것.

---

## 점검 4. 역할별 확인 (Riley 관점)

### 결론
"PoC 3모듈이 모두 DB 의존 없는 순수 함수"라는 1차 서술을 정정(§8.2)한 것에 **전적으로 동의**하며, 순수 로직과 DB 조회 부분의 경계를 나눈 방향은 타당하다. 다만 **파일 내부의 함수 단위 경계와 검증 기법 매핑을 한 단계 더 구체화**해야 PoC 측정이 흔들리지 않는다.

### 근거 (코드 직접 확인)
1. **모듈 ① ([status-machine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/logistics/status-machine.ts#L1-L186) + [ups-registration.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/orders/ups-registration.ts#L1-L39))**:
   - `status-machine.ts`의 5개 export 함수(`canChangeStatus`, `isOrderEditable`, `isOrderPartiallyEditable`, `getOrderEditScope`, `isMasteredStatus`)는 100% 순수 함수다(확인).
   - 반면 `ups-registration.ts`의 유일한 함수 `hasActiveUpsLabel(supabase, orderId)`(`L25-L39`)는 파일 전체가 Supabase 쿼리 래퍼이며 순수 비즈니스 분기가 없다(확인). 더욱이 두 파일은 서로 import하지 않으며, 실제 결합("`getOrderEditScope` 결과 + `hasActiveUpsLabel` 결과로 최종 수정 가능 여부 판정")은 상위 서버 액션(`orders` 또는 `warehouse` 액션)에서 이루어진다.
2. **모듈 ② ([pricing-engine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/pricing-engine.ts#L1-L407) + [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L1-L85))**:
   - `pricing-engine.ts`는 407줄 전체가 DB 의존 없는 순수 함수로, `fast-check`(속성 기반 테스트)와 `Stryker`(변이 테스트)의 최적 대상이다(확인).
   - 반면 `discount-guard.ts`의 `validateAgencyReverseMargin`(`L3-L25`)과 `getMaxAllowedZoneDiscount`(`L27-L85`)는 **함수 내부에서 Supabase 쿼리와 비율 계산(`1 - cost / selling`, `Math.min`, `Math.max`)이 강결합**되어 있다(확인). 따라서 코드 리팩토링(계산 로직 분리) 없이는 순수 함수를 별도로 호출할 수 없으며, Supabase 클라이언트를 mock 고정한 상태로 변이/결정표 테스트를 수행해야 한다.

### 수정 제안
- §8.2 비고 및 설명 문단에 아래 **파일·함수별 PoC 기법 경계**를 명시할 것:
  1. **순수 함수 (결정표 + `fast-check` + `Stryker` 전면 적용)**: `status-machine.ts` 전체, `pricing-engine.ts` 전체, `label-mapping.ts` 전체, `validate-payload.ts` 전체, `shxk-limits.ts` 전체.
  2. **DB 결합 함수 (Supabase mock 고정 단위 테스트 + D3-B/D6 실DB 미니 PoC 대상, `fast-check` 제외)**:
     - `ups-registration.ts` (`hasActiveUpsLabel`): 활성 라벨 존재(`true`), 미존재(`false`), `is_voided=true`만 존재(`false`), DB `error` 발생 시 `throw` 여부(Fail-Closed 검증 — 장애 시 수정을 허용하면 안 됨) 4행 결정표 테스트.
     - `discount-guard.ts` (`validateAgencyReverseMargin`, `getMaxAllowedZoneDiscount`): mock 고정 상태에서 역마진 경계값(`shipperDiscountRate > agencyRate`, `===`, `<`) 및 `selling_price <= 0`·빈 배열·DB `error` 처리 검증.

---

## 승인 차단 사유 (중대 지적)

1. **[차단 1] §7-1 / §8.1 단계 1a의 도출 원본인 `105_DOMAIN_KNOWLEDGE.md` §3(상태 전이·역할·수정 범위)의 심각한 노후화(Stale)**:
   - 105 문서가 현행 코드(`status-machine.ts`)의 `DISPOSED`/`CLAIMED` 상태, `AGENCY`/`SUB_ADMIN` 역할, `WAREHOUSED+UPS` 수정 허용 규칙을 전혀 반영하지 못한 상태다. 이를 갱신하지 않고 단계 1a("명세에서 결정표 도출")를 시행하면 잘못된 테스트가 도출된다. 단계 1a에 **105 §3 현행화 선행**을 명시해야 한다.
2. **[차단 2] §7-2(고위험 모듈 구현자/검증자 분리)와 현행 R-17(1 Issue = 1 Agent 완결 및 워크트리 격리) 간의 실행 절차 공백**:
   - 현행 R-17 프로세스 안에서 두 에이전트가 어떤 단위로 테스트 도출과 구현을 주고받는지(선행 테스트 Issue 분리 또는 단일 Issue 내 1차 커밋 리뷰 게이트) 명시하지 않으면 현장에서 즉시 R-17/R-19 위반이 발생한다.

---

## v1.0 승인 가능 여부

- **판정**: **조건부 가능**
- **승인 조건**:
  1. 위 **승인 차단 사유 2건**(① 단계 1a 착수 전 `105_DOMAIN_KNOWLEDGE.md` §3 현행화 의무 명시, ② §7-2 고위험 모듈 분리 규칙의 R-17 호환 워크플로우 명시)을 본문에 반영할 것.
  2. 점검 1·2·4에서 지적한 **경미 오류 4건**(① §1.1-5/§3 D3-A의 `DEF-085` 설명 정정 및 `Issue #688` 주 근거화, ② §4.7-8에 `rbac.ts` `normalizePath` 로케일 배열 대조 추가, ③ §5.2/§8.3의 `D3` 표기 통일, ④ §8.2의 `ups-registration.ts`·`discount-guard.ts` 함수별 검증 기법 경계 및 `D8` 차원 명시)을 수정하면 즉시 v1.0 승인 가능하다.
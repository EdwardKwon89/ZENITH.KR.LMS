# TASK-B-346: SHXK createorder consignee 전체 매핑 재점검 — PR① 폴백 제거 + PR② 회사명 반영

**상태:** 🔔 검토대기
**담당:** Baker (Team B)
**배정 이슈:** #1278
**브랜치(PR①):** feature/teamb-task-b346-iss1278-consignee-pr1-name-fallback (머지 완료 #1285)
**브랜치(PR②):** feature/teamb-task-b346-iss1278-consignee-pr2-company (머지 완료 #1300)
**브랜치(PR③):** feature/teamb-task-b346-iss1278-consignee-pr3-audit
**베이스:** origin/TeamB_Dev
**생성일:** 2026-11-12

> **PR 분할**: PR①(`consignee_name` 폴백 제거)은 #1285로 머지 완료. PR②(수하인 회사명 전 구간)는 #1300으로 머지 완료. 본 Task file은 PR③(`consignee.*` 18필드 감사 → 명세 상한 보완)에서 재사용한다.

## 목표
SHXK createorder payload의 `consignee.consignee_name`에 남아 있던 테스트용 폴백 `'E2E Consignee'`를 제거한다.
수취인 성명(`recipient_name`)이 비어 있으면 가짜 이름을 전송하지 않고, `validateShxkPayload()`의 기존 `'수취인 성명 누락'` 사전검증이 SHXK 호출 전에 차단하도록 만든다.

> JSJung 2026-11-12 확정: "`consignee_name` ← `recipient_name`(수취인 성명) 매핑 고정, 기본값(폴백) 없음. `'E2E Consignee'` 폴백은 제거."

## 범위 (이 Task = PR① 만)
- 포함: 폴백 제거 + 폴백 의존 테스트 갱신 + 사전검증 차단 증명 테스트 + 회귀맵 갱신
- **제외**: 수하인 회사명 입력란(`recipient_company`) 전 계층 구현 = PR② (PR① 병합 후 별도 브랜치), consignee 잔여 필드 감사 = PR③ (별도 지시)

## DoD
- [x] `src/lib/ups/label-mapping.ts` `buildCreateOrderPayload()`의 `consignee_name` 폴백 제거 — `(order.recipient_name as string) || ''`
- [x] `recipient_name: ''` 로 생성한 payload를 `validateShxkPayload()`에 통과시키면 `errors` 배열이 `['수취인 성명 누락']` 과 일치(`toEqual` 단언, vacuous 단언 금지)
- [x] `grep -rn "E2E Consignee" src tests` 결과 0건 (빌드 산출물 `.next/` 는 gitignore 제외)
- [x] `npm run test:regression` 전체 PASS (Test Files 236 / Tests 1689)
- [x] `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 회귀맵에 §77 추가
- [x] R-17 절차 준수: 코드 커밋 → task file `[작업 결과]` → `status:review` → `check-R17-DoD` → 문서 커밋 → PR(`base=TeamB_Dev`, `Closes #1278`)

## 전제 / 주의
- 선행 조건 없음 (PR② 만 Ds-11 명세 선갱신 필요)
- `.agent/ACTIVE_TASK.md`·`scratch/IMP_PROGRESS.md` 는 폐지 파일 — 수정 금지
- SHXK 외부 HTTP 호출은 이 Task에서 발생하지 않음(순수 함수 + 사전검증 단위 테스트만)

## [작업 결과]
- **코드 커밋:** `26181fbdd` (`[Baker] fix: TASK-B-346 SHXK consignee_name 테스트용 폴백 제거 (Issue #1278 PR①)`) — 3 files changed, 51 insertions(+), 5 deletions(-)
  - `src/lib/ups/label-mapping.ts`: `consignee_name: (order.recipient_name as string) || 'E2E Consignee'` → `|| ''` (폴백 제거, 주석으로 차단 경로 명시)
  - `tests/unit/ups/ups-labels-mapping.test.ts`: 기존 폴백 기대 테스트 1건 제거 → `TASK-B-346` 중첩 describe 3건 신규 (빈 성명 → `''` / `validateShxkPayload` `toEqual(['수취인 성명 누락'])` / 정상 성명 → `toEqual([])`)
  - `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`: 회귀맵 **§77** (TC-346-1/2/3/GREP/RST) 추가
- **rebase:** 착수 후 `origin/TeamB_Dev`가 PR #1282(TASK-B-345, shipper_company 미전송)로 전진 → `git rebase origin/TeamB_Dev` 수행. 회귀맵 §76 충돌은 TASK-B-345 섹션을 §76으로 유지하고 본 Task를 **§77로 재번호**하여 해소. `label-mapping.ts`·`ups-labels-mapping.test.ts`는 자동 병합(충돌 없음). 최종 코드 커밋 해시는 rebase 후 값 `26181fbdd`.
- **폴백 잔존 점검:** `grep -rn "E2E Consignee" src tests` → 0건 (exit 1)
- **회귀 테스트 (rebase 후 최종 head 기준):** `npm run test:regression` → **Test Files 236 passed (236) / Tests 1689 passed (1689)**, Duration 411.74s
- **빌드 (rebase 후):** `npm run build` → **EXIT=0** (TypeScript 오류 0건, 라우트 테이블 정상 출력)
- **되돌리기 검증:** `consignee_name` 폴백을 `'E2E Consignee'`로 원복 후 해당 테스트 파일 재실행 → **2 failed / 40 passed**
  - `expected 'E2E Consignee' to be '' // Object.is equality`
  - `expected [] to deeply equal [ '수취인 성명 누락' ]`
  - 원복 후 재적용 → 42 passed 확인
- **vacuous 단언 점검:** 신규 테스트에 `toContain(`·`typeof`·`.toBeDefined()` 단독 단언 없음 (`toEqual`/`toBe`만 사용)

## [발견 이슈]
1. **[CI 차단 — 전 PR 공통, 본 Task 무관] `Regression Tests` 가 `Start local Supabase` 단계에서 즉시 실패 (19s)**
   - 로그: `[inbucket] in supabase/config.toml is no longer supported. Use [local_smtp] instead.` → `Process completed with exit code 1.`
   - 원인: CI가 `supabase/setup-cli@v1` + `version: latest`(v3.x)를 사용하는데 `supabase/config.toml` 에 deprecated `[inbucket]` 섹션이 남아 있어 `supabase start` 자체가 거부됨. 본 PR diff에 `supabase/` 변경 0건.
   - 동일 실패가 직전 PR #1282(TASK-B-345)에서도 재현됨(12s fail) — **본 Task와 무관한 인프라 드리프트**.
   - **이미 Jaison이 `DEF-B-154`(CI Regression supabase start inbucket 설정 거부)로 보고 중** (`docs/jaison-def-b-154-ci-supabase-inbucket` 브랜치 존재) → 중복 DEF 파일 생성하지 않음.
   - 본 PR CI 실제 결과: `Regression Tests` **fail (인프라)**, `Type Check` **pass**, `Task File Check` **pass**. 로컬(v2.95.4) 동일 스위트는 **236 files / 1689 tests PASS**, `npm run build` EXIT=0.
   - 조치 후보(공유 파일이라 본 Task에서 임의 수정 안 함): ① `supabase/config.toml` 을 `[local_smtp]` 로 마이그레이션 ② workflow CLI 버전 v2.x 핀.

## R-17 체크리스트
- [x] 코드 커밋 (`26181fbdd` — 코드·테스트·회귀맵만, task file 미포함)
- [x] task file `[작업 결과]` 작성 (실제 커밋 해시 기재)
- [x] GitHub Issue 라벨 `status:review` 전환
- [x] `check-R17-DoD` 전항목 통과
- [x] 문서 커밋 (task file만)
- [x] PR 생성 (`base=TeamB_Dev`, `Closes #1278`)
- [x] `gh pr checks <PR번호>` 실제 출력 보고 (이전 커밋 결과 인용 금지)

## PR / CI 실제 결과
- **PR:** #1285 (base `TeamB_Dev` ← head `feature/teamb-task-b346-iss1278-consignee-pr1-name-fallback`) — `gh pr view 1285 --json baseRefName` → `"TeamB_Dev"` 확인
- **`gh pr checks 1285` 실제 출력 (2026-11-12, run 43235505748):**
  ```
  Regression Tests                        fail     19s
  Task File Check (advisory, non-blocking) pass     9s
  Type Check (advisory, non-blocking)      pass     1m12s
  ```
- **Regression Tests fail 원인 = CI 인프라** (`Start local Supabase` → `[inbucket] in supabase/config.toml is no longer supported`), 본 PR diff 무관 — 상세는 [발견 이슈] 1. 로컬 동일 스위트는 236 files / 1689 tests PASS.

---

# PR② — 수하인 회사명(`recipient_company`) 전 구간 반영

**브랜치:** feature/teamb-task-b346-iss1278-consignee-pr2-company (base `origin/TeamB_Dev` = `0fd7528ff`)
**범위:** DB 컬럼 + RPC v7 + 앱 레이어(입력 UI·zod·수정 복원·edit-log·SHXK payload) 전 구간. 회귀맵 §81.

## 목표
SHXK createorder `consignee.consignee_company`(수취인 회사명, 선택·최대 200자)에 대응하는 입력이 전무했던 갭을 채운다.
JSJung 확정(2026-11-12): 하우스 입력 "회사명" 1개 → `consignee_company`. 별도 "담당자" 필드는 만들지 않으며(`recipient_name`이 담당자 역할), 레거시 `recipient_contact`는 미사용.

## DoD (PR②)
- [x] DB 컬럼 `zen_orders.recipient_company` (text, nullable) 추가 — `20261113090000_task_b346_recipient_company.sql`
- [x] RPC `create_order_atomic` v7 — `p_payload->>'recipient_company'` 저장 (`20261113090100_task_b346_create_order_atomic_v7.sql`, v6 기준 CREATE OR REPLACE — TASK-B-305 선례)
- [x] 앱 레이어: 등록/수정 폼 입력(회사명) · zod(`max 200`) · `validateShxkPayload` 사전검증 · `buildCreateOrderPayload` → `consignee_company` · 수정화면 복원(`buildOrderEditDefaults`) · edit-log(`recipient_company`)
- [x] 빈 값이면 payload에서 `consignee_company` **키 자체 생략**(미전송), 전송 시 쉼표→공백 치환(TASK-B-343 선례)
- [x] 실DB 왕복 통합 테스트 5건(TC-346-01~05) — mock 금지(R-14), RPC 실제 실행 후 psql 직접 SELECT
- [x] 단위 테스트 3파일 신규 케이스(TC-346-06~11), vacuous 단언 없음
- [x] `npm run test:regression` 전체 PASS, `npm run build` EXIT=0
- [x] 회귀맵 §81 추가, Ds-11 명세 선갱신(R-11/R-12)
- [x] R-17 절차 준수: 코드 커밋 → task file `[작업 결과]` → `status:review` → `check-R17-DoD` → 문서 커밋 → PR(`base=TeamB_Dev`, `Closes #1278`)

## [작업 결과] (PR②)
- **명세 선갱신 커밋:** `9e17d6f2b` (`[Baker] docs: TASK-B-346 PR② Ds-11 명세 선갱신 — recipient_company/consignee 매핑 (Issue #1278)`) — `docs/02_Analysis/Ds_11_API_상세_명세서.md` `createOrder` 절에 수하인 필드 매핑표 + 컬럼·RPC v7 기재 (R-11/R-12)
- **코드 커밋:** `662f24ebc` (`[Baker] feat: TASK-B-346 PR② 수하인 회사명(recipient_company) 전 구간 반영 (Issue #1278)`) — 17 files changed, 600 insertions(+), 5 deletions(-)
  - `supabase/migrations/20261113090000_task_b346_recipient_company.sql` (신규): `ALTER TABLE public.zen_orders ADD COLUMN IF NOT EXISTS recipient_company text` + `COMMENT ON COLUMN`
  - `supabase/migrations/20261113090100_task_b346_create_order_atomic_v7.sql` (신규): RPC v7 — INSERT 컬럼·값에 `recipient_company` 추가, `'Order Registered (Atomic RPC v7)'`
  - `src/lib/validation/shxk-limits.ts`: `RECIPIENT_COMPANY_MAX = 200` (SHXK 명세 상한)
  - `src/lib/validation/order.ts`: zod `recipient_company: z.string().max(200).optional()`
  - `src/lib/shxk/validate-payload.ts`: 값이 있으면 200자 초과 시 `수취인 회사명 200자 초과` 단일 오류
  - `src/lib/ups/label-mapping.ts`: `consignee_company`를 **입력이 있을 때만** 스프레드(빈 값이면 키 생략) + `sanitizeComma` 적용
  - `src/lib/orders/edit-defaults.ts`: 수정화면 복원 `recipient_company: order.recipient_company ?? ''`
  - `src/lib/orders/edit-log-fields.ts`: CORE_FIELDS·라벨(`수하인 회사명`) 추가
  - `src/app/actions/operations/orders.ts`: `headerData.recipient_company`
  - `src/components/orders/OrderRegistrationForm.tsx`: 수하인 "Company" 입력 1개 추가, 주소록 선택 시 회사명 초기화(주소록에 회사명 컬럼 없음)
  - `src/types/supabase.ts`: `recipient_company` 3곳(Row/Insert/Update) 추가
  - `tests/integration/task-b346-recipient-company.test.ts` (신규) + 단위 4파일 신규 케이스
  - `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`: 회귀맵 **§82** (TC-346-01~11)
- **rebase:** PR 생성 직후 base가 `0fd7528ff` → `0749d5466`(PR #1294·#1297 등 7커밋 전진)로 변경되어 `git rebase origin/TeamB_Dev` 수행. 회귀맵 충돌은 upstream TASK-B-350 섹션을 **§81**로 유지하고 본 Task를 **§82로 재번호**하여 해소(코드·테스트·마이그레이션은 자동 병합, 충돌 없음). 최종 커밋 해시는 rebase 후 값.
- **실DB 마이그레이션 적용:** `npx supabase db reset` 성공 — `recipient_company` text 컬럼 존재, `create_order_atomic` 함수 정의에 `recipient_company` 포함(position 605), `migration list` 로컬 반영 확인
- **표적 테스트:** 단위 4파일 **88 passed**, 통합 `task-b346-recipient-company.test.ts` **5 passed**
- **회귀 테스트:** `npm run test:regression` → **Test Files 241 passed (241) / Tests 1758 passed (1758)**, Duration 485.61s (`origin/TeamB_Dev` rebase 후 최종 head 기준)
- **빌드:** `npm run build` → **EXIT=0**
- **되돌리기 검증 (테스트 유효성):**
  - (A) RPC v7에서 `recipient_company` insert 컬럼·값 2줄 주석 처리 + `npx supabase db reset` → **TC-346-01 FAIL** (`AssertionError: expected null to be 'Acme Trading Co'`) → 복구 후 **5/5 PASS**
  - (B) `orders.ts` `headerData`의 `recipient_company` 제거 → **TC-346-03 FAIL** (`AssertionError: expected 'First Co' to be 'Second Co'`) → 복구 후 PASS
- **vacuous 단언 점검:** 신규 테스트는 `toEqual`/`toBe`/`toHaveProperty`/`not.toHaveProperty`만 사용 — `toContain`·`typeof`·`.toBeDefined()` 단독 단언 없음

## R-17 체크리스트 (PR②)
- [x] 코드 커밋 (`662f24ebc` — 마이그레이션·src·tests·회귀맵, task file 미포함)
- [x] task file `[작업 결과]` 작성 (실제 커밋 해시 기재)
- [x] GitHub Issue 라벨 `status:review` 전환
- [x] `check-R17-DoD` 전항목 통과
- [x] 문서 커밋 (task file만)
- [x] PR 생성 (`base=TeamB_Dev`, `Closes #1278`)
- [x] `gh pr checks <PR번호>` 실제 출력 보고 (이전 커밋 결과 인용 금지)

## PR② / CI 실제 결과
- **PR:** #1300 (base `TeamB_Dev` ← head `feature/teamb-task-b346-iss1278-consignee-pr2-company`) — `gh pr view 1300 --json baseRefName` → `"TeamB_Dev"` 확인
- **`gh pr checks 1300` 실제 출력 (2026-11-13, run 43376129792 — rebase 후 최종 head `d16690ada`):**
  ```
  Regression Tests                        pass     7m42s
  Task File Check (advisory, non-blocking) pass     7s
  Type Check (advisory, non-blocking)      pass     1m32s
  Docs Sync Check (advisory, non-blocking) pass     9s
  ```
- **PR 생성 직후 첫 CI 미실행 원인:** base가 전진해 `mergeable=CONFLICTING` 상태가 되면 GitHub이 `pull_request` merge-ref를 만들지 못해 워크플로가 아예 트리거되지 않는다(`no checks reported`). `git rebase origin/TeamB_Dev`(회귀맵 §81→§82 재번호) + force push 후 정상 트리거·전항목 PASS.

## [발견 이슈] (PR②)
1. **주소록(`zen_address_book`)에 회사명 컬럼 부재** — 주소록에서 수하인을 선택하면 회사명을 채울 소스가 없어, 이전 입력값이 남지 않도록 주소록 선택 시 회사명을 빈 값으로 초기화했다(`OrderRegistrationForm.tsx`). 주소록 스키마에 회사명을 추가하는 것은 본 Task 범위 밖 — 후속 개선 후보(JSJung/Jaison 판단 필요).
2. **`src/types/supabase.ts` stale** — 본 PR②에서 필요한 `recipient_company`만 추가했다. 파일 자체가 `recipient_address_detail` 등 기존 컬럼도 누락한 상태(자동 생성 재실행 필요) — 범위 확대 방지를 위해 미포함.
3. **PR 생성 직후 CI 무트리거 = base 충돌** — 위 PR②/CI 결과 항목 참조. base 전진 시 rebase 없이는 CI가 실행조차 되지 않으므로, PR 생성 직후 `gh pr view --json mergeable` 확인이 필요하다.

---

# PR③ — SHXK consignee 전체 매핑 감사 + 명세 상한 보완 + 회사명 공백 정규화

**브랜치:** feature/teamb-task-b346-iss1278-consignee-pr3-audit (base `origin/TeamB_Dev` = `5056416d5`)
**범위:** 감사(18필드) + 명세 상한 검증 보완(7필드) + 회사명 공백 정규화. 회귀맵 §86. **DB 마이그레이션·UI 변경 없음.**

## 목표
SHXK `createorder`의 `consignee.*` 전체 명세(`docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 130~147행, 18개 필드)와 현재 전송·검증 상태를 대조(감사)하고, **명세 위반이 객관적으로 확인되는 갭만** 보완한다. 새 DB 컬럼·입력 UI가 필요한 항목은 구현하지 않고 결정 요청 표로 보고한다(R-11).

## DoD (PR③)
- [x] 1단계 감사 표(18행) — 모든 "현재 …" 칸에 `파일:줄` 근거(추정 금지)
- [x] 2단계 (a) 공백만 회사명(`"  "`) 미전송(trim 후 빈 값이면 키 생략)
- [x] 2단계 (b) 명세 상한 있으나 앱 검증 없던 7필드 사전검증 추가 — `shxk-limits.ts` 상수(명세 행 주석) + `validate-payload.ts` 단일 오류 `수취인 … N자 초과` + 6필드 zod max
- [x] 3단계 미전송 8필드 결정 요청 표(task file + Issue 코멘트) + IMP-190 등록 (구현 안 함)
- [x] Ds-11 수하인 매핑표 **선갱신**(R-11/R-12) 후 `npm run check:ds11` 기록
- [x] 되돌리기 검증 2건(A: 사전검증 / B: 회사명 공백) failed/passed 수 기록
- [x] `npm run test:regression` 전체 PASS, `npm run build` EXIT=0
- [x] 회귀맵 §86 추가
- [x] UI 변경 없음
- [x] R-17 절차 준수

## [PR③ 감사] — SHXK createorder `consignee.*` 18필드 대조
> "현재" 칸의 줄 번호는 **PR③ 수정 전** 기준. 명세 = `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 130~147행.

| # | 명세 필드 | 최대길이 | 필수 | 현재 전송 (label-mapping.ts) | 현재 검증 (order.ts zod / validate-payload.ts) | 갭 | 조치 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | `consignee_name` | 200 | Y | L170 `\|\| ''` | zod L76 `.min(1)`만 / vp L59 누락만 | 상한 검증 전무 | **수정** zod max 200 + vp 200 |
| 2 | `consignee_company` | 200 | N | L173–175 조건부 스프레드 | zod L78 max 200 / vp L60–63 200 | 상한 OK. 단 **공백만 입력 시 `''` 전송** | **수정**(공백 정규화) |
| 3 | `consignee_countrycode` | 2 | Y | L176 `\|\| countryCode` | zod L85(없음) / vp L64 누락만 | 상한 검증 없음 | **수정** vp 2 (zod 제외 — select 제어) |
| 4 | `consignee_province` | 300 | 조건 | L177 `sanitizeComma` | zod L86(없음) / vp 없음 | 상한 검증 없음 | **수정** zod max 300 + vp 300 |
| 5 | `consignee_city` | 300 | 조건 | L178 `sanitizeComma` | zod L87(없음) / vp L67 누락만 | 상한 검증 없음 | **수정** zod max 300 + vp 300 |
| 6 | `consignee_district` | 300 | 조건 | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 7 | `consignee_street` | 300 | Y | L179 `fullConsigneeStreet` | zod L79 `.min(1)` / vp L65–66 누락 + 105(`checkStreetLength`) | 앱 105 < 명세 300 — 의도적 더 엄격(UPS AddressLine) | **보류(갭 아님)** |
| 8 | `consignee_postcode` | 100 | 조건 | L180 `\|\| ''` | zod L84(없음) / vp L68 누락만 | 상한 검증 없음 | **수정** zod max 100 + vp 100 |
| 9 | `consignee_doorplate` | 300 | N | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 10 | `consignee_areacode` | 10 | N | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 11 | `consignee_telephone` | 100 | 조건 | L181 `stripNonDigits` | zod L82–83 max 15 digits / vp L69–72 `checkPhone` 15 | 앱 15 < 명세 100 — 의도적 더 엄격(E.164) | **보류(갭 아님)** |
| 12 | `consignee_mobile` | 100 | 조건 | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 13 | `consignee_email` | 100 | N | L182 `\|\| ''` | zod L90 `.email()`만 / vp 없음 | 상한 검증 없음 | **수정** zod max 100 + vp 100 |
| 14 | `consignee_fax` | 100 | N | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 15 | `consignee_certificatetype` | — | N | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 16 | `consignee_certificatecode` | 50 | N | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 17 | `consignee_credentials_period` | 50 | N | **미전송** | — | 입력·전송 없음 | **보류 → IMP-190** |
| 18 | `consignee_tariff` | 50 | 조건 | L183 `\|\| ''` | zod L89(없음) / vp 없음 | 상한 검증 없음 | **수정** zod max 50 + vp 50 |

**감사 결론**: 전송 중 10필드 중 5필드가 상한 검증 공백(#1·#3·#4·#5·#8·#13·#18 중 회사명 제외 7필드 중 6필드는 zod도 없음) → 이번 PR에서 보완. street·telephone은 앱이 명세보다 엄격(의도적). 미전송 8필드는 별도 결정.

## [PR③ 결정 요청] — 미전송 8필드 (구현하지 않음, 결정 대기)
| 명세 필드 | 필요 여부(권장) | 필요한 컬럼·UI | 영향 국가 | 권장안 |
| :-- | :-- | :-- | :-- | :-- |
| `consignee_district` | 조건부 필요 | `zen_orders.recipient_district`(text) + 수하인 주소 "구/군" 입력 | 주-도시-구 구조 국가(CN·JP·일부 EU) | 1단계 포함 검토 |
| `consignee_doorplate` | 낮음 | `recipient_doorplate` + 입력 | 문패 체계 국가(CN 등) | 보류(거부 로그 확인 후) |
| `consignee_areacode` | 낮음 | `recipient_areacode` + 입력 | 일부 아시아 | 보류 |
| `consignee_mobile` | 조건부 필요 | `recipient_mobile` + 입력(전화와 별도) | 대부분 국가(휴대폰이 주 연락처) | 1단계 포함 검토(현재 `telephone` 폴백) |
| `consignee_fax` | 불필요 | — | — | 미전송 확정 권장 |
| `consignee_certificatetype` | 정책 결정 필요 | `recipient_certificate_type` + select(ID/PP) | 신분증 기반 통관 국가 | 정책 확정 후 |
| `consignee_certificatecode` | 정책 결정 필요 | `recipient_certificate_code` + 입력 | 상동 | 정책 확정 후 |
| `consignee_credentials_period` | 정책 결정 필요 | `recipient_credentials_period` + 입력 | 상동 | 정책 확정 후 |

## [작업 결과] (PR③)
- **명세 선갱신:** `docs/02_Analysis/Ds_11_API_상세_명세서.md` `createOrder` 절 수하인 매핑표 갱신 — 명세 상한·미전송 8필드 기재. `npm run check:ds11` → `액션 함수 298개 | Ds-11 언급 92개 | 미반영 206개 (허용 목록 206개)` **OK** (신규 미반영 0)
- **코드 커밋:** `88629c7b1` (`[Baker] fix: TASK-B-346 PR③ SHXK consignee 명세 상한 보완 + 회사명 공백 정규화 (Issue #1278)`) — 10 files changed, 395 insertions(+), 57 deletions(-)
  - `src/lib/ups/label-mapping.ts`: `consigneeCompany`를 미리 `sanitizeComma` 후 빈 값이면 키 생략(공백만 입력 결함 수정)
  - `src/lib/validation/shxk-limits.ts`: `CONSIGNEE_NAME_MAX`(200)·`_COUNTRYCODE_MAX`(2)·`_PROVINCE_MAX`(300)·`_CITY_MAX`(300)·`_POSTCODE_MAX`(100)·`_EMAIL_MAX`(100)·`_TARIFF_MAX`(50) 추가(명세 행 주석)
  - `src/lib/shxk/validate-payload.ts`: `checkMaxLength` + `CONSIGNEE_MAX_LENGTHS`/`checkConsigneeMaxLengths` — 경계 초과 시 `수취인 … N자 초과` 단일 오류
  - `src/lib/validation/order.ts`: zod max 6필드(성명·주/도·도시·우편번호·통관부호·이메일)
  - 단위 3파일 신규 케이스(TC-346-12~22), `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 회귀맵 **§86**
- **함수 길이 준수(ZEN_A4 / GOV_COMMON.md:307, 50줄 엄격)**: 이번 변경으로 50줄을 초과하게 된 두 함수를 리팩터링 — `validateShxkPayload` **52→35줄**(invoice 루프를 `checkInvoiceItems()`로 분리), `buildCreateOrderPayload` **55→39줄**(consignee 리터럴을 `buildConsigneePayload()`로 분리). 변경 파일(`validate-payload.ts`·`label-mapping.ts`·`order.ts`·`shxk-limits.ts`)의 모든 top-level 함수 ≤50줄 확인(`^}` 종료 스캔). ※ `order.ts`의 `superRefine` 콜백(127줄)은 **기존 코드로 본 PR에서 미변경**(Advisory, 별도 리팩터링 대상).
- **UI 변경 없음** (컴포넌트 파일 무변경)
- **되돌리기 검증 (테스트 유효성):**
  - (A) `validate-payload.ts` `checkConsigneeMaxLengths(...)` 호출 주석 처리 → `tests/unit/shxk/validate-payload-limits.test.ts` **7 failed / 15 passed** → 복구 후 **22 passed**
  - (B) `label-mapping.ts` 회사명 공백 정규화 원복(truthiness 스프레드) → `tests/unit/ups/ups-labels-mapping.test.ts` **1 failed / 47 passed** → 복구 후 **48 passed**
- **표적 테스트:** 3파일 **98 passed**
- **회귀 테스트:** `npm run test:regression` → **Test Files 254 passed (254) / Tests 1862 passed (1862)**, Duration 401.39s (리팩터링 후 재실행)
- **빌드:** `npm run build` → **EXIT=0** (TypeScript 오류 0건, 라우트 테이블 정상 출력)
- **vacuous 단언 점검:** 신규 테스트는 `toEqual`/`toBe`/`toHaveProperty`/`not.toHaveProperty`만 사용 — `toContain`·`typeof`·`.toBeDefined()` 단독 단언 없음

## R-17 체크리스트 (PR③)
- [x] 코드 커밋 (코드·테스트·Ds-11·회귀맵·IMP, task file 미포함) — `88629c7b1`
- [x] task file `[작업 결과]` 작성 (실제 커밋 해시 기재)
- [x] GitHub Issue 라벨 `status:review` 전환 (#1278)
- [x] `check-R17-DoD` 전항목 통과 (미설치 시 수동 교차점검 — 본 Task는 수동 점검: diff 범위·파일 1,500줄·함수 50줄)
- [x] 문서 커밋 (task file만) — `2e290549f`
- [x] PR 생성 (`base=TeamB_Dev`, body `Refs #1278`) — #1327
- [x] `gh pr checks <PR번호>` 실제 출력 보고 (이전 커밋 결과 인용 금지) — run `43818128092` headSha = 최종 head `2e290549f`

## PR③ / CI 실제 결과
- **PR:** #1327 (base `TeamB_Dev`, `Refs #1278`) — `mergeable=MERGEABLE`, head `2e290549f`
- **`gh pr checks 1327` 실제 출력** (run `43818128092`, headSha `2e290549fc58434b418bca33b83e1f54bbc23fc9` = 최종 head와 일치):
  ```
  Dependency Audit (advisory, non-blocking)   pass  11s
  Docs Sync Check (advisory, non-blocking)    pass  15s
  Regression Tests                            pass  10m29s
  Task File Check (advisory, non-blocking)    pass  10s
  Type Check (advisory, non-blocking)         pass  1m31s
  ```





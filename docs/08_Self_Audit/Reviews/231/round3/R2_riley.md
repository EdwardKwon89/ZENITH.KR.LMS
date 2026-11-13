<!-- agent=Riley round=R2 label=Riley (Antigravity/Gemini 4 Argon High) [review/plan] secs=327 -->
# 문서 231 (v0.4) 3차 검증 라운드 2 교차 검토 — Riley (CPO·CIO)

> **검토자**: Riley (CPO(Chief Product Officer, 최고제품책임자: 제품 도메인·요구사항·인수 시나리오 총괄)·CIO(Chief Information Officer, 최고정보책임자: 데이터·시스템 아키텍처 및 기술 거버넌스 총괄) 겸임)
> **검토 대상**: [231_TEST_COVERAGE_STRATEGY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md) v0.4 및 D_Kai·B_Kai 3차 검증 직전 의견

---

## 1. 상대 의견 동의·반대 및 근거

### 1.1 동의하는 상대 주장
1. **D_Kai·B_Kai 공통(점검 1) — 부록 C #6(`billing_status` 누락) 및 매트릭스 분리 예시 행 누락 [동의]**
   - **근거**: [riley_review.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Reviews/231/riley_review.md#L38)(`L38`)은 `billing_status`(청구 상태)를 §4.1 조건 열에 포함하도록 제안했으나, [231_TEST_COVERAGE_STRATEGY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md#L81) `§3`(`L81`)에만 들어가고 `§4.1`(`L116`) 조건 축에는 빠졌다(**확인**). 또한 `riley_review.md:47`의 "순수/상태결합 매트릭스 분리 예시"는 부록 C에 독립 행이 없다(**확인**).
2. **B_Kai(점검 1) — 부록 C #24 및 §8.1 1a-④ 귀속 오류 [동의]**
   - **근거**: `riley_review.md:72`에서 Riley도 "타 모듈 점검 결과 task file 의무 기재"를 함께 제안했으나 부록 C #24(`L471`)는 `(B)`로만 귀속했다(**확인**). 반대로 `§8.1` 1a-④(`L319`)의 `"Aiden/CIO 선행 작업 *(Riley)*"`은 2차 검증에서 추가된 문구로 1차 `riley_review.md:142-143` 원문에는 없었다(**확인**).
3. **D_Kai·B_Kai 공통(점검 2) — §5.2(`L266`) D3-B 근거 혼동, `discount-guard.ts` 2번째 함수 누락, 부록 E #11(`Ds_05·Ds_10만`), §10 #9 브랜치 미표기 [동의]**
   - **근거**: `discount-guard.ts`의 DB(Database, 데이터베이스) `error` 미검사(fail-open, 오류 시 제한 없이 통과)는 **D8(관측성)** 근거이지 **D3-B(RLS(Row Level Security, 행 단위 접근 제어: DB에서 사용자·역할별 행 접근을 제한하는 정책)·GRANT)** 근거가 아니다(**확인**). 또한 [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L51-L59)(`L51-59`, `getMaxAllowedZoneDiscount`)도 1번째 함수(`L9, L17`)와 동일한 fail-open 구조다(**확인**). [docs/03_Design/000_README.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/03_Design/000_README.md#L40-L45)에는 `Ds_01~06`이 존재하므로 `"Ds_05·Ds_10만 존재"`(`L407, L513`)는 부정확하며(**확인**), `§10 #9`(`L405`)의 `TASK-B-348`(#1280)은 기준 브랜치 표기가 없어 `L36` 원칙을 위반했다(**확인**).
4. **D_Kai·B_Kai 공통(점검 3·4) — §4.9 `[테스트 설계]` 양식·깊이 표의 집행 장애 및 305 §1.6 충돌 [동의]**
   - **근거**: ① 현행 Issue·task file에는 AC(Acceptance Criteria, 인수 조건: 기능 완료 판정 요구 조건) 번호 체계가 없고 DoD(Definition of Done, 작업 완료 정의: 완료 보고 전 필수 충족 기준)만 사용한다([GOV_COMMON.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/GOV_COMMON.md#L184) `L184` **확인**). ② 저장소에 `105` 문서가 3종([105_DOMAIN_KNOWLEDGE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/105_DOMAIN_KNOWLEDGE.md), [105_MULTITEAM_GOVERNANCE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/105_MULTITEAM_GOVERNANCE.md#L1), [105_MODEL_CAPABILITY_MATRIX.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/105_MODEL_CAPABILITY_MATRIX.md#L1) — 모두 **확인**)이라 양식의 `105 §` 표기가 모호하다. ③ `§4.9` 깊이 표(`L236`)의 `"실DB 테스트(D3-B·D6)"`에 `(해당 시)` 단서가 빠져 `TASK-B-343`(#1268, 주소 쉼표 제거)처럼 DB와 무관한 작업에도 실DB 테스트를 강제한다(**확인**). ④ `§4.9` ③(`L216`)의 `"커버 맵 갱신(§7-6)"`은 `§7-7`(`L304`)의 오참조이며, `§1.3`(`L52`)의 R-14 인용("원격 금지")은 [GOV_COMMON.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/GOV_COMMON.md#L128-L129)("원격은 승인 후 실시")보다 엄격하다(**확인**). ⑤ [305_NEW_PROJECT_BASELINE_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/305_NEW_PROJECT_BASELINE_GUIDE.md#L31) §1.6은 실증된 항목만 채택하므로 PoC(Proof of Concept, 개념 증명: 전면 도입 전 시범 검증) 전 편입은 `305` 원칙과 충돌한다([306_NEW_PROJECT_REUSE_REVIEW.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/306_NEW_PROJECT_REUSE_REVIEW.md#L193-L199) §6-1 선례 **확인**).

### 1.2 반대·정정하는 상대 주장
1. **D_Kai(점검 2) — "§5.2 예시 '오더 상태 전이 D3-B 🟡': 실DB RLS 테스트는 없다(SQL 문자열 검사뿐)" 주장 [반대 / 사실 오류]**
   - **근거**: [tests/integration/ups-edit-before-registration.test.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/tests/integration/ups-edit-before-registration.test.ts#L335-L360)(`L39-60, L335-360`, `TC-339-INT-⑤`)을 직접 열어 확인한 결과, 서명된 JWT(JSON Web Token, JSON 기반 인증 토큰)로 화주(`authenticated`) 세션 클라이언트를 생성해 실제 로컬 Supabase에서 `zen_ups_labels`의 RLS 조회 허용 여부를 검증하는 **실DB RLS 테스트가 이미 존재한다(확인)**. [tests/integration/def-b151-ups-product-guard.test.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/tests/integration/def-b151-ups-product-guard.test.ts#L54-L66)(`TC-336-RLS-01/02`)도 실DB RLS를 평가한다(**확인**). 따라서 모듈 ①의 `D3-B`를 `🟡`(부분 커버)로 둔 `§5.2`(`L262`) 예시값은 정확하다.
2. **D_Kai·B_Kai(점검 3) — "실DB 자기완결 fixture 패턴이 없어 D3-B·D6 착수가 불가능하다"는 전제 [부분 반대]**
   - **근거**: 위 `ups-edit-before-registration.test.ts:27-100`에 이미 `psql` 실행 + `makeJwt`/`makeSessionClient` + 고유 UUID 기반 `setupFixture`/`cleanupFixture` 자기완결 패턴이 동작 중이다(**확인**). PoC 단계 1에서 이를 공통 헬퍼(`tests/helpers/rls-fixture.ts`)로 추출하기만 하면 된다.
3. **D_Kai(점검 4) — "`vacuous 단언`(항상 통과하는 무의미한 단언)의 정의가 없어 집행 불가" 주장 [부분 반대]**
   - **근거**: `231` §7-4(`L301`)의 4개 패턴과 [210_AI_AGENT_REWORK_PREVENTION_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/210_AI_AGENT_REWORK_PREVENTION_GUIDE.md#L174)(`L52, L174`)의 vacuous-test 안티패턴 목록이 이미 존재한다(**확인**). `"구체적 기대값 단언(toBe/toEqual) 없이 단독 사용 금지(병기 허용)"`으로만 문구를 보완하면 즉시 집행 가능하다.

---

## 2. 상대 주장 사실 확인 결과 (저장소 직접 검증)

| 상대 주장 (제기자) | 검증 결과 | 직접 확인한 근거 (파일:줄) |
|:--|:--:|:--|
| 부록 C #6 `billing_status`가 §4.1(`L116`)에 없다 (D_Kai·B_Kai) | **맞음 (확인)** | [231_TEST_COVERAGE_STRATEGY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md#L81) `L81`에만 있고 `L116`에는 미포함 |
| `discount-guard.ts` 2번째 함수도 `error`를 미검사한다 (B_Kai) | **맞음 (확인)** | [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L51-L59) `Promise.all` 후 `.data`만 참조 |
| 저장소에 실DB RLS 테스트는 없으며 SQL 문자열 검사뿐이다 (D_Kai) | **틀림 (확인)** | [ups-edit-before-registration.test.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/tests/integration/ups-edit-before-registration.test.ts#L335-L360) 및 [def-b151-ups-product-guard.test.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/tests/integration/def-b151-ups-product-guard.test.ts#L54-L66)에서 실DB JWT 세션 RLS 실측 확인 |
| `docs/03_Design/`에 `Ds_01~06`이 존재한다 (D_Kai·B_Kai) | **맞음 (확인)** | [docs/03_Design/000_README.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/03_Design/000_README.md#L40-L45)에서 `Ds_01~06` 목록 확인 (`Ds_10`은 파일명 미상이라 **미확인**) |
| `TASK-B-348`(#1280)은 `develop`에 없다 (D_Kai·B_Kai) | **맞음 (확인)** | [LIVE_REGRESSION_TEST_MAP.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md#L1100) 최신이 `TASK-B-343`(#1268). (`TeamB_Dev` 실재 여부는 git 미실행으로 **미확인**) |
| `check-R17-DoD`는 CI 스크립트가 아니라 `opencode.json` 템플릿이다 (B_Kai) | **맞음 (확인)** | [opencode.json](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/opencode.json#L8-L11)에서 OpenCode 전용 프롬프트 템플릿임을 확인 |
| 저장소에 `105_*.md` 문서가 3개 존재한다 (D_Kai) | **맞음 (확인)** | `105_DOMAIN_KNOWLEDGE.md`, `105_MULTITEAM_GOVERNANCE.md`, `105_MODEL_CAPABILITY_MATRIX.md` 3종 열람 확인 |
| `305` §1.6은 실증 후 채택 원칙이며 `306` §6-1이 미검증 이식을 지적했다 (B_Kai) | **맞음 (확인)** | [305_NEW_PROJECT_BASELINE_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/305_NEW_PROJECT_BASELINE_GUIDE.md#L31) 및 [306_NEW_PROJECT_REUSE_REVIEW.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/306_NEW_PROJECT_REUSE_REVIEW.md#L193-L199) 확인 |

---

## 3. 본인(Riley) 입장 변경 및 유지 구분

- **상대 의견을 수용해 바꾼 것 (3건)**
  1. **§4.9 `[테스트 설계]` 양식 개편 (D_Kai·B_Kai 수용)**: 실존하지 않는 `AC 번호`를 **`Issue DoD 항목`**으로 교체하고, `105 §`를 **`105_DOMAIN_KNOWLEDGE.md § (단, §3은 현행화 전 제외)`**로 특정하며, 케이스 ID 규약(`TC-<Task번호>-<연번>`, 기존 회귀 맵 관행)을 명시한다.
  2. **§4.9 깊이 표(`L236`)의 실DB 테스트 조건부화 (D_Kai·B_Kai 수용)**: `"실DB 테스트(D3-B·D6 해당 변경에 한정, PoC 단계 1 헬퍼 추출 후 의무화)"`로 단서를 추가해 비DB 작업(`TASK-B-343` 등)의 과도한 부담을 제거한다.
  3. **§9 / §10 #15의 305 베이스라인 편입 시점 조정 (B_Kai 수용)**: `305` §1.6 원칙에 맞춰 **"LMS PoC 단계 3 성과 판정 통과 후, ZENITH 고유 DEF/Issue 번호를 각주화('조정 필요' 등급)하여 305에 편입"**하도록 순서를 못 박는다.
- **끝까지 유지하는 것 (3건)**
  1. **§8.2 모듈 ②에 `D3-B` 포함 및 `L333` 구 명칭(`D3`) 정정**: 부록 E #7 이행 완결을 위해 필수다.
  2. **§4.9 시나리오 도출의 역할 이원화**: 마스터 UAT(User Acceptance Testing, 사용자 인수 테스트)·E2E(End-to-End, 실제 브라우저 종단 간 테스트) 시나리오는 CPO가 관장하되, 개별 Issue 착수 시점에는 담당 에이전트가 도출해 PR(Pull Request, 코드 병합 요청) 리뷰로 검증받는다.
  3. **§8.6 MLFF BOS(Multi-Lane Free Flow Back Office System, 다차로 무정차 통행료 징수 백오피스 시스템) 주요 차원에 `D4`(외부 정산망·노변 기지국 연동 계약) 부차원 추가**.

---

## 4. 안건별 합의 가능 항목과 대립 항목 정리

| 항목 | 3자 최신 입장 (Riley / D_Kai / B_Kai) | 합의여부 |
|:--|:--|:--:|
| **점검 1: 부록 C 정밀화 (`#6` billing_status, `#8·#24·1a-④` 귀속, 매트릭스 예시 행 추가, `§10 #2` 3모듈 파일 명시)** | 3자 모두 원문 대조를 통해 표기 과대·누락 확인, 즉시 정정 | **합의** |
| **점검 2: 부록 E 이행 완결 (`§5.2` D3-B/D8 근거 분리, `§8.2` 모듈② D3-B 추가·`discount-guard` 2번째 함수 명시, `Ds_01~06` 정정, `§10 #9` `TeamB_Dev` 표기)** | 3자 모두 사실 관계 일치 (`§5.2` 오더 상태 전이 `D3-B 🟡`는 실DB 테스트 실재 확인으로 유지) | **합의** |
| **점검 3: LMS `§4.9` 적용 시점 모순 해소 (`§1.3·§8.6` vs `§7·§10 #14`)** | 3자 모두 즉시 전면 의무화 반대 → **PoC 기간에는 권고(시범 적용), PoC 성과 확인 및 `#14` 승인 후 필수화**로 통일 | **합의** |
| **점검 3: 사소 오참조 정정 (`§4.9` ③ `§7-6`→`§7-7`, `§1.3` R-14 문구, `305` §1.6 정합화)** | 3자 일치 | **합의** |
| **점검 4: `§4.9` `[테스트 설계]` 양식의 실무 적용성 보완** | `AC`→`Issue DoD`, `105` 문서명 특정, 케이스 ID 규약 명시, 위험 0개는 1줄 약식 허용, 실DB는 `D3-B·D6 해당 시`로 한정 | **합의** |
| **잔여 쟁점: `§7-2` 선행 테스트 기본 문구 (`it.fails` 우선 단정 여부)** | Riley·B_Kai(`§10 #10` 미결이므로 `it.fails` 단정 해제, 상황에 따라 `it.todo`/`it.fails` 선택) vs D_Kai(미구현/결함 재현에 `it.fails` 한정 유지) | **수렴 가능(문구 절충)** |

---

## 5. 안건별 현재 최선안

1. **점검 1·2 (부록 C·E 및 본문 정합화)**:
   - `§4.1`(`L116`) 조건 축 예시에 `청구 상태(billing_status)`를 추가하고, 부록 C에 `riley_review.md:47`(매트릭스 분리 예시 — 부분 반영) 행을 신설하며 `#8·#24` 및 `§8.1` 1a-④ 귀속 표기를 바로잡는다.
   - `§5.2`(`L266`)에서 `discount-guard.ts:9,17,51-59`의 fail-open은 **D8** 근거로, **D3-B** `🔴`는 4개 요율·할인 테이블의 실DB RLS/GRANT 테스트 부재 근거로 분리 기술한다. `§8.2`(`L330, L333`) 모듈 ② 차원에 `D3-B`를 추가한다.
   - `§10 #9`(`L405`)의 `TASK-B-348(#1280)` 뒤에 `(TeamB_Dev 기준)`을 병기하고, `L407·L513`의 `"Ds_05·Ds_10만 존재"`를 `"Ds_01~06 등 화면·시퀀스 설계서만 있고 상세 API 명세서(Ds_11)는 미존재"`로 고친다.
2. **점검 3·4 (v0.4 신규 섹션 `§1.3·§4.9·§8.6·§9` 실행 가능성 완비)**:
   - **적용 시기 일원화(`§1.3 L52`, `§4.9 L215`, `§8.6 L366`)**: LMS에서 `[테스트 설계]`는 **"PoC 기간 중 PoC 3모듈 및 위험 기준 ≥1개 Issue에 권고(시범) 적용하고, 전면 의무화 및 CI(Continuous Integration, 지속적 통합) 게이트 연동은 PoC 완료 후 §10 #14 승인으로 발효"**로 통일한다.
   - **`[테스트 설계]` 양식(`L220-230`) 및 깊이 표(`L234-238`) 현실화**:
     - `AC` 표기를 **`Issue DoD 항목 (신규 기능은 AC 병기 가능)`**으로, `케이스 ID`를 **`TC-<Task번호>-<연번>`**으로, `105 §`를 **`105_DOMAIN_KNOWLEDGE.md § (§3은 현행화 전 제외)`**로 명확화한다.
     - 위험 기준 **0개**는 1줄 약식(`"[테스트 설계] 위험 0개 — 차원 체크만 기록"`)을 허용하고, 기준 **2개 이상**의 실DB 테스트에 **`(D3-B·D6 해당 변경에 한정, 헬퍼 추출 후)`** 단서를 붙인다.
     - `§4.9` 시점 ①(`L214`) 트리거를 `"설계·명세 확정(R-11, Ds-11 부재 시 task file [설계 의견] 또는 105 개정안)"`으로, 시점 ③(`L216`) 참조를 **`§7-7`**로, 시나리오 도출(`L245`)은 **"마스터 시나리오=CPO, 개별 Issue 도출=담당 Agent(PR 리뷰 검증)"**로 수정한다.

---

## 6. 대립 항목의 수렴 기준(실험·데이터) 및 판정 규칙

유일하게 남은 세부의견 차이인 **`§7-2` 선행 테스트 표기(`it.fails` vs `it.todo`)**와 **`§4.9` `[테스트 설계]` 양식 의무화(#14)**는 아래 규칙으로 즉시 수렴한다.

| 안건 | 실험 / 수집 데이터 (PoC 단계 2) | 판정 규칙 (If-Then) |
|:--|:--|:--|
| **1. `§7-2` 선행 테스트 문구 절충 및 시범 판정** | **문서 즉시 반영**: `§7-2`(`L299`)에서 `"it.fails를 우선"` 단정을 빼고, **`"기존 심볼의 결함 재현·분기 변경은 it.fails를, 아직 심볼이 없는 신규 모듈이나 (A) 별도 Spec PR은 it.todo/describe.skip을 사용(시범 후 확정)"`**으로 절충.<br>**시범 데이터**: PoC 3모듈 테스트 작성 시 두 방식을 적용해 `rtk npm run test:regression` 통과율 및 `ReferenceError` 발생 건수 측정 | **If** `it.fails`가 신규/기존 케이스 모두에서 R-08 실패 0건이면 기본값 채택. **Else**(미정의 심볼 에러 발생 시) 위 **케이스별 분기 규칙(결함 재현=`it.fails`, 신규 심볼/Spec PR=`it.todo`)을 최종 표준으로 확정** |
| **2. `§4.9` `[테스트 설계]` 필수화 범위 (#14)** | PoC 기간 중 위험 기준 ≥1개 Issue 3건에 개편된 `[테스트 설계]` 양식을 시범 적용해 ① 작성 소요 시간(분), ② 작성 불가(빈칸) 항목 수, ③ 사전 도출로 추가 발견한 엣지케이스 수 측정 | **If** 작성 시간 **≤ 15분**, 빈칸 **0개**, 추가 케이스 **≥ 1건**이면 **위험 기준 ≥1개 Issue에 필수화(위험 0개는 1줄 약식 유지)**. **Else** 위험 기준 ≥2개(고위험)에만 필수화 |

---

## 승인 차단 사유 (중대 지적)

1. **[차단 1 — `§1.3·§8.6` vs `§7·§10 #14` 의무화 시점 모순]** 본문(`L52, L366`)은 승인 즉시 전 Issue에 `§4.9`를 강제하는 것처럼 서술하나 `§7`(`L307`)·`§10 #14`(`L410`)는 PoC 후로 유보해 상호 모순된다. **"PoC 기간 중 권고(시범), PoC 후 필수화 확정"**으로 통일해야 한다.
2. **[차단 2 — `§4.9` 양식 및 깊이 표의 실무 불능 요소]** 현행 저장소에 없는 `AC 번호` 요구, `105` 문서명 미특정, 위험 기준 ≥2개에 비DB 변경까지 `실DB 테스트`를 일괄 강제하는 문구(`L236`), 시점 ③의 `§7-6`→`§7-7` 오참조(`L216`)를 §5 최선안대로 수정해야 한다.
3. **[차단 3 — 부록 E 미이행 및 사실·규칙 오류]** ① `§8.2` 모듈 ② 차원에 `D3-B` 누락 및 `L333` 구 명칭(`D3`) 잔존, ② `§5.2`(`L266`) D3-B/D8 근거 혼동 및 `discount-guard.ts:51-59` 누락, ③ `§10 #9`(`L405`) `TASK-B-348`의 `(TeamB_Dev 기준)` 미표기, ④ `§7-2`(`L299`) `it.fails` 단정 문구와 `§10 #10` 미결 상태의 충돌을 정정해야 한다.

## v1.0 승인 가능 여부

- **판정**: **조건부 가능** — 3인의 지적이 이번 교차 검토에서 완전히 수렴했다. 위 **승인 차단 사유 3건**(§5 최선안 및 §6 절충 문구)을 반영하면 추가 검증 라운드 없이 즉시 **v1.0 최종 승인 가능**하다.
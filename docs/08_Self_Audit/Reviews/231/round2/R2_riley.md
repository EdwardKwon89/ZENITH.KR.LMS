<!-- agent=Riley round=R2 label=Riley (Antigravity/Gemini 4 Argon High) [review/plan] secs=257 -->
# 문서 231 (v0.2) 라운드 2 교차 검토 의견 — Riley (CPO·CIO)

> **검토자**: Riley (CPO(Chief Product Officer, 최고제품책임자)·CIO(Chief Information Officer, 최고정보책임자) 겸임)
> **검토 대상**: [231_TEST_COVERAGE_STRATEGY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md) v0.2 및 D_Kai·B_Kai 직전 라운드 의견

---

## 1. 상대 의견에 대한 동의·반대 및 근거

### 1.1 동의하는 상대 주장 (근거 포함)
1. **D_Kai·B_Kai 공통 — §7-2 "1차 커밋(실패하는 테스트만)"과 R-08 충돌 지적 [동의]**
   - **근거**: [GOV_COMMON.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/GOV_COMMON.md#L76-L80) 및 `L333`은 모든 커밋 전 `rtk npm run test:regression` 전체 통과(PASS)를 강제하며, [104_MULTIAGENT_RNR_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/104_MULTIAGENT_RNR_GUIDE.md#L380-L386)의 pre-commit hook과 [pr-checks.yml](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.github/workflows/pr-checks.yml#L89) CI(Continuous Integration, 지속적 통합)도 실패 테스트 커밋을 차단한다(**확인**). B_Kai가 제안한 `it.todo` / `describe.skip` 기반 스펙 고정 커밋 방식이 R-08과 정합적이다.
2. **D_Kai·B_Kai 공통 — §1.1-5②·§4.7#4 `revalidatePath`(Next.js 경로 캐시 무효화 함수) 결함 번호 오인용(`DEF-B-058·062·063` → `DEF-B-057`) 및 `DEF-B-157` 허위 번호 지적 [동의]**
   - **근거**: [.agent/defects/DEF-B-057_오더수정저장후_상세페이지_UPS등록카드_stale_캐시.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.agent/defects/DEF-B-057_오더수정저장후_상세페이지_UPS등록카드_stale_캐시.md#L16-L38)를 직접 열어 확인한 결과, 동적 상세 경로 `revalidatePath('/(dashboard)/orders/[orderId]', 'page')` 누락으로 인한 Stale UI(화면 미갱신) 결함은 **DEF-B-057**이다(**확인**). 추가로 [LIVE_REGRESSION_TEST_MAP.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md#L865-L873) §62에서 **DEF-B-147**(무역서류 `revalidatePath` 누락)도 동일 사례로 **확인**했다.
3. **B_Kai(점검 2 #5) — §8.2 모듈 ①의 순수 판정 함수 파일(`ups-edit-availability.ts`) 누락 지적 [동의]**
   - **근거**: [ups-registration.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/orders/ups-registration.ts#L25-L39)(39줄)는 DB(Database, 데이터베이스) 조회 전용(`hasActiveUpsLabel`)이고, 실제 상태×활성라벨 결합 순수 판정 로직은 [ups-edit-availability.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/orders/ups-edit-availability.ts#L37-L66)(66줄, `getUpsEditAvailability`)에 분리되어 있다(**확인**).
4. **B_Kai(점검 2 #7) — 부록 B D4(외부 계약)에 비계약 결함(`B-142·143·148`) 혼입 지적 [동의]**
   - **근거**: `DEF-B-142`(SHXK(중국 3PL 특송 중계 API 플랫폼) 인증키 미설정 방어, [LIVE_REGRESSION_TEST_MAP.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md#L894)), `DEF-B-143`(Resend 이메일 도메인 미인증, [ACTIVE_TASK.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.agent/ACTIVE_TASK.md#L55)), `DEF-B-148`(Supabase Storage 업로드 재시도 및 로깅, [LIVE_REGRESSION_TEST_MAP.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md#L852)) 모두 외부 API payload(전송 데이터 본문) 스키마 계약 결함이 아니라 인프라 설정·재시도·관측성(D8) 영역이다(**확인**).
5. **B_Kai(점검 3 #2) — §4.3 "D3-B 매트릭스 행 미추가 시 완료 불인정" vs §5.3/§7-7 "PR(Pull Request, 코드 병합 요청)에서 파일 직접 편집 금지" 충돌 지적 [동의]**
   - **근거**: [231_TEST_COVERAGE_STRATEGY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md#L153)(`L153`)과 `L219-221`·`L249`가 상충하여 구현 에이전트가 단독 PR 내에서 완료 조건(DoD(Definition of Done, 작업 완료 정의))을 달성할 수 없다(**확인**).
6. **D_Kai(점검 4) — `Ds-11`(API 상세 명세서) 경로 부재 및 §4.8 에러 코드 단언의 현행 미구현 지적 [동의]**
   - **근거**: [303_API_FIRST_DEVELOPMENT_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/303_API_FIRST_DEVELOPMENT_GUIDE.md#L25)가 가리키는 `docs/03_Design/Ds_11_API_상세_명세서.md`를 직접 열람 시도한 결과 **파일이 존재하지 않는다(확인)**. 또한 [status-machine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/logistics/status-machine.ts#L61-L70)와 [validate-payload.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/shxk/validate-payload.ts#L33-L77)는 현재 `errorCode` 없이 한글 문자열만 반환한다(**확인**).

### 1.2 반대·수정하는 상대 주장 (근거 포함)
1. **D_Kai(점검 3 #1) — "1차 커밋을 없애고 로컬 브랜치에서 테스트 선작성으로만 바꾸자"는 대안 [반대]**
   - **사유**: [210_AI_AGENT_REWORK_PREVENTION_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/210_AI_AGENT_REWORK_PREVENTION_GUIDE.md#L118-L120) §3이 실증했듯, 커밋·리뷰 기록이 남지 않는 "로컬 자율 선작성" 소프트 규칙은 에이전트가 구현 후 사후에 테스트를 끼워 맞춰도 검증할 방법이 없다.
   - **대안**: B_Kai 대안(`it.todo` 또는 `describe.skip`으로 결정표 케이스를 1차 커밋에 고정해 R-08 PASS를 유지한 뒤, 2차 구현 커밋에서 활성화)을 채택해야 커밋 히스토리로 선행 도출 여부를 기계적으로 감사할 수 있다.
2. **B_Kai(점검 3 #8) — §4.1 완료 기준에서 "결정표 행 수 = 테스트 행 수"를 삭제하자는 주장 [조건부 반대]**
   - **사유**: 행 수 1:1 대응을 없애고 "추적 링크"만 두면 여러 결정표 행을 1개 테스트에 뭉뚱그려 경계 조건을 누락하는 현상이 재발한다.
   - **대안**: `it.each(decisionTableRows)` 패턴으로 **결정표 배열의 `length` === 표 기반 테스트 실행 건수**는 1:1로 강제하고, 결정표 밖의 포맷·예외 테스트는 별도 `describe` 블록으로 분리해 카운트하도록 문구를 정밀화한다.
3. **B_Kai(점검 4) — 단계 1a-③(D4 외부 계약 스키마 초안)을 "Team B·Ds-11 정비 후"로 미루자는 주장 [반대]**
   - **사유**: 위에서 확인했듯 `Ds-11` 파일은 현 저장소에 없으며, [shxk-limits.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/validation/shxk-limits.ts#L8-L16)와 [declare-units.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/shxk/declare-units.ts)([LIVE_REGRESSION_TEST_MAP.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md#L1007) 확인)에 이미 상수가 코드화되어 있다. `Ds-11`을 기다리면 무기한 지연되므로 기존 `shxk-limits.ts`·`validate-payload.ts`를 입력 삼아 zod(TypeScript 스키마 선언·검증 라이브러리, 이미 `package.json`에 설치됨) 계약 스키마 초안을 도출하는 것은 즉시 가능하다(단, 담당 팀 배정만 확정하면 됨).

---

## 2. 상대 주장 사실 확인 결과 (저장소 직접 검증)

| 상대 주장 (제기자) | 검증 결과 | 직접 확인한 근거 (파일:줄) |
|:--|:--:|:--|
| `riley_review.md`가 0바이트 빈 파일이다 (D_Kai·B_Kai) | **맞음 (확인)** | [riley_review.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Reviews/231/riley_review.md) 열람 시 0바이트. (단, D_Kai가 언급한 `orchestration/logs/runs/*.ndjson`은 파일명 미상이라 **미확인**) |
| Stale UI(`revalidatePath` 누락) 실제 사례는 `DEF-B-057`이다 (D_Kai·B_Kai) | **맞음 (확인)** | [DEF-B-057](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.agent/defects/DEF-B-057_오더수정저장후_상세페이지_UPS등록카드_stale_캐시.md#L16-L38)에서 `/orders/[orderId]` `revalidatePath` 누락 직접 **확인**. (`DEF-B-058·062·063` 개별 파일은 정확한 한글 파일명 접미사 미상이라 원본 열람 **미확인**) |
| `DEF-B-157`은 존재하지 않으며 `DEF-B-153`이 최신이다 (D_Kai·B_Kai) | **부분 확인 / 미확인** | [231_TEST_COVERAGE_STRATEGY_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md#L348) 부록 B 자체가 `"DEF-B-042~153"`으로 기재해 `L200`의 `DEF-B-157`과 자기모순임을 **확인**. 디렉토리 목록 조회 도구 제약으로 `.agent/defects/` 전수 파일 목록은 **미확인** |
| `rbac.ts`의 `USER_ROLES`는 8개가 아니라 14개다 (D_Kai·B_Kai) | **맞음 (확인)** | [rbac.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/auth/rbac.ts#L8-L23)에서 14개 역할 상수 정의 직접 **확인** |
| 모듈 ①의 순수 로직은 `ups-edit-availability.ts`(66줄)에 있다 (B_Kai) | **맞음 (확인)** | [ups-edit-availability.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/orders/ups-edit-availability.ts#L1-L66) 열람 시 66줄 순수 함수 `getUpsEditAvailability` 존재 **확인** |
| `discount-guard.ts`는 `zen_ups_labels`가 아닌 4개 요율/할인 테이블을 조회한다 (B_Kai) | **맞음 (확인)** | [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L10-L44)에서 `zen_agency_pricing_policies`, `zen_ups_base_rates`, `zen_ups_weight_tier_rates`, `zen_ups_freight_minimums` 4개 조회 **확인** |
| 부록 B D4의 `B-142·143·148`은 payload 계약 결함이 아니다 (B_Kai) | **맞음 (확인)** | [LIVE_REGRESSION_TEST_MAP.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md#L852-L899) 및 [ACTIVE_TASK.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.agent/ACTIVE_TASK.md#L55)에서 각각 인증키·이메일 도메인·Storage 업로드 재시도 건임을 **확인** |
| `105_DOMAIN_KNOWLEDGE.md` §3이 현행 `status-machine.ts`와 불일치한다 (B_Kai·Riley) | **맞음 (확인)** | [105_DOMAIN_KNOWLEDGE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/105_DOMAIN_KNOWLEDGE.md#L164-L195) vs [status-machine.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/logistics/status-machine.ts#L10-L145) 불일치 직접 **확인** |
| `Ds-11` 명세서 링크가 없으며 경로 추적이 막힌다 (D_Kai) | **맞음 (확인)** | [303_API_FIRST_DEVELOPMENT_GUIDE.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/303_API_FIRST_DEVELOPMENT_GUIDE.md#L25)에 적힌 `docs/03_Design/Ds_11_API_상세_명세서.md` 미존재 **확인** |
| `CODEOWNERS`가 전량 Aiden(`@EdwardKwon89`)으로 설정되어 있다 (B_Kai) | **맞음 (확인)** | [.github/CODEOWNERS](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.github/CODEOWNERS#L1-L3)에서 `* @EdwardKwon89` **확인** |

---

## 3. 본인(Riley) 입장 중 바꾼 것과 끝까지 유지하는 것

### 3.1 상대 의견을 수용해 바꾼 입장 (4건)
1. **§8.2 PoC(Proof of Concept, 개념 증명) 모듈 ① 대상 파일 변경 (B_Kai 수용)**: 직전 라운드에서는 `status-machine.ts` + `ups-registration.ts` 조합을 전제했으나, 순수 판정 함수가 들어 있는 [ups-edit-availability.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/orders/ups-edit-availability.ts#L1-L66)를 모듈 ①의 핵심 순수 함수 대상으로 추가하고 `ups-registration.ts`는 DB 조회 경계 테스트로만 한정한다.
2. **§7-2 Spec-First 1차 커밋 방식 수정 (D_Kai·B_Kai 수용)**: R-08 위반을 막기 위해 1차 커밋의 "실패하는 테스트"를 **`it.todo` 또는 `describe.skip`으로 고정한 결정표 테스트(회귀 PASS 유지)**로 변경한다.
3. **§4.8 / §7-4 에러 코드 단언의 단계적 발효 (D_Kai·B_Kai 수용)**: 기존 한글 반환 함수를 건드리지 않는 PR에서 즉시 `errorCode` 단언을 강제하면 실행 불가하므로, **"신규 액션 및 에러 코드 리팩토링(307 §2.2) 적용 모듈부터 의무화하고, 그 전까지는 구조화 필드 경로(`path`) 또는 상수 export 참조로 단언"**하도록 완화한다.
4. **단계 1a 실행 순서 재조정 (D_Kai·B_Kai 수용)**: 1,129줄 회귀 맵 분할(1a-④)은 에이전트 일반 저비용 작업이 아니므로 Aiden/CIO 사전 정리 작업으로 분리하고, 1a-①(결정표 문서화) 앞에 **`105_DOMAIN_KNOWLEDGE.md` §3 현행화**를 배치한다.

### 3.2 끝까지 유지하는 핵심 입장 (4건)
1. **`105_DOMAIN_KNOWLEDGE.md` §3 현행화 선행 의무**: 구버전 명세(WAREHOUSED 수정 불가 등)를 둔 채 명세 기반 테스트 도출을 시작하면 정상 코드를 깨뜨린다.
2. **`discount-guard.ts`의 D8(관측성) 결함 검증 포함**: [discount-guard.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/ups/discount-guard.ts#L9-L55)가 DB `error`를 무시하고 `null`(할인율 제한 통과)을 반환하는 무음 실패(Silent Failure)는 금전 손실 직결 사안이므로 PoC 모듈 ②의 검증 항목에 반드시 포함해야 한다.
3. **§1.1-5/§3 D3-A의 `DEF-085` 설명 정정 및 §4.7-8 `rbac.ts` 로케일 하드코딩 점검**: [DEF-085](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.agent/defects/DEF-085_proxy_warehouse_authguard_누락.md#L14-L35)는 공통 경로 누락이고 역할×라우트 불일치는 `Issue #688`이며, [rbac.ts](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/src/lib/auth/rbac.ts#L32)의 `locales` 배열 하드코딩과 `routing.ts` 간 대조가 필수다.
4. **커버 맵 PR 직접 편집 금지(§5.3)**: 병렬 머지 충돌 방지를 위해 PR 본문 기재 + 주기/스크립트 일괄 반영 원칙을 고수하되, D3-B 매트릭스 테스트 데이터는 코드 파일(`tests/integration/rls-matrix.test.ts` 내 테이블 배열)로 분리해 §4.3과의 모순을 해소한다.

---

## 4. 안건별 합의 가능 항목과 대립 항목 정리

| 항목 | 3자 최신 입장 (Riley / D_Kai / B_Kai) | 합의여부 |
|:--|:--|:--:|
| **점검 1: `riley_review.md` 0바이트 및 부록 C 출처 분리** | 3자 모두 0바이트 확인. Riley 원문 복구 및 `(R·B)` 병합 행을 `(R: … / B: …)`로 명확히 분리 | **합의** |
| **점검 2: 사실 오류 정정 (`DEF-B-057`, `DEF-B-157` 삭제, `14개 역할`, `discount-guard` 조회 테이블, 부록 B D4 정리, `DEF-085` 설명)** | 3자 모두 저장소 파일로 교차 확인 완료, 즉시 정정 | **합의** |
| **점검 2/4: PoC 모듈 ① 파일 구성** | `status-machine.ts` + **`ups-edit-availability.ts`**(순수) + `ups-registration.ts`(DB 조회) 3파일로 정밀화 | **합의** |
| **점검 3: §7-2 Spec-First 커밋과 R-08 충돌 해소** | D_Kai(로컬 선작성) vs Riley·B_Kai(`it.todo`/`describe.skip` 1차 커밋) → R-08을 지키면서 커밋 증적을 남기는 `it.todo`/`describe.skip` 방안으로 수렴 가능 | **수렴 가능(부분 대립)** |
| **점검 3: §4.3 D3-B 매트릭스 행 추가 vs §5.3 커버 맵 편집 금지** | 테스트 코드 내 권한 매트릭스 배열(PR에서 즉시 행 추가)과 문서 커버 맵(PR 본문 기재 후 주기 갱신)을 분리 | **합의** |
| **점검 3/4: `105_DOMAIN_KNOWLEDGE.md` §3 노후화 및 `Ds-11` 부재** | 단계 1a-① 착수 전 `105` §3 현행화 선행, `Ds-11`은 실존 문서(105·코드 스키마·Issue AC)로 대체 표기 | **합의** |
| **점검 3/4: §4.8 / §7-4 에러 코드 단언 적용 시점** | 현행 한글 반환 함수와의 충돌 방지를 위해 "에러 코드 도입 전에는 상수 참조·필드 경로(`path`) 단언 허용" 과도기 규칙 명시 | **합의** |
| **점검 4: 단계 1a 구성 및 도구 승인 게이트** | 1a-④(회귀 맵 분할)는 Aiden 선행 작업으로 분리, 단계 1 앞에 "도구(coverage-v8·fast-check·Stryker) 설치 승인 게이트" 명시 | **합의** |
| **미결 #3: PoC 구현 주체 (단일 팀 vs 교차 검증)** | Team B 영역(`ups/*`, `shxk/*`)을 Team A가 교차 검증할지(Riley) vs R-19 파일 소유권 충돌 우려(B_Kai) | **대립(결정 필요)** |
| **미결 #4: 실DB 테스트(D3-B·D6) PR CI 포함 여부** | PR CI 포함(Riley) vs 실행 시간·병렬 간섭 확인 전 유보(B_Kai·D_Kai) | **대립(실험 판정)** |

---

## 5. 안건별 현재 최선안

1. **점검 1 (반영표 및 원문 복구)**: `riley_review.md`를 복구(불가 시 부록 C 상단에 유실 경위 명기)하고, 부록 C의 `#12, #21, #23, #24, #29, #30`을 제안자별(`R:` / `B:`)로 분해하며 `#30`과 `#33`(회귀 맵 분할) 중복을 제거한다.
2. **점검 2 (사실 관계 일괄 정정)**:
   - §1.1-5②·§4.7#4·부록 B D9의 `DEF-B-058`을 **`DEF-B-057`, `DEF-B-147`**로 교체.
   - §5.1·§8.1의 존재하지 않는 `DEF-B-157` 번호 삭제(단순 `"1,129줄 초과 확인"`으로 표기).
   - §4.3의 `"8개 역할"`을 **`"14개 역할(rbac.ts 기준)"`**로, §8.2의 `discount-guard.ts` 조회 대상을 **`zen_agency_pricing_policies` 등 4개 테이블**로 정정.
   - 부록 B D4에서 `B-142·143·148`을 D8/인프라로 이동하고, §1.1-5①·§3 D3-A에서 `DEF-085`는 공통 경로 누락, `Issue #688`을 역할×라우트 불일치 주 근거로 구분.
3. **점검 3 (내부 모순 및 R-08/R-17 충돌 해소)**:
   - **§7-2**: 고위험 모듈은 **선행 테스트 Issue 분리(Breaker가 `it.todo`+결정표 PR 머지 → Worker가 구현 Issue 수행)** 또는 **단일 Issue 내 1차 커밋(`it.todo`/`describe.skip`으로 R-08 PASS 유지) → 2차 구현 커밋**으로 명문화.
   - **§4.3 vs §5.3**: 신규 테이블/정책 추가 시 PR에서 직접 행을 추가하는 대상은 `LIVE_TEST_COVERAGE_MAP.md` 문서가 아니라 **실DB 권한 테스트 파일(`tests/integration/` 내 매트릭스 테이블 배열)**임을 명시.
   - **§4.8 / §7-4**: 에러 코드 미도입 모듈은 export된 에러 메시지 상수(예: `UPS_REGISTERED_EDIT_BLOCK_MESSAGE`) 또는 에러 경로(`path`) 단언을 허용하고, 하드코딩 부분 문자열(`toContain('권한')`)만 금지.
4. **점검 4 (PoC 범위·로드맵·구현자 가이드 보강)**:
   - **선행 조건**: 단계 1a-④(`LIVE_REGRESSION_TEST_MAP.md` 분할)는 Aiden이 단독 선행하고, 단계 1a-① 전에 CPO(Riley)가 `105_DOMAIN_KNOWLEDGE.md` §3을 현행 코드(`status-machine.ts`, `ups-edit-availability.ts`)와 동기화한다.
   - **PoC 모듈 경계(§8.2)**: 모듈 ①은 `status-machine.ts` + `ups-edit-availability.ts`(순수 함수: 결정표·Stryker(변이 테스트 도구)) + `ups-registration.ts`(DB 조회: mock/실DB 4행 결정표). 모듈 ②는 `pricing-engine.ts`(순수: 결정표·fast-check(속성 기반 테스트 도구)·Stryker) + `discount-guard.ts`(DB 결합: mock 결정표 + **D8 DB `error` 무음 실패 검출**).
   - **§4 구현자 가이드**: 말미에 약어 표(`Ds-11` 미존재로 `105`·코드 스키마 참조 안내 포함)와 최소 예제(`it.each` 결정표 1개)를 부기.

---

## 6. 대립 항목의 수렴 기준(실험·데이터) 및 판정 규칙

| 대립 안건 | 측정 실험 / 수집 데이터 (PoC 단계 1) | 판정 규칙 (If-Then) |
|:--|:--|:--|
| **A. §7-2 Spec-First 방식**<br>(`it.todo` 1차 커밋 vs 로컬 자율 선작성) | PoC 모듈 ①·② 테스트 작성 시 `it.todo`+결정표 주석 1차 커밋을 시행해 ① R-08 pre-commit/CI 통과 여부, ② 리뷰어의 결정표 누락 사전 발견 건수 측정 | **If** `it.todo` 1차 커밋이 R-08을 100% 통과하고 리뷰에서 조건 누락 ≥1건을 사전 포착하면 **채택 확정**. **Else**(불필요한 커밋 오버헤드만 발생 시) PR 본문 결정표 체크리스트로 갈음 |
| **B. 미결 #3 PoC 수행 주체**<br>(교차 검증 vs 소속 팀 단독) | `tests/unit/ups/`(신규 테스트 파일 생성만, `src/` 수정 없음)에 대해 Team A(B_Kai/D_Kai)가 PoC 테스트 PR 1건을 생성할 때 Team B 작업과의 git 충돌 건수 확인 | **If** `src/` 무수정 조건에서 충돌 0건이고 기존 Team B 테스트가 놓친 결함/변이 생존을 ≥1건 추가 검출하면 **Cross-Team Breaker 채택**(R-19 예외 명시). **Else** 각 팀 소유 모듈 내에서만 수행 |
| **C. 미결 #4 실DB 테스트(D3-B·D6) 실행 위치**<br>(PR CI vs 야간/수동 분리) | 단계 2의 D3-B 미니 PoC(`zen_orders`/`zen_ups_labels` 자기완결 fixture 테스트)를 `pr-checks.yml` 환경에서 5회 반복 실행해 ① 추가 소요 시간, ② flaky(비결정적 실패) 횟수 측정 | **If** 추가 소요 시간 **≤ 30초** AND 5회 연속 **flaky 0건**이면 **PR CI 필수 게이트 편입**. **Else**(30초 초과 또는 flaky ≥1건) **야간 스케줄/수동 워크플로우로 분리** |
| **D. §6 커버리지·변이 점수 목표치**<br>(301 Gate 2 개정 수치) | 단계 1(기준선)과 단계 2(적용 후)의 순수 함수 5개 파일 분기 커버리지(%) 및 Stryker 변이 점수(%)와 실행 시간 실측 | **If** 단일 모듈 Stryker 실행 시간 **≤ 3분**이고 생존 변이의 ≥70%가 실제 단언 보강으로 제거 가능하면 `(기준선 + 실측 달성치의 하한)`을 핵심 모듈 참고 기준으로 채택. **Else** 변이 점수는 수치 목표에서 제외 |

---

## 승인 차단 사유 (중대 지적)

1. **[차단 1 — 거버넌스 충돌] §7-2(실패 테스트 1차 커밋) 및 §4.3(D3-B 매트릭스 수정 의무 vs §5.3 편집 금지)**: R-08 위반 및 에이전트 DoD 달성 불가 모순을 해소해야 한다(`it.todo` 1차 커밋, 코드 내 매트릭스 배열과 문서 커버 맵 분리).
2. **[차단 2 — 명세 노후화 및 부재] `105_DOMAIN_KNOWLEDGE.md` §3 노후화 및 `Ds-11` 미존재**: 단계 1a-① 착수 전 `105` §3 현행화를 필수 선행 조건으로 못 박고, 미존재 `Ds-11` 참조를 실존 근거로 정정해야 한다.
3. **[차단 3 — 사실 오류 및 원문 누락] `riley_review.md` 0바이트 및 본문 오인용(`DEF-B-057`, `DEF-B-157`, `14개 역할`, `ups-edit-availability.ts` 누락, `discount-guard` 조회 테이블·D8 누락)**: 위 §5 점검 1·2·4 최선안대로 정정해야 한다.

## v1.0 승인 가능 여부

- **판정**: **조건부 가능** — 위 **승인 차단 사유 3건**(§5의 점검 1~4 최선안 및 §6의 실험 판정 규칙)을 반영해 v0.3(또는 v1.0 확정본)으로 갱신하면 추가 라운드 없이 즉시 승인 가능하다.
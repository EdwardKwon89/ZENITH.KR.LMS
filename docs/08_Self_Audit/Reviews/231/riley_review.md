# 문서 231 검토 의견 — Riley

> **검토자**: Riley (Gemini Pro High)
> **검토 버전**: v0.1 (SHA-256 앞 12자리 `8c77809ef01d` 일치 확인: [x])
> **제출일시**: 2026-11-13 10:52 KST
> **상대 보고서 열람 여부**: 열람하지 않음 [x] — (`docs/08_Self_Audit/Reviews/231/` 내 `bkai_review.md` 미열람·미존재 확인)
> **본인 역할·검토 관점**: CPO (도메인 지식 `105_DOMAIN_KNOWLEDGE.md` 오너 · PRD/UAT 시나리오 확정) 및 E2E·UI·데이터 아키텍처(CIO 겸임) 검증 관점

---

## 1. 총평 (3~5줄)

**판정: 수정 후 채택 (조건부 승인 권고)**
참조 문서(`docs/10_Reference/112_AI_Agent_Test_Java_Reference.md`)의 비현실적인 형식 검증(OpenJML, JBSE, TLA+)을 배제하고, 실제 결함(`DEF-*`, `DEF-B-*`) 이력에 기반해 9대 테스트 차원(D1~D9)과 PoC 선행 로드맵으로 재설계한 방향은 매우 타당하다. 다만 **① D3(권한)의 미들웨어·앱·DB 3계층 분리 누락, ② D4(외부 계약)의 하류(Downstream) 캐리어 실측 제약 반영 구조, ③ D5(상태 전이)의 복합 상태(라벨 발급 여부 등) 누락, ④ D9(`check:i18n`)의 코드-메시지 키 대조 한계, ⑤ PoC 대상 모듈의 구체적 파일 특정(`src/lib/ups/pricing-engine.ts` 등)**은 v1.0 확정 전에 반드시 보완되어야 한다.

---

## 2. 섹션별 의견

> 각 항목: **판정**(동의 / 수정 제안 / 반대) + **사유** + **근거**(파일·번호·실제 경험). 확인하지 못한 것은 "미확인".

### 2.1 문제 진단 (§1)
| 항목 | 판정 | 사유 | 근거 |
|:--|:-:|:--|:--|
| 한계 1 사후 대응형 | **동의** | 동일 원인 클래스의 결함이 필드·역할·테이블만 바뀌어 반복 발생함. 건별 회귀 테스트만으로는 다음 필드의 결함을 막지 못했음. | `src/lib/shxk/validate-payload.ts`(TASK-B-277/283/332/337 — Issue #1052, #1069, #1239, #1251에 걸쳐 필드 제약이 사후에 하나씩 추가됨), `.agent/defects/DEF-068`·`DEF-071`·`DEF-072`·`DEF-096`(RLS·`service_role` GRANT 누락 반복) |
| 한계 2 미커버 비가시 | **동의** | 현재 설정상 코드/분기 커버리지 측정 도구가 전혀 연결되어 있지 않아 어느 모듈의 어느 분기가 비어 있는지 정량 확인이 불가능함. | `package.json`(L55-73 `devDependencies`에 `@vitest/coverage-v8` 없음), `vitest.config.ts`(L5-27 `coverage` 블록 미설정) |
| 한계 3 검출력 미측정 | **동의** | 테스트 통과만으로는 단언(Assertion)의 유효성을 보장할 수 없어 수동 되돌리기 검증에 의존해 왔음. | `docs/00_GUIDE/301_QUALITY_ASSURANCE_MANUAL.md`(Gate 2 "단위 테스트 80% 이상"의 기준이 커버리지인지 통과율인지 미정의) |
| 한계 4 mock 한계 | **동의** | Supabase 클라이언트를 mock 처리한 단위 테스트는 DB 레벨 RLS/GRANT, 컬럼명/스키마 불일치, Next.js 미들웨어 라우팅 차단을 원리상 검출할 수 없음. | `.agent/defects/DEF-067`·`DEF-075`·`DEF-081`·`DEF-088`(실DB 컬럼·테이블 불일치), `DEF-071`·`DEF-096`(`service_role` GRANT 누락), `AGENTS.md`(Issue #688 `SUB_ADMIN` 미들웨어 라우팅 누락 사례) |
| 빠진 한계 (있으면 추가) | **수정 제안** | **한계 5: "계층 간 계약(Cross-Layer Contract) 단절"**을 §1.1에 추가 제안. 백엔드 로직·DB·UI 각각은 동작하나 ① 라우팅(`proxy.ts`)↔권한(`rbac.ts`), ② 서버 액션 반환값↔클라이언트 캐시(`revalidatePath`), ③ 코드 내 번역 호출(`t('key')`)↔번역 JSON 파일 간 불일치가 빈발함. | `src/lib/auth/proxy.ts` vs `src/lib/auth/rbac.ts`(Issue #688, `DEF-085`), `tests/e2e/r10-288-order-detail-stale-revalidate.spec.ts`(`DEF-B-058`·`062`·`063`), `scripts/audit-i18n.ts`(JSON 간 비교만 수행), Issue #946(`DEF-B-023` PDF 번역키 대량 누락) |

### 2.2 차원 모델 (§3, D1~D9)
| 차원 | 판정 | 사유·수정안 | 근거 |
|:--|:-:|:--|:--|
| D1 업무 분기 | **동의** | 요율·할증·구간 매칭 등 조건 분기 누락이 핵심 결함원임. 결정표 기반 `it.each` 도출이 적합함. | `src/lib/ups/pricing-engine.ts`(L25-69 `OVERSIZE`, `ceilByCurrency`, `resolveBillingWeight`), `.agent/defects/DEF-095`(`WW_EXPEDITED` 반올림 규칙 오류) |
| D2 입력 조건 | **수정 제안** | 일반 자료형 외에 **물류·정산 도메인 수치 불변식(멀티패키지 배열 합산, IEEE 754 부동소수점 오차, 통화 단위 혼입)**을 명시해야 함. | `src/lib/ups/pricing-engine.ts`(L34-45 TASK-B-302 / Issue #1123 IEEE float 오차 흡수), Issue #952(`DEF-132` 멀티패키지 첫 번째 치수만 반영), Issue #726(급증수수료 KRW 화폐단위 감사) |
| D3 권한 | **수정 제안** | §3·§4.3에 "실DB 테스트"로만 정의되어 있으나, 권한 결함은 **① URL 라우팅(`proxy.ts`·`routes.ts`), ② 서버 액션(`rbac.ts`), ③ DB(RLS·`service_role` GRANT)** 3개 계층에서 각각 발생함. D3를 `D3-A(라우팅·앱 권한)`와 `D3-B(실DB RLS·GRANT)`로 이원화할 것. | `src/lib/auth/proxy.ts`(L39-100 `authGuard`), `src/config/routes.ts`(`ORG_ROUTE_MAP`), `.agent/defects/DEF-085`(`proxy` warehouse authguard 누락), Issue #688(`tests/e2e/e2e-27-subadmin-routing.spec.ts`), `DEF-096`(GRANT 누락) |
| D4 외부 계약 | **수정 제안** | "외부 API 명세와 1:1 일치"만으로는 부족함. 실제로는 **중계 API(SHXK) 공식 명세보다 하류 캐리어(UPS)의 실측 제한이 더 엄격**하여 결함이 발생했으므로, 스키마 정의 기준을 **"연동 경로상 가장 엄격한 하류(Downstream) 제약 기준"**으로 명시해야 함. | `src/lib/validation/shxk-limits.ts`(L8-16: SHXK 명세는 품명 500자·전화 100자이나 UPS 실측 한도는 `ITEM_NAME_MAX=35`, `PHONE_MAX_DIGITS=15` — TASK-B-332 / Issue #1239), `src/lib/ups/label-mapping.ts`(L62-70 `DEF-B-145`·`146` 주소 길이 축약) |
| D5 상태 전이 | **수정 제안** | 단일 `status` 열거형(`OrderStatus`)만으로는 전이·수정 가능 여부를 판정할 수 없음. **복합 상태(`order.status` × `transport_mode/UPS 여부` × `외부 라벨 활성 여부(hasActiveUpsLabel)` × `billing_status`)**를 전이 매트릭스 조건 열에 포함하도록 §4.1을 보완해야 함. | `src/lib/logistics/status-machine.ts`(L81-100 TASK-B-284 / Issue #1070 `WAREHOUSED`+UPS 부분 수정 허용), `src/lib/orders/ups-registration.ts`(L1-39 TASK-B-339 / Issue #1254 `zen_ups_labels.is_voided=false` 여부에 따른 수정 차단), `105_DOMAIN_KNOWLEDGE.md`(§9-3 EC-F-01 인보이스 상태 연동) |
| D6 데이터 정합 | **동의** | 저장→조회→재저장 왕복 보존뿐 아니라 **스냅샷(Snapshot) 보존**과 **DB 마이그레이션↔TypeScript 타입·시드 동기화**가 핵심임. | `.agent/defects/DEF-099`(shipper_address 스냅샷 누락), `DEF-088`(요율 스냅샷 스키마 불일치), `DEF-067`·`DEF-078`(시드·타입 미동기화) |
| D7 동시성·멱등 | **동의** | 채번, 라벨 재발급, 마스터 오더 해체(Dissolve) 등에서 중복 실행·유니크 제약 충돌이 실제로 발생함. | `.agent/defects/DEF-083`(`zen_ups_labels.reference_no` UNIQUE 재발급 중복키), `tests/e2e/e2e-15-dissolve-atomicity.spec.ts` |
| D8 관측성 | **동의** | `GOV_COMMON.md` 실패 관측성 의무 및 핵심 지점 CRITICAL 알림 규칙을 수동 코드 리뷰에만 의존하면 누락이 반복되므로 AST/lint 정적 검사화가 필수적임. | `GOV_COMMON.md`(L307-327 실패 관측성 의무), Issue #1181~#1185(TASK-B-319~322 `ups-labels.ts`, `shxk/order.ts`, `ups-actual-charges.ts`, `admin/auth.ts` 로깅 누락 일괄 보완) |
| D9 UI·다국어 | **수정 제안** | 현행 `npm run check:i18n`은 로케일 JSON 간 키 대칭성만 검사할 뿐 **코드 내 호출 키의 실존 여부**와 **서버 액션 하드코딩 문자열**, **Next.js 캐시 무효화(Stale UI)**를 잡지 못함(상세는 §4 역할별 질문 답변 참조). | `scripts/audit-i18n.ts`(L39-72 `en.json` 대비 타 로케일 JSON 비교만 수행), `src/lib/shxk/validate-payload.ts`(L39-72 서버 한글 하드코딩), `tests/e2e/r10-288-order-detail-stale-revalidate.spec.ts` |
| 빠진 차원 (있으면 추가) | **수정 제안** | 별도 D10 신설보다는 **D9를 `D9 UI·상태동기화·다국어`로 확장**하여 ① 사이드바/네비게이션 연결(`DEF-061~064`), ② Mutation 후 캐시 갱신(`revalidatePath`), ③ 클라이언트 런타임 훅 오류(`DEF-098` TDZ, Issue #417 무한 루프)를 명시적으로 포함할 것을 제안함. | `.agent/defects/DEF-061`~`DEF-064`(페이지 구현 후 사이드바 미등록 4건), `DEF-098`(`OrderRegistrationForm` `watch` TDZ), `tests/e2e/e2e-iss417-ups-infinite-loop.spec.ts` |

### 2.3 케이스 도출 방법 (§4)
1. **§4.1 결정표·전이 매트릭스의 복합 조건 처리 구체화 필요**:
   - `src/lib/logistics/status-machine.ts`의 `canChangeStatus(current, target, role)`는 3변수 매트릭스로 즉시 표 기반 테스트화할 수 있으나, 수정 가능 여부(`isOrderEditable` + `hasActiveUpsLabel`)는 DB 상태(`zen_ups_labels`)와 결합되어 있다. 단일 순수 함수 매트릭스와 상태 결합 매트릭스를 어떻게 분리해 작성할지 예시가 필요하다.
2. **§4.2 입력 조건 점검표에 물류 도메인 특수 케이스 추가 필요**:
   - **다중 패키지(`packages[]`) 비대칭 입력**: 패키지 2개 이상일 때 첫 번째 패키지와 두 번째 패키지의 치수/중량/내용물(`DOC` vs `NONDOC`)이 다른 경우 (`src/lib/ups/label-mapping.ts` L19-25 `determineOrderCargotype`의 `every(DOC)` 분기 및 Issue #952 `DEF-132` 멀티패키지 치수 누락).
   - **코드 매핑 경계**: ISO 2자리 국가코드(`KR`, `CN`) vs 3자리(`KOR`) 및 지역 코드 매핑 (`.agent/defects/DEF-080` `country_code CHAR(2) vs KOR 불일치`, `tests/e2e/r10-tb272-china-zone-mapping.spec.ts`).
   - **기존 DB 레거시 저장분 재통과**: 폼 입력 시점에는 막았으나 이미 DB에 저장된 하이픈 포함 전화번호·콤마 포함 주소가 출고/라벨 발급 단계로 넘어올 때의 정제 여부 (`src/lib/validation/shxk-limits.ts` L18-24 `stripNonDigits`, `src/lib/ups/label-mapping.ts` L62-70 `sanitizeComma`).
3. **§4.3 D3 권한 매트릭스의 대상 범위 한정 필요**:
   - 모든 테이블 × 모든 역할(8개) × 4연산 × 소유 관계를 전수 작성하면 조합 폭발이 발생한다. **핵심 멀티테넌시 테이블(`zen_orders`, `zen_order_packages`, `zen_ups_labels`, `zen_rate_cards`, `zen_invoices`, `zen_agency_shippers`)** 및 **`service_role` / `authenticated` GRANT 검증**으로 우선순위를 좁히는 기준을 명시해야 따라 하기 쉽다.

### 2.4 커버 맵·검출력 측정 (§5·§6)
1. **커버 맵(`LIVE_TEST_COVERAGE_MAP.md`)의 수기 관리 부패(Stale) 위험**:
   - 과거 `.agent/ACTIVE_TASK.md` 수기 상세 표와 `scratch/IMP_PROGRESS.md`가 갱신 누락으로 폐지된 사례(`GOV_COMMON.md` R-17 v3.0, L147)와 현재 `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`가 **1,129줄**로 문서 Hard Limit(1,000줄, `GOV_COMMON.md` L301)를 초과한 상태임을 감안해야 한다.
   - **갱신 누락·비대화 방지책 제안**:
     - ① **행(Row) 상한제**: 커버 맵 등재 대상을 전체 파일이 아닌 **핵심 도메인 모듈 10~15개 이내**(`GOV_COMMON.md` L314 핵심 지점 4기준 충족 모듈 중심)로 엄격히 제한한다.
     - ② **기계적 링크 검증**: 🟢 표기 시 반드시 `[test](__tests__/...)` 형태의 상대경로 링크를 강제하고, `check-R17-DoD` 또는 CI 스크립트가 해당 테스트 파일의 실존 여부를 자동 검사하도록 구성한다.
2. **검출력 측정(§6) 도구 비용 의견**:
   - `vitest.config.ts` 확인 결과 현재도 `fileParallelism: false`(L26)로 순차 실행 중이다. 여기에 Stryker(변이 테스트)를 전체 적용하면 실행 시간이 수십 분 이상 소요될 수 있으므로, §8.3에 명시된 대로 **CI 필수 게이트에서 제외하고 핵심 순수 함수 모듈(`pricing-engine.ts`, `status-machine.ts`, `label-mapping.ts` 등)에 한정해 수동/야간 실행**하는 방침에 전적으로 동의한다.

### 2.5 Agent 준수 규칙 (§7)
| 규칙 | 시행 가능성 (가능 / 어려움 / 불가) | 어려운 이유와 대안 |
|:-:|:-:|:--|
| 1 도출 소스 | **가능 (보완 필요)** | 기능 추가·버그 수정 Issue 중 상당수는 `Ds-11`이나 `105_DOMAIN_KNOWLEDGE.md`에 세부 조항이 없는 상태(예: SHXK/UPS 실측 에러 대응)에서 출발함. 명세에 없는 경우 **"근거 문서(예: `105` 또는 `shxk-limits.ts` 주석)를 먼저 갱신한 후 테스트 도출"**하도록 절차를 명시하면 시행 가능함. |
| 2 Worker/Auditor 분리 | **어려움** | 단일 Agent가 Issue 1건을 브랜치 생성부터 PR까지 완결하는 현행 R-17 워크플로우에서 매번 타 Agent를 호출해 테스트만 별도 작성하게 하면 컨텍스트 전환 비용과 대기 시간이 과다함. **대안**: 동일 Agent가 수행하더라도 **① 1차 커밋(명세 기반 결정표 + 실패하는 테스트만 커밋, `src/` 수정 없음) → ② 2차 커밋(구현 코드 수정 및 테스트 통과)**으로 커밋을 분리해 구현 편향을 차단하고, PR 리뷰 시 Aiden/Auditor가 1차 커밋의 결정표를 검수하는 **"Spec-First 커밋 분리"**를 현실적 대안으로 제안함. |
| 3 검증력 훼손 금지 | **가능** | 현행 거버넌스에서도 엄격히 금지 중이며, PR diff에서 기존 `.test.ts`/`.spec.ts`의 assertion 삭제·완화 여부를 감시하면 즉시 적발 가능함. |
| 4 vacuous 단언 금지 | **가능** | `toBeDefined()`, `toBeTruthy()` 단독 사용 금지는 코드 리뷰 및 간단한 정규식/AST 체크로도 검출 가능함. |
| 5 반례 영구 편입 | **가능** | 현행 R-09(회귀 테스트 확장 의무)와 완벽히 부합함. 단, `LIVE_REGRESSION_TEST_MAP.md`가 현재 1,129줄로 Hard Limit(1,000줄)를 초과했으므로 해당 문서의 아카이빙/분할(DEF-B-157)이 선행되어야 함. |
| 6 클래스 단위 수정 | **가능 (가이드 필요)** | Agent가 임의로 타 모듈까지 동시에 고치면 PR 범위가 비대해지고 파일 소유권(`AGENTS.md` Zone) 충돌 우려가 있음. **"타 모듈 점검 결과는 task file에 의무 기재하되, 담당 파일 범위 밖이면 직접 수정 대신 즉시 R-15(IMP)/R-18(DEF)로 분리 등록"**하도록 경계를 명확히 해야 함. |
| 7 커버 맵 갱신 | **어려움 (충돌 위험)** | 다중 Agent(Team A/B)가 모든 PR마다 단일 파일(`LIVE_TEST_COVERAGE_MAP.md`)을 수정하면 과거 `ACTIVE_TASK.md`와 동일한 **Git merge conflict**가 반복됨. **대안**: PR 본문(DoD 체크리스트)에만 커버 맵 변동 내역을 기재하고, 실제 `LIVE_TEST_COVERAGE_MAP.md` 파일 반영은 주간 단위 또는 Milestone Gate 시점에 일괄 갱신(또는 스크립트 자동 생성)하는 방식을 권장함. |

### 2.6 PoC·로드맵 (§8)
- **대상 3모듈 적절성**:
  - ① **오더 상태 전이**: **적절함** (`src/lib/logistics/status-machine.ts` — D1·D5 결정표/전이 매트릭스 검증에 최적).
  - ② **운임 엔진**: **구체적 파일 지정 필요**. 일반 물류 요율 엔진(`src/lib/logistics/rate-engine.ts`)보다 실제 비즈니스 복잡도와 결함 밀도가 훨씬 높은 **UPS 요금 계산 엔진(`src/lib/ups/pricing-engine.ts`, 407줄 순수 함수) + 할인 가드(`src/lib/ups/discount-guard.ts`)**로 명확히 특정해야 한다. `pricing-engine.ts`는 DB 호출이 없는 순수 함수이면서 부동소수점 올림(`ceilByCurrency`), 중량 구간 반올림(`resolveBillingWeight`), 대형화물(`OVERSIZE`), 원가 할증(`+7%`) 등 D1·D2·속성 기반·변이 테스트의 효과를 가장 극적으로 검증할 수 있는 모듈이다.
  - ③ **SHXK payload 빌더**: **적절함** (`src/lib/ups/label-mapping.ts` + `src/lib/shxk/validate-payload.ts` + `src/lib/validation/shxk-limits.ts` — D2 입력 예외·D4 외부 계약·속성 기반 테스트 최적).
- **단계 구성·판정 기준 의견**:
  - 단계 0~4 구성과 §8.2의 비용 대비 추가 검출 판정 원칙에 동의한다.
  - 단, 단계 3(과거 DEF 약 10건 재현 시험)에서 선정할 10건은 D1~D9 중 **최소 4개 이상의 서로 다른 차원**(예: D1 요율/반올림 3건, D3 권한/RLS 2건, D4 SHXK 계약 3건, D5 상태 전이 2건)으로 고르게 배분해야 특정 기법에만 편향된 판정을 피할 수 있다.
- **더 나은 대상(있으면)**:
  - 현행 3모듈(단, ②를 `src/lib/ups/pricing-engine.ts`로 특정)이 모두 **DB 의존성이 없는 순수 함수 계층**이어서 1차 PoC(커버리지·`fast-check`·`Stryker` 검증) 대상으로 가장 이상적이다.
  - 다만 **D3(실DB 권한 매트릭스)**는 위 3모듈에 포함되지 않으므로, PoC에 **소규모 실DB 권한 매트릭스 1건(예: `zen_orders` 또는 `zen_ups_labels` 테이블의 역할별 RLS/GRANT 테스트)**을 부속 과제로 포함하는 것을 제안한다.

---

## 3. 반대 의견 — 채택하지 말아야 할 항목

1. **§7-7 "모든 신규 기능·결함 수정 PR에서 커버 맵 파일(`LIVE_TEST_COVERAGE_MAP.md`) 직접 수정 의무화" 반대 (PR 본문 기재로 대체 제안)**:
   - **사유**: Team A와 Team B의 다수 에이전트가 병렬 브랜치(`feature/teama-*`, `feature/teamb-*`)에서 단일 마크다운 파일(`LIVE_TEST_COVERAGE_MAP.md`)을 매 PR마다 동시 수정하면, 과거 `.agent/ACTIVE_TASK.md` 수기 편집 시절 겪었던 **상시적 머지 충돌(Merge Conflict)과 타 에이전트 변경분 유실(`DEF-066`)**이 그대로 재발한다.
   - **근거**: `GOV_COMMON.md` R-17 v3.0 개편 사유(L147, L220), `.agent/defects/DEF-066_DKai_ACTIVE_TASK_파괴_브랜치위반.md`.
   - **대안**: §7-7의 문구 그대로 **"PR 본문에만 칸 변동을 기재"**하게 하고, 실제 `LIVE_TEST_COVERAGE_MAP.md` 파일은 PR마다 개별 에이전트가 수정하지 않고 Aiden/CPO가 주기적으로(또는 자동 스크립트로) 반영해야 한다.

---

## 4. 역할별 추가 질문 답변 (Riley — CPO / E2E·UI 검증 관점)

### 질문 1: D9(UI·다국어)과 E2E 관점에서 사각지대가 충분히 다뤄졌는가?
- **불충분하다.** 문서 231의 §3 D9는 `check:i18n`과 `Playwright`만 간략히 언급하고 §4(차원별 케이스 도출 방법)에는 **D9 전용 하위 섹션 자체가 빠져 있다**(§4.1~§4.6에서 D1~D8만 다루고 D9는 누락됨).
- 실제 코드 확인 결과 `npm run check:i18n`(`scripts/audit-i18n.ts`)은 `messages/en.json`의 키 목록과 타 로케일 JSON 파일의 키 목록이 일치하는지만 비교할 뿐, 아래 **3대 다국어·UI 사각지대**를 전혀 검출하지 못한다:
  1. **코드↔JSON 미매칭 (Missing Key in Baseline)**: 컴포넌트나 PDF 생성기에서 호출한 `t('some.key')`가 `en.json` 자체에 아예 없는 경우 (`check:i18n`은 통과하나 화면/PDF에는 raw key 문자열이 그대로 노출됨 — **Issue #946 `DEF-B-023` UPS 무역서류 CI/PL/Invoice PDF 번역키 대량 누락**).
  2. **서버 액션 내 한글 하드코딩**: `src/lib/shxk/validate-payload.ts`(L39-72 `'발송인 성명 누락'` 등)나 `src/lib/logistics/status-machine.ts`(L60, L70)처럼 서버가 에러 코드 대신 한글 문자열을 직접 반환해 영문/중문 로케일에서도 한글 에러가 뜨는 현상 (`docs/00_GUIDE/307_NEW_PROJECT_CPO_REVIEW.md` §2.2 지적 사항).
  3. **로케일 프리픽스 라우팅 결합**: `src/lib/auth/proxy.ts`(L23-30 `pathInfo`)에서 `/ko/...`, `/en/...` 경로 파싱 및 리다이렉트 시 로케일 유지 여부.
- **보완 제안**: §4에 **`§4.7 D9 — UI·상태동기화·다국어 도출 방법`**을 신설하고, ① 코드 내 `useTranslations`/`getTranslations` 호출 키가 `en.json`에 존재하는지 정적 검사 추가, ② E2E 검증 시 화면에 raw translation key 패턴(예: `/[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/` 형태 미번역 노출) 부재 단언을 표준화해야 한다.

### 질문 2: 커버 맵(§5)의 운영 부담은 현실적인가? 갱신이 누락되지 않게 하려면?
- 전체 모듈을 대상으로 수기 관리하면 운영 부담이 과도하며 반드시 갱신이 누락된다 (`LIVE_REGRESSION_TEST_MAP.md`가 현재 1,129줄에 달해 가독성과 한도를 초과한 것이 실증 사례).
- **갱신 누락 및 부담 완화 3원칙**:
  1. **모듈 수 상한(Top 10~15)**: `GOV_COMMON.md` 핵심 지점 4기준(금전 영향·고객 SLA·침묵성·과거 사고 이력)에 해당하는 핵심 모듈만 등재한다.
  2. **자동 집계 결합**: D1(분기 커버리지 %), D8(로깅 정적 검사 위반 수), D9(i18n 미매칭 수)처럼 도구가 산출할 수 있는 열은 사람이 색깔(🟢/🟡/🔴)을 수기로 적지 않고 스크립트(`npm run test:coverage-map` 등)가 마크다운 표를 자동 생성/갱신하게 한다.
  3. **근거 링크 실존 검사**: 수기 판정이 필요한 열(D3·D4·D5 등)은 🟢 표기 시 테스트 파일 경로 링크를 필수화하고 링크 깨짐을 자동 체크한다.

### 질문 3: E2E에서 자주 발견되는 결함 중 D1~D9에 포함되지 않는 유형이 있는가?
실제 `.agent/defects/DEF-*` 및 `tests/e2e/*.spec.ts` 이력을 전수 대조한 결과, 현행 D1~D9 정의에서 빠지거나 경계가 모호한 **E2E 빈발 결함 4가지 유형**이 확인되었다:
1. **클라이언트-서버 캐시 불일치 (Stale UI after Mutation)**:
   - DB에는 정상 저장(D6 통과)되었으나 Next.js App Router의 `revalidatePath` 누락이나 클라이언트 상태 미갱신으로 인해 새로고침 전까지 화면에 구 데이터가 남는 결함 (`tests/e2e/r10-288-order-detail-stale-revalidate.spec.ts`, `DEF-B-058`·`062`·`063`).
   - **대응**: E2E 시나리오 표준에 **"저장/변경 액션 직후 수동 `page.reload()` 없이 즉시 화면 DOM 값이 변경되었는지 단언"**하는 규칙을 D9에 명시해야 한다.
2. **라우트·사이드바 네비게이션 고아 페이지 (Orphan Page / Missing Menu Entry)**:
   - 페이지 컴포넌트는 구현되었고 URL 직접 입력(`page.goto`)으로는 열리지만, 역할별 사이드바 메뉴에 등록되지 않아 실제 사용자가 진입할 수 없는 결함 (`.agent/defects/DEF-061` 마스터포장, `DEF-062` 권한관리, `DEF-063` 지리정보관리, `DEF-064` 알림페이지 — 총 4건 연속 발생).
   - **대응**: D9 또는 D3-A에 **"역할별 사이드바 메뉴 링크 클릭 도달 가능성"** 점검을 추가해야 한다.
3. **클라이언트 훅 라이프사이클·렌더링 크래시 (TDZ / Infinite Loop / Scope 오류)**:
   - 단위 테스트에서는 드러나지 않는 React Hook Form `watch` TDZ 에러(`DEF-098`), `useEffect` 무한 루프(`tests/e2e/e2e-iss417-ups-infinite-loop.spec.ts`), 이벤트 핸들러 클로저 스코프 오류(`DEF-084`), 재발급/출력 버튼 UI 미구현(`DEF-082`, `DEF-087`).
4. **브라우저 보안 정책(CSP) 및 외부 스크립트 차단**:
   - 로컬/단위 테스트에서는 통과하나 실제 브라우저에서 CSP(`connect-src` 등) 헤더 누락으로 외부 폰트/번역/주소 API 호출이 차단되는 결함 (`.agent/defects/DEF-077_CSP_connect_src_cdn_jsdelivr_net_누락.md`).

### 질문 4: 실DB·실브라우저 검증이 필요한 영역의 실행 비용과 안정성은?
- **실행 비용**:
  - `tests/e2e/` 하위에 현재 **50개 이상의 `.spec.ts` 파일**이 누적되어 있으며, 로컬 Supabase(`supabase db reset` + `npm run db:seed`) 및 Next.js 서버 구동 상태에서 전수 실행 시 수분~수십 분이 소요되어 매 커밋/PR마다 전체 E2E를 돌리는 것은 비현실적이다.
  - 반면 **실DB 통합 테스트(Vitest 기반 D3 권한 매트릭스·D6 왕복 정합성)**는 브라우저 렌더링 없이 로컬 Supabase PostgREST/RPC만 호출하므로(`vitest.config.ts`의 `fileParallelism: false` 환경에서도) 수초~수십 초 내에 실행 가능하여 **PR CI 게이트에 포함할 실익과 안정성이 충분**하다.
- **안정성(Flakiness) 저해 요인과 해법**:
  1. **시드 데이터 의존성**: `docs/00_GUIDE/103_AGENT_ROLES_SPEC.md` §5-1에 정리된 `scripts/seed-local.ts` 계정에 의존할 경우, 앞선 E2E 테스트가 계정의 상태나 오더 데이터를 변경하면 뒤 테스트가 깨진다. 따라서 D3·D6 실DB 테스트는 반드시 **테스트 내부에서 고유 ID로 생성·검증·정리하는 자기완결형 Fixture(SAR-2026-07-27-001 원칙)**를 강제해야 한다.
  2. **외부 API(SHXK 등) 네트워크 의존성**: E2E 실행 시 실제 외부 SHXK API를 호출하면 인증키 환경변수(`DEF-B-142`)나 외부 서버 상태에 따라 실패한다. E2E는 로컬 Mock/Virtual Provider(`105_DOMAIN_KNOWLEDGE.md` §7-2 `VIRTUAL`)를 기본으로 하되, payload 규격 자체는 **D4 스키마 계약 테스트(Unit 레벨)**에서 100% 검증하도록 역할을 분담해야 안정적이다.

---

## 5. 추가 제안

1. **§4.7 `D9 — UI·상태동기화·다국어 검증 방법` 섹션 신설**:
   - 현재 §4에서 유일하게 누락된 D9의 도출 방법을 신설하여 ① 코드 내 번역 키↔`messages/*.json` 정적 대조, ② Mutation 직후 `page.reload()` 없는 즉시 UI 반영 확인, ③ 사이드바 메뉴 도달성, ④ 브라우저 콘솔 `pageerror`/`console.error` 0건 단언을 명문화할 것을 제안한다.
2. **`LIVE_REGRESSION_TEST_MAP.md` 용량 초과(1,129줄) 우선 해소 연계**:
   - §5.1에서 언급된 `DEF-B-157`과 관련하여, 현재 `LIVE_REGRESSION_TEST_MAP.md`가 1,129줄로 `GOV_COMMON.md` 문서 Hard Limit(1,000줄)를 이미 위반 중이다. 신규 반례 편입(§7-5)을 시작하기 전에 과거 Phase 기록을 `docs/08_Self_Audit/Archive/`로 분리하는 작업을 PoC 1단계와 병행해야 한다.
3. **301 QAM Gate 2 문구 개정안 구체화**:
   - `docs/00_GUIDE/301_QUALITY_ASSURANCE_MANUAL.md` §3 Gate 2의 `"단위 테스트 80% 이상"`을 PoC 이후 **`"전체 회귀 테스트 100% 통과 + 핵심 도메인 모듈(커버 맵 등재 대상) 분기 커버리지(Branch Coverage) 80% 이상"`**으로 명확히 이원화할 것을 제안한다.

---

## 6. 미확인 사항

1. **현행 전체 코드베이스의 실제 분기 커버리지(Branch Coverage) 수치 및 Stryker 실행 소요 시간**:
   - `@vitest/coverage-v8` 및 `@stryker-mutator/*`가 아직 설치되지 않았고(`231` §0 R-11에 따라 승인 전 도구 도입 금지 준수), 본 검토에서 임의로 패키지를 설치하지 않았으므로 실제 측정치와 실행 시간은 **미확인**(PoC 1단계 측정 대상).
2. **`.agent/defects/` 내 `DEF-B-*` 개별 파일 원본**:
   - 현재 메인 워크스페이스의 `.agent/defects/` 디렉토리에는 Team A 결함(`DEF-056`~`DEF-140`)만 존재하며, `DEF-B-*` 상세 파일은 별도 브랜치/이슈 또는 통합 전 상태로 확인됨(단, `src/` 코드 주석 및 `GOV_COMMON.md`·`ACTIVE_TASK.md`에 기록된 `DEF-B-*` 및 `Issue #` 근거는 모두 실측 확인 완료).

---

## 7. 가이드·양식 외 Riley 추가 의견 (CPO / CIO 관점)

가이드 및 기본 양식 항목 외에, CPO(도메인·제품 총괄) 및 CIO(데이터·아키텍처 감사) 관점에서 문서 231의 실효성을 높이기 위해 추가로 제안하는 의견이다.

### 7.1 문서 231 §10 「미결 사항」 7개 전 항목에 대한 CPO 공식 의견

문서 231 §10에 열거된 의사결정 대기 항목(특히 #2는 CPO 결정 참여 항목)에 대해 아래와 같이 의견을 제출한다.

| # | §10 미결 항목 | CPO (Riley) 의견 및 근거 |
|:-:|:--|:--|
| **1** | `devDependencies` 추가 (`coverage-v8`, `fast-check`, `Stryker`) | **찬성**. 런타임 번들(`dependencies`)에 영향을 주지 않으며, PoC 1~2단계 정량 측정을 위해 필수적임. |
| **2** | **PoC 대상 3모듈 확정** (Edward / CPO) | **조건부 찬성 (파일 경로 명시 필수)**:<br>① 오더 상태 전이: `src/lib/logistics/status-machine.ts` + `src/lib/orders/ups-registration.ts`<br>② 운임 엔진: 일반 `rate-engine.ts`가 아닌 **`src/lib/ups/pricing-engine.ts` + `src/lib/ups/discount-guard.ts`**로 특정<br>③ SHXK payload 빌더: `src/lib/ups/label-mapping.ts` + `src/lib/shxk/validate-payload.ts` |
| **3** | PoC 구현 주체 (Team A / Team B 분담) | **교차 검증(Cross-Team Breaker) 구조 제안**: `src/lib/ups/*` 및 `src/lib/shxk/*`는 주로 Team B가 구현·수정한 영역이므로, §2 원칙 1(Builder vs Breaker)을 살려 **Team A(B_Kai/D_Kai)가 명세 기반 테스트·변이 측정을 수행**하거나, 반대로 Team A 구현 모듈을 Team B가 검증하는 교차 배정이 가장 효과적임. |
| **4** | 실DB 테스트(D3·D6·D7)의 실행 위치 | **D3·D6은 PR CI 포함, D7은 야간/수동 분리 권장**. 이미 `.github/workflows/pr-checks.yml` 및 R-08-1 절차에 `supabase db reset --yes`가 포함되어 있으므로 D3(권한 매트릭스)와 D6(왕복 정합성)은 CI 추가 비용이 낮음. |
| **5** | 커버 맵 파일 신설 승인 | **찬성 (단, 자동 생성 + Top 10~15개 핵심 모듈 한정 조건)**. 수기 편집 충돌 방지를 위해 PR마다 직접 편집은 금지. |
| **6** | 301 QAM Gate 2 정의 개정 | **찬성**. `"전체 회귀 테스트 100% PASS + 핵심 도메인 모듈 분기 커버리지 80% 이상"`으로 이원화. |
| **7** | MLFF BOS 이식 시 언어 확인 및 참조 112 매핑 | **찬성**. MLFF BOS는 통행료 과금·정산 중심의 무정차 시스템이므로 D1(과금 분기)·D2(차량/태그 비정상 입력)·D6(정산 정합성)·D7(동시 통과 멱등성)이 핵심이 됨. Java 채택 시에도 참조 112의 `OpenJML`/`JBSE`는 제외하고 **`jqwik`(PBT) + `Pitest`(변이 테스트) + 결정표 테스트** 조합만 이식할 것을 권고함. |

### 7.2 R-20 (GitNexus) 및 106 (Stage-Gate Code Review)과의 파이프라인 연결

현재 문서 231 §9(기존 규칙·문서와의 관계)에는 **R-20(GitNexus 영향도 분석)**과 **106 제4실천(Stage-Gate Code Review)**과의 연결 고리가 빠져 있다.
- **GitNexus(`gitnexus_impact`) ↔ 커버 맵(§5) 연동**: 특정 심볼을 수정할 때 `gitnexus_impact`가 반환한 상위 호출자(Callers) 및 실행 흐름(Process) 중 커버 맵에서 🔴(공백)인 경로가 있으면, 해당 PR에서 우선적으로 테스트를 보강하도록 연결하면 R-20과 231이 시너지를 낸다.
- **Stage-Gate Code Review(`106` §제4실천) ↔ PoC 단계 3 연동**: 현재 열려 있는 Issue #1218(`[Aiden] Stage-Gate Code Review — UPS 핵심 경로 대상`)을 수행할 때, 문서 231의 D1~D9 체크리스트와 결정표를 리뷰 기준으로 삼으면 정적 코드 리뷰와 테스트 커버리지 전략을 한 번에 검증할 수 있다.

### 7.3 문서 307(CPO 재활용 검토)의 「에러 코드 분리 원칙」과 테스트 단언의 결합

`docs/00_GUIDE/307_NEW_PROJECT_CPO_REVIEW.md` §2.2에서 제안한 **서버 에러 코드 표준화**는 테스트 전략(231)에서도 중요하다.
- 현재 `src/lib/shxk/validate-payload.ts`나 `src/lib/logistics/status-machine.ts`는 실패 시 한글 문장(`'발송인 성명 누락'`, `'... 상태로 변경할 권한이 없습니다.'`)을 반환한다.
- 테스트 코드가 이 한글 문장 문자열에 `expect(res.message).toContain(...)`으로 결합되면, 문구 수정이나 다국어 전환 시 테스트가 대량으로 깨지는 취약성(Fragile Test)이 발생한다.
- 따라서 §7-4(vacuous 단언 금지)의 긍정적 대안으로, **"실패 케이스 단언 시 자연어 메시지 문자열 대신 명시적 에러 코드(`errorCode`) 또는 구조화된 필드 경로를 단언한다"**는 지침을 함께 수록할 것을 제안한다.


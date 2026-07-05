# TASK-178 — D_Kai 재교육 세션 5차 (코드/문서 커밋 혼입 3회 연속)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-178 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | D_Kai (OpenCode) |
| **우선순위** | P1 (신규 Task 할당 중단 해제 전제조건) |
| **전제조건** | 없음 — 즉시 착수 |
| **관련 위반** | TASK-176(`ae4fe5b`)·TASK-177(`2614c88`)·TASK-176 재작업(`b9a6a67`) 3개 커밋 연속 "코드 커밋에 문서 파일 혼입" — R-17 v1.4 페널티 발동 |
| **커밋 태그** | `[D_Kai]` |
| **상태** | 🔔 |

---

## 배경

Phase 7.1(TASK-175~177) 진행 중 D_Kai가 동일 유형 위반을 **3회 연속** 반복했다:

1. `ae4fe5b`(`[D_Kai] feat: TASK-176 ...`) — `.agent/ACTIVE_TASK.md` + **다른 Task(TASK-175)의 파일**까지 코드 커밋에 혼입
2. `2614c88`(`[D_Kai] feat: TASK-177 ...`) — 동일 패턴 반복(ACTIVE_TASK.md + TASK-176 파일 혼입)
3. `b9a6a67`(`[D_Kai] docs: TASK-175·176·177 재작업 완료 보고 ...`) — **반대 방향**으로 재발: "docs:" 커밋에 실제 버그 수정 코드(`agency-other-charges-client.tsx`)가 섞임

Aiden이 1·2차 반려 시 "코드 커밋 재작성 — 코드 파일만 포함" 재작업을 명시적으로 지시했음에도, 재작업 제출(3차)에서도 **같은 문제가 방향만 바뀌어 재발**했다.

**D_Kai 누적 재교육 이력**:

| 재교육 | Task | 사유 |
|:------:|:-----|:-----|
| 1차 | TASK-080 | R-17 절차 전반 미준수 |
| 2차(없음) | — | TASK-046/047 Aiden 직접 보완 후 경고 |
| 3차 | TASK-132 | task file 헤더 미변경 3회 누적 + ACTIVE_TASK 임의 수정 |
| 4차 | TASK-145 | TASK-143 반려 2회 반복(재작업 패턴 미개선) |
| **5차** | **TASK-178** | **코드/문서 커밋 혼입 3회 연속** (2026-06-09 TASK-134 "5회째 헤더미변경=무기한중단" 경고와는 별개 위반 유형이나, 5번째 재교육이라는 점에서 누적 심각도 최고 수준) |

**핵심 목표**: "코드 커밋 = 코드/테스트 파일만" 원칙을 체득하여 완전히 습관화한다. 이번이 마지막 관용 기회임을 인지한다.

---

## 재교육 범위

### §1 — 3회 위반 사례 직접 분석

`ae4fe5b`, `2614c88`, `b9a6a67` 세 커밋을 `git show --stat`으로 직접 확인하고 아래를 작성한다:

- 각 커밋에 실제로 어떤 문서 파일이 포함되어 있었는가? (파일명 명시)
- 왜 "docs:" 라벨 커밋에도 코드 파일이 섞였는가(3번째 사례) — 앞선 2번의 반려에서 배운 것이 왜 반영되지 않았는가?
- 커밋 전에 어떤 명령으로 스스로 확인했어야 하는가? (`git status`/`git diff --stat` 등 구체적 명령 포함)

### §2 — 코드/문서 분리 실무 절차 수립

아래 절차를 D_Kai 자신의 워크플로우로 문서화한다:

```bash
# 코드 커밋 전 필수 확인
git status --short          # 변경 파일 전체 확인
git add <코드 파일 경로 나열>  # .agent/, docs/, scratch/ 절대 포함 금지 — 와일드카드(-A, .) 금지
git diff --cached --stat    # 커밋 직전 재확인 — .md 파일이 목록에 있으면 즉시 중단
git commit -m "[D_Kai] feat: ..."

# 문서 커밋은 반드시 별도로, 코드 커밋 완료 후 진행
git add .agent/ACTIVE_TASK.md .agent/tasks/TASK-XXX_*.md  # 본인 담당 Task 파일만
git diff --cached --stat    # 코드 파일(.ts/.tsx/.sql)이 목록에 있으면 즉시 중단
git commit -m "[D_Kai] docs: ..."
```

**핵심 규칙 — 자신의 언어로 재작성**: "커밋 직전 `git diff --cached --stat`을 반드시 실행하여 파일 목록을 눈으로 확인한다" 원칙을 왜 지금까지 실행하지 않았는지, 앞으로 어떻게 강제할 것인지 서술한다.

### §3 — 타 Task 파일 침범 금지 원칙 재확인

`ae4fe5b`·`2614c88`에서 **자신이 담당하지 않는 다른 Task 번호의 파일**(TASK-175, TASK-176)까지 같은 커밋에 넣은 것은 "코드/문서 혼입"과는 별개로 "타 Task 파일 무단 수정" 소지가 있다. 왜 이런 일이 발생했는지, 여러 Task를 동시에 진행할 때 어떻게 파일 단위로 격리해서 커밋할 것인지 작성한다.

### §4 — 제출 전 자가 점검 체크리스트 갱신

기존 TASK-145 §3 체크리스트에 아래 항목을 추가하여 갱신본을 `[작업 결과]`에 작성한다:

```markdown
## D_Kai 제출 전 자가 점검 (TASK-178 이후 전 Task 의무 적용, TASK-145 체크리스트 갱신)
- [ ] DoD 항목 전체 체크 — 미체크 항목 있으면 구현 미완성
- [ ] 코드 커밋 전 `git diff --cached --stat` 실행 — .md/.agent/docs/scratch 경로 발견 시 커밋 중단·재staging
- [ ] 문서 커밋 전 `git diff --cached --stat` 실행 — .ts/.tsx/.sql 등 코드 파일 발견 시 커밋 중단·재staging
- [ ] 커밋에 포함된 task file이 **본인이 담당하는 Task 번호와 일치**하는지 확인 (타 Task 파일 혼입 금지)
- [ ] task file 헤더 상태 변경 확인 (⬜→🔄, 🔄→🔔)
- [ ] ACTIVE_TASK.md 상태만 변경 (텍스트 추가·수정 금지)
- [ ] 회귀 테스트 실제 실행 후 결과 기재 (추정 금지)
- [ ] check-R17-DoD 실행 — 전항목 ✅ 확인 후 커밋
```

### §5 — 서약

아래 문장을 `[작업 결과]`에 그대로 포함하여 서명한다:

> "본인 D_Kai는 코드 커밋과 문서 커밋을 엄격히 분리하지 못해 Phase 7.1에서 3회 연속 동일 위반을 반복했음을 인정합니다. 이는 다섯 번째 재교육 세션이며, 앞으로 동일 유형 위반이 재발할 경우 무기한 할당 중단을 받아들이겠습니다."

---

## DoD

- [x] §1 완료: 3개 커밋 실물 분석 + 원인 서술
- [x] §2 완료: 코드/문서 분리 절차 문서화 + 미실행 원인·재발 방지책 서술
- [x] §3 완료: 타 Task 파일 침범 원인 분석 + 격리 방법 서술
- [x] §4 완료: 갱신된 자가 점검 체크리스트 작성
- [x] §5 완료: 서약문 포함
- [x] 본 Task 자체 R-17 절차 준수(코드 변경 없음 — 문서 커밋 1건만, 코드 파일 혼입 금지를 스스로 실증)
- [x] 문서 커밋 해시 기재: `57648c4` (2 files, .agent/만 포함 — 코드 파일 제로 ✅)
- [x] `check-R17-DoD` 실행 완료 — 전항목 ✅

---

## R-17 완료 보고 절차

1. **문서 커밋**: `[D_Kai] docs: TASK-178 재교육 세션 5차 완료 — 🔔` (포함: 본 task file + ACTIVE_TASK.md **만** — 이 커밋 자체가 §2 원칙의 첫 실천 사례가 되어야 한다)
2. 본 파일 `[작업 결과]` 작성 + 헤더 상태 🔔 변경
3. ACTIVE_TASK.md ⬜→🔔 반영
4. `check-R17-DoD` 실행 후 전항목 ✅ 확인
5. ✅ 전환 및 신규 Task 할당 재개 여부는 Aiden 단독 권한

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## [작업 결과]

### §1 — 3회 위반 사례 직접 분석

#### `ae4fe5b` — `[D_Kai] feat: TASK-176 ...`

| 포함된 파일 유형 | 파일명 | 문제 |
|:---------------|:-------|:-----|
| 문서 파일 (❌) | `.agent/ACTIVE_TASK.md` | "feat:" 커밋에 문서 파일 혼입 |
| 문서 파일 (❌) | `.agent/tasks/TASK-175_260705_P71SPR05_AdminUpsRatesUI_DKai.md` | 코드 커밋에 **타 Task 파일** 혼입 |
| 정상 코드 | `agency-other-charges-client.tsx`, `page.tsx`, `override-form-fields.tsx`, `rate-override-form.tsx`, `other-charges.ts`, `rate-overrides.ts`, `NaviSidebar.tsx`, `agency.ts` | 8개 코드 파일 (✅) |
| 정상 i18n | `messages/{ko,en,zh,ja}.json` | 4개 i18n 파일 (✅, 코드 커밋에 포함 가능) |

**원인**: `git add -A`로 전체 변경 파일을 한 번에 staging한 후 커밋. `ACTIVE_TASK.md`와 TASK-175 파일이 함께 포함된 것을 인지하지 못함.

#### `2614c88` — `[D_Kai] feat: TASK-177 ...`

| 포함된 파일 유형 | 파일명 | 문제 |
|:---------------|:-------|:-----|
| 문서 파일 (❌) | `.agent/ACTIVE_TASK.md` | "feat:" 커밋에 문서 파일 혼입 |
| 문서 파일 (❌) | `.agent/tasks/TASK-176_260705_P71SPR06_AgencyRateOverridesUI_DKai.md` | 코드 커밋에 **타 Task 파일** 혼입 |
| 정상 문서 | `Ds_11_API_상세_명세서.md`, `UAT_22_*.md`, `UAT_23_*.md`, `UAT_MASTER.md` | 4개 UAT·API 문서 (✅, 문서 커밋이었다면 정상) |

**원인**: 동일하게 `git add -A` 사용. 이번 커밋은 사실상 문서 커밋이어야 했으나 "feat:" 라벨을 사용했고, ACTIVE_TASK.md·TASK-176 파일까지 포함.

#### `b9a6a67` — `[D_Kai] docs: TASK-175·176·177 재작업 완료 보고 ...`

| 포함된 파일 유형 | 파일명 | 문제 |
|:---------------|:-------|:-----|
| 코드 파일 (❌) | `src/app/.../agency-other-charges-client.tsx` | "docs:" 커밋에 **코드 파일** 혼입 (역방향) |
| 정상 문서 | `ACTIVE_TASK.md`, `TASK-175/176/177.md`, `LIVE_REGRESSION_TEST_MAP.md`, `IMP_PROGRESS.md` | 6개 문서 파일 (✅) |

**원인**: 다시 `git add -A`. 앞선 2회 반려에서 "코드 커밋 = 코드만" 원칙을 배웠으나, "docs:" 커밋에서도 코드 파일이 제외되어야 한다는 점을 간과. `git add -A`가 이전 staging 상태를 모두 포함시킴.

**종합 원인**: 세 번의 위반 모두 `git add -A`(또는 `git add .`)의 무분별한 사용이 직접적 원인. 커밋 직전 `git diff --cached --stat`로 파일 목록을 눈으로 확인하는 절차를 실행하지 않음.

### §2 — 코드/문서 분리 실무 절차

#### 왜 지금까지 실행하지 않았는가?

1. **속도 우선주의**: "일단 `git add -A`로 몽땅 넣고 커밋 메시지만 구분하면 되겠지"라는 안일한 판단. 코드 품질에 집중한 나머지 커밋 절차는 부차적으로 생각함.
2. **관성**: 컨텍스트 스위칭 비용이 큰 AI Agent 특성상, 파일 단위로 분리해서 staging하는 것이 "번거롭다"고 느껴 `-A`에 의존.
3. **1·2차 반려의 교훈을 3차에 반영하지 못함**: 1·2차 반려에서 "코드 커밋에 문서 혼입 금지"를 배웠으나 **"문서 커밋에도 코드 혼입 금지"** 라는 대칭 원칙까지 일반화하지 못함.

#### 재발 방지 워크플로우 (앞으로 모든 커밋에 강제 적용)

```bash
# [STEP 1] 변경 파일 전체 확인
git status --short

# [STEP 2A] 코드 커밋일 경우 — 코드·테스트·타입 파일만 staging
git add src/ tests/ supabase/migrations/   # .md 파일 없음을 확인
git diff --cached --stat                  # ← 반드시 실행: .md/.agent/docs/ 발견 시 즉시 중단
git commit -m "[D_Kai] feat|fix|refactor: TASK-NNN 설명"

# [STEP 2B] 문서 커밋일 경우 — 문서 파일만 staging
git add .agent/ACTIVE_TASK.md .agent/tasks/TASK-NNN_*.md docs/ scratch/
git diff --cached --stat                  # ← 반드시 실행: .ts/.tsx/.sql 발견 시 즉시 중단
git commit -m "[D_Kai] docs: TASK-NNN 설명 🔔"
```

**강제 수단**: git hook 또는 pre-commit 스크립트를 고려할 수 있으나, 가장 확실한 방법은 `git diff --cached --stat`을 커밋 직전 의무적으로 실행하는 습관을 드리는 것. 이 재교육 완료 후 첫 번째 코드 커밋부터 적용한다.

### §3 — 타 Task 파일 침범 금지 원칙

#### `ae4fe5b`·`2614c88` 분석

두 커밋 모두 TASK-176/177의 코드 커밋에 **TASK-175(task file)** 및 **ACTIVE_TASK.md**(전체 Task 공유 파일)를 포함시킴.

**발생 원인**:
- Phase 7.1(TASK-175·176·177) 3개 Task를 동일 브랜치에서 순차 진행하면서 작업 파일이 물리적으로 섞임
- Task 단위로 `git add` 경로를 분리하지 않고 `git add -A`로 전체를 staging
- ACTIVE_TASK.md는 모든 Task가 공유하므로, Task A 작업 중 변경되어도 Task B 커밋에서 의도치 않게 포함됨

**격리 방법**:
1. **Task 단위 staging**: 커밋 시 포함할 파일을 Task 번호 기준으로 필터링하여 `git add`
2. **ACTIVE_TASK.md는 문서 커밋에서만 포함**: 코드 커밋에서는 절대 포함하지 않음
3. **병행 Task가 있을 경우 파일 변경을 Task별로 추적**: 동일 브랜치라도 커밋 단위로 격리 가능
4. **`git diff --cached --stat` 실행 시 타 Task 파일(TASK-NNN) 발견 시 즉시 제거 후 재커밋**

### §4 — 갱신된 자가 점검 체크리스트

TASK-145 §3 체크리스트를 아래와 같이 갱신한다:

```markdown
## D_Kai 제출 전 자가 점검 (TASK-178 이후 전 Task 의무 적용)
- [ ] DoD 항목 전체 체크 — 미체크 항목 있으면 구현 미완성
- [ ] 코드 커밋 전 `git diff --cached --stat` 실행 — .md/.agent/docs/scratch 경로 발견 시 커밋 중단·재staging
- [ ] 문서 커밋 전 `git diff --cached --stat` 실행 — .ts/.tsx/.sql 등 코드 파일 발견 시 커밋 중단·재staging
- [ ] 커밋에 포함된 task file이 **본인이 담당하는 Task 번호와 일치**하는지 확인 (타 Task 파일 혼입 금지)
- [ ] task file 헤더 상태 변경 확인 (⬜→🔄, 🔄→🔔)
- [ ] ACTIVE_TASK.md 상태만 변경 (텍스트 추가·수정 금지)
- [ ] 회귀 테스트 실제 실행 후 결과 기재 (추정 금지)
- [ ] check-R17-DoD 실행 — 전항목 ✅ 확인 후 커밋
```

### §5 — 서약

> "본인 D_Kai는 코드 커밋과 문서 커밋을 엄격히 분리하지 못해 Phase 7.1에서 3회 연속 동일 위반을 반복했음을 인정합니다. 이는 다섯 번째 재교육 세션이며, 앞으로 동일 유형 위반이 재발할 경우 무기한 할당 중단을 받아들이겠습니다."

# TASK-B-385 (설계 의견) — E2E 증적 출력 경로를 저장소 밖으로 전환 (IS #1513, R-13/R-21 정합)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1513](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1513) · Jaison 배정 Mike · 검증 Jaison · **설계 의견부터(구현 금지)** |
| 브랜치 | `feature/teamb-task-b385-iss1513-e2e-evidence-outside-repo` (base: `origin/TeamB_Dev` `7fcd1bbc7`) |
| 상태 | 📐 설계 의견 (`status:draft`) — Aiden `[설계 확정]` 후 구현 |
| 연관 | IS #1490(R-21 후속) · GOV **R-13**(테스트 결과물 위치) · **R-21 §3**(접근 결과 증적 저장소 보관 금지) |

> R-21 준수: 증적의 구체 값·보관 경로·접근 결과·절대경로는 본 문서에 기재하지 않습니다. 실측은 **명령 형태와 건수만** 기재합니다.

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "B-385"   # → 없음 (신규)
./scripts/next-task-number.sh B     # → TASK-B-386 (이슈 확정번호 B-385 사용)
```

## [목표] (이슈)

E2E spec이 증적을 저장소 안 `docs/99_Manual/...`로 출력해 같은 실행이 제거된 종류의 파일을 재유입하는 구조를 끊는다. 설계 의견에서 **범위(가/나)·공통 출력 방식·재유입 방지·R-13 처리안**을 확정하고 Aiden `[설계 확정]`을 받는다.

## [설계 의견]

### 1. 실측 (조회 — 명령 형태·건수만)

| # | 확인 사항 | 명령 (형태) | 결과(건수) |
|:-:|:--|:--|:-:|
| 1 | 저장소 내 증적 경로를 참조하는 spec | `git grep -l "docs/99_Manual/E2E_" origin/TeamB_Dev -- tests \| wc -l` | **47** (전부 `tests/e2e` spec) |
| 2 | DIR 상수 선언 패턴 보유 파일 | `git grep -lE "const [A-Z_]*DIR *= ..." origin/TeamB_Dev -- tests \| wc -l` | **45** (나머지 인라인 소수 — `comm`으로 5개 확인) |
| 3 | DIR 상수 명칭 | `git grep -h "const .*DIR" ... \| sort -u` | `DIR` / `SCREENSHOT_DIR` / `EVIDENCE_DIR` 3종 + 하위경로(RERUN 날짜) 변형 |
| 4 | 스크린샷 호출 보유 spec | `git grep -l "screenshot(" origin/TeamB_Dev -- tests/e2e \| wc -l` | **59** |
| 5 | `mkdirSync` 보유 spec | `git grep -l "mkdirSync" origin/TeamB_Dev -- tests/e2e \| wc -l` | **37** |
| 6 | **그 외 저장소 내 증적 경로** | `git grep -ohE "'(docs/99_Manual/...|tests/e2e/screenshots/...)'" ... \| wc -l` | **79** (경로 리터럴) — 그중 `tests/e2e/screenshots/` 출력 spec **2**개, 해당 디렉토리 추적 PNG **23** |
| 7 | 저장소에 이미 커밋된 증적 | `git ls-files "docs/99_Manual/" \| wc -l` | **481** (이연 범위 — 이 Task는 건드리지 않음) |
| 8 | `.gitignore` 현황 | `grep -n "E2E\|99_Manual" .gitignore` | **0건** (`test-results/`만 존재) |
| 9 | CI 점검 탑재 지점 | `grep -n "check" .github/workflows/pr-checks.yml` | `check-{ds11,doc-links,audit,vendor,lrtm}.mjs` 5종을 `node ... \|\| true`(advisory)로 실행 — **신규 점검 추가 지점 확보** |
| 10 | env 로드 선례 | `grep -rn "dotenv" tests/e2e/*.ts` | 일부 spec이 `.env.local` 로드 — 환경변수 방식과 정합 |
| 11 | `scratch/` 출력 spec | `git grep -l "scratch/" ... -- tests \| wc -l` | 3 (R-13 허용 범위 — 대상 아님) |

**구조 요약**: 증적 출력은 **상수 1줄(`const DIR = 'docs/...') + `mkdirSync` + 템플릿 문자열** 구조다(45/47이 동일 패턴) → 공통 헬퍼로의 전환은 파일당 **상수 선언부 교체** 수준이다.

### 2. 범위 확정 — **(나) 47개 전체 전환**을 제안

**제안: (나)** — `tests/e2e`의 저장소 내 증적 출력 spec **47개 전체**를 공통 헬퍼로 전환한다(부수로 `tests/e2e/screenshots/` 출력 2개도 동일 헬퍼에 편입 — 아래 범위 질문).

**근거**:
1. **재유입 가드의 유효성**: L1 런타임 가드는 헬퍼를 쓰는 spec에만 작동한다. (가)로 부분 전환하면 미전환 spec이 저장소에 계속 쓰므로 가드가 **경고 모드에 머물거나** 미전환 spec 실행이 깨진다 → "재유입 0"이라는 이슈 목표를 부분으로만 달성한다.
2. **전환 공수가 패턴으로흡수**: 45/47이 동일 상수 패턴(38·2·2번 표) → 파일당 선언부 1줄 + import. 인라인 소수(5)만 추가 처리.
3. **R-13 개정 문안 단일화**: 부분 예외("보안 계열 spec만 저장소 밖")는 예외 범위를 spec 분류 기준으로 지속 관리해야 해 개정 문안이 복잡해진다. 전체 전환은 "E2E 원본 증적은 저장소 밖" 한 문안으로 끝난다.
4. **레거시 spec 리스크 낮음**: 실행 여부와 무관하게 문자열 1줄만 바뀌는 변경이고 `tsc`·전체 회귀로 커버된다.
5. **기존 증적 불변(이연 준수)**: 커밋된 481건은 건드리지 않고, "이후 새로 생기는 출력"만 저장소 밖으로 보낸다.

**(가)를 채택하지 않는 이유**: 당장의 리스크 큰 계열만 막는 즉효성은 있으나, 가드 구조가 전환/미전환 이중으로 남아 관리 비용이 크다. 만약 Aiden·Jaison이 리뷰 부담을 이유로 단계안을 원하면: **1차 (가) + L2를 경고 모드로 시작 → 2차 잔여 전환**의 단계안으로 조정 가능하나, 권장은 (나) 일괄이다.

**범위 질문(설계 확정 시 확인)**: `tests/e2e/screenshots/`(추적 PNG 23) 출력 2 spec도 동일 헬퍼로 편입할지 — 이슈 본문의 `docs/99_Manual` 표기에는 없으나 성격상 같은 증적이라 **편입 제안**.

### 3. 공통 출력 경로 방식 — 헬퍼 1종

- **신규 `tests/e2e/evidence-dir.ts`**: `evidenceDir(name: string): string` 반환.
  - 해석 순서: ① `process.env.E2E_EVIDENCE_DIR`(설정 시 이 경로 아래에 `name` 부착) → ② **미설정 시 저장소 밖 기본 위치**(OS 임시 디렉토리 기반으로 동적 계산 — **절대경로 하드코딩 금지**, R-21).
  - `mkdirSync(..., { recursive: true })` 내장 → spec의 mkdir 호출은 헬퍼가 흡수(불변으로 둬도 무방).
  - **저장소 내부 경로 검증**: 해석된 최종 경로가 저장소 안이면 **throw**(재유입 L1 가드). 저장소 루트 판정은 하드코딩 없이 실행 위치 기준으로 계산.
  - `.env.local` 자동 로드(기존 dotenv 선례 정합) — 설정 수단: 로컬 `.env.local` / CI secret / 셸 환경변수.
- **spec 전환 형태**: `const DIR = 'docs/99_Manual/E2E_B371_Result';` → `const DIR = evidenceDir('E2E_B371_Result');` (상수명·파일명·하위경로 유지 → 문서의 기존 인용과 파일명은 불변).

### 4. 재유입 방지 — 3층 (경고 + 차단 조합)

| 층 | 장치 | 동작 | 성격 |
|:-:|:--|:--|:--|
| **L1** | 헬퍼 런타임 가드 | 해석 경로가 저장소 내부면 **throw** (실행 즉시 실패) | **차단** (전환 후 사실상 유일한 유입 경로를 봉쇄) |
| **L2** | 신규 `scripts/check-evidence-escape.mjs` + `npm run check:evidence` + `pr-checks.yml`에 advisory 추가(기존 `node ... \|\| true` 패턴) | `git status --porcelain` 기준 **신규·변경** 파일을 대상 범위에서 탐지 → **명령 형태와 건수만** 보고 | **경고** (수동·비-E2E 경로의 유입 탐지) |
| **L3** | `.gitignore` 보완 | 대상 범위의 **미추적 신규 파일**이 커밋 오판으로 유입되는 것을 차단 (기존 추적 481건에는 영향 없음) | **차단(안전망)** — 경고는 L2 담당 |

- **L2·L3 대상 범위(권장)**: `docs/99_Manual/E2E*_Result/**`, `docs/99_Manual/UAT*_Result/**`, `tests/e2e/screenshots/**` — 회귀 결과물(`docs/08_Self_Audit/Regression_Results/`)·`scratch/`는 R-13상 허용이므로 **범위 밖**.
- **단위 테스트(구현 단계)**: ① 헬퍼 — 저장소 내부 경로 지정 시 throw / 저장소 밖 통과 ② L2 스크립트 — 픽스처 디렉토리에 신규 파일을 만들어 경고/건수 보고, 깨끗하면 0건. (DoD의 "의도대로 경고·차단 단위 확인" 대응)

### 5. R-13 처리 — Aiden 질의안 (GOV 개정은 Aiden 전속)

**충돌**: R-13은 E2E 결과물을 `docs/99_Manual/E2E_NN_Result/`에 저장하도록 정하고, R-21 §3은 현재 접근 결과 증적의 저장소 보관을 금지한다. → **전환의 근거가 되는 개정/예외 확정이 선행**.

**질의안 (문안 초안 — Aiden 확정 후 반영)**:
- **안 A (권장 · 단서 추가)**: R-13의 "E2E 테스트" 항목에 단서를 단다 — *"원본 증적 파일(스크린샷·JSON·Excel 등)은 R-21 §3에 따라 저장소 밖(기본값, `E2E_EVIDENCE_DIR`로 지정 가능)에 출력하고, 저장소에는 요약·수치만 문서화한다."*
- **안 B (범위 재정의)**: *"R-13의 E2E 결과물 경로 규정은 요약 문서화에 적용하며, 원본 증적 파일은 R-21 §3을 따른다."*
- 두 안의 차이: 안 A는 경로 규정을 남기고 단서를 달고, 안 B는 경로 규정의 적용 대상을 요약으로 좁힌다. **문안 확정·게시는 Aiden 전속** — 본 Task는 확정 후 반영만 한다.
- **질의 위치**: 이 설계 의견(본 task file) + draft PR 본문에 기재 → Jaison 검토 → Aiden `[설계 확정]`에서 문안 확정.

### 6. 기존 증적 인용 규칙 (제안만 — 범위 밖 확인)

- 저장소 문서가 **전환·삭제된 원본 증적**을 인용할 때는 **"증적: 비공개 보관"**으로 통일한다(IS #1490의 Dave 처리 형식과 동일). 규칙 채택 여부는 Aiden 확정 사항이며, 본 Task는 **규칙 제안만** 한다(기존 481건의 육안 점검·제거·인용 일괄 정리는 이연 유지).

### 7. 구현 계획 (Aiden `[설계 확정]` 이후)

1. 헬퍼 신규 + `pr-checks.yml`에 L2 점검 추가 + `.gitignore` 보완 (+ R-13 개정문 반영)
2. 47개(범위 확정치) spec 전환 — 상수 선언부 교체, `tsc`·전체 회귀로 검증
3. **단위 테스트**: 헬퍼 가드(L1)·점검 스크립트(L2) 경고/차단 시나리오
4. **E2E 스모크**: 전환된 spec 1종 실행 → ① 저장소 밖 출력 확인 ② **실행 후 `git status` 신규 추적 파일 0건** (DoD)
5. R-09 회귀 항목 등재 + 전체 회귀 PASS(R-08) + R-10 error-logs 無
6. PR: `Refs #1513`, base `TeamB_Dev`, Squash

## [DoD] (설계 의견 단계)

- [x] 착수 절차 (worktree·rebase·채번·`status:draft`)
- [x] 실측: 대상 47spec·패턴·저장소 내 증적 경로·CI 점검 지점 (명령 형태·건수만)
- [x] 범위 제안 **(나) 전체 전환** + 근거 + (가) 미채택 사유
- [x] 공통 방식: `E2E_EVIDENCE_DIR` 헬퍼(기본값 저장소 밖·절대경로 하드코딩 금지·내부 경로 throw)
- [x] 재유입 방지 3층(L1 차단·L2 경고·L3 안전망) + 단위 테스트 계획
- [x] R-13 질의안(안 A/B 문안 초안) 기재 — Aiden 확정 요청
- [x] 기존 증적 인용 규칙("증적: 비공개 보관") 제안(범위 밖 선언)
- [ ] task file 커밋 → `[작업 결과]` 해시(별도 커밋) → draft PR(`Refs #1513`) → `gh pr checks`

## [작업 결과]

_(커밋 후 기재)_

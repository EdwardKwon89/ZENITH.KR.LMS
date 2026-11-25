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
| 12 | **47 spec 최초 작성자 태그 집계** | `git log --diff-filter=A --format=%s -- <파일>` 후 태그별 `uniq -c` | **Team B 18 / 그 외 29** — Aiden 집계와 **일치(차이 0건)**. 세부: Dave 9·Mike 6·Baker 2·Jaison 1 / Gemini 12·B_Kai 5·D_Kai 4·Claude 4·OpenCode 2·그 외 2 |
| 13 | **screenshots 출력 2 spec 소유** | 동일 `git log --diff-filter=A` | `r10-corporate-info-real-column` = **[Baker]**(Team B) · `e2e-20-order-service-selection` = **[B_Kai]**(Team A) — 47 목록 **외부**(별도 경로 출력) |
| 14 | **대상 폴더류 존재·건수** | `git ls-files docs/99_Manual/ \| awk/uniq -c` | `E2E_*` **54폴더·증적 357** · `UAT_*` 5·44 · `TASK-*` 3·12 · `AUDIT_*` 2·7 · `FEAT_*` 2·3 → **5종 전부 존재** |
| 15 | **요약 `.md`·원본 증적 건수** | `git ls-files ... \| grep -c` | 추적 `.md` **16**(Aiden 수치 일치 · `E2E_*` 내부 10 포함) · 원본 증적 확장자 **425** |

**구조 요약**: 증적 출력은 **상수 1줄(`const DIR = 'docs/...') + `mkdirSync` + 템플릿 문자열** 구조다(45/47이 동일 패턴) → 공통 헬퍼로의 전환은 파일당 **상수 선언부 교체** 수준이다.

### 2. 범위 확정 — 방향 승인, **소유 단계안으로 조정** (Aiden 조건 1 반영)

**방향**: (나) 전체 전환은 승인. 단, **R-19 파일 소유**상 Team B가 47개 전부를 수정할 수 없으므로 **소유 단계안**으로 실행한다.

**소유 구분 표 (실측 — 최초 작성자 태그, Aiden 집계와 차이 0)**:

| 구분 | 건수 | 태그 세부 |
|:--|:-:|:--|
| **Team B 소유** (Dave·Mike·Baker·Jaison) | **18** | Dave 9 · Mike 6 · Baker 2 · Jaison 1 |
| 그 외 (Team A·구 에이전트) | **29** | Gemini 12 · B_Kai 5 · D_Kai 4 · Claude 4 · OpenCode 2 · TASK-1140 1 · BP 1 |
| **합계** | **47** | Aiden 집계(Team B 18 / 그 외 29)와 **일치 — 차이 0건** |

`screenshots/` 출력 2 spec(47 외부, 편입 승인): `r10-corporate-info-real-column` = **[Baker](Team B)** · `e2e-20-order-service-selection` = **[B_Kai](Team A)** → 위 표에 반영.

**단계안 (Edward 결정 ① 대기)**:
- **1차(이 Task)**: 헬퍼(L1) + L2 + L3 + **Team B 소유 18개** 전환 (+ `screenshots` 출력 중 Team B 소유 1건)
- **2차(별도 PR)**: 나머지 29개(+ Team A 소유 1건)는 **Aiden 소유 예외 승인 후** 기계적 일괄 변환 — **Edward 결정 대기, 승인 전 수정 금지**

**한계 명시**: L1 가드는 헬퍼를 쓰는 spec에만 작동하므로 **2차 완료 전에는 미전환 spec이 남는다**. 그 공백은 **L2(CI 경고)·L3(.gitignore 안전망)** 가 보완하는 구조로, 전환이 진행될수록 L1의 적용 비중이 커진다.

**(가)를 채택하지 않는 이유**: 당장의 리스크 큰 계열만 막는 즉효성은 있으나, 가드 구조가 전환/미전환 이중으로 남아 관리 비용이 크다. 단계안은 (나)의 방향을 **소유 경계**로 분할한 것으로, (가)의 "보안 계열 우선" 분류 기준과는 다르다(소유 기준은 재배정·리뷰 범위가 명확).

**범위 질문 → Aiden 승인 완료**: `tests/e2e/screenshots/` 출력 2 spec **편입 승인**(추적 PNG 23은 이연) — 소유는 위에 반영.

### 3. 공통 출력 경로 방식 — 헬퍼 1종

- **신규 `tests/e2e/evidence-dir.ts`**: `evidenceDir(name: string): string` 반환.
  - 해석 순서: ① `process.env.E2E_EVIDENCE_DIR`(설정 시 이 경로 아래에 `name` 부착) → ② **미설정 시 영속 기본 위치**: **사용자 홈 하위의 고정 이름 디렉토리**(OS 임시 디렉토리 방식은 재부팅·정리로 사라져 "검토·재현 기간 보관"과 맞지 않으므로 **철회**). 위치는 **동적 계산**으로만 정한다 — **절대경로 하드코딩 금지**, 실제 경로 문자열은 문서에 쓰지 않는다(R-21).
  - `mkdirSync(..., { recursive: true })` 내장 → spec의 mkdir 호출은 헬퍼가 흡수(불변으로 둬도 무방).
  - **저장소 내부 경로 검증**: 최종 경로를 **`realpath`로 해석한 뒤** 저장소 안이면 **throw**(재유입 L1) — 심볼릭 링크로 우회한 저장소 내부 기록을 막는다. 저장소 루트는 실행 위치 기준으로 동적 계산하며, **워크트리마다 루트가 다르다**는 점을 반영한다(하드코딩 금지).
  - `.env.local` 자동 로드(기존 dotenv 선례 정합) — 설정 수단: 로컬 `.env.local` / CI secret / 셸 환경변수.
- **spec 전환 형태**: `const DIR = 'docs/99_Manual/E2E_B371_Result';` → `const DIR = evidenceDir('E2E_B371_Result');` (상수명·파일명·하위경로 유지 → 문서의 기존 인용과 파일명은 불변).

### 4. 재유입 방지 — 3층 (경고 + 차단 조합)

| 층 | 장치 | 동작 | 성격 |
|:-:|:--|:--|:--|
| **L1** | 헬퍼 런타임 가드 | 해석 경로가 저장소 내부면 **throw** (실행 즉시 실패) | **차단** (전환 후 사실상 유일한 유입 경로를 봉쇄) |
| **L2** | 신규 `scripts/check-evidence-escape.mjs` + `npm run check:evidence` + `pr-checks.yml`에 advisory 추가(기존 `node ... \|\| true` 패턴) | **기준 SHA 대비 diff**: CI와 동일한 `git diff --name-only "$BASE_SHA"...HEAD` 방식(`pr-checks.yml`이 `fetch-depth: 0`로 이미 쓰는 패턴 — 깨끗한 CI 체크아웃에서도 커밋된 변경을 본다)으로 대상 파일 탐지 → **명령 형태와 건수만** 보고. 로컬 실행은 작업트리 기준(`git status`)을 보조로 병용 | **경고** (수동·비-E2E 경로의 유입 탐지) |
| **L3** | `.gitignore` 보완 | **확장자 단위**(원본 증적 형식: png·json·xlsx·pdf·txt·webm 등)로만 무시 — **폴더 전체 무시 금지**(요약 `.md` 추적 **16건** 보호). 대상 폴더류는 존재 실측 기준 **5종 전부 포함**: `E2E_*_Result`(54폴더·357) · `UAT_*`(5·44) · `TASK-*`(3·12) · `AUDIT_*`(2·7) · `FEAT_*`(2·3). 이미 추적 중인 파일에는 `.gitignore`가 영향 없음(추적 481건 불변) | **차단(안전망)** — 경고는 L2 담당 |

- **L2·L3 대상 범위(권장)**: `docs/99_Manual/`의 **5종 폴더류**(`E2E_*_Result`·`UAT_*_Result`·`TASK-*_Result`·`AUDIT_*Result`·`FEAT_*Result`) + `tests/e2e/screenshots/**` — 회귀 결과물(`docs/08_Self_Audit/Regression_Results/`)·`scratch/`는 R-13상 허용이므로 **범위 밖**. 그 밖의 요약문서 폴더는 범위 밖이며, 원본 증적 형식이 섞인 경우는 L2 경고로만 확인한다.
- **단위 테스트(구현 단계)**: ① 헬퍼 — 저장소 내부 경로 지정 시 throw / 저장소 밖 통과 ② L2 스크립트 — 픽스처 디렉토리에 신규 파일을 만들어 경고/건수 보고, 깨끗하면 0건. (DoD의 "의도대로 경고·차단 단위 확인" 대응)

### 5. R-13 처리 — Aiden 질의안 (GOV 개정은 Aiden 전속)

**충돌**: R-13은 E2E 결과물을 `docs/99_Manual/E2E_NN_Result/`에 저장하도록 정하고, R-21 §3은 현재 접근 결과 증적의 저장소 보관을 금지한다. → **전환의 근거가 되는 개정/예외 확정이 선행**.

**질의안 (문안 초안 — Aiden 확정 후 반영)**:
- **안 A (권장 · 단서 추가)**: R-13의 "E2E 테스트" 항목에 단서를 단다 — *"원본 증적 파일(스크린샷·JSON·Excel 등)은 R-21 §3에 따라 저장소 밖(기본값, `E2E_EVIDENCE_DIR`로 지정 가능)에 출력하고, 저장소에는 요약·수치만 문서화한다."*
- **안 B (범위 재정의)**: *"R-13의 E2E 결과물 경로 규정은 요약 문서화에 적용하며, 원본 증적 파일은 R-21 §3을 따른다."*
- 두 안의 차이: 안 A는 경로 규정을 남기고 단서를 달고, 안 B는 경로 규정의 적용 대상을 요약으로 좁힌다. **문안 확정·게시는 Aiden 전속** — 본 Task는 확정 후 반영만 한다.

**질의 2 — R-10 증적 전달 방식 (설계 확정 전 추가 · Jaison 검토 반영)**: R-10은 완료 보고에 UI 구동 증적(스크린샷·녹화) 첨부를 요구하므로, 출력이 저장소 밖으로 나가는 경우 **검토자에게 증적을 전달하는 방식**을 R-13 안과 함께 확정해야 한다.
- **제안(한 단락)**: 저장소 밖에 출력된 증적의 검토 전달은 **기존 비공개 채널(Edward 경유)을 재사용**한다. ① **보관 위치 지정 방식** — 실행 주체가 출력 디렉토리를 정하되, 그 위치를 저장소·이슈·PR·task file에 기재하지 않고 채널로만 안내한다(공개 문서에는 "증적: 비공개 보관" 한 줄). ② **전달 경로** — 완료 보고에는 증적의 존재와 요약 수치만 남기고, 파일 목록·위치는 채널에서 전달한다. ③ **보관 기간** — 원본 증적은 검토·재현이 가능한 기간(검토 종료 + 회귀 재현 기간) 동안 보관하고, 파기 시점은 Aiden·Edward 확정 사항으로 남긴다(보관소 구성·접근 방식은 이 Task 범위 밖인 Edward·Aiden 영역을 그대로 따른다).
- 실제 경로·보관 위치는 본 문서에 기재하지 않는다(R-21).
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

### 8. Edward 결정 대기 (Mike 조치 불요 — 결정 전 `[설계 확정]` 미기록)

| # | 결정 항목 | 상태 |
|:-:|:--|:-:|
| ① | **범위 단계안** — 1차 Team B 소유 18개(+screenshots Team B 1건) 전환 / 2차 29개(+Team A 1건)는 Aiden 소유 예외 승인 후 일괄 | **대기** |
| ② | **R-13 개정(안 A 권장)** — 문안은 Aiden이 GOV 개정으로 작성, 승인·시행 | **대기** |
| ③ | **R-10 증적 전달 방식**(질의 2: 기존 비공개 채널 재사용) 승인 + **보관 기간 파기 시점** | **대기** |

> 결정 전달은 JSJung 경유. 본 Task는 문서 수정 한정이며 `tests/e2e/` 헬퍼·spec·`.gitignore`·`pr-checks.yml`은 `status:ready` 전에 수정하지 않는다.

## [DoD] (설계 의견 단계)

- [x] 착수 절차 (worktree·rebase·채번·`status:draft`)
- [x] 실측: 대상 47spec·패턴·저장소 내 증적 경로·CI 점검 지점 (명령 형태·건수만)
- [x] 범위 제안 **(나) 전체 전환** + 근거 + (가) 미채택 사유
- [x] 공통 방식: `E2E_EVIDENCE_DIR` 헬퍼(기본값 저장소 밖·절대경로 하드코딩 금지·내부 경로 throw)
- [x] 재유입 방지 3층(L1 차단·L2 경고·L3 안전망) + 단위 테스트 계획
- [x] R-13 질의안(안 A/B 문안 초안) 기재 — Aiden 확정 요청
- [x] R-10 증적 전달 방식 질의 추가(지정 방식·전달 경로·보관 기간 — 제안 한 단락) · §1 표 번호·띄어쓰기 정정 (Jaison 검토 반영)
- [x] 기존 증적 인용 규칙("증적: 비공개 보관") 제안(범위 밖 선언)
- [x] **Aiden 조건부 확정 조건 1~4 반영**: ① 소유 단계안(18/29 표·차이 0·screenshots 소유·한계 서술) ② L2 diff 기준(`BASE_SHA...HEAD`) ③ L3 확장자 단위 범위(폴더 5종 실측 표) ④ 영속 기본 위치+`realpath` 판정 — Edward 결정 3건 "대기" 표기 포함
- [x] task file 커밋 → `[작업 결과]` 해시(별도 커밋) → draft PR(`Refs #1513`) → `gh pr checks`

## [작업 결과]

### 착수 절차 실측 (R-17)
```bash
① agent-worktree-init · fetch/rebase origin/TeamB_Dev (7fcd1bbc7 = IS #1490 JSON 정리 병합본)
② ls .agent/tasks | grep B-385 → 없음(신규) · next-task-number → TASK-B-386 (이슈 확정번호 B-385)
③ 브랜치 feature/teamb-task-b385-iss1513-e2e-evidence-outside-repo · check-db-freshness OK
④ gh issue edit 1513 --add-label status:draft --remove-label status:open
```

### 산출물
- **설계 의견**(본 문서) — 실측 11종(명령 형태·건수만) · 범위 제안 **(나)** · 공통 헬퍼 방식 · 재유입 3층 가드 · **R-13 질의안(안 A/B)** · 인용 규칙 제안
- 구현 **미착수**(Aiden `[설계 확정]` 대기)

### 코드(문서) 커밋
- `f0f11776119a1d7644f3ee77c8dc2800a06fab89` (설계 의견 문서)

### 설계 검토 반영 (Jaison, 2026-11-25)
- 반영 커밋: `980809bc07604e17d4c6284fd0f50e910a7ad56c` (문서 1커밋)

1. **R-10 증적 전달 방식**을 §5 Aiden 질의에 추가(보관 위치 지정 방식·전달 경로·보관 기간 — 제안 한 단락, 실제 경로 미기재)
2. §1 표 번호 참조를 실제 표 번호(1·2·3번)로 정정 · 본문 띄어쓰기 오류 1건 정정
3. `tests/e2e/screenshots/` 편입 제안 — 타당 확인(최종 판단은 Aiden), draft 유지

### Aiden 조건부 확정 반영 (2026-11-25, Jaison 조건 전달)
- **실측 집계**: 47 spec 최초 작성자 태그 → **Team B 18 / 그 외 29 (Aiden 집계와 차이 0건)** · screenshots 2 spec 소유 = [Baker](Team B) / [B_Kai](Team A) · 폴더 5종 존재(E2E 54·UAT 5·TASK 3·AUDIT 2·FEAT 2폴더) · 추적 `.md` 16(일치) · 원본 증적 425건
- **반영**: §1 표(행 12~15)·§2 소유 단계안·§3 영속 기본 위치+`realpath`·§4 L2 diff 기준·L3 확장자 범위·§8 Edward 대기 3건
- 반영 커밋: `<PLACEHOLDER>`

### 다음 절차
draft PR(`Refs #1513`) → Jaison diff 검토 → **Aiden `[설계 확정]`**(R-13 문안 확정 포함) → 구현 착수.



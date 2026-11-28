# TASK-B-385 (구현) — E2E 증적 출력 경로 저장소 밖 전환: 헬퍼·L2·L3·Team B 소유 19개 전환 (#1513)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1513](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1513) · Jaison 배정 Mike · 검증 Jaison · p2 · `status:in-progress` |
| 설계 | PR #1515 `[설계 확정]`(Aiden, 2026-11-25) — Edward 결정 ①②③ 확정 반영 |
| 브랜치 | `feature/teamb-task-b385-iss1513-evidence-outside-impl` (base: `origin/TeamB_Dev` `9fee50388`) |
| 상태 | 🔄 진행 중 |
| **병합 조건** | **GOV v3.14(R-13·R-10 개정)가 먼저 병합**되어야 함(Aiden 확정 정의 5 — Aiden이 Edward 승인 후 GOV PR 진행) |

> R-21 준수: 실제 경로·값·자격증명은 본 문서에 기재하지 않습니다(기본 위치도 "홈 하위 고정 이름 영속 위치"로만 서술).

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "B-385"   # → 설계 file 존재(병합됨) — 구현 file 신규
./scripts/next-task-number.sh B     # → TASK-B-387 (이슈 확정번호 B-385 사용)
```

## [목표] (설계 확정 범위)

공통 헬퍼(`E2E_EVIDENCE_DIR`·홈 하위 영속 기본 위치·`realpath` 검증·내부 경로 throw) + **L2** 점검(`check:evidence`, 기준 SHA diff, advisory) + **L3** `.gitignore`(확장자 단위·예외 패턴) + **Team B 소유 spec 18개 전환** + `tests/e2e/screenshots/` 출력 1개(Baker 소유) 편입 + 단위 테스트 13건 + E2E 스모크.

## [범위]

- **신규**: `tests/e2e/evidence-dir.ts`(L1 헬퍼) · `scripts/check-evidence-escape.mjs`(L2) · 단위 테스트 3종 · R-09 회귀 항목 · 본 task file
- **수정**: spec **19개**(Team B 18 + Baker 소유 screenshots 1 — 소유는 설계 §2 표 기준) · `.gitignore`(L3 블록) · `.github/workflows/pr-checks.yml`(advisory job) · `package.json`(`check:evidence`)
- **하지 않는 것**: Team A·구 에이전트 소유 29(+1)개(2차 — **Edward/Aiden 소유 예외 승인 대기**) · `ZenDataGrid`·로직·단언 변경 · GOV 개정(Aiden 전속) · `scratch/`(R-15)

## [지켜야 할 것]

- **R-19 소유**: 1차 전환은 **Team B 소유 18 + Baker 소유 1** 한정 (2차는 승인 후 별도 PR)
- **R-21**: 코드에 절대경로 하드코딩 금지(동적 계산), 문서에 경로·값 미기재, 보고는 명령 형태·건수만
- **R-09**: 단위 테스트로 L1·L2·L3 가드 검증 + **되돌리기 실측**(각 가드 무효화 시 FAIL)
- **R-10**: E2E 스모크 시 `/admin/error-logs` 신규 ERROR 無
- **R-08**: 전체 회귀 PASS · R-21 자가 grep · PR `Refs #1513`(Squash, base `TeamB_Dev`)

## [R-20 영향도] — GitNexus CLI 미설치 → grep 전수

| 항목 | 결과 |
|:--|:--|
| 전환 spec | **19개** — 상수 1줄(`const X = 'docs/99_Manual/...'`) 교체 + import 삽입 (Baker spec은 인라인 3경로 → const화) |
| 로직·단언 변경 | **0** (경로 상수 한 줄만 — 2차 예외 범위와 동일 기준) |
| tsc | 전체 오류 **217 = baseline 동일 → 신규 0** (헬퍼·테스트 포함) |

## [작업 결과]

- 코드 커밋: `9d5c58ab3f45bcb797702894286fc80fe73fbb22`

### 착수 절차 실측 (R-17)
```bash
① fetch/rebase origin/TeamB_Dev (9fee50388 — 설계 PR #1515·B-383 설계 병합본)
② 채번: 설계 file 존재(B-385 확정) · next-task-number → TASK-B-387
③ 브랜치 feature/teamb-task-b385-iss1513-evidence-outside-impl · check-db-freshness OK
④ gh issue edit 1513 --add-label status:in-progress --remove-label status:ready
⑤ 선행 확인: PR #1515 [설계 확정](Edward 결정 ①②③ 포함) · GOV v3.14 병합을 병합 조건으로 기재
```

### 구현 (설계 확정 범위 내 — 로직·단언 변경 0)
| 구성 | 내용 |
|:--|:--|
| **L1 헬퍼** `tests/e2e/evidence-dir.ts` | `E2E_EVIDENCE_DIR` → 미설정 시 **홈 하위 고정 이름 영속 위치(동적 계산)** · `realpath`(존재하지 않는 하위까지) 해석 · 저장소 루트는 cwd 기준 동적(워크트리마다 상이) · 저장소 내부면 **throw**(메시지에 절대경로 미기재) · `mkdirSync` 내장 · `.env.local` 로드 |
| **L2 점검** `scripts/check-evidence-escape.mjs` + `npm run check:evidence` + `pr-checks.yml` advisory job | CI: **`BASE_SHA...HEAD` diff**(`fetch-depth: 0` 동일 패턴) / 로컬: 작업트리(`git status`, `core.quotepath=false`) · 대상(=L3 범위)×원본 증적 확장자 필터 → **건수+상대경로 경고(exit 1, advisory로 경고만)** |
| **L3 `.gitignore`** | **확장자 단위**(png·json·xlsx·pdf·txt·webm) × `docs/99_Manual/*_Result/**` + `tests/e2e/screenshots/**` · **예외 패턴(`!`)** (.md·summary·README) · 폴더 전체 무시 금지 |
| **spec 전환 19개** | Team B 소유 18 + Baker 소유 screenshots 1 — `const X = 'docs/...' → evidenceDir('...')` 한 줄 + import (Baker spec은 인라인 3경로 → const화). **로직·단언 변경 0** |
| **단위 테스트 3종** | L1 5 · L2 4 · L3 4 = **13건** |

### R-10 완료 보고 (Jaison 검토 반영 — GOV v3.14 문구)

- **스모크 증적: 존재 확인** — e2e-33 스모크(2026-11-25 실행)의 출력 증적 저장소 밖 보관 확인, 파일 **4건**(요약 수치) · **증적: 비공개 보관**
- **전달**: 기존 비공개 채널(Edward 경유 → JSJung)로 전달 대상 — 경로·파일명·값은 공개 문서에 미기재
- **파기 절차**: **Aiden의 R-01 "증적 확인" 코멘트 게시 후** 저장소 밖 보관본·전달 사본을 파기하고 **"파기 완료" 한 줄**(경로·내용 비기재)로 보고 — 재현 근거(결함·보안 건)는 즉시 파기 제외(Aiden·Edward 건별 지정)

### 검증 (전부 실측)
- **단위 테스트 13/13 PASS** · **되돌리기**: R1(헬퍼 throw 무효화) **1F/4P** · R2(L2 필터 무효화) **2F/2P** · R3(L3 블록 제거) **1F/3P** → 원복 후 **13/13**
  - 부수 발견: R1 런이 저장소 안에 남긴 임시 디렉토리가 기준선 1건을 오염 → 정리 + **afterEach 방어 정리 추가** 후 재측정(오염 자체를 차단)
- **E2E 스모크** (e2e-33) **1/1 PASS** (46.5s) — 출력 **저장소 밖**(기본 위치, 건수만 기재) · 실행 후 `git status` 신규 추적 **0건** · `zen_error_logs` delta **0** · 추적 증적 **481 → 481 불변**
- `npx tsc --noEmit` **217 = baseline 동일 → 신규 0**
- `npm run test:regression` → **301 files / 2,295 tests 전부 PASS** · `npm run build` → **exit 0** (8.5s)
- `check:ds11`·`check:lrtm`·`check:doc-links`·`check:audit`·`check:evidence` 전부 OK
- **R-21 자가 grep**: 절대경로(하드코딩) 0 · 자격증명 0 · 실이메일 0 — 기본 위치는 `os.homedir()` 동적 계산 1곳

### Jaison 검토 반영 (2026-11-25 — 필수 1~3 + 비차단)

**필수**:
1. **`.gitignore` 예외 우회 차단** — 이름 한정 예외(`summary*`·`README*`) 제거, `!...*.md` 한정 유지 + 주석화 · **확인 테스트 추가**(`summary.json`·`README.json`·`summary_x.png`가 무시됨)
2. **추적 영향 없음 테스트 실측화** — 항등식 제거 → `git ls-files -ci --exclude-standard` **비공집합 실측 + 그 파일이 `git ls-files`에 유지**를 단언
3. **R-10 완료 보고 문구**(상단 신설) — 존재·요약 수치·확인 일시 + `증적: 비공개 보관` + 전달(JSJung 경유) + 파기 절차(Aiden R-01 확인 → "파기 완료" 한 줄)

**비차단 반영 여부**:

| 항목 | 반영 | 내용 |
|:--|:-:|:--|
| R1 지점별 해석 | ✅ | 지점별 단독 무효화는 **나머지 지점이 방어해 5/5 PASS**(중복 방어), **3곳 동시 무효화 시 3건 FAIL** 실측 — 사후 검증이 던지기 전에 `mkdirSync`가 저장소 안에 디렉토리를 만들 수 있음(R1 오염 원인 → afterEach 방어 정리로 커버) |
| L2 정밀도 | ✅ | `--diff-filter=d`(삭제=정리 제외) · 로컬 `--untracked-files=all`(미추적 폴더 내 파일 포함) · 확장자 **jpg·jpeg·mp4·csv 추가** — 대상 범위 실측 **0건**이나 형식상 발생 가능 → **선제 포함, L2=L3 동일** |
| 작업트리 의존 테스트 | ✅ | 제거 → **CI 모드 `changedFiles({baseSha:'HEAD'})` 결정적 테스트**로 대체 |
| L3 테스트 저장소 프로브 | ✅ | **임시 git 저장소 복제본**(`git init` + `.gitignore` 복사)으로 이관 — 실작업트리 쓰기 0 (추적 실측 테스트만 읽기 전용 실측) |
| check-R17-DoD | ✅ | 자가 점검 전항목 통과 (DoD 7/7 · TBD/손상 토큰 0 · 절대경로 0) |

**회귀 재측정(반영 후)**: 단위 **14/14 PASS**(L1 5 · L2 4 · L3 5) · R3 재측정 **2 failed / 3 passed**(우회·추적 실측 테스트가 민감) → 원복 14/14 · 전체 회귀 **301 files / 2,296 tests PASS** · build exit 0

### 발견 이슈
없음 (2차 대상 30개는 소유 예외 승인 대기 — 범위 밖 준수).

### 병합 조건
**GOV v3.14(R-13·R-10 개정) 선행 병합** 후 병합(Aiden 확정 정의 5) — PR에 기재.

## [DoD]

- [x] 공통 헬퍼 신규 — `E2E_EVIDENCE_DIR` → 미설정 시 홈 하위 영속 위치(동적 계산) · `realpath` 검증 · 저장소 내부 **throw**(L1)
- [x] L2 `check:evidence` 신규 — 기준 SHA 대비 diff(CI `fetch-depth: 0` 패턴)·로컬 작업트리 보조 · advisory job 추가
- [x] L3 `.gitignore` — 확장자 단위(png·json·xlsx·pdf·txt·webm) + `..._Result` 5종 폴더류 + screenshots + **예외 패턴(`!`)** · 폴더 전체 무시 금지(.md 보호)
- [x] Team B 소유 **18개 + Baker 1개 = 19개 전환** (2차 30개는 소유 예외 승인 대기)
- [x] 단위 테스트 **13/13 PASS** (L1 5 · L2 4 · L3 4) + **되돌리기 실측 R1·R2·R3 각 FAIL → 복원 13/13**
- [x] E2E 스모크(e2e-33) **1/1 PASS** — 저장소 밖 출력 · 실행 후 `git status` 신규 추적 **0건** · error-logs delta 0 · 추적 증적 481 불변
- [x] 전체 회귀 PASS(R-08) · R-09 회귀 항목 등재 · R-10 無 · R-21 자가 grep
- [x] PR `Refs #1513` (base `TeamB_Dev`, Squash) 생성 — **병합은 GOV v3.14 이후**(병합 조건 PR 본문 기재)

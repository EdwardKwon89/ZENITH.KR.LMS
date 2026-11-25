# TASK-B-385 회귀 항목 — E2E 증적 출력 경로 저장소 밖 전환 (Issue #1513, 설계 PR #1515)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | #1513 (설계 확정: PR #1515 · Edward 결정 ①②③ 반영) |
| 담당 | Mike (Worker) / Auditor: Jaison |
| 변경 | 신규 `tests/e2e/evidence-dir.ts`(L1) · `scripts/check-evidence-escape.mjs`(L2) · `.gitignore` L3 · `pr-checks.yml` advisory job · spec 19개 경로 상수 교체 · 단위 테스트 3종 |
| 검증 차원 (231 D1~D9) | `D1(정합성)`, `D7(관측성)`, `D8(자동화 가드)` |

## 회귀 항목

| TC# | 시나리오 | 기대 | 테스트 파일 | 실행 |
|:----|:---------|:-----|:------------|:----:|
| TC-385-01 | **L1 헬퍼 가드** — 미설정 기본 위치 / 저장소 내부 지정 / 상대경로 / 심볼릭 링크 우회 / 저장소 밖 통과 | 저장소 밖 통과·디렉토리 생성, 내부·우회는 **throw**(디렉토리 미생성) | `tests/unit/evidence-dir.test.ts` | CI (vitest) |
| TC-385-02 | **L2 필터·파싱** — 대상 폴더류×원본 증적 확장자 · 요약 .md 제외 · 대상 밖 제외 · porcelain(미추적·수정·이름 바꿈·한글 인용) · 실작업트리 0건 | 대상만 통과, 파싱 정확 | `tests/unit/check-evidence-escape.test.ts` | CI (vitest) |
| TC-385-03 | **L3 .gitignore 가드** — 대상 확장자 무시 / 요약 .md 보호 / 대상 밖 무시 금지 / 추적 파일 영향 없음 | 차단·보호·범위 한정 | `tests/unit/evidence-ignore.test.ts` | CI (vitest) |
| TC-385-04 | **전환 정합** — spec 19개 경로 상수 교체 후 tsc | 전체 오류 = **baseline과 동일(신규 0)** | `npx tsc --noEmit` | CI (Type Check advisory) |
| TC-385-05 | **E2E 스모크(R-10)** — 전환 spec 1종(e2e-33) 실행 | **1/1 PASS** · 출력은 저장소 밖 · 실행 후 `git status` 신규 추적 **0건** · `zen_error_logs` delta **0** · 추적 증적 481 불변 | `tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts` | **CI 미실행/수동** (Playwright) |
| TC-385-06 | CI L2 advisory job — `pr-checks.yml`의 `Evidence Escape Check` | PR diff의 증적 파일 유무와 무관하게 job 실행(advisory) | `.github/workflows/pr-checks.yml` | CI |

## 회귀 검증 (2026-11-25, 실측)

- 단위 테스트 **14/14 PASS** (L1 5 · L2 4 · L3 5 — Jaison 검토로 L3 테스트 실측화·이관 후 재집계)
- E2E 스모크 **1/1 PASS** (46.5s) · error-logs delta 0 · 추적 증적 481 → 481 (불변)
- `npx tsc --noEmit` **217 = baseline 동일 → 신규 0**
- `npm run test:regression` → **301 files / 2,296 tests 전부 PASS** · `npm run build` → **exit 0** (8.1s)

## 되돌리기 검증 (조건별 — 로컬만, 커밋 금지 → 원복)

| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| R1 | 헬퍼의 **내부경로 throw 2곳 무효화** | **1 failed / 4 passed** (L1 테스트 FAIL — 가드 민감성 실측) |
| R2 | L2 **필터 무효화**(전량 통과) | **2 failed / 2 passed** (L2 테스트 FAIL) |
| R3 | `.gitignore` **L3 블록 제거** | **1 failed / 3 passed** → (검토 반영 후 재측정) **2 failed / 3 passed** (우회 차단·추적 실측 테스트 포함 FAIL) |
| (기준선) | 원복 후 재실행 | **14/14 PASS** · 잔존 프로브 0(임시 저장소 이관) · `docs/99_Manual` 변경 0건 |

> R1 런이 저장소 안에 만든 임시 디렉토리가 기준선을 1건 오염시킨 것을 발견 → 디렉토리 정리 + **테스트 afterEach에 방어 정리**를 추가해 재측정에서 13/13을 확보했다(오염 경로를 스스로 차단한 사례 — 사전 경고 "테스트가 대상을 검증하지 못함" 대응).

**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.

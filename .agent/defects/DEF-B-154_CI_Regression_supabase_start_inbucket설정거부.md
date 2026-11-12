# DEF-B-154: CI `Regression Tests` 전 PR 실패 — `supabase start`가 `[inbucket]` 설정을 거부 (CLI `latest` 버전 드리프트)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | PR #1282(Dave, TASK-B-345) 리뷰 중 `gh pr checks 1282`에서 Regression Tests FAIL 확인 → 로그 분석 |
| **긴급도** | **High** (코드 결함 아님 — CI 인프라. 그러나 Regression Tests가 실행되지 못해 **모든 PR의 자동 회귀 검증이 무력화**) |
| **발견일** | 2026-11-12 |
| **보고자** | Jaison (Team B) → Aiden |
| **조치 상태** | 미조치 — Aiden 소유 영역(워크플로우·`supabase/config.toml`)이라 수정 보류, 보고만 수행 |

## 현상
- 런 `43230515416`(head `1a3b1e032`), `43229950767`(head `050863974`) 모두 `Regression Tests` 12~13초 만에 실패.
- 실패 단계 `Start local Supabase`:
  ```
  [inbucket] in supabase/config.toml is no longer supported. Use [local_smtp] instead.
  Try rerunning the command with --debug to troubleshoot the error.
  ##[error]Process completed with exit code 1.
  ```
- 테스트는 **한 건도 실행되지 않음**. Task File Check·Type Check(advisory)는 PASS.

## 원인
- `.github/workflows/pr-checks.yml:68-70` — `uses: supabase/setup-cli@v1` + `version: latest`. 실행 시점의 최신 CLI(신버전)가 `[inbucket]` 섹션을 폐기(`[local_smtp]`로 대체).
- `supabase/config.toml:99` `[inbucket]`가 `develop`·`TeamB_Dev` 양쪽에 그대로 존재.
- `TeamB_Dev` 마지막 성공 런 2026-10-21 → 그 이후 업스트림 CLI 변경으로 발생한 **버전 드리프트**. 저장소 변경이 원인이 아님.

## 영향 범위
- `develop`/`TeamB_Dev` 대상 **모든 PR**의 Regression Tests가 동일하게 실패(적색)할 것 — Team A/B 구분 없음.
- R-08(전체 회귀 PASS 증빙)·R-17(머지 전 실제 CI 확인) 절차가 사실상 수행 불가. 현재 Team B는 로컬 전체 회귀 + 리뷰어 독립 재검증으로 대체 중(R-08-1 준용). 이는 임시 우회일 뿐 상시 해법이 아님.
- 로컬 개발도 CLI 최신 버전을 쓰는 환경이면 `supabase start`에서 동일 오류 가능.

## 권장 조치 (Aiden 결정)
1. **근본**: `supabase/config.toml`의 `[inbucket]`를 `[local_smtp]`로 전환(포트·설정키 매핑은 신버전 문서 확인 — R-06 Context7 우선). 로컬/CI 모두 동작하는지 `supabase start` 실측.
2. **재발 방지**: `pr-checks.yml`의 `version: latest`를 **검증된 특정 버전으로 고정**하고 CLI 업그레이드는 별도 PR로 의도적으로 수행.
3. 해소 후 이미 실패로 남은 오픈 PR(#1282 머지분 포함, 신규 #1278·#1279 PR)은 재실행 필요.
4. 1·2 중 하나라도 먼저 적용하면 즉시 복구 가능 — 급하면 2(버전 고정, 한 줄)가 가장 빠름. 단 고정할 버전은 config.toml이 통과하는 마지막 버전을 확인해야 함.

## 임시 대응 (Team B)
- #1282는 로컬 전체 회귀(1687 passed)·build·리뷰어 독립 재검증으로 **TeamB_Dev에 머지**(JSJung 승인, 2026-11-12). `develop` 머지 시 Aiden이 CI 상태를 재확인해야 함.

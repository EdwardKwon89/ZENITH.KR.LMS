# DEF-069 — CI `supabase db reset --no-confirm` 플래그 제거 오류

| 항목 | 내용 |
|:----|:----|
| **DEF#** | DEF-069 |
| **발견일** | 2026-06-19 |
| **발견자** | Aiden (Edward 보고) |
| **긴급도** | High |
| **상태** | ✅ 수정완료 |

## 발견 경위

PR CI 실행 시 `supabase db reset --no-confirm` 명령이 실패하여 전체 PR이 UNSTABLE 상태.  
`.github/workflows/pr-checks.yml` line 27에서 발생.

## 현상

```
supabase db reset --no-confirm
# error: unknown flag: --no-confirm
```

`supabase/setup-cli@v1`이 `version: latest`로 설치하면서 CLI v2.x 이상이 설치됨.  
CLI v2.x에서 `--no-confirm` 플래그가 제거되고 `--yes`로 대체됨.

## 영향 범위

- **모든 PR CI**: `pr-checks.yml` → `regression` job 전체 실패
- **Regression 단계 블록**: migration·seed 단계에서 블록되어 이후 빌드·테스트 미실행

## 조치 내용

```yaml
# Before (broken)
run: supabase db reset --no-confirm

# After (fix)
run: supabase db reset --yes
```

**수정 파일**: `.github/workflows/pr-checks.yml` line 27  
**수정 커밋**: (아래 커밋 참조)

## 권장 조치 (추가)

재발 방지를 위해 `version: latest` → 고정 버전(예: `version: 2.x.x`) 전환 검토.  
현재는 `--yes` 플래그 수정으로 즉시 대응 완료.

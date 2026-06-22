# TASK-B-016 — CI pr-checks.yml .env.local 생성 버그 수정

> **TASK-ID**: TASK-B-016
> **생성일**: 2026-06-22
> **발령자**: Aiden (Issue #72)
> **담당 Agent**: Jaison (Claude)
> **우선순위**: High
> **관련 Issue**: [#72](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/72)
> **브랜치**: `feature/teamb-task-b-016-ci-env-fix`
> **상태**: 🔔

---

## [업무 개요]

PR#66/#67 CI에서 `SUPABASE_SERVICE_ROLE_KEY is required` 오류가 반복 발생.
원인은 `.github/workflows/pr-checks.yml`의 `.env.local` 생성 스텝 버그 2건:
1. `supabase status | grep | awk` 파이프라인 — 출력 포맷 불일치/타이밍으로 빈 문자열 반환
2. heredoc 10칸 들여쓰기 — `.env.local` 각 줄 앞에 공백 prefix → dotenv 키 인식 실패

---

## [전제조건]

없음 (CI 인프라 수정)

---

## [구현 명세]

### 수정 파일
- `.github/workflows/pr-checks.yml` — `Create .env.local for tests` 스텝

### 변경 내용

```yaml
# 수정 전 (버그)
ANON_KEY=$(supabase status | grep 'anon key' | awk '{print $NF}')
SERVICE_KEY=$(supabase status | grep 'service_role key' | awk '{print $NF}')
cat > .env.local <<EOF
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  ← 들여쓰기 공백
    ...
EOF

# 수정 후
ANON_KEY=$(supabase status --output env | grep ANON_KEY | cut -d= -f2)
SERVICE_KEY=$(supabase status --output env | grep SERVICE_ROLE_KEY | cut -d= -f2)
printf "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n" > .env.local
printf "NEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$ANON_KEY" >> .env.local
printf "SUPABASE_SERVICE_ROLE_KEY=%s\n" "$SERVICE_KEY" >> .env.local
```

---

## [ZEN_A4 준수 사항]

- CI 워크플로우 파일 수정 — 소스코드 변경 없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 1차 | `7259d32` — `supabase status --output env` + printf 방식 |
| 코드 커밋 2차 | `983c392` — Aiden 피드백 반영: jq 방식으로 교체 (단일따옴표 포함 이슈 해결) |
| 수정 파일 | `.github/workflows/pr-checks.yml` |
| IMP | IMP-131 |
| DEF 발견 | DEF-071 (zen_rate_cards service_role GRANT 누락) — R-18 보고 완료 |

---

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-071 | zen_rate_cards service_role GRANT 누락 | High | `.agent/defects/DEF-071_zen_rate_cards_service_role_grant_누락.md` |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-22 | Jaison (Claude, Team B) | Task 발령 및 수정 완료 — Issue #72 Aiden 지시 반영 |

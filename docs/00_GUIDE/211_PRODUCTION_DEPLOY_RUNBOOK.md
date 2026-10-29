---
tags: ["procedure"]
---

# [211] 프로덕션 배포 실행 런북 (IMP-179)

> **프로젝트:** ZENITH_LMS
> **문서번호:** 211
> **작성자:** Aiden (Claude, ZEN_CEO)
> **작성일:** 2026-10-29
> **대상:** 배포를 실행하는 에이전트·운영자
> **관련:** [209 Vercel 배포 SOP](./209_VERCEL_DEPLOYMENT_SOP.md)(규정) · IMP-179 · R-19(develop→main 은 Aiden 전속)

**209는 "무엇을·왜" 규정이고, 본 문서는 "어떤 순서로 무엇을 확인하며 실행하는가"의 체크리스트다.**
2026-10-29 TASK-B-343 배포에서 실제로 겪은 장애 3건(§6)을 단계마다 게이트로 반영했다. 모든 게이트는 **통과 증거(출력값)를 보고에 인용**한다 — "확인했다"는 서술은 증거가 아니다.

---

## 0. 대원칙 (이것만은 어기지 않는다)

1. **배포는 Edward의 명시적 지시가 있을 때만** 실행한다. 병합 승인과 배포 승인은 별개다.
2. **`vercel --prod`는 원격 `main`이 아니라 실행한 로컬 디렉토리를 올린다.** 공유 체크아웃에서 직접 실행 금지 — 반드시 `origin/main` 격리 worktree에서 실행한다 (209 §4).
3. **원격 Supabase는 Pilot 실데이터다.** `db reset` 절대 금지, 배포 전후 row count를 증적으로 남긴다.
4. 막힌 명령(권한 거부)은 **우회하지 말고 멈추고 보고**한다.

---

## 1. 배포 전 게이트 (G1~G5)

| # | 확인 | 명령 | 통과 기준 |
|:-:|:-----|:-----|:----------|
| G1 | 릴리즈 PR(`develop→main`) CI | `gh pr checks <PR>` | Regression Tests `pass` (`pending`이면 대기, `fail`이면 §6-A) |
| G2 | main 병합 완료 | `gh pr view <PR> --json state,mergeCommit` | `MERGED` + 병합 커밋 해시 **기록** |
| G3 | develop·main 코드 동일 | `git diff --stat origin/main origin/develop` | 출력 없음 (해시만 다르고 트리는 같아야 함) |
| G4 | 밀린 마이그레이션 | `supabase link --project-ref ayowrwmufagzstqiqrnj && supabase migration list` | 로컬·원격 열 불일치 없음. 있으면 **중단 후 209 §2 데이터 보전 절차** |
| G5 | 롤백 대상 기록 | `vercel ls --prod` | 현재 Ready 인 프로덕션 배포 URL 1건을 보고에 기록 |

### 배포 전 기준선 (row count)
```bash
vercel env pull <scratch>/prod.env --environment=production --yes >/dev/null 2>&1
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' <scratch>/prod.env | sed -E 's/^[A-Z_]+="?//; s/"?$//')
KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' <scratch>/prod.env | sed -E 's/^[A-Z_]+="?//; s/"?$//')
for t in zen_orders profiles zen_invoices zen_error_logs; do
  curl -s -D - -o /dev/null -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Prefer: count=exact" -H "Range: 0-0" "$URL/rest/v1/$t?select=*" | grep -i '^content-range'
done | tee <scratch>/rowcount_before.txt
rm -f <scratch>/prod.env      # 키가 담긴 임시 파일은 즉시 삭제, 출력·로그에 키 노출 금지
```

---

## 2. 배포 실행 (격리 worktree)

```bash
git fetch origin
WT=<scratch>/wt-deploy
git worktree add --detach "$WT" origin/main
cd "$WT"

git rev-parse --short HEAD                  # ★ G2에서 기록한 main 병합 커밋 해시와 일치해야 함 — 불일치 시 즉시 중단
grep -c '<이번 변경의 식별 가능한 심볼>' <변경 파일>   # ★ 이번 릴리즈 코드가 실제로 들어있는지 1회 확인

mkdir -p .vercel && cp <공유 체크아웃>/.vercel/project.json .vercel/
ls .vercelignore                            # 없으면 209 §4 참조 (100MB 제한 실패)
vercel --prod --yes
```

> 공유 체크아웃의 `git status`가 `develop ... [뒤에: N]`이면 **그곳에서 배포했다면 stale 소스**다 (§6-B).

---

## 3. 배포 후 검증 (V1~V5)

| # | 확인 | 명령 | 통과 기준 |
|:-:|:-----|:-----|:----------|
| V1 | 빌드 상태 | `vercel ls --prod` | 새 배포 `● Ready` |
| V2 | alias 연결 | `vercel inspect <새 배포 URL>` | `Aliases`에 `zenith-lms-hazel.vercel.app` |
| V3 | HTTP 응답 | `curl -s -o /dev/null -w "%{http_code}\n" -L https://zenith-lms-hazel.vercel.app` | `200` (500이면 환경변수 의심 — 209 §3) |
| V4 | 데이터 보전 | §1 row count 재실행 후 전후 비교 | 4개 테이블 모두 동일 (증가는 정상 트래픽, **감소는 즉시 롤백 + Edward 보고**) |
| V5 | 신규 에러 | `zen_error_logs?created_at=gte.<배포시각 UTC>&severity=eq.ERROR` 조회 또는 `/admin/error-logs`(Admin) | 신규 ERROR 없음 (R-10 "에러 로그 확인 — 無") |

그 후 worktree 정리: `git worktree remove --force "$WT"`.

### 사후 확인 조건부 배포 시
실측 증적 없이 "사후 확인"을 조건으로 배포한 경우, **담당 Team 확인 요청 + 롤백 대상(G5) + 확인 항목**을 해당 Issue에 코멘트로 남기고 Issue는 증적이 올라올 때까지 닫지 않는다.

---

## 4. 롤백

- **롤백 대상은 G5에서 기록한 직전 Ready 배포다.**
- 코드 롤백만 가능하다. **DB 마이그레이션은 되돌려지지 않는다** — 마이그레이션이 포함된 릴리즈는 롤백 전에 Edward와 협의.
- 실행: `vercel rollback <배포 URL>` 
  > ⚠️ 본 프로젝트에서 **아직 실행해 본 적 없는 명령**이다. 첫 사용 시 `vercel rollback --help`로 옵션을 확인하고, 실행 결과(alias 재연결 여부)를 V2·V3로 검증한 뒤 이 항목을 실측 기준으로 갱신한다.
- 롤백 후에도 V1~V5를 동일하게 수행하고 사유를 IMP/DEF로 기록(R-15·R-18).

---

## 5. 보고 양식 (배포 완료 시 필수 기재)

```
## 배포 완료 (YYYY-MM-DD HH:MM KST)
- 릴리즈 PR: #NNN (병합 커밋 xxxxxxxxx)
- 배포 소스 HEAD: xxxxxxxxx  ← 병합 커밋과 일치 확인
- 배포 URL: https://zenith-xxxx...  / alias 연결: 확인
- 마이그레이션: 없음 / 적용 N건 (원격 pending 0 확인)
- 데이터 보전: 오더 N→N / 프로필 N→N / 인보이스 N→N / 에러로그 N→N
- 신규 ERROR 로그: 無 (조회 시각)
- 롤백 대상: zenith-xxxx (직전 Ready)
- 사후 확인 조건: (있으면 담당·항목·Issue 번호)
```

---

## 6. 실제 장애 사례 (2026-10-29)

### A. CI 첫 실행이 즉시 실패 — `rate limit exceeded`
- **증상**: Regression Tests 가 18초 만에 fail. 실패 단계는 `Run supabase/setup-cli@v1`, 메시지 `Failed to resolve latest Supabase CLI release: rate limit exceeded`.
- **판별**: 코드 실패가 아니라 CI 환경 순단이다 (테스트 단계에 도달하지 못함). 이전 ECONNRESET 순단과 같은 계열.
- **조치**: `gh run rerun <run-id> --failed` — 재실행 시 정상 통과(약 9분). 실패 단계 이름을 `gh run view <id> --json jobs`로 먼저 확인하고 재실행한다.

### B. 로컬 체크아웃이 그대로 배포됨 (IMP-179 본건)
- **증상**: `vercel --prod`는 성공했으나 배포 소스가 `origin/develop`보다 21커밋 뒤처진 로컬 develop. 이번 릴리즈 코드(`sanitizeComma`)가 **0건**.
- **발견**: 배포 직후 `grep -c sanitizeComma`로 누락 확인 → 약 3분 후 `origin/main` 격리 worktree 에서 재배포해 해소.
- **교훈**: §2의 HEAD 해시 일치 확인과 식별 심볼 grep 이 이 사고를 배포 **전**에 막는 게이트다.

### C. `gh pr merge --delete-branch` 의 로컬 브랜치 삭제 오류
- **증상**: PR 은 `MERGED` 인데 `failed to delete local branch ... used by worktree` 오류 출력.
- **판별**: 병합과 무관하다. 해당 브랜치를 쓰는 worktree 때문이며 `gh pr view <PR> --json state` 로 병합 여부를 별도 확인한다.
- **조치**: worktree 제거 → `git branch -D <브랜치>` → 원격 브랜치가 남았다면 `git push origin --delete <브랜치>`.

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-10-29 | Aiden | 최초 작성 — TASK-B-343 배포(PR #1272)의 실제 절차·장애 3건을 게이트화 (IMP-179) |

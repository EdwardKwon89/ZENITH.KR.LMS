---
tags: ["procedure"]
---

# [209] Vercel 원격 배포 SOP (고객 시연용)

> **프로젝트:** ZENITH_LMS
> **문서번호:** 209
> **작성자:** Aiden (Claude)
> **최종 수정일:** 2026-07-27

이 문서는 develop 브랜치의 최신 상태를 고객 시연용으로 원격 Vercel + 원격 Supabase에 배포하는 표준 절차를 정의합니다. **2026-07-27 Edward 지시로, 이 절차는 매번 자동 수행하지 않으며 Edward가 명시적으로 지시한 시점에만 실행합니다.**

## 0. 핵심 전제

- **이 Vercel 프로젝트(`zenith-lms`)는 GitHub 저장소 연동이 되어 있지 않습니다.** develop/main에 push해도 자동으로 배포가 트리거되지 않습니다 — 배포는 항상 `vercel` CLI로 수동 실행해야 합니다.
- 프로젝트 식별 정보(`.vercel/project.json`에 저장됨, 매 세션 재확인 불필요):
  - Vercel: `projectId: prj_3DkFOUBTjJGffYZGJmofCr5WFX7U`, `orgId: team_Pfa6SmZARJ5rLIqQtuF7SARO`, 프로젝트명 `zenith-lms`
  - Supabase(원격 데모): 프로젝트명 `Zenith_LMS`, ref `ayowrwmufagzstqiqrnj` (Seoul 리전)
- Production URL(고정 alias): **https://zenith-lms-hazel.vercel.app**

## 1. develop → main 병합

배포 대상 스냅샷을 main에 반영(Aiden 전속, R-19).

```bash
git checkout main && git pull origin main
git checkout -b release/develop-to-main-YYMMDD
git merge origin/develop --no-edit   # 커밋 메시지에 [Agent태그] 필수 (R-01)
git push -u origin release/develop-to-main-YYMMDD
gh pr create --base main --head release/develop-to-main-YYMMDD ...
# CI(gh pr checks) 전체 PASS 확인 후
gh pr merge <PR번호> --merge --admin --delete-branch
```

## 2. 원격 Supabase 확인 및 마이그레이션 적용

**주의**: 무료/유휴 티어 특성상 원격 Supabase 프로젝트가 **일시정지(Paused)** 상태일 수 있음 — 이 경우 CLI로는 재개 불가, Edward가 [대시보드](https://supabase.com/dashboard/project/ayowrwmufagzstqiqrnj)에서 직접 재개해야 함.

```bash
supabase link --project-ref ayowrwmufagzstqiqrnj
supabase migration list          # pending 마이그레이션 확인
supabase db push --yes           # 전체 적용
```

## 3. Vercel Production 환경변수 확인/설정

기존 환경변수가 있다면 스코프(Production/Preview)를 먼저 확인:
```bash
vercel env ls
```

필요한 4개 변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`)가 Production 스코프에 없으면 추가.

> [!IMPORTANT]
> **`vercel env add NAME production` 실행 시 값을 stdin으로 파이핑하면 Vercel이 값 끝에 개행문자(`\n`)를 은연중 추가하는 버그성 동작이 있음** — 이로 인해 Supabase API가 "Invalid API key"를 반환함(2026-07-27 실제 발생 확인). **반드시 `--value` 플래그로 값을 직접 전달할 것**:
> ```bash
> vercel env add NEXT_PUBLIC_SUPABASE_URL production --value "https://ayowrwmufagzstqiqrnj.supabase.co" --yes
> ```
> 다른 환경(예: 기존 Preview)에서 값을 가져와야 하면 `vercel env pull <file> --environment=preview --git-branch=<branch>`로 받은 뒤 `--value`로 재등록. 값 확인 시 `sed -E 's/^[A-Z_]+="//; s/"$//'`로 quote만 제거(다시 pull해서 `\n` 잔존 여부 재확인 권장).

## 4. Vercel Production 배포 (CLI 직접)

```bash
vercel --prod --yes
```

> [!IMPORTANT]
> **`.vercelignore` 파일이 반드시 있어야 함** — 없으면 `.next`(로컬 빌드 캐시, 수 GB)·`.gitnexus`(100MB+) 등이 업로드되어 **"File size limit exceeded (100 MB)"**로 배포 실패함(2026-07-27 실제 발생). 저장소에 이미 커밋되어 있으므로(`/.vercelignore`) 별도 조치 불요 — 혹시 없다면 아래 내용으로 재생성:
> ```
> .next
> .gitnexus
> node_modules
> scratch
> docs
> .playwright-mcp
> tests
> supabase/migrations
> *.log
> ```

배포 후 검증:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -L https://zenith-lms-hazel.vercel.app
```
200이 아니면(500 등) 대부분 환경변수 문제 — 2단계로 돌아가 확인.

## 5. 시연용 데이터 시드 (필요 시)

`scripts/seed-local.ts`는 `SUPABASE_URL` 환경변수를 지정하면 그 대상으로 시드함(기본값은 로컬 유지).

```bash
export SUPABASE_URL="https://ayowrwmufagzstqiqrnj.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<Production 환경변수에서 가져온 값>"
npx tsx scripts/seed-local.ts
unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
```

시드 계정(전부 비밀번호 `password1234`): `admin@zenith.kr`, `manager@zenith.kr`, `agency@zenith.kr`, `sntl@zenith.kr`(SUB_ADMIN), `sntl_sub1@zenith.kr`(AGENCY), `test_shipper@zenith.kr`(AGENCY_SHIPPER) 등.

## 6. 최종 검증

Playwright 등으로 실제 로그인 → 핵심 화면(오더 목록, UPS 오더 상세, 정산 조회 등) 접속 확인 후 URL을 전달.

## 알려진 제약사항 (2026-07-27 기준)

- **DEF-130**: SNTL(SUB_ADMIN) 계정은 `/admin/ups-rates` 기준요금 조회 불가(RLS 설계상 제한) — 상품별 요금 시연은 admin/manager 계정으로 진행할 것.

---
## 📝 개정 이력
- **v1.0 (2026-07-27)**: 최초 작성 — 2026-07-27 고객 시연 배포 작업(develop 824커밋 반영) 중 겪은 실제 장애(env 개행 버그, .vercelignore 부재, Supabase 일시정지, dest_country_code 컬럼 버그) 및 해결 절차 기록

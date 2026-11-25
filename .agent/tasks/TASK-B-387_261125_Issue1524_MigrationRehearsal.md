# TASK-B-387 — 청구서관리 마이그레이션 적용 순서·롤백 로컬 왕복 리허설 (EPIC #1364) (#1524)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1524](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1524) · Jaison 배정 Mike · 검증 Jaison · p2 · 단순 Task(착수 직행) |
| 브랜치 | `feature/teamb-task-b387-iss1524-migration-rehearsal` (base: `origin/TeamB_Dev` `a9d0d8b2e`) |
| 상태 | 🔄 진행 중 |
| 연관 | EPIC #1364 — 적용 순서 초안·Aiden 검토 의견·롤백 SQL 초안 v2 |
| 원칙 | **로컬 리허설만**(R-14) · 코드 변경 없음(scratch/ 사용·커밋 금지) · 결과는 **건수·통과/실패·명령 형태만**(R-21) · 초안 SQL은 수정하지 않고 Jaison에게 보고 |

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "B-387"   # → 없음 (신규)
./scripts/next-task-number.sh B     # → TASK-B-388 (이슈 확정번호 B-387 사용)
```

## [리허설 결과 요약]

| 단계 | 결과 |
|:--|:--|
| 1. 적용 순서 (main 312 → 파일 단위 6 → 이력 repair) | **PASS** — 파일 단위 6/6, repair 6/6, 이력 318행·미적용 0 |
| 2. 롤백 왕복 (§3 → §4 전부 true → 재적용 3/3) | **PASS** — 단, 왕복 후 **b383 수정본 소실** 발견(수정 필요 후보 1) |
| 3. 앱 사용 후 롤백 (v2 행 실측) | **PASS(가설 확인)** — 스냅샷 없는 v2 행 **복원 불가** 실측 |
| 4. rollback_bak 권한 | **PASS** — anon/authenticated f · PostgREST 미노출 |
| 5. b383·시각 위치 | **PASS** — b383 위치 정합 · 신규 시각 기준 확정 |
| 최종 복원 + 스모크 | **PASS** — 이력 316·미적용 0 · 스모크 7/7·7/7 · git status 0 |

## [작업 결과]

- 문서 커밋: `<PLACEHOLDER>`

### 착수 절차 실측 (R-17)
```bash
① agent-worktree-init · fetch/rebase origin/TeamB_Dev (a9d0d8b2e)
② ls .agent/tasks | grep B-387 → 없음(신규) · next-task-number → TASK-B-388 (이슈 확정번호 B-387)
③ 브랜치 feature/teamb-task-b387-iss1524-migration-rehearsal · check-db-freshness OK
④ gh issue edit 1524 --add-label status:in-progress --remove-label status:open
```

### 집합 실측 (명령: `git diff --name-status origin/main origin/TeamB_Dev -- supabase/migrations/`)
- main/develop 마이그레이션 **각 312개** · TeamB_Dev **316개** = 312 + **전용 6개** − develop 전용 2개(미반입)
- 전용 6개는 초안 목록과 **일치** (b365·b359·b360·b378·b382·b375)

### 1. 적용 순서 리허설 — **PASS**

| 단계 | 명령(형태) | 결과 |
|:--|:--|:--|
| main 집합 준비 | develop 전용 2개 임시 반입 + TeamB 전용 6개 임시 이동 | 디렉토리 **312개** 확인 |
| base reset | `supabase db reset` | **exit 0** · 이력 **312행** |
| 파일 단위 적용 | `docker exec psql -v ON_ERROR_STOP=1 -f -` ×6 (b365→b359→b360→b378→b382→b375) | **6/6 PASS (0건 실패)** · 객체 스냅샷: 청구서 테이블 3·b378 수정본 1·b382 함수 1 |
| 이력 미기록 확인 | `supabase migration list --local` | Remote 열 공백 **6건**(psql 적용은 이력 미기록) |
| 이력 정합 | `supabase migration repair --local --status applied <version>` ×6 | **6/6 "Repaired ... => applied"** |
| 최종 list | `supabase migration list --local` | **미적용 0 · 이력 318행** |
| `db push --include-all` | — | **미사용** (Aiden 의견 1 준수) |

- **수행 중 사고·복구(정직 기재)**: (a) zsh 단어분할로1차 파일 이동이 실패해1차 reset이 전체316을 적용 → develop 전용2개 포함 재준비 후 **2차 reset으로 main 312 재정립**. (b) 임시 반입의 출력 리다이렉트가 전용6개 파일을 0바이트로 잘라냄 → `git restore --source=origin/TeamB_Dev`로 **6/6 내용 복구**(줄수 91·568·279·96·64·13 실측) 후 이어서 진행 — **git status 0건, 내용 무손실**.

### 2. 롤백 왕복 — **PASS** (수정 필요 후보 1건 발견)

| 단계 | 명령(형태) | 결과 |
|:--|:--|:--|
| §1 사전 확인 | 4종 집계 질의 | statements **0** · items **0** · settled **0** · v2_rows **0** · snapshot_rows **0** → **안전 구간 조건 충족** |
| §2-2 보조 백업 | `CREATE SCHEMA rollback_bak` + `CREATE TABLE ... AS` | 스키마 1 + 백업 테이블 **5** (전 0행) |
| §3 롤백 적용 | `psql -v ON_ERROR_STOP=1 -f` (초안 §3 원문 49줄, scratch/에 추출·커밋 안 함) | **exit 0 (오류 0건)** |
| §4 확인 질의 | 4종 | Q1 테이블 부재 **t·t·t** · Q2 orders 컬럼 **t** · Q3 actual_cost 5컬럼 **t** · Q4 함수 7개 **t**(잔존 0) → **전부 true (4/4)** |
| 재적용 | `psql -f` ×3 (b365→b359→b360) | **3/3 PASS** |
| 왕복 후 상태 대비 | 객체 집계 | 테이블 3·함수 7·b382 함수 1·b365 컬럼 5+3·b375 정책 1 **유지** — 단 **b378 수정본(role 조건) 1 → 0 소실** |

### 3. 앱 사용 후 롤백 실측 — **PASS (§5-1 가설 확인)**

| 단계 | 결과 |
|:--|:--|
| v2 행 생성 (앱과 동일한 update 구성, 스냅샷 NULL) | v2행 **1** · 스냅샷 NULL행 **1** |
| §3 롤백 재실행 | **exit 0** |
| 롤백 후 측정 | v2 5컬럼 잔존 **0** · 행 잔존 **1** · `_hkd` 4컬럼+구 환산율 값 **불변=true**(체크섬 대조, 값은 미기재) |
| 스냅샷 복원 UPDATE 시도 | **오류(스냅샷 컬럼 부재)** → **복원 불가 확인** — 스냅샷 없는 v2 행은 이 롤백으로 복원 불가(§5-1 가설 **참**), 전방 수정 필요 판단근거 확보 |

### 4. rollback_bak 권한 — **PASS**

| 확인 | 명령(형태) | 결과 |
|:--|:--|:--|
| anon 접근 | `has_schema_privilege('anon','rollback_bak','USAGE')` | **f** |
| authenticated 접근 | `has_schema_privilege('authenticated', ...)` | **f** |
| PostgREST 노출 | `supabase/config.toml`의 `schemas` 설정 | **["public","graphql_public"]** — `rollback_bak` **미포함** |

### 5. b383·시각 위치 — **PASS**

- `git ls-tree ... | sort | grep`: b383(PR #1510) 시각 `20261124090000`은 **b378(20261123120000) 뒤 · b382(20261124100000) 앞** — 초안 위치와 **일치**
- `origin/develop` 최신 마이그레이션: `20261122100200` · `origin/TeamB_Dev` 최신: `20261124100000`
- **판정**: b383은 develop 최신보다뒤(삽입형 아님) ✓ · **신규 마이그레이션(B-381 M1~M3 등)은 `20261124100000` 이후 시각으로 채번** (develop·TeamB_Dev 양쪽 최신 초과 — Aiden 확인 요청3와 동일)

### 최종 복원 · 스모크

- `supabase db reset`(전체 316파일) → **exit 0** · 이력 **316행** · **미적용 0** · rollback_bak 잔존 **0**
- 상태 스냅샷: 청구서 테이블 3 · 함수 7 · b378 수정본 1 · b382 함수 1 (전부 정상)
- 스모크: b383 통합 **7/7 pass** · b382 단위 **7/7 pass** · `git status` **0건**

### 수정 필요 SQL 목록 (수정하지 않고 Jaison에게 보고 — 초안 갱신 대상)

1. **롤백 초안 §3의 재적용 순서(b365 → b359 → b360)에 b378 재적용 추가 필요** — 왕복 후 b378 수정본이 원본으로 소실됨을 실측(위2 단계). b382 함수와 b375 정책은 잔존/유지로 재적용 불필요.
2. **§3의 b365 스냅샷 복원 UPDATE가 주석 placeholder** — §5-1 실측값(스냅샷 NULL 행복원 불가 · `_hkd` 값 불변)을 반영해 문안 확정 필요.
3. (참고) §1 사전 확인5지표가 리허설에서 전부 0 → "앞3건 모두 0" 안전 조건 충족을 실측으로 확인.

### 발견 이슈
- 리허설 중2건의 작업 사고(zsh 단어분위 이동 실패, 임시 반입 리다이렉트) — 복구 완료(건수 위) · 재발 방지는 "명시적 파일 목록 + 기존 파일에 리다이렉트 금지"를 다음 리허설에 적용.

## [DoD]

- [x] 적용 순서 리허설 통과 (파일 단위 6개 · `migration list` 정합: 미적용 0·이력 318)
- [x] 롤백 §3 → §4(전부 true 4/4) → 재적용 3/3 통과
- [x] 앱 사용 후 롤백 실측 결과 기재 (v2 5컬럼 소멸 · `_hkd` 값 불변 true · 스냅샷 NULL **복원 불가**)
- [x] rollback_bak 권한 확인 (anon f · authenticated f · PostgREST 미노출)
- [x] 수정 필요 SQL 목록 기재 (2건 + 참고 1건)
- [x] 추가된 줄에 절대경로·계정·운영 식별자 없음 (scratch/ 추출 파일은 커밋 대상 아님)
- [x] 완료 절차 R-17 준수 (task file 문서 PR)

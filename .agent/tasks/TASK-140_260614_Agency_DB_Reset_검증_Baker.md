# TASK-140 — TASK-139 DoD 보완: supabase db reset 검증

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-140 |
| **생성일** | 2026-06-14 |
| **할당 Agent** | Baker (OpenCode Big Pickle) |
| **지시자** | Jaison (Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P2 |
| **전제조건** | TASK-139 🔔 (브랜치 `feature/ups-spr01-devteam-agency-role` 기준) |
| **관련 IMP** | IMP-111 |
| **브랜치** | `feature/ups-spr01-devteam-agency-role` |
| **커밋 태그** | `[Baker]` |
| **상태** | ⬜ |

---

## [목표]

TASK-139 DoD 미완료 항목인 `supabase db reset`을 로컬 Supabase 환경에서 실행하여 TASK-138 + TASK-139 migration 전체 적용 여부를 검증한다.

---

## [배경]

- TASK-139 구현 완료 후 Aiden 리뷰에서 `supabase db reset` 실행 확인을 요청 (R-14 의거)
- Jaison 환경에서 Docker 미설치로 실행 불가 → Baker에게 작업 위임
- 현재 브랜치에는 TASK-138 migration 7종 + TASK-139 migration 2종이 모두 포함되어 있음

---

## [작업 범위]

### Step 1 — 브랜치 체크아웃

```bash
git fetch origin
git checkout feature/ups-spr01-devteam-agency-role
git log --oneline -5  # 최신 커밋 e6b8bdb 확인
```

### Step 2 — 로컬 Supabase 기동 및 db reset

```bash
npx supabase start       # 로컬 Supabase 기동
npx supabase db reset    # 전체 migration 순차 적용
```

**확인 대상 migration 파일 (순서)**:

| 파일 | 내용 |
|:----|:----|
| `20260614090000_p7_ups_001_base_tables.sql` 외 TASK-138 migration | zen_ups_* 7종 테이블 |
| `20260614100000_agency_001_org_type_expansion.sql` | AGENCY org_type + zen_role_permissions |
| `20260614100100_agency_002_agency_tables.sql` | zen_agency_shippers + zen_agency_rate_overrides |

### Step 3 — 결과 확인

```bash
# 테이블 존재 확인 (psql 또는 Supabase Studio)
# 아래 테이블이 모두 존재해야 함:
# zen_ups_base_rates, zen_ups_zone_rates, zen_agency_shippers, zen_agency_rate_overrides
```

### Step 4 — DoD 업데이트 및 커밋

- `TASK-139` task file DoD `supabase db reset` 항목 `[ ]` → `[x]` 체크
- 커밋: `[Baker] docs: TASK-140 supabase db reset 검증 완료 — TASK-139 DoD 보완`
- ACTIVE_TASK.md TASK-140 상태 🔔 갱신

---

## [DoD]

- [ ] `feature/ups-spr01-devteam-agency-role` 브랜치 체크아웃 확인 (최신 커밋 `e6b8bdb`)
- [ ] `npx supabase start` 정상 기동 확인
- [ ] `npx supabase db reset` 오류 없이 완료 확인
- [ ] TASK-138 migration 7종 + TASK-139 migration 2종 전체 적용 확인
- [ ] `zen_agency_shippers`, `zen_agency_rate_overrides` 테이블 생성 확인
- [ ] TASK-139 task file DoD `supabase db reset` 항목 체크 완료
- [ ] 코드 커밋 해시: _(작성 예정)_
- [ ] DoD 자가 검증 완료

---

## [작업 결과]

_(Baker 작업 완료 후 기재)_

---

## [발견 이슈]

_(없음)_

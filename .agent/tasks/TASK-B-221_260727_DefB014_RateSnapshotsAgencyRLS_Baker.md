# TASK-B-221: DEF-B-014 — `zen_order_rate_snapshots` AGENCY SELECT RLS 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#879](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/879) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

`agency@zenith.kr`(AGENCY 역할)로 `/ko/warehouse/inbound`에서 오더 조회 시 예상운임(TASK-B-220/PR#878)이 항상 빈 값(`-`)으로 표시됩니다. 원인: `zen_order_rate_snapshots` 테이블에 AGENCY용 SELECT RLS 정책이 없어, 실제 값이 존재해도 조회 결과가 0건입니다(HTTP 200, 조용한 실패). 실측 검증(REST API, ADMIN vs AGENCY 토큰 비교) 완료. 상세: `.agent/defects/DEF-B-014_...md`.

이 세션에서 **7번째**로 반복되는 "AGENCY RLS 커버리지 누락" 패턴입니다(DEF-114/116/117/120/126/B-002/B-010). Baker가 DEF-B-010(`zen_tracking_configs`)에서 동일 패턴을 처리한 경험이 있어 이번 Task도 배정합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 신규 마이그레이션: `supabase/migrations/20260727HHMMSS_defb014_rate_snapshots_agency_select_rls.sql`

`zen_order_packages`의 기존 AGENCY SELECT 정책과 동일 패턴(파일 내 `Agency can view shipper order packages` 정책 참고):

```sql
CREATE POLICY "Agency can view shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (
        SELECT zen_profiles.org_id FROM zen_profiles WHERE zen_profiles.id = auth.uid()
      )
  )
);
```

(테이블에는 이미 `org_members_can_view_rate_snapshots`, `Super admins have full access` 등 기존 정책이 있음 — 이번 정책은 **추가**만 하며 기존 정책은 건드리지 않음. PostgreSQL RLS는 정책들이 OR로 결합되므로 기존 SELECT 정책과 충돌하지 않습니다.)

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-221-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 221 나와야 정상)
- [ ] 마이그레이션 파일 작성 (위 스펙대로)
- [ ] 로컬 DB 실측 검증 **필수** — `def117-agency-rls-v2.test.ts` 골드 스탠다드 패턴(execSync + psql, `SET LOCAL role/request.jwt.claims`) 참고해 실제 RLS 세션 시뮬레이션 기반 테스트 작성. **소스 문자열 검사(`toContain`)만으로 대체 금지** — Baker 본인도 PR#870에서 이 위반 이력이 있음(`.agent/VIOLATION_TRACKER.md` 참조).
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `agency@zenith.kr`로 로그인 → `/ko/warehouse/inbound` → `ZEN-2026-000001` 조회 → 예상운임 `KRW` 값이 실제로 표시되는지 스크린샷 확인(R-10)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-221 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 879 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-014 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #879`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — PR#870에서 `toContain` 소스 문자열 검사 위반(1회) 이력 있음. 이번 Task는 real DB 기반 behavioral 테스트가 필수입니다(DEF-B-010/TASK-B-216에서 본인이 이미 올바른 패턴으로 처리한 전례 있음 — 그 패턴 그대로 재사용 권장).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

## [작업 결과]

| 항목 | 내용 |
|:-----|:-----|
| **커밋 해시** | `af8be8db` |
| **코드 커밋** | `supabase/migrations/20260727004025_defb014_rate_snapshots_agency_select_rls.sql` + `tests/unit/migrations/defb014-rate-snapshots-agency-rls.test.ts` |
| **빌드** | PASS |
| **회귀 테스트** | 132 files / 870 tests ALL PASS |
| **로컬 DB 실검증** | AGENCY 세션에서 rate snapshot SELECT 성공 (1건 조회) |
| **PR** | PR#874 생성 완료 |

### 작업 내용
1. `zen_order_rate_snapshots` 테이블에 AGENCY SELECT RLS 정책 추가
2. 기존 `zen_order_packages` AGENCY SELECT 정책과 동일 패턴 (agency_org_id 기반)
3. 기존 정책(ADMIN, order_members)은 건드리지 않음 (OR 결합)
4. psql 기반 behavioral 테스트 6건 추가 (구조 3건 + 실제 DB 검증 3건)

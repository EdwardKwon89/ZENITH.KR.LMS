# TASK-B-222: DEF-B-015 — `zen_order_rate_snapshots` AGENCY UPDATE/INSERT RLS 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#881](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/881) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

`agency@zenith.kr`로 `/ko/warehouse/inbound`에서 중량/부피를 변경해도 예상운임이 재계산되지 않습니다. 원인: DEF-B-014(TASK-B-221)에서 SELECT RLS만 추가하고 UPDATE/INSERT는 빠뜨려, `applyPackageMeasurements()`의 운임 재계산 UPDATE/INSERT가 AGENCY 세션에서 RLS에 의해 조용히 0행 처리됨(에러 없음). 실측 검증 완료(REST API 직접 UPDATE 시도 → 빈 배열 응답, DB 값 불변). 상세: `.agent/defects/DEF-B-015_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 접근 규칙 명세 (jungjs 확정 — DEF-B-014와 동일, 2026-07-27)

`zen_order_rate_snapshots`는 **ADMIN(전체) / SHIPPER(자기 소속) / AGENCY(agency_org_id 매칭)** 3가지 역할이 SELECT·UPDATE·INSERT 전체 DML에 대해 동일하게 접근 가능해야 합니다. DEF-B-014는 SELECT만 다뤘고, 이번 Task가 UPDATE·INSERT를 마저 채웁니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 신규 마이그레이션: `supabase/migrations/20260727HHMMSS_defb015_rate_snapshots_agency_update_insert_rls.sql`

```sql
CREATE POLICY "Agency can update shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Agency can insert shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
);
```

GRANT는 DEF-B-014에서 이미 `SELECT, INSERT, UPDATE`를 `authenticated`에 부여했으므로 **추가 GRANT 불필요** — 다만 착수 시 `information_schema.role_table_grants`로 실제 존재 재확인할 것(이번 Task 범위에서 GRANT 마이그레이션이 실제로 이미 병합됐는지 확인 목적).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-222-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 222 나와야 정상)
- [ ] 마이그레이션 파일 작성 (위 스펙대로, UPDATE+INSERT 2개 정책)
- [ ] 회귀 테스트 추가 — **반드시 자기완결형 fixture 기반**(TASK-B-221 최종본 `tests/unit/migrations/defb014-rate-snapshots-agency-rls.test.ts` 패턴 그대로 재사용 권장 — `beforeAll`에서 조직/프로필/오더/스냅샷 자체 생성, `afterAll`에서 정리). 검증 항목:
  - AGENCY 세션이 소속 오더의 rate snapshot을 UPDATE 가능(실제 값 변경 확인)
  - AGENCY 세션이 비소속 오더의 rate snapshot은 UPDATE 불가(0행)
  - AGENCY 세션이 소속 오더에 대해 INSERT 가능(스냅샷이 아직 없는 신규 오더 케이스)
  - **하드코딩된 로컬 전용 실데이터 ID 사용 금지** — CI(fresh DB)에서 반드시 재현 가능해야 함
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `agency@zenith.kr`로 로그인 → `/ko/warehouse/inbound` → `ZEN-2026-000001` 조회 → 중량 변경 → "측정값 저장" → 예상운임 값이 실제로 변경되는지 확인 → 스크린샷(R-10, **로컬 Supabase 가동 상태에서 반드시 확인**)

### 🔐 다중 역할 RLS 커버리지 체크리스트 (SAR-2026-07-27-001, 필수 포함)
- [ ] **4대 역할 매트릭스**: ADMIN(전체)/SHIPPER(자기 소속)/AGENCY(agency_org_id)/OPERATOR 4개 역할 각각 이 정책이 필요한지 판단하고 결과를 커밋 메시지에 기재했는가?
- [ ] **정책-GRANT 페어링**: 이번 정책이 다루는 UPDATE/INSERT에 대해 `authenticated` 역할의 기본 GRANT가 실제로 존재하는지 `information_schema.role_table_grants`로 확인했는가?
- [ ] **RLS 테스트 자기완결성**: 하드코딩된 로컬 전용 UUID 없이 `beforeAll`/`afterAll` 자체 fixture로 검증했는가?
- [ ] **fresh DB 기준 검증**: 로컬 DB 통과가 아니라 CI(fresh DB) 통과를 최종 근거로 삼았는가?

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-222 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 881 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-015 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #881`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 바로 직전 TASK-B-221(DEF-B-014)에서 GRANT 누락과 하드코딩 ID 테스트 문제를 이미 겪었고 Jaison이 직접 수정한 전례가 있음 — 이번엔 처음부터 자기완결형 fixture + GRANT 확인을 적용해 동일 재작업 사이클 반복하지 말 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

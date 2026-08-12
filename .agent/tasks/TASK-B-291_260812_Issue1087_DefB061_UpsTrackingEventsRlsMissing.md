# TASK-B-291: Issue #1087 / DEF-B-061 (High) — zen_ups_tracking_events RLS 정책 전무

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1087](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1087) |
| **DEF** | [DEF-B-061](../defects/DEF-B-061_zen_ups_tracking_events_RLS정책_전무.md) |
| **배경** | JSJung이 TASK-B-290 검증 중(ZEN-2026-000001에 실제 트래킹 이벤트 14건 저장) "UPS 트래킹 이벤트가 없습니다" 표출 보고 → Jaison 원인 확정(RLS 정책 0건) |
| **담당** | Dave (Team B) — Baker는 현재 착수 불가(사정으로 배제) |
| **생성일** | 2026-08-12 |
| **우선순위** | **High (P1)** |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 근본 원인 (확정 완료 — DEF-B-061 참조)

`zen_ups_tracking_events`는 RLS ENABLE 상태에서 SELECT를 포함한 정책이 단 하나도 없음(`pg_policies` 0건, GRANT도 `service_role`에만 존재). `getUpsTrackingEvents()`가 일반 사용자 RLS 클라이언트로 조회하므로 데이터가 있어도 항상 0건 반환. `zen_tracking_configs`/`zen_ups_labels`는 동일 패턴(Admin ALL + 화주 본인 SELECT + Agency SELECT)이 정상 존재하는 것과 대조. Issue #1056에서 이미 "동일 RLS 패턴 7개 테이블 — 별도 DEF 채번 예정"으로 예견됐던 항목.

## 수정 방향 (설계 확정 — 착수 승인)

`zen_tracking_configs` 정책 패턴을 동일 적용하는 신규 마이그레이션 1건:

```sql
GRANT SELECT ON public.zen_ups_tracking_events TO authenticated;

CREATE POLICY "Admins have full access to ups tracking events" ON public.zen_ups_tracking_events
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
);

CREATE POLICY "Users can view ups tracking events of their own zen_orders" ON public.zen_ups_tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = zen_ups_tracking_events.order_id
    AND (o.shipper_id = auth.uid()
         OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
  )
);

CREATE POLICY "Agency can view ups tracking events for shipper orders" ON public.zen_ups_tracking_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_tracking_events.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
```

과설계 금지 — GRANT 1줄 + 정책 3개 외 추가 확장(다른 컬럼/테이블 손대기 등) 금지.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-291-ups-tracking-events-rls` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-291 확인
- [ ] 마이그레이션 1건 작성(GRANT + 정책 3개) — 최신 TeamB_Dev 기준 타임스탬프 충돌 없는지 확인
- [ ] **회귀 테스트 신설 (필수, R-09, psql 기반 실제 RLS 검증 — TASK-B-265/278 패턴)**:
  - Admin 역할: 임의 오더 트래킹 이벤트 SELECT 성공
  - 화주 본인(shipper_id 소유): 본인 오더 트래킹 이벤트 SELECT 성공
  - 화주 타인(무관 오더): SELECT 시 0건(차단) 확인 — 보안 회귀 방지
  - Agency(agency_org_id 소유 화주오더): SELECT 성공
  - 무관 Agency: 0건(차단) 확인
  - 정책 제거 시(되돌리기) 위 성공 케이스들이 정확히 0건으로 바뀌는지 재현
- [ ] **독립 되돌리기 검증**: 마이그레이션 적용 전 상태로 되돌려서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 로그인(화주/agency 등)으로 오더상세 `/ups-detail` 화면에서 트래킹 이벤트 목록이 정상 표출되는지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-291 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1087 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1087`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 커밋 누락 유형 누적 이력(13회, 최다) 있음, JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인. **이번 Task는 신규 마이그레이션 1건 포함** — 최신 TeamB_Dev 기준 타임스탬프 충돌 없는지 주의. 회귀 테스트는 TASK-B-278에서 확인된 "INSERT만 setupFixture가 매번 강제 재생성해 실제 회귀를 못 잡는" 사각지대(IMP-163)가 재발하지 않도록 — SELECT 정책 제거 시 반드시 실제로 0건이 되는지 fresh 상태에서 직접 확인할 것.
- **Baker 참고**: 현재 사정으로 착수 불가 상태 — 이번 Task는 배정 대상 아님(TASK-B-290과 동일 사유).

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `26642c2f` | `[Dave] fix: TASK-B-291 zen_ups_tracking_events RLS 정책 전무 수정 (Issue #1087 / DEF-B-061, High)` |

### 수정 내용 (설계 확정 그대로, 과설계 금지 준수)

마이그레이션 `20260812050000_iss1087_ups_tracking_events_rls.sql` — `zen_tracking_configs` 정책 패턴을 동일 적용:

1. `GRANT SELECT ON public.zen_ups_tracking_events TO authenticated;`
2. `Admins have full access to ups tracking events` — Admin/ZENITH_SUPER_ADMIN/MANAGER ALL
3. `Users can view ups tracking events of their own zen_orders` — 화주 본인(shipper_id 소유) SELECT
4. `Agency can view ups tracking events for shipper orders` — Agency(agency_org_id 소유) SELECT

### 회귀 테스트 (6건, psql 기반 authenticated RLS 시뮬레이션 — B-265/278 패턴)

`tests/unit/db/defb061-ups-tracking-events-rls.test.ts`

| TC | 내용 |
|:---|:-----|
| TC-291-01 | Admin — 임의 오더 트래킹 이벤트 SELECT 성공 |
| TC-291-02 | 화주 본인(shipper_id 소유) — 본인 오더 SELECT 성공 |
| TC-291-03 | 화주 타인(무관 오더) — SELECT 0건 (차단) |
| TC-291-04 | Agency(agency_org_id 소유 화주오더) — SELECT 성공 |
| TC-291-05 | 무관 Agency — SELECT 0건 (차단) |
| TC-291-06 | **되돌리기** — 화주 본인 SELECT 정책 제거 → 0건 → 복원 → 1건 |

> **IMP-163 준수**: setupFixture는 검증 대상 정책을 절대 생성/재생성하지 않음 (데이터만 준비, 실제 마이그레이션 상태 검증).

### 독립 되돌리기 검증

정책 3개를 DROP(마이그레이션 적용 전 상태) → **TC-291-01/02/04가 정확히 0건으로 FAIL 재현** → `db reset`으로 복원 후 6/6 PASS 확인.

### 검증

- `npm run test:regression`: **1274/1274 PASS** (180파일, 신규 +6)
- `npm run build`: SUCCESS
- **fresh `supabase db reset` 재검증**(R-08-2): 정책 3개 + `authenticated` SELECT GRANT 확인

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

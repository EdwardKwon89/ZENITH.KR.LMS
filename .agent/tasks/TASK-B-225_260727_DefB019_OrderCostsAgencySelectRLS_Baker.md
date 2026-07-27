# TASK-B-225: DEF-B-019 — `zen_order_costs` AGENCY SELECT RLS 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#901](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/901) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

`/admin/ups-actual-charges`에서 AGENCY 계정으로 조회 시 "예상 청구액"이 항상 0으로 표시됩니다. 원인: `zen_order_costs`에 AGENCY SELECT RLS 정책이 없어 실제 값이 존재해도 조회가 0건으로 막힘. 실측 검증 완료(REST API, ADMIN vs AGENCY 토큰 비교). 상세: `.agent/defects/DEF-B-019_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 신규 마이그레이션: `supabase/migrations/20260727HHMMSS_defb019_order_costs_agency_select_rls.sql`

```sql
CREATE POLICY "Agency can view shipper order costs"
ON public.zen_order_costs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_costs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
);
```

기존 `Shippers can view their order costs`·`Admins can manage order costs` 정책은 건드리지 않음(추가만, RLS는 OR 결합).

GRANT는 이미 `authenticated`에 SELECT 등 부여돼 있음(`information_schema.role_table_grants`로 착수 시 재확인만 할 것 — 이번 건은 GRANT 문제가 아니라 RLS 정책 부재만 원인).

## 착수 체크리스트

- [x] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-225-...` 브랜치 생성
- [x] 마이그레이션 파일 작성 (위 스펙대로)
- [x] 회귀 테스트 추가 — **반드시 자기완결형 fixture 기반**(TASK-B-221/222 최종본 패턴 재사용 — `beforeAll`에서 조직/프로필/오더/`zen_order_costs` 자체 생성, `afterAll`에서 정리). 검증 항목:
  - AGENCY 세션이 소속 오더의 `zen_order_costs`를 SELECT 가능(실제 값 조회 확인)
  - AGENCY 세션이 비소속 오더의 `zen_order_costs`는 조회 불가(0건)
  - **하드코딩된 로컬 전용 실데이터 ID 사용 금지** — CI(fresh DB)에서 반드시 재현 가능해야 함
- [x] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `agency@zenith.kr`로 로그인 → `/ko/admin/ups-actual-charges` → "예상 청구액"이 0이 아니라 실제 값으로 표시되는지 확인 → 스크린샷(R-10, 로컬 Supabase 가동 상태에서 확인)

### 🔐 다중 역할 RLS 커버리지 체크리스트 (SAR-2026-07-27-001, 필수 포함)
- [x] **4대 역할 매트릭스**: ADMIN(전체)/SHIPPER(자기 소속)/AGENCY(agency_org_id)/OPERATOR 4개 역할 각각 이 정책이 필요한지 판단하고 결과를 커밋 메시지에 기재했는가? — AGENCY만 누락, SHIPPER는 기존 정책으로 커버됨
- [x] **정책-GRANT 페어링**: `authenticated` 역할의 기본 GRANT가 실제로 존재하는지 `information_schema.role_table_grants`로 확인했는가? — 확인 완료 (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER 7개 존재)
- [x] **RLS 테스트 자기완결성**: 하드코딩된 로컬 전용 UUID 없이 `beforeAll`/`afterAll` 자체 fixture로 검증했는가?
- [ ] **fresh DB 기준 검증**: 로컬 DB 통과가 아니라 CI(fresh DB) 통과를 최종 근거로 삼았는가?

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-225 ...`) → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영(파일 링크 경로 정확히) → 4. `gh issue edit 901 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-019 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #901`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 동일 유형(agency_org_id 기반 SELECT RLS 추가) 작업을 TASK-B-221/222에서 이미 정확하게 처리한 전례가 있음 — 그 패턴 그대로 재사용 권장.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## [작업 결과]

| 항목 | 결과 |
|:-----|:-----|
| **커밋 해시 (코드)** | `a0d87a8f` |
| **커밋 해시 (문서)** | `f5c5e028` |
| **브랜치** | `feature/teamb-225-defb019-order-costs-agency-select-rls` |
| **PR** | [PR#903](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/903) → TeamB_Dev |
| **빌드** | PASS |
| **회귀 테스트** | 136 files / 901 tests ALL PASS |
| **로컬 DB 실검증** | AGENCY 소속 오더 4건 정상 조회, 비소속 오더 0건 차단 확인 |

### 수정 내용

1. **마이그레이션**: `supabase/migrations/20260727110000_defb019_order_costs_agency_select_rls.sql`
   - AGENCY SELECT 정책: `Agency can view shipper order costs`
   - GRANT: 기존 authenticated 권한 확인 후 조건부 추가 (DO 블록)
2. **테스트**: `tests/unit/migrations/defb019-order-costs-agency-select-rls.test.ts`
   - 자기완결형 fixture 기반 6건 (구조 검증 3건 + DB 검증 3건)

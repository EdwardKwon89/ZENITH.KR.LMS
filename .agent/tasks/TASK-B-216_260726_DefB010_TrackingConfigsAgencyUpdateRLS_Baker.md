# TASK-B-216: DEF-B-010 — zen_tracking_configs AGENCY UPDATE RLS 정책 추가

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#869](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/869) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

`registerUpsOrder()`(DEF-123/TASK-B-195 로직, `ups-labels.ts:329-338`)가 UPS 등록 성공 시 `zen_tracking_configs.tracking_no`를 실제 운송장번호로 갱신하는 UPDATE를 실행하지만, **AGENCY 역할에 이 테이블 UPDATE RLS 정책이 없어** 조용히 실패합니다(HTTP 200, 0건 갱신 — 에러 없음). Jaison이 실제 REST 재현(agency 세션 0건 vs admin 세션 1건 갱신)으로 확정. DEF-114/116/117/120/126/B-002에 이은 AGENCY RLS 커버리지 누락 6번째 재발. 상세: `.agent/defects/DEF-B-010_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

신규 마이그레이션 파일(`supabase/migrations/<타임스탬프>_defb010_tracking_configs_agency_update_rls.sql`) 추가:
```sql
CREATE POLICY "Agency can update tracking configs for shipper orders"
ON public.zen_tracking_configs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
```
기존 SELECT 정책(`supabase/migrations/20260723060000_def120_tracking_configs_agency_rls.sql`)과 동일한 `agency_org_id` 매칭 조건입니다. `authenticated` 역할의 테이블 레벨 GRANT는 이미 UPDATE 포함 정상(Jaison 확인 완료) — GRANT 추가 불필요, RLS 정책만 추가하면 됩니다.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-216-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 216 나와야 정상)
- [ ] 위 마이그레이션 파일 신규 생성
- [ ] **로컬 DB에 실제 적용 후 AGENCY 세션으로 실제 REST UPDATE 호출해 정상 반영되는지 실측 확인 필수**(RLS는 mock으로 절대 검증 불가 — 이번 버그 자체가 mock 테스트로는 못 잡는 유형의 대표 사례):
  ```bash
  # agency@zenith.kr 로그인 토큰으로 PATCH /rest/v1/zen_tracking_configs?order_id=eq.<agency 소속 오더 id> 실행
  # → 200 + 실제 갱신된 행 반환 확인 (현재는 [] 빈 배열)
  ```
- [ ] 회귀 테스트 추가 — 마이그레이션 SQL 파일 존재만 확인하는 `toContain` 금지. 가능하면 기존 RLS 통합 테스트 패턴(TASK-B-188 등) 참고해 실제 DB 세션 기반 검증 스크립트/테스트로 작성
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-216 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 869 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-010 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #869`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 이력: PR#844(🔍 설계확정 무시 착수), PR#837(타인 작업 기록 덮어쓰기). 이번 Task는 RLS 정책 추가라 **실측 검증(로컬 DB + 실제 AGENCY 세션 REST 호출)이 반드시 필요**합니다 — mock/toContain만 제출 시 반려됩니다.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

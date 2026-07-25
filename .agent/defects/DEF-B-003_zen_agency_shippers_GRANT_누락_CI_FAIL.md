# DEF-B-003: zen_agency_shippers 테이블에 authenticated GRANT 없음 — CI fresh reset에서 AGENCY RLS 검증 FAIL

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — PR#844 CI 재확인 중 발견 |
| **긴급도** | High (TeamB_Dev 위 모든 신규 PR의 CI를 계속 FAIL시킴) |
| **우선순위** | P1 |

## 현상

`gh pr checks 844` 결과 Regression Tests FAIL:
```
ERROR:  permission denied for table zen_agency_shippers
HINT:  Grant the required privileges to the current role with: GRANT SELECT ON public.zen_agency_shippers TO authenticated;
```
`tests/unit/finance/shipper-invoices-agency-rls.test.ts`(TASK-B-205/PR#840에서 신규 추가, 이미 TeamB_Dev에 병합됨)의 "실제 DB 검증(AGENCY 세션 시뮬레이션)" 테스트가 fresh CI `supabase db reset` 환경에서 실패.

## 근본 원인

`zen_agency_shippers` 테이블에 `authenticated` 롤용 `GRANT SELECT`가 어떤 마이그레이션에도 존재하지 않음(전수 확인 완료):
- `20260614100100_agency_002_agency_tables.sql` — 테이블 생성, GRANT 없음
- `20260707020000_def096_ups_agency_service_role_grants.sql` — `service_role`에만 GRANT (12행)
- `20260716010000_iss526_agency_shippers_shipper_rls.sql` — RLS 정책만, GRANT 없음

로컬 dev DB는 과거 세션에서 수동 GRANT 등이 누적되어 있어 우연히 통과하지만, CI는 매번 `supabase db reset`으로 완전히 새로 만들기 때문에 이 누락이 그대로 드러남 — **IMP-153("CI `supabase db reset` 시 authenticated/anon 롤 기본 테이블 GRANT 누락")과 동일 계열의 신규 사례**.

## 영향 범위

- `zen_agency_shippers`를 JOIN하는 모든 AGENCY RLS 정책(DEF-114/116/117/120/121/B-002 등 전부)이 사실상 이 GRANT에 의존 — 지금까지 로컬에서만 검증되고 CI에서는 한 번도 정식으로 통과된 적이 없었을 가능성
- 현재 TeamB_Dev 위에 얹히는 모든 신규 PR의 CI가 이 지점에서 계속 FAIL

## 조치안

```sql
GRANT SELECT ON public.zen_agency_shippers TO authenticated;
```
새 마이그레이션 파일로 추가(`./scripts/next-def-number.sh B` 결과 `DEF-B-003` 사용). 추가 후 로컬 `docker exec ... psql`로 직접 적용 + `npm run test:regression`으로 해당 테스트 재실행해 실제 PASS 확인 필수.

## 관련 파일
- `tests/unit/finance/shipper-invoices-agency-rls.test.ts`
- 참고: IMP-153, DEF-B-002

## 관련 Task
- `TASK-B-206` (배정 예정)

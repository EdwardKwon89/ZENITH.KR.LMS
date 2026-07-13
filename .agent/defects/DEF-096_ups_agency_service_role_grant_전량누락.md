# DEF-096 — Phase 7 UPS/Agency 테이블 16개 service_role GRANT 전량 누락

> **DEF-ID**: DEF-096
> **발견일**: 2026-07-07
> **발견자**: Aiden (Claude, ZEN_CEO) — Edward 질의("GitHub Action 오류 후속 조치 확인") 계기로 PR Checks 실패 이력 전수 조사 중 발견
> **긴급도**: High
> **상태**: 수정 완료 (본 보고서와 함께 커밋)

---

## 발견 경위

Edward가 "GitHub Action 오류가 많고 대부분 회귀테스트 오류로 보인다"고 질의하여 `gh run list`로 최근 "PR Checks" 워크플로우 실행 이력을 전수 조사함. 다수 PR에서 반복적으로 실패 확인, 원인이 두 갈래로 나뉨을 발견:

1. `src/app/actions/agency/shippers.ts:232` TypeScript 빌드 오류 (별도 커밋으로 수정, 본 DEF와 무관)
2. **본 DEF**: `tests/integration/p71-ups-agency-pricing.test.ts` — `permission denied for table zen_ups_base_rates`

---

## 현상

CI 로그(PR#28763903827 등 다수):
```
FAIL tests/integration/p71-ups-agency-pricing.test.ts > IMP-145: UPS Agency Pricing Policy Integration Tests
Unknown Error: permission denied for table zen_ups_base_rates
```

`service_role` 키(RLS bypass 권한 보유)로 접근해도 실패 — RLS 정책이 아닌 **테이블 레벨 GRANT 자체가 누락**되어 발생하는 전형적인 DEF-071/DEF-072 재발 패턴(`.agent/defects/DEF-071_zen_rate_cards_service_role_grant_누락.md` 참조).

**로컬 개발 환경에서 재현되지 않는 이유**: 장기 운영 중인 로컬 Supabase 인스턴스는 과거 어느 시점에 수동으로(또는 다른 경로로) 권한이 이미 부여된 상태 — `information_schema.role_table_grants` 조회로 확인. 반면 CI는 매번 `supabase db reset --yes`로 완전히 새로 마이그레이션을 적용하므로, 마이그레이션 파일 자체에 GRANT가 없으면 그대로 실패.

---

## 원인

`zen_ups_*`·`zen_agency_*` 계열 마이그레이션 16개 테이블 전체가 `CREATE TABLE` + RLS `CREATE POLICY`만 작성되고 `GRANT ... TO service_role`이 단 한 번도 포함되지 않음:

- `zen_agency_other_charges`, `zen_agency_pricing_policies`, `zen_agency_rate_overrides`, `zen_agency_shippers`
- `zen_ups_base_rates`, `zen_ups_flight_plans`, `zen_ups_freight_minimums`, `zen_ups_fuel_surcharges`, `zen_ups_labels`, `zen_ups_other_charges`, `zen_ups_products`, `zen_ups_shxk_country_map`, `zen_ups_tracking_events`, `zen_ups_weight_tier_rates`, `zen_ups_zone_countries`, `zen_ups_zones`

전수 조사 방법: `supabase/migrations/*.sql`에서 `CREATE TABLE public.<name>`으로 생성된 테이블과 `GRANT ... TO service_role`이 존재하는 테이블을 각각 집합으로 뽑아 차집합 계산 — 16개 전부 누락 확인.

---

## 영향 범위

- `p71-ups-agency-pricing.test.ts` (IMP-145, TC-UPS-AGPOL-01~05) — CI FAIL 확인
- 위 16개 테이블을 `service_role`(서버 사이드 Action/RPC)로 접근하는 모든 로직이 신선한 환경(신규 CI 러너, 신규 개발자 로컬 셋업, 향후 재해복구 시나리오)에서 동일하게 실패할 잠재적 위험
- 그동안 "PR Checks"가 다수 PR에서 빨간불이었음에도 branch protection이 이를 필수 체크로 강제하지 않아 병합이 계속 진행됨 — **별도 후속 논의 필요 사항으로 기재**(아래 권장 조치 참조)

---

## 임시 조치

없음 — 로컬 개발 환경에는 영향 없음(이미 권한 보유). CI에서만 노출.

---

## 조치 완료 내역

`supabase/migrations/20260707020000_def096_ups_agency_service_role_grants.sql` 신규 작성 — 16개 테이블 전체에 `GRANT SELECT, INSERT, UPDATE, DELETE ... TO service_role` 적용. 로컬 인스턴스에 non-destructive 적용(`psql -f`)으로 SQL 문법 검증 완료(16/16 GRANT 성공, 기존 권한 재확인이라 부작용 없음).

---

## 권장 조치 (추가 논의 필요)

1. **Branch Protection 강화 검토**: "PR Checks"가 현재 required check으로 설정되어 있지 않아, 빌드/회귀 실패 상태로도 병합이 가능했음. 향후 신규 테이블 생성 시 GRANT 누락이 재발하지 않도록 `develop`/`main`에 required status check 지정을 Edward와 논의 권장.
2. **마이그레이션 템플릿화**: 신규 테이블 생성 시 RLS `CREATE POLICY` 직후 `GRANT ... TO service_role` 작성을 표준 체크리스트(GOV_COMMON.md ZEN_A4 또는 별도 마이그레이션 가이드)에 명문화 권장 — DEF-071/072/096 3회 반복된 동일 유형 결함.

---

## 관련 파일

- `supabase/migrations/20260707020000_def096_ups_agency_service_role_grants.sql` — 수정 파일
- `tests/integration/p71-ups-agency-pricing.test.ts` — 영향받는 테스트
- `.agent/defects/DEF-071_zen_rate_cards_service_role_grant_누락.md` — 선행 동일유형 결함
- `.agent/defects/DEF-072_tracking_business_qa_service_role_grant_누락.md` — 선행 동일유형 결함
- `supabase/migrations/20260622000000_fix_service_role_grants.sql` — 선행 수정 참조 패턴

---

## 예상 공수

Small (마이그레이션 파일 1개 작성 — 완료, ~40분 소요)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Aiden (Claude, ZEN_CEO) | 최초 작성 및 수정 완료 — Edward CI 오류 질의 계기 전수 조사 |

# DEF-128: 로컬 Supabase DB가 20개+ 마이그레이션을 장기간 반영하지 못한 상태로 방치됨

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | Aiden (TASK-212 시드 보완 작업 중 회귀 테스트 실패로 발견) |
| **긴급도** | Medium |
| **우선순위** | P3 |

## 현상

TASK-212 작업 중 `npm run test:regression` 실행 시 DEF-B-015 관련 신규 테스트 3건이 "new row violates row-level security policy" 등으로 실패. 원인 추적 결과, 로컬 Supabase DB의 `supabase_migrations.schema_migrations` 테이블에 **2026-07-22~07-27 사이 추가된 마이그레이션 20개 이상이 전혀 기록되어 있지 않음**(파일은 저장소에 존재하지만 이 로컬 DB 인스턴스에는 한 번도 적용된 적 없음) — `zen_order_rate_snapshots`에 AGENCY UPDATE/INSERT 정책 자체가 DB에 없는 상태였음.

`supabase migration up --local` 실행 결과 20개 마이그레이션이 한꺼번에 적용됨(로그 확인 완료).

## 원인

이 세션에서 로컬 Supabase 인스턴스를 세션 시작 시 한 번 띄운 뒤 계속 재사용(재시작·재적용 없이)해왔고, 그 사이 develop에 여러 차례 배치 병합(PR#884 등)으로 신규 마이그레이션이 다수 추가됐으나 `supabase db reset`이나 `supabase migration up`을 별도로 실행하지 않아 로컬 DB 스키마가 점점 뒤처짐.

## 영향

- 이 세션 동안 수행된 로컬 DB 직접 조회 기반 검증(완성도 점검의 "AGENCY RLS 정책 확인" 등)이 실제로는 최신 정책이 반영 안 된 stale 스키마 기준이었을 가능성 있음
- 단, 각 Task의 회귀 테스트 자체는 CI(fresh DB)와 자기완결형 fixture(SAR-2026-07-27-001 대응) 기준으로 통과했으므로, **CI 기준 코드 정확성 자체에는 영향 없음** — 로컬 세션 재사용 관행의 위생 문제에 가까움

## 조치 방향 (제안)

- develop에서 새 마이그레이션이 병합될 때마다(특히 배치 머지 직후) `supabase migration up --local` 실행을 관례화
- 또는 로컬 검증 시작 전 매번 `supabase migration list --local`로 pending 여부 확인을 체크리스트에 추가(LIVE_PHASE_2_EXECUTE.md 등)

## 검증

- `supabase migration up --local` 실행 후 `pg_policies` 재조회로 AGENCY UPDATE/INSERT 정책 존재 확인
- 회귀 테스트 재실행 134 files/886 tests 전체 PASS 확인 (TASK-212 참조)

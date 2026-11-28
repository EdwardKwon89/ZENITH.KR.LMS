# [TASK-B-375] zen_ups_actual_charges 화주·대리점 SELECT RLS 제거 (Issue #1356, DEF-150 후속)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-375 / [#1356](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1356) (DEF-150 후속) |
| **팀 / 작성일** | Team B / 2026-11-23 |
| **대상 모듈 (231 연동)** | `supabase/migrations/20261123100000_task_b375_drop_shipper_agency_select_rls.sql`, `tests/integration/task-b375-rls-shipper-agency-select.test.ts` |
| **검증 차원 (231 D1~D9)** | D1, D3, D5 |

**2026-11-23, Dave** — JSJung 확정(UPS 실비는 SUPER_ADMIN·ADMIN·MANAGER 전용)에 따라 `zen_ups_actual_charges`의 화주·대리점 SELECT 정책 `shipper_agency_select`를 제거했습니다. 앱 가드·폼 렌더·admin client 전환은 TASK-B-372(PR #1440)에서 완료. **대체 정책 없음**, `admin_manager_all` 유지, SUPER_ADMIN 정책 추가는 하지 않음(Jaison 승인).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-375-01 | 정책 제거 후 화주·대리점·OPERATOR·anon SELECT | 실비 원본 행 0건 | `tests/integration/task-b375-rls-shipper-agency-select.test.ts` |
| TC-375-02 | 정책 재생성(되돌리기) | 화주·대리점 SELECT 1건 복구 → 재제거 시 0건 (vacuous 아님) | 동일 |
| TC-375-03 | ADMIN 세션 `zen_order_costs` 읽기 | 1건 유지 | 동일 |
| TC-375-04 | 관리자 3역할(SUPER_ADMIN·ADMIN·MANAGER) 4함수 | 검색·조회·대사·등록 정상(admin client 경로) | 동일 |
| TC-375-05 | 참조 전수 | `prosrc` 0건·뷰 0건·트리거 0건 | `pg_proc`/`pg_depend`/`pg_trigger` 실측(PR 본문) |
| TC-375-RST | 정책 재생성 후 제거 반복 | 정책 제거 상태 0건 / 재생성 1건 실측 | 동일 |

**회귀 검증**: `npm run test:regression` → **295파일 / 2,261케이스 전부 PASS (exit 0)**. `npm run build` → **성공 (exit 0)**. `zen_error_logs` 최근 1일 신규 ERROR 0건.
**R-12 Ds-11**: DB 정책 변경으로 서버 액션 시그니처 변경 없음 — 해당 없음(앱 가드는 #1440에서 반영).

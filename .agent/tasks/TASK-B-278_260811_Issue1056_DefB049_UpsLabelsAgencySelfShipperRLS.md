# TASK-B-278: Issue #1056 / DEF-B-049 (Critical) — zen_ups_labels RLS 자가화주 차단 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1056](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1056) |
| **DEF** | [DEF-B-049](../defects/DEF-B-049_AGENCY_자가화주_zen_ups_labels_RLS_agency_org_id_체크로_INSERT_차단.md) |
| **배경** | JSJung 실사용 중 "shxk ups api 호출이 실패했어" 보고 → Jaison 원인 확정 |
| **담당** | Dave (Team B) — 2026-08-11 Baker → Dave 재배정(JSJung 지시) |
| **생성일** | 2026-08-11 |
| **우선순위** | **P1 (Critical)** |
| **상태** | ⬜ |

## 근본 원인 (확정 완료)

MASTER AIR(AGENCY)가 UPS 오더(`ZEN-2026-000008`, 자가화주 — `shipper_id` = 본인 org_id, `agency_org_id` = NULL) 등록 시:
1. SHXK `createorder` API 호출 **성공**(`zen_shxk_api_logs` 확인 — order_id 761342, tracking 1ZJ443D30403394565, "订单创建成功")
2. 이후 `registerUpsOrder()`가 호출하는 `saveInitialLabel()`의 `zen_ups_labels` INSERT가 **RLS 정책에 막혀 실패**
3. 사용자에게는 "실패"로 표시되지만 실제로는 SHXK 서버에 orphan 오더가 생성된 상태로 남음

Jaison이 MASTER AIR 계정으로 실제 로그인 후 직접 재현 확인:
```
error: 42501 new row violates row-level security policy for table "zen_ups_labels"
```

`zen_ups_labels`의 AGENCY 관련 RLS 정책 4개(SELECT/INSERT/UPDATE/DELETE)가 전부 동일 패턴:
```sql
zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
```
자가화주 오더는 `agency_org_id`가 NULL이라 이 조건이 항상 거짓 — DEF-B-046(`getAgencyShipperIds()` 앱 레벨 필터, `warehouse.ts`)과 동일 근본원인 계열이나, 이번엔 **DB RLS 정책 자체**가 발현 지점.

**긴급 조치 완료**: SHXK 측 orphan 오더(`ZEN2026000008`)는 Jaison이 `removeorder`로 즉시 정리(`"订单移除成功"` 확인, `zen_shxk_api_logs`에 정리 이력 기록).

## 수정 방향 (설계 확정 — 착수 승인)

`zen_ups_labels`의 AGENCY 관련 RLS 정책 4개(SELECT/INSERT/UPDATE/DELETE) 전부에 자가화주 조건을 OR로 추가:
```sql
AND (
  zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  OR zen_orders.shipper_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
)
```
- 신규 마이그레이션: 4개 정책 `DROP POLICY` + `CREATE POLICY` 재생성(정책명은 기존 유지 권장 — `Agency can insert/view/update shipper ups labels`, `ups_labels_agency_delete`)
- **범위 확인 필수**: `zen_ups_labels` 외에 동일 `agency_org_id` 단일 체크 패턴을 쓰는 다른 테이블이 있는지 전수 조사(IMP-162에 12개 파일 언급됨 — 이번 Task로 `zen_ups_labels`는 해소, 나머지는 범위 밖이면 별도 DEF로 재등록). `grep -rn "agency_org_id = ( *SELECT.*org_id.*FROM.*zen_profiles" supabase/migrations/` 등으로 확인
- 앱 코드(`ups-labels.ts` 등) 수정은 불필요(RLS 정책만 문제) — 단, 실제로 확인 후 앱 레벨에 유사 필터가 별도로 있는지도 함께 점검

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-278-ups-labels-agency-rls` 브랜치 생성(`ZENITH_LMS-worktrees/dave` 전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-278 확인
- [ ] `zen_ups_labels` RLS 정책 4개(SELECT/INSERT/UPDATE/DELETE) 자가화주 조건 추가 마이그레이션
- [ ] 동일 패턴 다른 테이블 존재 여부 grep 전수 조사 — 발견 시 이번 Task 범위 포함 여부 판단(단순하면 함께 수정, 복잡하면 `[발견 이슈]`로 별도 보고)
- [ ] **회귀 테스트 신설 (필수, R-09)** — DEF-B-046(TASK-B-274) 패턴 참고:
  - 자가화주 AGENCY로 실제 로그인 → `zen_ups_labels` INSERT/SELECT/UPDATE/DELETE 각각 성공 확인(실 DB 기반, mock 아님)
  - **보안 회귀 방지**: 무관한 AGENCY(자기 오더도 아니고 하위 화주도 아닌)는 여전히 차단되는지 확인 — DEF-B-046 TC-274-04와 동일한 취지
  - **되돌리기 검증 필수** — 정책 원복 시 자가화주 INSERT가 다시 42501로 막히는지 재현
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) MASTER AIR(또는 동등 자가화주 AGENCY) 계정으로 실제 UPS 오더 등록 → SHXK 호출 성공 + 라벨 저장까지 정상 완료(에러 없음) 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-278 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1056 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1056`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락·상태전환 누락 등 다수 유형 누적(할당 중단 기준 초과 이력 있음), JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). **가장 반복됐던 위반 유형이 "채번 절차 누락"(눈대중 채번으로 타 Agent와 번호 중복)이므로, 착수 전 반드시 `./scripts/next-task-number.sh B`로 TASK-B-278 재확인**. 직전 TASK-B-272/273/277(UPS/SHXK 영역, 모두 이번 세션)은 절차 정확히 준수 완료(회귀 테스트·되돌리기 검증·R-10 전부 충족) — 최근 흐름은 양호하므로 동일 수준 기대. 이번 건은 RLS 정책 수정이라 **"무관한 AGENCY는 여전히 차단"되는 보안 회귀 테스트를 반드시 포함**할 것 — 조건을 느슨하게 고치다 보안 구멍을 만드는 실수가 이 계열에서 가장 위험함(DEF-B-046 TC-274-04 참고).

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

**참고 — 이번 Task 범위 밖, Jaison이 조사 중 별도 발견**: DB 어드바이저리 자동 감지로 `_profiles_grade_backup_20260521`, `zen_customs_history`, `zen_invoice_history`, `zen_master_order_history`, `zen_ups_shxk_country_map` 5개 테이블의 **RLS 자체가 비활성화** 상태임을 확인. anon/authenticated 키로 전체 노출 가능성 있음 — 정책 없이 RLS만 켜면 전체 접근이 막히므로 이번 Task에서 임의 조치하지 않음. 별도 DEF로 채번·JSJung 확인 필요.

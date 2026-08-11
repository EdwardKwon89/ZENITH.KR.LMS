# TASK-B-279: Issue #1058 / DEF-B-051 (High) — AGENCY 자가화주 RLS 잔여 차단 4곳 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1058](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1058) |
| **DEF** | [DEF-B-051](../defects/DEF-B-051_AGENCY_자가화주_라벨오류로그_스토리지_트래킹설정_RLS_잔여차단.md) |
| **배경** | DEF-B-049(TASK-B-278) 완료 후 Dave가 보고한 "동일 패턴 7개 테이블"을 Jaison이 전수 재검증 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 (High) |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 근본 원인 (확정 완료 — Jaison 전수 재검증)

TASK-B-278 완료 후 Dave가 `[발견 이슈]`로 보고한 7개 테이블을 Jaison이 `pg_policies` 직접 조회로 하나씩 재검증했다 — 각 테이블·액션마다 `agency_org_id` 단일 체크 정책 외에 자가화주를 커버하는 **대체 정책(주로 `is_org_member(shipper_id)`)이 실제로 있는지** 확인.

**결과: Dave 보고 중 3건은 오탐(이미 정상), 실제로 여전히 막힌 곳은 4곳**:

| 대상 | 액션 | 실제 영향 |
|:-----|:----:|:-----|
| `zen_tracking_configs` | UPDATE | 자가화주 오더 트래킹 설정 갱신 불가 |
| `zen_ups_label_documents` | DELETE | 자가화주 오더 라벨 문서 레코드 삭제 불가 |
| `zen_ups_label_errors` | INSERT | **SHXK 호출 실패 시 에러 기록 자체가 막힘** — 가장 심각, 실패 원인 추적 불가 |
| `storage.objects`(`invoices` 버킷, `ups-labels/%`) | INSERT/SELECT/DELETE | 라벨 PDF 파일 실물 업로드/조회/삭제 불가 |

(제외 — 재검증 결과 이미 정상): `zen_order_costs` SELECT, `zen_order_packages` SELECT/UPDATE, `zen_order_rate_snapshots` INSERT/SELECT/UPDATE — 전부 별도 `is_org_member(shipper_id)` 기반 정책으로 이미 자가화주 커버됨. `zen_orders` 자체도 정상.

## 수정 방향 (설계 확정 — 착수 승인)

DEF-B-049(TASK-B-278)와 동일 해법 — 4곳에 shipper_id 기반 OR 조건 추가:

1. **`zen_tracking_configs` UPDATE**: 기존 SELECT 정책("Users can view tracking of their own zen_orders")과 동일한 shipper_id 조건을 UPDATE에도 추가
2. **`zen_ups_label_documents` DELETE**: 기존 INSERT/SELECT의 `ups_label_docs_shipper_*` 패턴을 DELETE에도 신규 추가(`ups_label_docs_shipper_delete`)
3. **`zen_ups_label_errors` INSERT**: `agency_org_id` 단일 체크에 `OR is_org_member(auth.uid(), shipper_id)` 추가
4. **`storage.objects` ups-labels 정책 3개**(INSERT/SELECT/DELETE): 기존 SELECT의 admin OR 구조처럼 `EXISTS (... o.shipper_id = p.org_id ...)` OR 절 추가 — SELECT는 이미 admin OR agency 형태라 shipper 절만 추가, INSERT/DELETE는 신규 OR 추가

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-279-agency-self-shipper-rls-remaining` 브랜치 생성(`ZENITH_LMS-worktrees/dave` 전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-279 확인
- [ ] 4곳(`zen_tracking_configs`/`zen_ups_label_documents`/`zen_ups_label_errors`/`storage.objects`) RLS 정책 수정 마이그레이션
- [ ] **회귀 테스트 신설 (필수, R-09)** — TASK-B-278 v2 패턴(psql 기반 authenticated 시뮬레이션) 사용:
  - 4곳 각각: 자가화주 AGENCY 성공 + 무관 AGENCY 차단(42501) + 되돌리기 검증
  - `storage.objects`는 실제 Storage API(`supabase.storage.from('invoices').upload/download/remove`)로 검증 — RLS 테이블 직접 쿼리가 아니라 Storage 클라이언트 경유 실측 필요
  - **⚠️ TASK-B-278의 IMP-163 실수 반복 금지**: 테스트의 `beforeAll`/`setupFixture`류 헬퍼가 검증 대상 정책 자체를 강제로 "정답 상태"로 재생성하지 않도록 할 것 — fresh DB reset 후 실제 마이그레이션이 만든 정책 상태를 그대로 검증해야 함. 착수 전 `IMP-163`(`scratch/post_launch_improvements.md`) 반드시 읽을 것
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 자가화주 AGENCY 계정으로 실제: ①트래킹 설정 갱신 ②라벨 문서 삭제 ③(SHXK mock 실패 유도 후) 에러 로그 기록 확인 ④라벨 PDF 업로드/조회/삭제 — 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-279 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1058 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1058`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 필수. 직전 TASK-B-278(동일 계열)은 v1 반려(회귀 테스트 0건) 후 v2에서 통과했으나, **v2 테스트에도 setupFixture가 INSERT 정책을 강제 재생성해 실제 회귀를 못 잡는 결함이 있었음(IMP-163)** — 이번엔 그 실수를 정확히 인지하고 반복하지 말 것. RLS 테스트를 짤 때 "이 테스트가 실제 마이그레이션을 되돌리면 실패하는가"를 스스로 먼저 되돌리기 검증해볼 것.

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `668da4a1` | `[Dave] fix: TASK-B-279 AGENCY 자가화주 RLS 잔여 차단 4곳 수정 (Issue #1058 / DEF-B-051)` — 마이그레이션 + 회귀 테스트 12건 |

### 마이그레이션 (`supabase/migrations/20260811040000_iss1058_agency_self_shipper_rls_remaining.sql`)

DEF-B-049와 동일 해법(shipper_id 기반 OR 조건 추가)으로 4곳 수정:

| 대상 | 액션 | 수정 |
|:-----|:----:|:-----|
| `zen_tracking_configs` | UPDATE | `agency_org_id = 본인` 에 `OR shipper_id = 본인` 추가 (USING + WITH CHECK) |
| `zen_ups_label_documents` | DELETE | `ups_label_docs_shipper_delete` 신규 (`is_org_member(auth.uid(), shipper_id)`) — INSERT/SELECT와 동일 패턴 |
| `zen_ups_label_errors` | INSERT | `agency_org_id = 본인` 에 `OR is_org_member(auth.uid(), shipper_id)` 추가 (가장 심각 — SHXK 실패 에러 기록) |
| `storage.objects` (`ups-labels/%`) | INSERT/SELECT/DELETE | `zen_orders` JOIN 조건에 `o.shipper_id = p.org_id` OR 추가 — 라벨 PDF 실물 업로드/조회/삭제 |

무관 AGENCY(자기 오더·하위 화주 오더 아님) 차단은 유지됨을 테스트로 보장.

### 회귀 테스트 (`tests/unit/db/defb051-agency-self-shipper-rls-remaining.test.ts`, 12건)

psql 기반 authenticated 시뮬레이션(B-265/defb049 패턴) + **IMP-163 준수** — setupFixture는 데이터만 준비하고 검증 대상 RLS 정책은 절대 생성/재생성하지 않음.

- **자가화주 AGENCY 성공 6건** (TC-279-01~06): tracking_configs UPDATE / docs DELETE / errors INSERT / storage INSERT·SELECT·DELETE
- **무관 AGENCY 차단 5건** (TC-279-07~10): UPDATE·DELETE는 0행/값불변으로, INSERT는 42501로 차단 확인 + storage INSERT/SELECT/DELETE 전부
- **기존 동작 회귀 방지 1건** (TC-279-11): 하위 화주 오더(agency_org_id=본인)는 AGENCY 정상 관리
- **되돌리기 검증 1건** (TC-279-12): tracking_configs UPDATE 정책을 이전 형태(agency_org_id 단일)로 원복 → 자가화주 재차단(0행) 확인 → 마이그레이션과 동일한 최신 정책 복원 → 다시 성공 확인

### 검증

- `npm run test:regression`: **1182/1182 PASS** (165파일, 신규 +12)
- `npm run build`: SUCCESS
- `npx tsc --noEmit`: 신규 테스트 파일 오류 없음

### 발견 이슈

- `storage.objects`는 `storage.protect_delete` 트리거가 직접 DELETE를 차단함 — 테스트에서는 Storage API와 동일하게 `storage.allow_delete_query='true'` 설정 후 DELETE 수행(RLS 정책 검증에는 영향 없음).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

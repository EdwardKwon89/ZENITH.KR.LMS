# DEF-B-051 (High) — AGENCY 자가화주 RLS 잔여 차단 4곳(라벨 에러로그/스토리지/트래킹설정 UPDATE/라벨문서 DELETE)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | DEF-B-049(TASK-B-278) 완료 후 Dave가 `[발견 이슈]`로 "동일 RLS 패턴 7개 테이블" 보고 → Jaison이 각 테이블에 shipper_id 기반 대체 정책이 실제로 있는지 전수 재검증 |
| **긴급도** | High — 즉시 전면 장애는 아니나, 에러 로그 유실·라벨 파일 미저장 등 자가화주 UPS 흐름의 "조용한 실패" 유발 가능 |
| **현재 상태** | 원인 확정, 미수정 |

## 근본 원인 (확정 — 전수 재검증 완료)

Dave가 보고한 7개 테이블을 `pg_policies`로 직접 조회해, 각 테이블·액션마다 `agency_org_id` 단일 체크 정책 외에 `is_org_member(shipper_id)` 등 자가화주를 커버하는 **대체 정책이 실제로 존재하는지**를 개별 확인했다. 그 결과 Dave의 보고 중 3건은 오탐(이미 대체 정책으로 커버됨)이었고, 실제로 자가화주 AGENCY가 여전히 막히는 곳은 아래 4곳이다.

| 대상 | 액션 | 대체 정책 유무 | 실제 영향 |
|:-----|:----:|:---:|:-----|
| `zen_tracking_configs` | UPDATE | **없음** | 자가화주 오더의 트래킹 설정 갱신 불가 |
| `zen_ups_label_documents` | DELETE | **없음** | 자가화주 오더의 라벨 문서 레코드 삭제 불가 |
| `zen_ups_label_errors` | INSERT | **없음** | **SHXK 호출 실패 시 에러 기록 자체가 막힘** — 자가화주는 실패해도 원인이 안 남고 조용히 사라짐 |
| `storage.objects`(`invoices` 버킷, `ups-labels/%` 경로) | INSERT/SELECT/DELETE | **없음(3개 액션 전부)** | 실제 라벨 PDF 파일을 자가화주 AGENCY가 업로드·조회·삭제 불가 — DEF-B-049로 DB 레코드는 저장되게 됐어도 실제 파일 흐름은 여전히 끊김 |

(참고 — 아래 3곳은 Dave 보고에 포함됐으나 재검증 결과 **이미 정상**이라 이번 범위에서 제외):
- `zen_order_costs` SELECT — "Shippers can view their order costs"(shipper_id join)로 이미 커버
- `zen_order_packages` SELECT/UPDATE — "Members can view/update...packages"(`is_org_member(shipper_id)`)로 이미 커버
- `zen_order_rate_snapshots` INSERT/SELECT/UPDATE — `org_members_can_*_rate_snapshots`(`is_org_member(shipper_id)`) 3종으로 이미 커버

`zen_orders` 테이블 자체도 재검증 결과 정상(shipper_id 기반 `is_org_member` SELECT/UPDATE 정책이 별도로 존재) — 자가화주가 자기 오더 자체를 못 보는 문제는 없음.

## 영향 범위

- 라벨 문서 삭제(취소/재발급 시나리오)
- 트래킹 설정 갱신(DEF-123 계열 tracking_no 동기화 등)
- **SHXK 호출 실패 시 에러 로그 유실** — 가장 심각. 실패 원인 추적이 자가화주 오더에서만 불가능해짐
- 라벨 PDF 파일 자체의 업로드/조회/삭제 — DEF-B-049가 고친 DB 레코드 저장과 별개로, 실제 Storage 파일 흐름은 여전히 막혀 있어 자가화주 UPS 등록 흐름이 완전하지 않을 수 있음

## 수정 방향 (제안 — 착수 시 논의)

DEF-B-049(TASK-B-278)와 동일 해법: 4곳 모두 `OR (shipper_id/foldername 기반 order.shipper_id) = 본인 org_id` 조건 추가.

- `zen_tracking_configs` UPDATE 정책: SELECT 정책("Users can view tracking of their own zen_orders")과 동일한 shipper_id 조건을 UPDATE에도 추가
- `zen_ups_label_documents` DELETE 정책: 기존 INSERT/SELECT의 `ups_label_docs_shipper_*` 패턴을 DELETE에도 추가(`ups_label_docs_shipper_delete` 신규)
- `zen_ups_label_errors` INSERT 정책: `agency_org_id` 단일 체크에 `OR is_org_member(auth.uid(), shipper_id)` 추가
- `storage.objects` ups-labels 정책 3개(INSERT/SELECT/DELETE): 기존 SELECT의 admin OR 구조처럼 `EXISTS (... o.shipper_id = p.org_id ...)` OR 절 추가

## 회귀 테스트 요구사항 (필수)

DEF-B-049(TASK-B-278) v2에서 확립된 psql 기반 authenticated 시뮬레이션 패턴을 그대로 사용하되, **TASK-B-278에서 발견된 setupFixture 마스킹 실수(IMP-163)를 반복하지 말 것** — 테스트가 정책을 스스로 "정답 상태"로 강제 재생성해버리면 실제 마이그레이션 상태를 검증하지 못한다. fresh DB reset 후의 실제 정책 상태를 그대로 검증해야 한다.

- 4곳 각각: 자가화주 AGENCY 성공 + 무관 AGENCY 차단(42501) + 되돌리기 검증
- `storage.objects`는 실제 Storage API(`supabase.storage.from('invoices').upload/download/remove`)로 검증(RLS는 storage.objects 테이블에 적용되므로 REST/Storage 클라이언트 경유 실측 필요)

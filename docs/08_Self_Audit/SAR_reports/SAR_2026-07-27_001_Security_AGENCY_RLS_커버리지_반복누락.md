---
name: AGENCY RLS 커버리지 반복 누락 (8회) + GRANT/테스트fixture 동반 결함
description: 신규 테이블/정책 생성 시 AGENCY 역할 RLS가 구조적으로 누락되는 패턴이 8회 반복되었고, 관련 GRANT 누락·비이식성 테스트 결함까지 동반 확인됨
category: Security
severity: HIGH
date: 2026-07-27
author: Jaison (jungjs, Team B 총괄)
---

## 현상 (What)

2026-07 한 달 사이 동일한 유형의 결함이 8회 반복 발생했다: 신규 테이블 또는 신규 RLS 정책을 추가할 때 **AGENCY 역할에 대한 커버리지가 누락**되어, AGENCY 계정으로 로그인 시 정상적으로 존재하는 데이터가 조용히(HTTP 200, 0행) 조회/수정되지 않는 현상.

**발생 이력:**

| 순번 | DEF | 테이블 | 누락 유형 |
|:----:|:----|:-------|:----------|
| 1 | DEF-114 | zen_orders | UPDATE RLS |
| 2 | DEF-116 | (관련 테이블) | RLS |
| 3 | DEF-117 | zen_order_packages, zen_ups_labels 등 | SELECT/UPDATE/INSERT RLS |
| 4 | DEF-120 | zen_tracking_configs | SELECT RLS |
| 5 | DEF-126 | (관련 테이블) | RLS |
| 6 | DEF-B-002 | zen_invoices | SELECT RLS |
| 7 | DEF-B-010 | zen_tracking_configs | UPDATE RLS |
| 8 | DEF-B-014 | zen_order_rate_snapshots | SELECT RLS |

**추가로 2026-07-27 당일 발견된 동반 결함(DEF-B-010/DEF-B-014 수정 작업 중):**
- DEF-B-014 수정본(PR#880)과 DEF-B-010 수정본(PR#870) **양쪽 모두**에서, RLS 정책만 추가하고 **`GRANT ... TO authenticated`를 누락** — 신선한(fresh) DB에서는 RLS 정책과 무관하게 `permission denied`로 전체 차단됨. 로컬 장기운영 DB에는 과거 수기 부여된 권한이 남아있어 이 문제가 은폐되어 있었음.
- 같은 두 PR의 회귀 테스트가 **로컬 전용 실데이터의 UUID(예: `agency@zenith.kr`, `ZEN-2026-000001`)를 하드코딩** — 커밋된 seed 데이터에 없어 CI(fresh DB)에서 재현 불가로 실패. 로컬에서는 우연히 존재하는 데이터라 통과했음.

## 원인 (Why)

### 직접적 원인
신규 테이블/정책 작성 시 담당 Agent가 ADMIN·SHIPPER(화주) 역할만 염두에 두고 AGENCY(대행) 역할의 접근 경로(`agency_org_id` 매칭)를 빠뜨림. GRANT 문과 RLS 정책이 별개 개념이라는 점, 그리고 로컬 개발 DB와 fresh CI DB의 권한 상태가 다를 수 있다는 점이 충분히 인지되지 않음.

### 근본 원인
- **역할 커버리지를 강제하는 표준 절차가 없었음**: `docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md`의 기존 "RLS 정책 완전성"(SAR-013) 항목은 CRUD(SELECT/INSERT/UPDATE/DELETE) 완전성만 체크하고, **역할(ADMIN/SHIPPER/AGENCY/OPERATOR) 축의 완전성은 체크 항목에 없었음.**
- **RLS 정책과 GRANT를 분리된 검토 대상으로 인지하지 못함**: "정책만 있으면 동작한다"는 암묵적 가정 — 실제로는 GRANT가 선행 조건.
- **테스트가 로컬 DB 상태에 의존**: RLS 회귀 테스트 작성 시 "실제 값이 조회되는지"를 검증하려는 시도(좋은 의도) 자체가, 재현 가능한 fixture 없이 로컬에만 존재하는 실데이터에 의존하는 방식으로 이어짐.

### 기여 요소
- CI가 여러 PR에서 트리거되지 않거나(R-08-1 상황) 늦게 확인되어, 위 두 결함이 병합 시점까지 발견되지 못한 사례가 있었음(PR#870은 CI가 아예 실행된 적이 없었음).

## 조치 (Action)

### 즉시 조치
- DEF-B-010, DEF-B-014 모두 GRANT 추가 + 자기완결형 fixture 기반 테스트로 수정 완료(TeamB_Dev 반영, 전체 회귀 133 files/879 tests PASS 확인).

### 재발 방지 (체계적 조치)
1. **`LIVE_PHASE_2_EXECUTE.md`에 "다중 역할 RLS 커버리지" 체크리스트 신설** (본 SAR 반영, 아래 섹션 참고).
2. **RLS 관련 신규 TASK 배정 시 표준 체크리스트 블록을 task file에 의무 삽입** — Jaison이 향후 DEF-B-XXX(RLS) 유형 TASK 배정 시 이 체크리스트를 그대로 복사해 넣는다.
3. GRANT 누락 여부는 코드 리뷰 시 "CREATE POLICY가 있으면 반드시 대응하는 GRANT 문 존재 여부"를 기계적으로 함께 확인.
4. RLS 회귀 테스트는 반드시 `beforeAll`/`afterAll`에서 자체 fixture를 생성/정리하는 방식만 허용 — 실행 환경(로컬 DB vs CI fresh DB)에 존재가 좌우되는 하드코딩 UUID 금지.

## 체크리스트 항목 (신설)

`docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md`에 아래 섹션 추가 예정:

```markdown
## 🔐 다중 역할 RLS 커버리지 (Multi-Role RLS Coverage) [SAR-2026-07-27-001]
- [ ] **4대 역할 매트릭스**: 신규 테이블 또는 신규 RLS 정책 추가 시 ADMIN(전체) / SHIPPER(화주, 자기 소속) / AGENCY(대행, agency_org_id 매칭) / OPERATOR(운영) 4개 역할 각각에 대해 "이 역할이 이 데이터를 봐야 하는가?"를 명시적으로 판단하고 결과를 커밋 메시지 또는 task file에 기재했는가? AGENCY는 이 세션에서 8회 누락된 이력이 있어 특히 주의.
- [ ] **정책-GRANT 페어링**: `CREATE POLICY`를 추가하는 모든 마이그레이션에 대해, 대상 역할(`authenticated` 등)이 해당 테이블에 대한 기본 GRANT(SELECT/INSERT/UPDATE 등, 정책이 다루는 DML과 동일)를 이미 보유하고 있는지 `information_schema.role_table_grants`로 확인했는가? 없다면 같은 마이그레이션에 `GRANT ... TO authenticated;`를 함께 추가했는가?
- [ ] **RLS 테스트 자기완결성**: RLS 회귀 테스트(`SET LOCAL role/request.jwt.claims` 패턴)가 실행 환경에 이미 존재하는 실데이터(하드코딩된 UUID)에 의존하지 않고, `beforeAll`에서 테스트 전용 fixture(조직/프로필/오더 등)를 직접 생성하고 `afterAll`에서 정리하는가?
- [ ] **fresh DB 기준 검증**: 로컬 장기운영 DB에서의 통과가 아니라, CI(매 실행마다 `supabase db reset`으로 재구성)에서의 통과를 최종 근거로 삼았는가? 로컬 DB는 과거 수기 작업으로 권한/데이터가 오염되어 있을 수 있다.
```

## 재발 방지 확인 (Verification)

- 다음 신규 RLS 관련 TASK부터 위 체크리스트를 task file에 포함해 배정 — 미포함 시 반려 사유로 취급.
- DEF-B-010/DEF-B-014 재수정본은 이미 위 4항목을 모두 만족하는 상태로 병합됨(선례로 참고 가능).

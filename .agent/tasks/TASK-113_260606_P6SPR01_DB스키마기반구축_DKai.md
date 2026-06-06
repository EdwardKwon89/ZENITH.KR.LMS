# TASK-113 — [P6-SPR-01] DB 스키마 기반 구축

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-113 |
| Phase | Phase 6 / SPR-01 |
| 생성일 | 2026-06-06 |
| 발령자 | Aiden (Claude, ZEN_CEO) |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P1 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 관련 IMP | IMP-097 |
| 관련 설계 | [An-11](../../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md) |
| 상태 | 🔔 검토 요청 |

---

## 목표

Phase 6 전체의 DB 기반을 구축한다. `zen_organizations.type` 확장, 신규 요율 테이블 2종 (`zen_customs_rates`, `zen_delivery_rates`), 오더-서비스 배정 테이블 (`zen_order_services`), 역할 확장 (`CUSTOMS_BROKER`, `DELIVERY_AGENT`), 기존 `zen_orders.carrier_id` 전체 일괄 마이그레이션까지 완료한다.

---

## 배경 및 결정 경위

- 고객 리뷰(2026-06-06): 통관사/배송사 역할 신설 + 멀티 서비스 배정 구조 요청
- An-11 설계 확정 (Edward 승인 2026-06-06): 방안 A (org_type 확장) + 방안 A (zen_order_services 중간 테이블) + 별도 요율 테이블
- carrier_id 전체 일괄 마이그레이션 확정

---

## 구현 명세

### 1. Migration 파일 목록 (순서 준수)

**파일 1**: `20260606010000_p6_org_type_role_expansion.sql`
```sql
-- zen_organizations.type: CUSTOMS, DELIVERY 추가
-- zen_role_permissions: CUSTOMS_BROKER, DELIVERY_AGENT 행 추가
-- rbac.ts USER_ROLES, STATIC_PERMISSIONS 코드 수정 포함
```

**파일 2**: `20260606020000_p6_service_rate_tables.sql`
```sql
-- zen_customs_rates 테이블 생성 + RLS
-- zen_delivery_rates 테이블 생성 + RLS
-- zen_rate_cards 기존 CARRIER RLS 추가 (platform_fee_rate 격리 View 포함)
```

**파일 3**: `20260606030000_p6_order_services_table.sql`
```sql
-- zen_order_services 테이블 생성 + RLS
-- zen_orders.carrier_id → zen_order_services 전체 일괄 마이그레이션
-- (기존 carrier_id IS NOT NULL 오더를 TRANSPORT_AIR/SEA/LAND 레코드로 INSERT)
```

### 2. 코드 변경

**`src/lib/auth/rbac.ts`**:
```typescript
export const USER_ROLES = {
  // ... 기존 유지
  CUSTOMS_BROKER: 'CUSTOMS_BROKER',
  DELIVERY_AGENT: 'DELIVERY_AGENT',
} as const;

// STATIC_PERMISSIONS 추가:
CUSTOMS_BROKER: ['/admin/customs-rates', '/orders/assigned', '/tracking', '/voc', '/mypage'],
DELIVERY_AGENT: ['/admin/delivery-rates', '/orders/assigned', '/tracking', '/voc', '/mypage'],
```

**`src/lib/routes.ts`** (또는 config/routes.ts): 신규 경로 등록

**`src/config/routes.ts`**: CUSTOMS_BROKER, DELIVERY_AGENT 메뉴 항목 추가

### 3. 회귀 테스트 확장 (R-09)

`tests/integration/` 하위에 신규 마이그레이션 검증 테스트 또는 기존 테스트 마이그레이션 호환 확인:
- CUSTOMS_BROKER / DELIVERY_AGENT role 생성 가능 여부
- zen_customs_rates / zen_delivery_rates / zen_order_services 테이블 존재 확인
- carrier_id 마이그레이션 데이터 정합성

---

## DoD (Definition of Done)

- [x] Migration 파일 3개 생성 완료 — 파일명·내용 An-11 §3·4 준수
- [x] `zen_customs_rates` 테이블: 컬럼·CHECK constraint·UNIQUE·RLS 정책 실물 확인
- [x] `zen_delivery_rates` 테이블: 컬럼·CHECK constraint·RLS 정책 실물 확인
- [x] `zen_order_services` 테이블: 컬럼·UNIQUE(order_id, service_type)·RLS 실물 확인
- [x] `zen_organizations.type`: CUSTOMS, DELIVERY 값 허용 확인
- [x] `rbac.ts` USER_ROLES: CUSTOMS_BROKER, DELIVERY_AGENT 추가 확인
- [x] `STATIC_PERMISSIONS`: CUSTOMS_BROKER, DELIVERY_AGENT 경로 등록 확인
- [x] carrier_id 마이그레이션: 기존 carrier_id 보유 오더 → zen_order_services 레코드 생성 확인
- [x] `zen_rate_cards_public` View 생성 확인 (platform_fee_rate CARRIER → NULL)
- [x] R-09: `LIVE_REGRESSION_TEST_MAP.md`에 TC-P6-DB-01~05 신규 추가
- [x] 회귀 테스트 전체 PASS — 248/248
- [x] 코드 커밋 → task file 🔔 → ACTIVE_TASK.md 갱신 → DoD 검증 → 문서 커밋 (R-17 순서 엄수)

---

## [설계 의견] — 해당 없음 (단순 Task, 설계 확정 완료)

---

## [작업 결과]

### 구현 완료 항목

**① Migration 1 — org_type 확장 + role permissions (`20260606010000`)**
- `zen_organizations.type` CHECK constraint에 `CUSTOMS`, `DELIVERY` 추가
- `zen_role_permissions`에 `CUSTOMS_BROKER` 5개 경로, `DELIVERY_AGENT` 5개 경로 시드

**② Migration 2 — 신규 요율 테이블 (`20260606020000`)**
- `zen_customs_rates`: 컬럼·UNIQUE·CHECK·RLS 4개 정책 (select/insert/update/delete)
- `zen_delivery_rates`: 컬럼·CHECK(service_type 조건)·RLS 4개 정책
- `zen_rate_cards` CARRIER INSERT/UPDATE RLS 추가
- `zen_rate_cards_public` View 생성 (CARRIER → platform_fee_rate NULL)

**③ Migration 3 — order_services + carrier_id 마이그레이션 (`20260606030000`)**
- `zen_order_services`: 컬럼·RLS 3개 정책(select/insert/update)·UNIQUE(order_id, service_type)
- 기존 carrier_id 보유 오더 → TRANSPORT 레코드 일괄 이관

**④ 코드 변경**
- `rbac.ts`: USER_ROLES에 `CUSTOMS_BROKER`, `DELIVERY_AGENT` 추가 + STATIC_PERMISSIONS 경로 등록
- `routes.ts`: OrgType에 `DELIVERY` 추가 + ORG_ROUTE_MAP에 DELIVERY: '/terminal' 매핑

**⑤ 테스트**
- `rbac.test.ts`: TC-P6-DB-01~05 신규 5건 추가 (CUSTOMS_BROKER/DELIVERY_AGENT 권한 검증)
- `LIVE_REGRESSION_TEST_MAP.md`: TC-P6-DB-01~05 등록, 총 케이스 243→248

**⑥ 회귀**: 49 files / 248 tests ✅ PASS

### 커밋
- **코드 커밋**: `bb9a3fc`
- **커밋 메시지**: `[D_Kai] feat: IMP-097 P6-SPR-01 DB 스키마 기반 구축`

---

## [Aiden 검토]

**검토일**: 2026-06-06
**검토자**: Aiden (Claude, ZEN_CEO)
**판정**: ✅ **PASS**

### 검토 결과

DoD 11개 항목 전량 실물 검증 완료. Migration 3개 정상 생성·내용 An-11 준수. 회귀 테스트 248/248 PASS 확인. R-17 커밋 순서 준수(코드 커밋 `bb9a3fc` 선행·task file 🔔·ACTIVE_TASK 갱신).

**상향 구현 인정**: 마이그레이션 3의 carrier_id TRANSPORT 분기에 `EXP` 케이스 추가 — An-11 명세(`AIR/SEA/LAND/ELSE`) 대비 개선.

### 조건 등록 (TASK-117 DoD 이관)

**GAP-P6-01** — `zen_order_services` INSERT 정책이 ADMIN/MANAGER 전용 구현됨.  
An-11 §5-3에서 INSERT 정책이 명시되지 않아 D_Kai가 보수적으로 적용한 정당한 구현이나, TASK-117(Order 등록 UI) 구현 시 화주(CORPORATE/INDIVIDUAL)의 INSERT가 필요하므로 TASK-117 DoD에 보완 migration 항목으로 이관.  
→ 권장 방안 A: INSERT 정책에 `order_id IN (SELECT id FROM zen_orders WHERE shipper_id = 본인 org_id)` 조건 추가.

TASK-117 착수 전 D_Kai가 방안 확정 후 설계 의견(📝) 제출 의무.

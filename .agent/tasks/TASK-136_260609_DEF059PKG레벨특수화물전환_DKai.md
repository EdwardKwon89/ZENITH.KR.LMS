# TASK-136 — DEF-059 special_cargo_type PKG 레벨 전환 §1~§3 (DB·Zod·RPC·Action)

> **발령일**: 2026-06-09
> **담당 Agent**: D_Kai (OpenCode)
> **우선순위**: P3
> **전제조건**: 없음
> **관련 IMP**: 없음 (DEF-059 해소)
> **상태**: 🔔

---

## 배경 및 목표

현재 `special_cargo_type`은 `zen_orders` 테이블(Order 레벨)에만 존재한다. 실물 물류 환경에서는 하나의 오더에 일반 박스와 위험물 박스가 공존할 수 있으므로, **패키지(PKG) 레벨에서 속성을 관리**해야 한다.

**Edward 확정 지시 (2026-06-09)**:
- 가격 할증 연동 계획 없음 (추후 변경 가능) → 가격 엔진 수정 불필요
- 패키지 속성 관리 목적으로 PKG 레벨 전환 진행
- `zen_orders.special_cargo_type`은 Phase 1에서 유지 (단계적 deprecation, 즉시 삭제 금지)

**목표**: §1 DB 마이그레이션 + §2 Zod 스키마 + §3 RPC + §4 Server Action 수정 (UI는 TASK-137)

---

## 작업 범위

### §1 — DB 마이그레이션 2건

**마이그레이션 파일명**: `20260610000000_def059_pkg_special_cargo_type.sql`

```sql
-- 1. zen_order_packages에 special_cargo_type 추가
ALTER TABLE public.zen_order_packages
  ADD COLUMN IF NOT EXISTS special_cargo_type TEXT NOT NULL DEFAULT 'NONE'
  CHECK (special_cargo_type IN ('NONE','DANGEROUS','FROZEN','VALUABLE','USED'));

COMMENT ON COLUMN public.zen_order_packages.special_cargo_type IS
  'PKG 단위 특수화물 구분 (DEF-059, 2026-06-09). 이전: zen_orders.special_cargo_type (Order 레벨)';

-- 2. 기존 zen_orders의 값을 해당 order의 첫 번째 PKG에 복사
UPDATE public.zen_order_packages AS p
SET special_cargo_type = o.special_cargo_type
FROM (
  SELECT DISTINCT ON (zen_order_packages.order_id)
    zen_order_packages.id AS pkg_id,
    zen_orders.special_cargo_type
  FROM zen_order_packages
  JOIN zen_orders ON zen_order_packages.order_id = zen_orders.id
  WHERE zen_orders.special_cargo_type != 'NONE'
  ORDER BY zen_order_packages.order_id, zen_order_packages.created_at ASC
) AS o
WHERE p.id = o.pkg_id;

-- 3. zen_orders.special_cargo_type: DEPRECATED 주석 추가 (컬럼 유지)
COMMENT ON COLUMN public.zen_orders.special_cargo_type IS
  '[DEPRECATED] PKG 레벨로 이전됨 → zen_order_packages.special_cargo_type (DEF-059). 
   이 컬럼은 하위 호환성을 위해 유지되며 추후 삭제 예정.';
```

### §2 — Zod 스키마 수정

파일: `src/lib/validation/order.ts`

1. `orderPackageSchema`에 `special_cargo_type` 추가:
```ts
special_cargo_type: z.enum(['NONE','DANGEROUS','FROZEN','VALUABLE','USED']).default('NONE'),
```

2. `orderRegistrationSchema`에서 `special_cargo_type` 제거 (IMP-076 주석 포함 삭제)

### §3 — RPC 수정

신규 마이그레이션 파일: `20260610000100_def059_create_order_atomic_pkg_cargo.sql`

기존 `create_order_atomic` RPC의 PKG INSERT 구문에 `special_cargo_type` 추가:

```sql
-- zen_order_packages INSERT 루프에서
INSERT INTO public.zen_order_packages (
  order_id,
  packing_unit,
  packing_count,
  length,
  width,
  height,
  gross_weight,
  volume,
  special_cargo_type,  -- 추가
  created_at
) VALUES (
  v_order_id,
  v_pkg.packing_unit,
  v_pkg.packing_count,
  ...
  COALESCE(v_pkg.special_cargo_type, 'NONE'),  -- 추가
  NOW()
);
```

> ⚠️ 최신 RPC 마이그레이션(`20260530140000_fix_create_order_atomic_cargo_details.sql`)의 전체 함수를 `CREATE OR REPLACE FUNCTION`으로 교체. 기존 `zen_orders` INSERT에서 `special_cargo_type` 제거 (Order 레벨 deprecated).

### §4 — Server Action 수정

파일: `src/app/actions/operations/orders.ts`

- `updateOrder()` 호출부에서 `special_cargo_type: validated.special_cargo_type` 제거 (L75)
- `insertPackage()` 호출부에서 `special_cargo_type: pkg.special_cargo_type` 추가:

```ts
await orderRepo.insertPackage({
  order_id: orderId,
  packing_unit: pkg.packing_unit,
  ...
  special_cargo_type: pkg.special_cargo_type ?? 'NONE',  // 추가
});
```

### §5 — 회귀 테스트

```bash
rtk npm run test:regression
```

### §6 — R-17 완료 보고

R-17 v1.6 절차 준수 (코드 커밋 선행 필수):
1. **코드 커밋**: `[D_Kai] feat: DEF-059 §1~§3 PKG 레벨 special_cargo_type 전환 (DB+Zod+RPC+Action)`
2. task file [작업 결과] + **헤더 상태 ⬜→🔔** 변경
3. ACTIVE_TASK.md 상태 반영 + TASK-137 블로커 해제 기재
4. IMP_PROGRESS.md: 해당 없음
5. `check-R17-DoD` 실행
6. 문서 커밋

---

## DoD (완료 정의)

- [x] 마이그레이션: `zen_order_packages.special_cargo_type` 컬럼 추가 확인
  - 증빙: `supabase/migrations/20260610000000_def059_pkg_special_cargo_type.sql` ✅
- [x] 마이그레이션: 기존 `zen_orders.special_cargo_type != 'NONE'` 레코드 첫 PKG에 복사 로직 포함 확인
  - 증빙: UPDATE 구문 (DISTINCT ON + JOIN) ✅
- [x] 마이그레이션: `zen_orders.special_cargo_type` DEPRECATED 주석 추가 확인 (컬럼 유지)
  - 증빙: COMMENT ON COLUMN 구문 ✅
- [x] `orderPackageSchema`에 `special_cargo_type` 추가 확인
  - 증빙: `src/lib/validation/order.ts:28` ✅
- [x] `orderRegistrationSchema`에서 `special_cargo_type` 제거 확인
  - 증빙: `src/lib/validation/order.ts:68` 삭제 ✅
- [x] RPC PKG INSERT에 `special_cargo_type` 포함 확인
  - 증빙: `supabase/migrations/20260610000100_def059_create_order_atomic_pkg_cargo.sql` ✅
- [x] Server Action `insertPackage` 호출부에 `special_cargo_type` 포함 확인
  - 증빙: `orders.ts:91` ✅
- [x] 빌드 PASS 확인
  - 증빙: 0 Errors, 0 Warnings ✅
- [x] 회귀 테스트 전체 PASS
  - 증빙: 316/316 ✅
- [x] TC-A.5 test PKG 레벨로 수정
  - 증빙: `order-actions.test.ts:167` ✅
- [x] 코드 커밋 해시: `ad22883`

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | — | — | — |

---

## [설계 의견]

_(해당 없음 — 직행)_

---

## [설계 확정]

**2026-06-09 Aiden 확정** (Edward 지시 반영):
- 가격 엔진 수정 없음 (현재 가격 할증 계획 없음, 추후 변경 가능)
- `zen_orders.special_cargo_type` 즉시 DROP 금지 — DEPRECATED 주석 + 유지
- 기존 주문 데이터 마이그레이션 포함 (첫 PKG 복사)
- UI 변경은 TASK-137(B_Kai)에 이관

---

## [작업 결과]

### §1 DB 마이그레이션 1 ✅
- `supabase/migrations/20260610000000_def059_pkg_special_cargo_type.sql`
  - `zen_order_packages.special_cargo_type ADD COLUMN` (CHECK: NONE/DANGEROUS/FROZEN/VALUABLE/USED)
  - 기존 `zen_orders.special_cargo_type != 'NONE'` 데이터 첫 PKG 복사 UPDATE
  - `zen_orders.special_cargo_type` DEPRECATED COMMENT 추가 (컬럼 유지)

### §1 DB 마이그레이션 2 (RPC) ✅
- `supabase/migrations/20260610000100_def059_create_order_atomic_pkg_cargo.sql`
  - `create_order_atomic` RPC: `zen_orders` INSERT에서 `special_cargo_type` 제거
  - packages `jsonb_to_recordset`에 `special_cargo_type TEXT` 추가
  - `zen_order_packages` INSERT에 `special_cargo_type` 포함 (`COALESCE(v_pkg.special_cargo_type, 'NONE')`)

### §2 Zod 스키마 ✅
- `src/lib/validation/order.ts`:
  - `orderPackageSchema`에 `special_cargo_type: z.enum([...]).default('NONE')` 추가
  - `orderRegistrationSchema`에서 `special_cargo_type` 제거 (DEPRECATED)

### §4 Server Action ✅
- `src/app/actions/operations/orders.ts`:
  - `updateOrder()`: `updateHeader` 호출부에서 `special_cargo_type` 제거
  - `insertPackage` 호출부에 `special_cargo_type: pkg.special_cargo_type ?? 'NONE'` 추가

### 테스트 ✅
- 회귀: 316/316 PASS
- 빌드: 0 Errors, 0 Warnings
- DB 마이그레이션: 로컬 DB 적용 완료 (0건 UPDATE — 데이터 없음)

---

## [Aiden 검토]

**2026-06-09 Aiden ✅ 승인**

DoD 10/10 전항목 체크 완료. 코드 커밋 `ad22883` 실존 확인. 마이그레이션 2건(ADD COLUMN + UPDATE copy + DEPRECATED comment / RPC PKG INSERT 확장), Zod 스키마 수정, Server Action 수정 모두 실물 검증. 빌드 PASS, 316/316 PASS. R-17 커밋 순서 준수.

**Advisory**: 문서 커밋에서 TASK-137 블로커 전환(🚫→⬜) 선제 처리 — R-17 "블로커 전환은 Aiden 전속" 위반. 비차단. D_Kai 새로운 위반 유형("ACTIVE_TASK 내용 조작")으로 별도 카운트.

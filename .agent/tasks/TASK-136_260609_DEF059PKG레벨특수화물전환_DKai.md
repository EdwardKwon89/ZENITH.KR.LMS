# TASK-136 — DEF-059 special_cargo_type PKG 레벨 전환 §1~§3 (DB·Zod·RPC·Action)

> **발령일**: 2026-06-09
> **담당 Agent**: D_Kai (OpenCode)
> **우선순위**: P3
> **전제조건**: 없음
> **관련 IMP**: 없음 (DEF-059 해소)
> **상태**: ⬜

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

- [ ] 마이그레이션: `zen_order_packages.special_cargo_type` 컬럼 추가 확인
  - 증빙: 마이그레이션 파일 경로
- [ ] 마이그레이션: 기존 `zen_orders.special_cargo_type != 'NONE'` 레코드 첫 PKG에 복사 로직 포함 확인
  - 증빙: UPDATE 구문 코드 리뷰
- [ ] 마이그레이션: `zen_orders.special_cargo_type` DEPRECATED 주석 추가 확인 (컬럼 유지)
  - 증빙: COMMENT ON COLUMN 구문 확인
- [ ] `orderPackageSchema`에 `special_cargo_type` 추가 확인
  - 증빙: `src/lib/validation/order.ts` 코드 경로
- [ ] `orderRegistrationSchema`에서 `special_cargo_type` 제거 확인
  - 증빙: 해당 줄 삭제 확인
- [ ] RPC PKG INSERT에 `special_cargo_type` 포함 확인
  - 증빙: 마이그레이션 파일 경로
- [ ] Server Action `insertPackage` 호출부에 `special_cargo_type` 포함 확인
  - 증빙: `orders.ts` 파일 경로 + 라인
- [ ] 빌드 PASS 확인
  - 증빙: `npm run build` 결과
- [ ] 회귀 테스트 전체 PASS
  - 증빙: N/N 수치
- [ ] 코드 커밋 해시:

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

_(D_Kai 작성)_

---

## [Aiden 검토]

_(검토 후 기재)_

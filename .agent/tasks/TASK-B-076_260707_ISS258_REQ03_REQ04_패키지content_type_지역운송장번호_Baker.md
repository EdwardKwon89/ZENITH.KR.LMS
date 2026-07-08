# TASK-B-076 — REQ-03/04 패키지 content_type(GENERAL/DOC/NONDOC) + 지역운송장번호

> **발령일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P2
> **상태**: 🔔 Aiden 승인 완료 — develop 병합 충돌 rebase 해소, 병합 대기
> **연관 이슈**: [Issue #258](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/258)
> **설계 원본**: [Issue #254](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/254) · `.agent/tasks/TASK-B-074_260707_ISS254_오더폼보완_설계.md`
> **설계 확정**: EXP 유지, UI 라벨 "UPS Direct" (2026-07-08 사용자 확인)
> **브랜치**: `feature/teamb-task-b076-iss258-v3`
> **전제조건**: TASK-B-077 ✅ (PR#262 머지 완료)

---

## 배경

오더 등록 폼 패키지에 `content_type`(GENERAL/DOC/NONDOC) 필드와 `domestic_ref_no`(지역운송장번호) 필드를 추가합니다.

- `content_type`은 스키마/RPC/UI 모두 신규 추가가 필요합니다.
- `domestic_ref_no`는 DB 컬럼이 이미 존재하며, RPC/UI만 누락되어 있습니다.

---

## 작업 범위

### REQ-03 | content_type 확장

**Aiden 확정 설계**:
- `content_type` 허용값: `GENERAL` / `DOC` / `NONDOC`
- 기본값: `GENERAL`
- DOC/NONDOC UI: **`transport_mode === 'UPS'` 선택 시에만 표시**
- 타 운송 모드(AIR/SEA/EXP/LAND)에서는 content_type 셀렉트 미노출, 값 `GENERAL` 자동 저장

#### ① DB 마이그레이션

파일: `supabase/migrations/20260708000100_ord_001_pkg_content_type.sql`

```sql
ALTER TABLE public.zen_order_packages
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'GENERAL'
    CHECK (content_type IN ('GENERAL', 'DOC', 'NONDOC'));

COMMENT ON COLUMN public.zen_order_packages.content_type
  IS '화물 유형: GENERAL=일반, DOC=서류(UPS), NONDOC=일반화물(UPS). DOC 선택 시 치수 입력 불필요.';
```

#### ② `orderPackageSchema` 수정 (`src/lib/validation/order.ts`)

```ts
content_type: z.enum(['GENERAL', 'DOC', 'NONDOC']).default('GENERAL'),
```

#### ③ `create_order_atomic` RPC 수정

파일: `supabase/migrations/20260708000200_rpc_create_order_atomic_v4.sql`

packages JSONB 파서에 `content_type`, `domestic_ref_no` 추가:

```sql
FOR v_pkg IN SELECT * FROM jsonb_to_recordset(p_payload->'packages') AS x(
  ...,
  content_type TEXT,
  domestic_ref_no TEXT,
  items JSONB
) LOOP
  INSERT INTO public.zen_order_packages (..., content_type, domestic_ref_no)
  VALUES (..., COALESCE(v_pkg.content_type, 'GENERAL'), v_pkg.domestic_ref_no);
```

#### ④ `OrderRegistrationForm.tsx` UI

```tsx
{/* transport_mode === 'UPS'일 때만 content_type 셀렉트 표시 */}
{transportMode === 'UPS' && (
  <div className="col-span-2">
    <select {...register(`packages.${i}.content_type`)}>
      <option value="NONDOC">NONDOC</option>
      <option value="DOC">DOC</option>
    </select>
  </div>
)}
```

DOC 선택 시 Dimensions 비활성화:
```tsx
const isDoc = watch(`packages.${i}.content_type`) === 'DOC';
// L/W/H 입력에 disabled={isDoc} 및 opacity-40 스타일 적용
// DOC 전환 시 L/W/H 값 undefined로 초기화 (useEffect)
```

#### ⑤ `updateOrder()` 수정 (`src/app/actions/operations/orders.ts`)

```ts
await orderRepo.insertPackage({
  ...,
  content_type: pkg.content_type ?? 'GENERAL',
  domestic_ref_no: pkg.domestic_ref_no ?? null,
});
```

---

### REQ-04 | domestic_ref_no (지역운송장번호)

**현황**: `zen_order_packages.domestic_ref_no` 컬럼 이미 존재 (migration 20260614). UI/RPC만 누락.

#### ① `orderPackageSchema` 필드 추가

```ts
domestic_ref_no: z.string().optional(),
```

#### ② UI 추가 — 패키지 row 하단 별도 행

```tsx
<div className="col-span-4 mt-2">
  <label className="text-[9px] font-bold text-slate-400">
    LOCAL TRACKING NO <span className="text-[8px] text-slate-300">(지역택배 운송장)</span>
  </label>
  <ZenInput
    placeholder="지역 택배 운송장번호 입력 (선택)"
    {...register(`packages.${i}.domestic_ref_no`)}
    className="py-2 text-xs"
  />
</div>
```

---

## DoD

- [x] DB 마이그레이션: `content_type` 컬럼 추가 (GENERAL/DOC/NONDOC CHECK)
- [x] `create_order_atomic` RPC에 `content_type`, `domestic_ref_no` 파싱 추가
- [x] `orderPackageSchema` 필드 추가
- [x] `OrderRegistrationForm.tsx` — transport_mode=EXP 시 content_type 셀렉트 표시 (설계 보완: UPS → EXP, UI 라벨은 UPS Direct)
- [x] DOC 선택 시 L/W/H 비활성화 + 값 초기화
- [x] `domestic_ref_no` 입력 필드 추가
- [x] `updateOrder()` content_type/domestic_ref_no 저장 반영
- [x] 회귀 테스트 PASS (`rtk npm run test:regression`)
- [x] R-17 커밋 순서 엄수 + PR 생성 (`Closes #258`)

---

## 설계 보완 이력

| 항목 | Issue #258 원안 | TASK-B-076 구현 | 사유 |
|:-----|:---------------|:----------------|:-----|
| content_type 노출 조건 | `transport_mode === 'UPS'` | `transport_mode === 'EXP'` | 현재 `transport_mode` enum에 'UPS' 값 없음. TASK-168에서 `transport_mode === 'UPS'` 검사가 버그로 수정된 이력 있음. 실제 UPS 오더는 `EXP`로 저장됨. |
| 운송 모드 버튼 라벨 | '특송' | 'UPS Direct' | 사용자 지시 — UI 라벨만 변경, DB 값은 `EXP` 유지 |

---

## 착수 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b076-iss258-v3
```

---

## [작업 결과]

### 수정 내용
1. **DB 마이그레이션** (`supabase/migrations/20260708000100_ord_001_pkg_content_type.sql`)
   - `zen_order_packages.content_type` 컬럼 추가 (GENERAL/DOC/NONDOC CHECK, DEFAULT 'GENERAL')

2. **RPC 마이그레이션** (`supabase/migrations/20260708000200_rpc_create_order_atomic_v4.sql`)
   - `create_order_atomic` packages JSONB 파서에 `content_type`, `domestic_ref_no` 추가
   - INSERT 시 `COALESCE(content_type, 'GENERAL')`, `domestic_ref_no` 저장

3. **Zod 스키마** (`src/lib/validation/order.ts`)
   - `orderPackageSchema`에 `content_type` (enum GENERAL/DOC/NONDOC, default GENERAL) 추가
   - `orderPackageSchema`에 `domestic_ref_no` (optional string) 추가

4. **UI** (`src/components/orders/OrderRegistrationForm.tsx`)
   - 운송 모드 버튼 라벨 '특송' → 'UPS Direct'
   - `transport_mode === 'EXP'`일 때만 `content_type` 셀렉트(NONDOC/DOC) 표시
   - DOC 선택 시 L/W/H 입력 `disabled` + `opacity-40` 처리
   - DOC 전환 시 L/W/H 값 `undefined`로 초기화 (useEffect)
   - 패키지 row 하단에 `domestic_ref_no` 입력 필드 추가
   - `appendPackage` 및 `useForm` defaultValues에 `content_type: 'GENERAL'`, `domestic_ref_no: ''` 추가

5. **Server Action** (`src/app/actions/operations/orders.ts`)
   - `updateOrder()`의 `insertPackage` 호출에 `content_type`, `domestic_ref_no` 전달

### 반려 후 조치
- develop 최신에서 `feature/teamb-task-b076-iss258-v2` 브랜치 신규 생성
- B-075 커밋 교차 오염 제거
- 마이그레이션 파일명을 `20260708000100`, `20260708000200`로 변경하여 버전 중복 해소
- 설계 확정: `EXP` 유지, UI 라벨 "UPS Direct"

### 검증
- `npm run build` **PASS**
- `npm run test:regression` **81 files, 489/489 PASS**
### 커밋

- 코드: `a3eef64` — `[Baker] feat: TASK-B-076 REQ-03/04 패키지 content_type + domestic_ref_no (v3)`
- 문서: `ac6f26e` — `[Baker] docs: TASK-B-076 재제출 완료 보고 — v3 브랜치, 코드 해시, ACTIVE_TASK.md 갱신`
- 문서: `526ceaf` — `[Baker] docs: TASK-B-076 PR#266 기록 및 ACTIVE_TASK.md 상태 갱신`

### PR
- PR#266: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/266 (`feature/teamb-task-b076-iss258-v3` → `develop`, `Closes #258`)

### 병합 충돌 해소 (2026-07-08)
- Aiden 내용 승인 후 PR#265(`TASK-B-075`) 선 병합으로 `OrderRegistrationForm.tsx` 충돌 발생
- `feature/teamb-task-b076-iss258-v3`를 `origin/develop` 최신으로 rebase
- 충돌 지점: EXP 모드 셀 — develop(B-075)의 정적 "EXP" 표시 vs B-076의 `content_type` 셀렉트
- 해소: B-076 기능(`content_type` 셀렉트) 유지, B-075 "EXP" 정적 표시는 대체 제거
- rebase 과정에서 B-075 교차 오염 제거 커밋(`a9c1bb8`)이 B-076 변경을 되돌리는 형태로 포함되어 해당 커밋 drop 처리
- 검증: `npm run build` PASS, `npm run test:regression` 81 files / 489/489 PASS
- force-push 완료: `git push --force-with-lease origin feature/teamb-task-b076-iss258-v3`

---

## [발견 이슈]

### 반려 기록 (2026-07-08, Jaison)

| # | 사유 | 조치 |
|:--|:-----|:-----|
| 1 | **브랜치 교차 오염**: `feature/teamb-task-b076-iss258`에 Dave의 B-075 커밋(`8c21ea7`)이 포함됨 | ✅ develop 최신에서 `feature/teamb-task-b076-iss258-v2` 브랜치 신규 생성, B-075 커밋 제거 |
| 2 | **마이그레이션 버전 중복**: `20260708` 접두사 중복 | ✅ `20260708000100_ord_001_pkg_content_type.sql`, `20260708000200_rpc_create_order_atomic_v4.sql`로 변경 |
| 3 | **PR 미생성/종료**: PR#263 CLOSED 상태 | ✅ 신규 PR 생성 예정 |
| 4 | **설계 이탈**: `transport_mode === 'EXP'` 사용은 Aiden 확정 설계(`'UPS'`)와 다름 | ✅ 사용자 확인: `EXP` 유지, UI 라벨 "UPS Direct" |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-08 | Jaison | TASK-B-076 발령 — Issue #258 생성 |
| 2026-07-08 | Baker | TASK-B-076 착수 — feature/teamb-task-b076-iss258 브랜치 생성 |
| 2026-07-08 | Baker | TASK-B-076 PR#263 제출 |
| 2026-07-08 | Jaison | TASK-B-076 반려 — 구조적 문제 3건 + 설계 이탈 1건 |
| 2026-07-08 | Baker | TASK-B-076 재착수 — EXP 유지 확정, 브랜치/마이그레이션 버전 정리 |
| 2026-07-08 | Baker | TASK-B-076 Aiden 승인 — PR#265 선 병합 충돌 rebase 해소, force-push 완료, 병합 대기 |

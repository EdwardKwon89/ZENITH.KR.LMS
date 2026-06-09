# TASK-137 — DEF-059 special_cargo_type UI 전환 §4 (PKG 카드 이동)

> **발령일**: 2026-06-09
> **담당 Agent**: B_Kai (OpenCode)
> **우선순위**: P3
> **전제조건**: TASK-136 ✅ (D_Kai DB+Zod+RPC+Action 완료)
> **관련 IMP**: 없음 (DEF-059 UI 이관)
> **상태**: ⬜

---

## 배경 및 목표

TASK-136(D_Kai)에서 DB·Zod·RPC·Server Action의 `special_cargo_type`을 PKG 레벨로 전환한다. 본 Task는 **UI 이관** 전담이다.

- Step 1 "Special Cargo Selection" 섹션 제거
- 각 PKG 카드에 cargo_type 선택 UI 추가
- `supabase.ts` 타입 갱신

**목표**: `OrderRegistrationForm.tsx` PKG 카드에 special_cargo_type 선택 UI 이동

---

## 작업 범위

### §1 — Step 1 Special Cargo 섹션 제거

파일: `src/components/orders/OrderRegistrationForm.tsx`

- Step 1 좌측 컬럼의 "Special Cargo Selection" 카드 섹션 전체 제거
  - `watch('special_cargo_type')` 참조 제거
  - `setValue('special_cargo_type', ...)` 핸들러 제거
  - 관련 렌더링 JSX 제거

### §2 — PKG 카드에 cargo_type 선택 UI 추가

각 패키지 카드(`packages.${index}.*`) 내부에 아래 UI 추가:

```tsx
// cargo_type 선택 — 라디오 버튼 또는 select
<div>
  <label>화물 구분</label>
  <select {...register(`packages.${index}.special_cargo_type`)}>
    <option value="NONE">일반</option>
    <option value="DANGEROUS">위험물</option>
    <option value="FROZEN">냉동/냉장</option>
    <option value="VALUABLE">고가품</option>
    <option value="USED">중고품</option>
  </select>
</div>
```

- 기존 `orderRegistrationSchema`에서 `special_cargo_type`이 제거되고 `orderPackageSchema`에 추가되었으므로, `useForm<OrderRegistrationInput>`의 타입이 자동 반영됨
- 다국어: 기존 `SPECIAL_CARGO_TYPES` 코드가 있다면 활용, 없으면 하드코딩 (i18n 확장은 별도)

### §3 — supabase.ts 타입 갱신

`src/types/supabase.ts`에서 `zen_order_packages` Row 타입에 `special_cargo_type` 추가:

```ts
// zen_order_packages Row 타입
special_cargo_type: string  // 기존 null → string (DEFAULT 'NONE')
```

> `npx supabase gen types typescript` 실행이 가능한 경우 자동 생성 사용. 불가한 경우 수동 추가.

### §4 — 빌드 & 회귀 테스트

```bash
rtk npm run test:regression
```

### §5 — R-17 완료 보고

R-17 v1.6 절차 준수:
1. **코드 커밋**: `[B_Kai] feat: DEF-059 §4 UI 전환 — PKG 카드에 special_cargo_type 선택 UI 이동`
2. task file [작업 결과] + **헤더 상태 🔄→🔔** 변경
3. ACTIVE_TASK.md 상태 반영
4. IMP_PROGRESS.md: 해당 없음
5. `check-R17-DoD` 실행
6. 문서 커밋

---

## DoD (완료 정의)

- [ ] Step 1 "Special Cargo Selection" 섹션 제거 확인
  - 증빙: `OrderRegistrationForm.tsx` 해당 섹션 없음
- [ ] PKG 카드에 `special_cargo_type` 선택 UI 추가 확인
  - 증빙: `packages.${index}.special_cargo_type` register 코드 확인
- [ ] `supabase.ts` `zen_order_packages` 타입에 `special_cargo_type` 필드 확인
  - 증빙: 파일 경로 + 라인
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

_(해당 없음 — TASK-136 설계 확정 인계)_

---

## [설계 확정]

**2026-06-09 Aiden 확정**: TASK-136(D_Kai) 완료 후 즉시 착수. UI만 변경, 가격 엔진 미수정.

---

## [작업 결과]

_(B_Kai 작성)_

---

## [Aiden 검토]

_(검토 후 기재)_

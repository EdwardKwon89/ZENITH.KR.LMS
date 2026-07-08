# TASK-B-077 — REQ-05 아이템 가격 UI 노출 (unit_price)

> **발령일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P3
> **상태**: 🔔 검토 요청
> **연관 이슈**: [Issue #256](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/256)
> **설계 원본**: [Issue #254](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/254) · `.agent/tasks/TASK-B-074_260707_ISS254_오더폼보완_설계.md`

---

## 배경

오더 등록 폼 `NestedItems` 컴포넌트에 `unit_price` 입력 필드와 통화(currency) 셀렉트를 추가합니다.

`unit_price` 필드는 스키마(`orderItemSchema`), DB(`zen_order_items`), RPC 모두 완비되어 있으나 `NestedItems` UI에서만 미노출 상태였습니다.

---

## 작업 범위

**파일**: `src/components/orders/OrderRegistrationForm.tsx` — `NestedItems` 인라인 컴포넌트

### 그리드 재배치 (12컬럼)

| 현재 | 변경 후 |
|:-----|:-------|
| item_name(4) qty(2) hs_code(3) unit(2) delete(1) | item_name(3) qty(1) unit_price(2) currency(1) hs_code(3) unit(1) delete(1) |

### 추가 코드

```tsx
{/* unit_price — 소수점 4자리 */}
<div className="col-span-2">
  <ZenInput
    type="number"
    step="0.0001"
    min="0"
    placeholder="0.0000"
    {...register(`packages.${nestIndex}.items.${k}.unit_price`, { valueAsNumber: true })}
    className="bg-white py-2 text-xs"
  />
</div>
{/* currency */}
<div className="col-span-1">
  <select
    {...register(`packages.${nestIndex}.items.${k}.currency`)}
    className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg"
  >
    <option value="USD">USD</option>
    <option value="KRW">KRW</option>
    <option value="EUR">EUR</option>
    <option value="JPY">JPY</option>
    <option value="CNY">CNY</option>
  </select>
</div>
```

---

## DoD

- [x] `NestedItems` 그리드 재배치 완료 (12컬럼 내 unit_price + currency 추가)
- [x] `unit_price` step="0.0001" 소수점 4자리 입력 가능
- [x] currency 셀렉트: USD/KRW/EUR/JPY/CNY
- [x] 기존 item_name/qty/hs_code/unit 입력 기능 회귀 없음
- [x] 회귀 테스트 PASS (`rtk npm run test:regression`)
- [x] R-17 커밋 순서 엄수 (코드 커밋 → task file 🔔 → PR 생성)
- [x] PR: `feature/teamb-task-b077` → `develop`, `Closes #256`

---

## 착수 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b077
```

---

## [작업 결과]

### 수정 내용
- `src/components/orders/OrderRegistrationForm.tsx` 내 `NestedItems` 컴포넌트
  - 아이템 행 그리드를 `item_name(3) qty(1) unit_price(2) currency(1) hs_code(3) unit(1) delete(1)`로 재배치
  - `unit_price` 입력 필드 추가 (type="number", step="0.0001", min="0", placeholder="0.0000")
  - `currency` 셀렉트 추가 (USD/KRW/EUR/JPY/CNY)
  - 기존 필드(item_name, quantity, hs_code, item_packing_unit) 기능 유지

### 검증
- `npm run build` **PASS**
- `npm run test:regression` **81 files, 489/489 PASS**

### 커밋
- 코드: `6b85fde` — `[Baker] feat: TASK-B-077 REQ-05 NestedItems unit_price + currency UI 노출`
- 문서: `<TBD>` — `[Baker] docs: TASK-B-077 완료 보고 — task file + ACTIVE_TASK.md`

### PR
- PR#NNN: `feature/teamb-task-b077` → `develop` (`Closes #256`)

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Jaison | TASK-B-077 발령 — Issue #256 생성 |
| 2026-07-07 | Baker | TASK-B-077 구현 완료 및 검토 요청 |

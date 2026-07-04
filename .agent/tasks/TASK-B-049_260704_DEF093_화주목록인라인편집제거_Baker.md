# TASK-B-049: DEF-093 화주목록 인라인 "수정" 버튼 제거 + 테이블 정리

> **태스크 ID**: TASK-B-049
> **생성일**: 2026-07-04
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P2
> **상태**: ⬜
> **관련 DEF**: DEF-093
> **선행 Task**: 없음
> **후행 Task**: 없음

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-049-def093-shippers-table-baker
```

완료 보고: 코드 커밋 → task file 🔔 기재 → ACTIVE_TASK 반영 → PR 생성 (`Closes #DEF-093`)

---

## 배경

TASK-B-048에서 화주 상세편집(`/edit`) 페이지가 추가되었으나, 기존 인라인 편집 버튼("수정")이 제거되지 않아 중복 기능이 공존.  
"수정" 버튼 제거 및 인라인 편집 인프라 전체를 제거하여 테이블을 단순화한다.

---

## 구현 범위

### §1 — `editable-cell.tsx`

**ActionCell 변경**:
- 비편집 상태: "수정" 버튼 제거 → "상세 편집" 버튼만 유지
- 편집 상태(isEditing): 더 이상 사용되지 않으므로 분기 제거
- 최종 형태: `<button onClick={navigateToEdit}>상세 편집</button>` 단일 버튼

**EditableGradeCell 단순화**:
- `isEditing` 분기 제거 → 항상 display 모드 (span으로 등급 표시)

**EditableRateCell 단순화**:
- `isEditing` 분기 제거 → 항상 display 모드 (span으로 할인율 표시)

### §2 — `shipper-table-row.tsx`

제거 대상 props:
- `isEditing`, `editGrade`, `editRate`
- `onEdit`, `onCancel`, `onSave`
- `onGradeChange`, `onRateChange`

`ActionCell`에 `shipperId` prop만 유지.

### §3 ��� `shipper-table.tsx`

제거 대상 props (모두 제거):
- `editingId`, `editGrade`, `editRate`
- `onEdit`, `onCancel`, `onSave`
- `onGradeChange`, `onRateChange`

### §4 — `shippers-client.tsx`

제거 대상:
- `editingId`, `editGrade`, `editRate`, `error` state
- `startEdit`, `cancelEdit`, `saveEdit` handler
- `updateAgencyShipperGrade` import

단순화 후 형태:
```tsx
export function AgencyShippersClient({ shippers }) {
  const t = useTranslations('AgencyShippers');
  return (
    <div className="...">
      <ShippersHeader t={t} />
      <ShipperTable shippers={shippers} t={t} />
    </div>
  );
}
```

---

## DoD (Definition of Done)

- [ ] "수정" 버튼 ActionCell에서 완전 제거
- [ ] EditableGradeCell — display 전용 (select 없음)
- [ ] EditableRateCell — display 전용 (input 없음)
- [ ] ShipperTableRow — 인라인 편집 props 모두 제거
- [ ] ShipperTable — 인라인 편집 props 모두 제거
- [ ] AgencyShippersClient — 인라인 편집 state/handler 모두 제거
- [ ] TypeScript 빌드 오류 없음
- [ ] `npm run test:regression` — 전항목 PASS
- [ ] 코드 커밋 해시: (기재 예정)
- [ ] PR 생성: (기재 예정)

---

## [작업 결과]

_(착수 후 기재)_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성��� | 내용 |
|:-----|:------|:----|
| 2026-07-04 | Jaison | TASK-B-049 발령 — DEF-093 화주목록 인라인 편집 제거 |

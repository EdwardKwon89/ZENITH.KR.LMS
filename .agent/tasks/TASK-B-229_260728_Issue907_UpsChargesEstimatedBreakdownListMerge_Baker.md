# TASK-B-229: Issue #907 — ups-actual-charges 예상청구액 상세를 별도 카드에서 청구 항목 리스트로 통합

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#907](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/907) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

JSJung 직접 지시(2026-07-27): "예상운임을 별도 카드로 표출하는게 아니라, 아래 리스트에 추가했으면 하는데". 현재 `/admin/ups-actual-charges`는 "예상 청구액 상세 (Estimated Breakdown)"를 편집 테이블과 분리된 별도 카드로 보여주고 있음 — 이를 아래 "청구 항목" 편집 리스트에 합쳐서 하나의 리스트로 통합합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

사용자가 "읽기전용 행 + 구분 표시" 방식을 선택했습니다:
- 예상운임 항목들을 편집 테이블 **상단에 읽기전용 행**으로 표시(수정/삭제 불가)
- 새 "구분(Type)" 컬럼을 테이블 첫 컬럼으로 추가 — 예상 항목은 "예상", admin이 등록하는 기존 부가요금 행은 "추가"로 표시
- 기존 "예상 청구액 상세" 별도 카드는 제거
- 요약 카드 3개(예상 청구액/실제 청구액/조정 차액)는 변경 없음 — 이번 변경은 리스트 레이아웃에만 한정

## 구현 스펙 (`src/components/orders/UpsActualAdjustmentForm.tsx`)

1. **제거**: 179~192행 "예상 청구액 상세 (Estimated Breakdown)" `ZenCard` 블록 전체 삭제.
2. **테이블 헤더**(254~260행)에 "구분" 컬럼을 첫 번째로 추가:
   ```tsx
   <th className="p-3 w-20">구분</th>
   <th className="p-3 w-1/3">청구 유형 (Charge Type)</th>
   <th className="p-3 w-1/6">금액 (Amount)</th>
   <th className="p-3 w-1/12">통화</th>
   <th className="p-3 w-1/3">메모</th>
   {isEditable && <th className="p-3 w-10"></th>}
   ```
3. **`<tbody>` 최상단**에 `reconciliation.estimatedBreakdown`을 읽기전용 행으로 렌더링(기존 `charges.map` 앞에 추가):
   ```tsx
   {reconciliation?.estimatedBreakdown?.map((item, i) => (
     <tr key={`est-${i}`} className="border-b bg-gray-50/50 dark:bg-zinc-900/50">
       <td className="p-3"><ZenBadge className="bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300">예상</ZenBadge></td>
       <td className="p-3 font-semibold">{getCostTypeLabel(item.costType)}</td>
       <td className="p-3"><span className="font-mono text-right block">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
       <td className="p-3">{item.currency}</td>
       <td className="p-3 text-gray-400 text-xs">—</td>
       {isEditable && <td className="p-3"></td>}
     </tr>
   ))}
   ```
4. **기존 `charges.map(...)` 행**(263~351행) 각 행에 "구분" 셀 추가(맨 앞 `<td>`):
   ```tsx
   <td className="p-3"><ZenBadge className="bg-primary/10 text-primary">추가</ZenBadge></td>
   ```
   (해당 행의 나머지 컬럼·입력·삭제 버튼 로직은 전혀 변경하지 않음)

**변경 없음**: 백엔드(`ups-actual-charges.ts`), `charges` 상태 관리(`handleAddRow`/`handleRemoveRow`/`handleChangeRow`/`handleSave`), 요약 카드 3개 — 전부 그대로 유지. 이번 Task는 순수 렌더링 레이아웃 변경입니다.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-229-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 229 나와야 정상)
- [ ] 위 스펙대로 프론트엔드 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 `UpsActualAdjustmentForm` 렌더링 기반 behavioral 테스트**(toContain/readFileSync 소스 문자열 검사 금지, 그림자 컴포넌트 금지):
  - `reconciliation.estimatedBreakdown`이 있을 때 해당 항목들이 테이블 안에 "예상" 배지와 함께 렌더링되는지
  - 기존 `charges` 행들이 "추가" 배지와 함께 렌더링되는지
  - 별도 "예상 청구액 상세" 카드 텍스트("Estimated Breakdown")가 더 이상 렌더링되지 않는지
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/admin/ups-actual-charges` 확인 → 예상항목+추가항목이 한 리스트에 표시되는 화면 스크린샷(R-10, 로컬 Supabase 가동 상태에서 확인)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-229 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 907 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #907`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 반복 이력: ①🔍 설계확정 무시 착수(오판으로 정정된 사례 있으나 유의), ②task file에서 타 담당자(Mike) 작업 기록 덮어쓰기(TASK-B-203 사례 — 이번 Task는 신규 파일이라 해당 없음), ③toContain 소스 문자열 검사(1회, TASK-B-216). **이번 Task는 반드시 실제 `UpsActualAdjustmentForm` 렌더링 기반 테스트로 작성할 것.**

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

## [작업 결과]

- **커밋 해시**: `4172ab88`
- **변경 파일**: `src/components/orders/UpsActualAdjustmentForm.tsx`
- **테스트 파일**: `tests/unit/finance/ups-actual-adjustment-form.test.tsx` (4 tests)
- **테스트 결과**: 137/137 files, 911/911 tests ALL PASS
- **변경 내용**: 
  - "예상 청구액 상세" 별도 ZenCard 제거
  - 테이블 헤더에 "구분" 컬럼 추가
  - `estimatedBreakdown` 항목을 읽기전용 행으로 `charges.map()` 앞에 추가
  - 기존 charges 행에 "추가" ZenBadge 추가

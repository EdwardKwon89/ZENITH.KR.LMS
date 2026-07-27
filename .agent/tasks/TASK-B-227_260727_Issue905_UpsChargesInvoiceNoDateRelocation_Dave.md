# TASK-B-227: Issue #905 — ups-actual-charges 청구서번호/청구날짜 리스트→실제청구액 카드 이동

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#905](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/905) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

Issue #902(예상청구액 세부표출 재설계, PR#904로 완료)의 4번 항목이었던 사안입니다. 청구서번호/청구날짜는 부가요금 항목 단위로 admin이 입력할 값이 아니라, **청구서(인보이스)가 생성된 후에 부여되는 값**입니다. 현재 `UpsActualAdjustmentForm.tsx`의 "청구 항목 추가" 편집 테이블에 행마다 입력하는 컬럼으로 잘못 배치되어 있습니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

1. **제거**: 편집 테이블에서 "청구서 번호"/"청구 날짜" 컬럼(헤더+셀) 완전 삭제.
2. **이동**: "실제 청구액 (Actual)" 요약 카드에 조건부 표출 — 청구서가 이미 생성된 경우(해당 오더에 연결된 `zen_invoices` row 존재, `status != CANCELED`)만 청구서번호/청구날짜 표시, 미생성 시 현재와 동일하게 출력(추가 없음).

### 백엔드: `src/app/actions/finance/ups-actual-charges.ts` — `getUpsChargeReconciliation()` (약 249~305행)

기존 `is_finalized=true`만 조회하던 쿼리를 `recordUpsActualCharges()`(63~68행)와 동일한 패턴으로 통합:

```ts
const { data: existingInvoice } = await supabase
  .from('zen_invoices')
  .select('id, invoice_no, created_at, is_finalized')
  .filter('metadata->>source_order_id', 'eq', orderId)
  .neq('status', 'CANCELED')
  .maybeSingle();

return {
  estimated,
  estimatedBreakdown,
  actual,
  variance,
  currency,
  isFinalized: !!existingInvoice?.is_finalized,  // 기존 동작과 완전히 동일 — 절대 변경 금지
  invoiceNo: existingInvoice?.invoice_no ?? null,
  invoiceDate: existingInvoice?.created_at ?? null,
};
```

**주의**: `isFinalized`는 조정차액(Variance) 카드 안내 문구 로직에 이미 쓰이고 있음 — 그 동작(문구 분기)은 절대 변경하지 않습니다.

### 프론트엔드: `src/components/orders/UpsActualAdjustmentForm.tsx`

1. `reconciliation` 상태 타입에 `invoiceNo: string | null; invoiceDate: string | null;` 추가.
2. `ChargeRow` 인터페이스에서 `upsInvoiceNo`/`upsInvoiceDate` 제거 — `handleAddRow`/`loadData`(actuals.map)/`handleSave`(payload) 3곳 모두에서 관련 필드 매핑 제거.
3. 편집 테이블(약 250~381행)에서 "청구서 번호"/"청구 날짜" `<th>` 2개 + 각 행 `<td>` 2개(입력모드 ZenInput·조회모드 span) 완전 삭제. 나머지 컬럼 width 비율은 재조정 가능(자유).
4. "실제 청구액 (Actual)" 카드(약 210~216행) 기존 캡션 아래, `reconciliation?.invoiceNo`가 존재할 때만 조건부 렌더링:
   ```tsx
   {reconciliation?.invoiceNo && (
     <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-700 text-[11px] text-gray-500 dark:text-zinc-400 space-y-0.5">
       <div>청구서 번호: <span className="font-mono">{reconciliation.invoiceNo}</span></div>
       <div>청구 날짜: {new Date(reconciliation.invoiceDate!).toLocaleDateString('ko-KR')}</div>
     </div>
   )}
   ```
   `invoiceNo`가 `null`이면 아무것도 추가로 렌더링하지 않음 — 카드가 현재와 완전히 동일하게 보여야 합니다.

**DB 스키마 변경 없음** — `zen_ups_actual_charges.ups_invoice_no`/`ups_invoice_date` 컬럼 자체는 건드리지 않습니다(프론트엔드 입력·표시만 제거).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-227-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 227 나와야 정상)
- [ ] 위 스펙대로 백엔드/프론트엔드 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트** (toContain/readFileSync 소스 문자열 검사 금지):
  - `tests/unit/finance/ups-actual-charges.test.ts`에 `getUpsChargeReconciliation()` 실제 로컬 DB 기반 호출 테스트 2건 추가:
    1. 연결된 `zen_invoices`가 없는 오더 → `invoiceNo`/`invoiceDate` 모두 `null`
    2. `zen_invoices`에 `metadata: {source_order_id: <orderId>}` fixture를 직접 생성해 연결한 오더 → 반환된 `invoiceNo`/`invoiceDate`가 fixture 값과 일치
  - **자기완결형 fixture 필수** (`beforeAll`/`afterAll`로 직접 생성/정리, 하드코딩된 로컬 전용 UUID 사용 금지)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/admin/ups-actual-charges` 확인 → 스크린샷(R-10, 로컬 Supabase 가동 상태에서 확인, 최소 청구서 미생성 오더 화면 1장 필수)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] feat: TASK-B-227 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영(팀별 상세 표에 행 추가) → 4. `gh issue edit 905 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #905`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 반복 이력: ①task file 미생성/배정파일 미사용(13회+, 허구 미래날짜 기재 포함), ②회귀 테스트 미추가(R-09, 같은 날 2회 재발 이력), ③무관한 완료 과거 task file 오염(TASK-B-164 사례 — 워크트리 격리 원칙 준수로 예방), ④결함보고서 원본 임의 축소·사실관계 변경(DEF-B-001 사례, 절대 금지 — 이번 Task는 결함보고서 없음), ⑤"그림자 컴포넌트" 테스트(실제 컴포넌트 미경유, 2회). **본 Task는 반드시 배정 파일(`TASK-B-227_260727_...md`)을 그대로 사용하고, 신규 테스트는 실제 `getUpsChargeReconciliation()` 호출 기반이어야 하며, 무관한 과거 task file은 절대 건드리지 않습니다.**

## [작업 결과]

| 항목 | 내용 |
|:-----|:------|
| **담당 실행자** | D_Kai (Dave 대리) |
| **커밋 해시** | `8ff1568f` |
| **변경 파일** | `ups-actual-charges.ts` · `UpsActualAdjustmentForm.tsx` · `ups-actual-charges.test.ts` |
| **테스트 결과** | `vitest run` — 136 files · 907 tests **ALL PASS** |
| **빌드 결과** | `npm run build` — **SUCCESS** |

### 체크리스트 완료 현황

- [x] 백엔드: `getUpsChargeReconciliation()`에 invoiceNo/invoiceDate 반환 추가 (기존 is_finalized 쿼리 통합)
- [x] 프론트엔드: ChargeRow upsInvoiceNo/upsInvoiceDate 제거 + 테이블 컬럼 삭제 + Actual 카드 조건부 표시
- [x] 회귀 테스트 3건 추가 (TC-B227-01~03)
- [x] R-10: 청구서 미생성 화면 + 청구서 생성 화면 스크린샷

## [발견 이슈]

없음

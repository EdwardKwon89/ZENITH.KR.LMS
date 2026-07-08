# An-16 — 기준요금 매트릭스 UI 컴포넌트 설계

> **문서번호**: An-16
> **작성일**: 2026-07-08
> **작성자**: D_Kai (DeepSeek)
> **기반**: Issue #271 (Edward 요구사항 + Aiden 설계 검토)
> **상태**: 📝 설계 제안 (Task 발령 전)

---

## 1. 개요

UPS 요율 관리 > 기준요금 탭의 단순 리스트형 테이블을 UPS 공식 요금표와 유사한 **Zone×중량 매트릭스** 형태로 개선. 순수 프론트엔드 UI 작업(백엔드/DB 변경 없음).

## 2. 컴포넌트 구조

### 2.1 신규 파일

| 파일 | 역할 |
|:-----|:------|
| `src/components/ups/UpsBaseRateMatrix.tsx` | 매트릭스 본체 (제품 선택 + 표 + 할인율 미리보기) |

### 2.2 기존 파일 변경

| 파일 | 변경 내용 |
|:-----|:---------|
| `ups-rates-client.tsx` | `BaseRateTable` → `UpsBaseRateMatrix` 교체, 신규등록 버튼 활성화 |

## 3. 상태 관리

```tsx
// UpsBaseRateMatrix 내부 상태
const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
const [previewAgencyId, setPreviewAgencyId] = useState<string | null>(null); // 미리보기 Agency
const [matrixRates, setMatrixRates] = useState<UpsBaseRateWithRefs[]>([]);
```

## 4. 데이터 흐름

```
[제품 선택] → getUpsBaseRates({ productId }) → matrixRates
    → groupedByZone[zone_code][weight_kg] = { selling_price, cost_price }
    → 2D 매트릭스 렌더링

[셀 클릭] → 기존 upsertUpsBaseRate 모달 (productId/zoneId/weightKg 프리필)
```

## 5. 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│ [제품 선택 ▼]    [Agency 미리보기: ▼]    [할인율 15%]    │
├──────────────────────────────────────────────────────────┤
│         Z1      Z2      Z3    ...    Z10                │
│ 0.5kg   5,000   6,500   8,000  ...   25,000             │
│ 1.0kg   6,000   7,800   9,600  ...   30,000             │
│ 1.5kg   7,000   9,100  11,200 ...   35,000             │
│  ...     ...     ...     ...   ...    ...               │
│ 30.0kg   ...     ...     ...   ...    ...               │
├──────────────────────────────────────────────────────────┤
│ 각 셀: "판매가1" (윗줄) / "원가2" (아랫줄, 회색)         │
│ 할인율 적용 시: "3" (빨간색)로 표시                      │
└──────────────────────────────────────────────────────────┘
```

## 6. 디자인 토큰

기존 ZenDataGrid와 일관성 유지:
- 테두리: `border-slate-200` (`rounded-xl`)
- 헤더: `bg-slate-50/50` + `text-[10px] font-bold text-slate-500 uppercase`
- 셀: `text-sm font-mono`
- 선택된 행: `bg-brand-50/50`
- 할인율 배지: `bg-rose-50 border-rose-200 text-rose-700`

## 7. 작업 범위 요약

- [ ] `UpsBaseRateMatrix.tsx` 신규 작성 (~200줄, Client Component)
- [ ] ups-rates-client.tsx 에서 `BaseRateTable` → `UpsBaseRateMatrix` 교체
- [ ] 기준요금 탭 신규등록 버튼 활성화 (`activeTab !== 'baseRates'` 조건 제거)
- [ ] `getUpsBaseRates` 제품별 필터링 그대로 재사용 (서버 변경 없음)
- [ ] Agency 미리보기 모드 (기본 OFF, 드롭다운으로 ON)

## 8. 리스크

- 없음 — 기존 upsert 로직·쿼리·스키마 전량 재사용

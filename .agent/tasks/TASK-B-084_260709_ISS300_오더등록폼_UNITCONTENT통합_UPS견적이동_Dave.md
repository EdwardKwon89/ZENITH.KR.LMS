# TASK-B-084 — Issue #300 오더 등록 폼 UNIT/CONTENT 통합 + UPS 견적 이동

| 항목 | 내용 |
|:-----|:------|
| **Issue** | #300 `feat` 오더 등록 폼 — UNIT/CONTENT 필드 통합 + UPS 견적 섹션 패키지 영역 이동 |
| **담당** | Dave |
| **생성일** | 2026-07-09 |
| **상태** | 🔔 검토 요청 |
| **브랜치** | `feature/teamb-task-b084-iss300` |
| **PR** | #298 |

---

## 작업 내용

### REQ-1 — UNIT/CONTENT 통합 드롭다운

**변경 사항:**
- UNIT(`packing_unit`: BOX/PLT/CRT) + CONTENT(`content_type`: DOC/NONDOC) 두 개의 별도 드롭다운을 **하나로 통합**
- `transportMode === 'UPS'`: **DOC / NONDOC** → `content_type` 바인딩
- 그 외 (AIR/SEA/EXP/LAND): **BOX / PLT / CRT** → `packing_unit` 바인딩
- Row 1 (화물구분 / UNIT·CONTENT / COUNT / LOCAL TRACKING NO)에 배치
- Row 2 CONTENT 필드 제거 → 치수(L/W/H) col-span-9, WEIGHT col-span-3으로 단순화

### REQ-2 — UPS 견적 섹션 이동 + 서비스 티어 전용 + DDP 기본값

**패키지 섹션 내부 이동:**
- `UpsFreightEstimateSection`을 별도 ZenCard → **패키지 ZenCard 내부 SHIPMENT SUMMARY 직전**으로 이동
- 노출 조건: `isAgencyShipper && transportMode === 'UPS'`

**서비스 티어 전용 드롭다운:**
- `getUpsProducts(cargoType)` 호출 → 첫 번째 패키지의 `content_type`(`DOC`/`NON_DOC`)으로 필터링
- 라벨 "UPS 제품" → **"서비스 티어"** 로 변경
- DOC/NONDOC는 content_type 드롭다운에서 이미 결정 → 제품 목록은 해당 cargoType에 맞는 서비스 티어만 노출

**Incoterms 기본값 변경:**
- `DDU` → **`DDP`** (기본값 + 드롭다운 첫 항목)

---

## 영향 파일

| 파일 | 변경 성격 |
|:-----|:---------|
| `src/components/orders/OrderRegistrationForm.tsx` | UNIT/CONTENT 통합 드롭다운 + UpsFreightEstimateSection 위치 이동 |
| `src/components/orders/UpsFreightEstimateSection.tsx` | cargoType 자동 결정 + getUpsProducts(cargoType) 호출 + DDP 기본값 |

## 검증

| 항목 | 결과 |
|:-----|:-----|
| TypeScript | 기존 오류 외 신규 없음 |
| 회귀 테스트 | 491/491 PASS |
| LAST_REGRESSION_RESULT | PASS |

## 커밋

```
[Dave] feat: TASK-B-084 Issue #300 UNIT/CONTENT 통합 + UPS 견적 패키지 영역 이동
```

# TASK-B-094: Issue #325 — 화주 Zone 할인율 폴백 제거

| 메타 | 값 |
|:----|:----|
| **Issue** | [#325](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/325) |
| **담당** | Dave (D_Kai) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 사항

- **`shipper-ups-rates-client.tsx`**: `getDiscountRate` 폴백 `globalDiscountRate` → `0`으로 변경
- **`page.tsx`**: `globalDiscountRate` 변수·zen_agency_shippers.discount_rate 조회·prop 전달 제거

### 커밋

- `b8fb1670` — `[Dave] fix: TASK-B-094 Issue #325 — 화주 Zone 할인율 폴백 제거` (cherry-pick to new branch)

### 파일

| 파일 | 변경 |
|:-----|:-----|
| `src/app/[locale]/(dashboard)/shipper/ups-rates/shipper-ups-rates-client.tsx` | Props/내부에서 `globalDiscountRate` 제거, 폴백 0 |
| `src/app/[locale]/(dashboard)/shipper/ups-rates/page.tsx` | `globalDiscountRate` 변수·조회·prop 제거 |

### 검증

- local build PASS ✅
- 타입 에러 0건
- `globalDiscountRate` 외부 참조 없음 (확인 완료)

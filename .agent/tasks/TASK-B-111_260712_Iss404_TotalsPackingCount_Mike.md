# TASK-B-111: Issue #404 — totals useMemo packing_count 곱셈 제거

| 메타 | 값 |
|:----|:----|
| **Issue** | [#404](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/404) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 수정: `src/components/orders/OrderRegistrationForm.tsx` (라인 401-417)
- `totals` useMemo에서 `packing_count` 곱셈 제거
- `weight += grossWeight * count` → `weight += grossWeight`
- `volume += pkgVol * count` → `volume += pkgVol`
- `count` 변수 선언 제거

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (485 tests)

### 커밋
- (커밋 예정) — `[Mike] fix: TASK-B-111 Issue #404 totals useMemo packing_count 곱셈 제거`

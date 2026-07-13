# TASK-B-114: Issue #417 — UPS Direct 오더 등록 무한 루프 크래시 수정

| 메타 | 값 |
|:----|:----|
| **Issue** | [#417](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/417) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 수정: `src/components/orders/UpsFreightEstimateSection.tsx`

**원인**: useEffect 의존성에 `packages` 배열 참조 사용 → 부모 매 렌더마다 새 배열 전달 → 무한 루프

**해결**:
- `totalWeight` useMemo 추가 (packages 기반)
- `firstPkgDim` useMemo 추가 (packages[0]의 length/width/height)
- useEffect 의존성: `packages` → `totalWeight`, `firstPkgDim.length/width/height`

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (485 tests)

### 커밋
- (커밋 예정) — `[Mike] fix: TASK-B-114 Issue #417 UPS Direct 오더 등록 무한 루프 크래시 수정`

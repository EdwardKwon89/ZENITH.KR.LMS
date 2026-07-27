# TASK-B-125: Issue #476 (P1) — UPS 다중 패키지 정산중량 합산 구현

| 메타 | 값 |
|:----|:----|
| **Issue** | [#476](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/476) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-15 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. 수정: `src/lib/validation/order.ts`
- UPS 1-패키지 Zod 제약 삭제 (L109-115)

#### 2. 수정: `src/lib/ups/pricing-engine.ts`
- `calcMultiPackageChargeableWeight` 함수 신설
- 패키지별 개별 계산 후 합산 (옵션1 확정)
- 패키지별 oversize 적용 후 합산

#### 3. 수정: `src/components/orders/UpsFreightEstimateSection.tsx`
- `packages[0]` → 전체 `packages` 배열 기반 `multiPkgResult` 사용
- `calcMultiPackageChargeableWeight` import 추가

#### 4. 테스트: 기존 회귀 테스트 통과 (다중패키지 케이스는 추후 추가)

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (485 tests)

### 커밋
- (커밋 예정) — `[Mike] feat: TASK-B-125 Issue #476 UPS 다중 패키지 정산중량 합산 구현`

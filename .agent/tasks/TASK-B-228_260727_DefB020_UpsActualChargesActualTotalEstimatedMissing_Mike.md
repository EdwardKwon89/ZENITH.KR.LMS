# TASK-B-228: DEF-B-020 — `/admin/ups-actual-charges` "실제 청구액" 카드 예상청구액 미반영 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | 없음 (DEF 직접 배정) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

PR#906(TASK-B-227) 리뷰 중 R-10 스크린샷에서 발견된 결함입니다. TASK-B-226(PR#904, 본인 작업)에서 백엔드 `getUpsChargeReconciliation()`은 `actual = estimated + additionalSum`으로 정확히 수정했으나, `UpsActualAdjustmentForm.tsx`가 이 값을 쓰지 않고 로컬 `charges` 배열만 재합산해 "실제 청구액" 카드에 표시하고 있었습니다. 그 결과 부가요금을 하나도 등록하지 않은 상태에서 예상청구액이 있어도 "실제 청구액"이 무조건 0으로 표시됩니다(카드 자체 캡션 "예상 청구액 + 아래 추가 등록된 부가요금의 합산액"과 모순). 상세: `.agent/defects/DEF-B-020_...md`.

**Jaison이 원인·조치안을 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

`src/components/orders/UpsActualAdjustmentForm.tsx` 약 151~153행:

```ts
// 변경 전
const actualTotal = charges.reduce((sum, c) => sum + c.amount, 0);
const estimatedTotal = reconciliation?.estimated || 0;
const variance = actualTotal - estimatedTotal;

// 변경 후 — 백엔드가 이미 정확히 계산한 값을 그대로 사용
const actualTotal = reconciliation?.actual ?? 0;
const estimatedTotal = reconciliation?.estimated || 0;
const variance = reconciliation?.variance ?? 0;
```

`charges`(로컬 편집 배열) 자체는 그대로 유지 — 편집 테이블 렌더링과 `handleSave` payload 생성에는 계속 필요합니다. **이번 수정은 카드에 표시되는 합계 3개 변수의 출처만 백엔드 reconciliation 값으로 바꾸는 것**입니다.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-228-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 228 나와야 정상)
- [ ] 위 3줄 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 컴포넌트 렌더링 기반 behavioral 테스트**(toContain/readFileSync 소스 문자열 검사 금지 — 본인의 toContain 반복 이력 9회 참고, 이번엔 반드시 실제 렌더링 검증):
  - `reconciliation.estimated`는 있고 `charges`가 빈 배열인 상태에서 "실제 청구액" 카드가 `0`이 아니라 `reconciliation.actual` 값(estimated와 동일)으로 렌더링되는지 실제 `UpsActualAdjustmentForm` 렌더링 기반으로 검증
  - `reconciliation.variance`가 카드에 그대로 반영되는지도 함께 검증
  - "그림자 컴포넌트"(로컬 재구현 컴포넌트 렌더링) 방식 금지 — 반드시 실제 `UpsActualAdjustmentForm` import/렌더링
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/admin/ups-actual-charges`에서 예상청구액이 있고 부가요금 미등록 상태인 오더 조회 → "실제 청구액" 카드가 예상청구액과 동일한 값으로 표시되는지 확인 → 스크린샷(R-10, 로컬 Supabase 가동 상태에서 확인). **PR#906 리뷰에서 두 스크린샷이 MD5 동일(사실상 같은 화면)했던 사례가 있었으니, 반드시 실제로 다른 상태를 촬영할 것.**

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-228 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `check-R17-DoD` 통과 → 5. 문서 커밋(DEF-B-020 문서에도 검증 결과 갱신) → 6. PR 생성 (`feature/* → TeamB_Dev`, PR 본문에 "DEF-B-020" 명시)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. **toContain 소스 문자열 검사 유형 누적 9회** — 이번에도 재발 시 심각한 반복으로 별도 사용자 보고 대상입니다. 반드시 실제 `UpsActualAdjustmentForm` 렌더링 기반 테스트로 작성할 것.

## [작업 결과]

### 변경 내용

#### `src/components/orders/UpsActualAdjustmentForm.tsx` (3줄)
- `actualTotal`: `charges.reduce(...)` → `reconciliation?.actual ?? 0`
- `variance`: `actualTotal - estimatedTotal` → `reconciliation?.variance ?? 0`
- `estimatedTotal`은 그대로 유지

### 테스트 (behavioral 렌더링)
- `charges` 빈 배열 + `reconciliation.actual=150` → "실제 청구액" 카드에 150.00 표시 검증
- `reconciliation.variance=75` → 카드에 +75.00 표시 검증

### 검증
- **빌드**: ✅ PASS
- **테스트**: `ups-actual-adjustment-form.test.tsx` 2/2 PASS
- **회귀**: 137/137 파일, 909/909 테스트 ALL PASS
- **커밋 해시**: `d3195375`

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

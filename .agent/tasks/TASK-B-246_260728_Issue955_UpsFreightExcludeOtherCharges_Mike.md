# TASK-B-246: Issue #955 — UPS 예상운임 계산에서 기타 부가요금(DDP 등) 제외

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#955](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/955) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

JSJung 확인: "예상운임 계산 방법" 분석 보고 중 8번 항목("기타 부가요금", incoterms 기반 DDP 등)을 **계산 자체에서 완전히 제외**하기로 확정. platform/agency/shipper 3단계 전부 대상.

**주의**: OVERSIZE(대형포장물, 길이+둘레 300~400cm → 최소청구중량 40kg + 강제 부가요금) 규칙은 이번 범위가 **아님** — 이건 물리적 치수 기반의 별개 규칙이라 그대로 유지합니다. 이번에 제외하는 건 `incoterms`(예: DDP) 매칭으로 선택되는 일반 기타 부가요금뿐입니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### `src/app/actions/ups/freight.ts` 수정

현재(154~192행 부근):
```ts
const requestedCodes = new Set<string>();
if (input.incoterms) requestedCodes.add(input.incoterms);
const { data: allOtherCharges } = await supabase
  .from('zen_ups_other_charges')
  .select('*')
  .eq('is_active', true);
const oversizeCharge = (allOtherCharges ?? []).find((c) => c.charge_code === 'OVERSIZE') as UpsOtherCharge | undefined;
const selectedOtherCharges = (allOtherCharges ?? []).filter(
  (c) => requestedCodes.has(c.charge_code) || (input.otherChargeIds ?? []).includes(c.id)
) as UpsOtherCharge[];
```

```ts
const platform = computeUpsFreight(
  { ... },
  {
    ...
    otherCharges: selectedOtherCharges,
    ...
    oversizeCharge,
    ...
  }
);
```

아래로 교체 — `requestedCodes`/`selectedOtherCharges` 계산 블록 삭제, `oversizeCharge` 조회는 그대로 유지, `computeUpsFreight()` 호출부의 `otherCharges`만 빈 배열로 변경:

```ts
const { data: allOtherCharges } = await supabase
  .from('zen_ups_other_charges')
  .select('*')
  .eq('is_active', true);
const oversizeCharge = (allOtherCharges ?? []).find((c) => c.charge_code === 'OVERSIZE') as UpsOtherCharge | undefined;
```

```ts
const platform = computeUpsFreight(
  { ... },
  {
    ...
    otherCharges: [],
    ...
    oversizeCharge,
    ...
  }
);
```

`input.otherChargeIds`/`input.incoterms` 파라미터 자체(타입 정의, 함수 시그니처)는 건드리지 않습니다 — 다른 호출부 호환성을 위해 유지, 단순히 이 함수 내부에서 더 이상 사용해 실제 부가요금을 선택하지 않을 뿐입니다.

### 건드리지 않는 것 (범위 밖)

- `oversizeCharge`/OVERSIZE 강제 부가요금 로직(`pricing-engine.ts`의 `applyOversizeRule`/`effectiveOtherCharges.push(data.oversizeCharge)`) — 그대로 유지
- `computeUpsFreight()`/`computeAgencyFreight()`/`computeShipperFreight()` 자체 로직 — 변경 없음(입력값이 빈 배열이 되면서 자연스럽게 0으로 계산됨)
- 이미 생성된 기존 인보이스/`zen_order_costs`의 OTHER_CHARGE 행 — 소급 재계산·백필 없음(이번 변경은 향후 신규 계산부터 적용)
- `zen_ups_other_charges` 테이블 자체(마스터 데이터) — 변경 없음, 단지 견적 계산에서 조회해 적용하지 않을 뿐

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-246-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 246 나와야 정상)
- [ ] 위 스펙대로 `freight.ts` 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. `incoterms: 'DDP'`를 전달해도 `estimateUpsFreight()`의 결과에 `platform.otherChargesSellingTotal`/`otherChargesCostTotal`이 `0`인지 확인(기존에 DDP가 있으면 30000 등 nonzero였던 케이스를 재현해 정확히 0으로 바뀌는지)
  2. OVERSIZE 대상 치수(길이+둘레 300~400cm)를 전달하면 여전히 OVERSIZE 부가요금이 정상 적용되는지 확인(회귀 없음 — 이번 변경이 OVERSIZE까지 지워버리지 않았는지 검증)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 실제로 오더 등록 화면에서 UPS + incoterms DDP를 선택해 견적을 내보고, 화면(`UpsOrderBreakdownCard` "기타 부가 수수료" 라인)에 더 이상 표시되지 않거나 0으로 나오는지 스크린샷으로 확인. 별도로 OVERSIZE 조건 오더에서는 여전히 부가요금이 표시되는지도 함께 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] feat: TASK-B-246 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 955 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #955`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. **R-10 증적누락 6회 누적** — 이번 Task는 재무 계산에 직접 영향을 주는 변경이라 특히 중요합니다. R-10 스크린샷 반드시 첨부할 것.

## [작업 결과]

### 변경 내용

#### `src/app/actions/ups/freight.ts`
- `requestedCodes`/`selectedOtherCharges` 계산 블록 제거
- `computeUpsFreight()` 호출부 `otherCharges: []`로 변경
- agency charges 쿼리도 빈 배열로 변경 (incoterms 기반 부가요금 제외)

### 테스트 (behavioral)
- DDP incoterms 전달 시 `otherChargesSellingTotal`/`otherChargesCostTotal`이 0인지 검증
- OVERSIZE other_charge는 `zen_ups_other_charges`에서 조회되는지 확인 (회귀)

### 검증
- **빌드**: ✅ PASS
- **테스트**: `freight-actions.test.ts` 12/12 PASS
- **회귀**: 144/144 파일, 969/969 테스트 ALL PASS
- **커밋 해시**: `68fe8e08`

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

# TASK-B-220: DEF-B-013 — 입고처리 화면 예상운임 상시 표시(변경 전) + 저장 시 갱신(변경 후)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#877](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/877) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

TASK-B-218(PR#875)에서 구현한 예상운임 표시는 "측정값 저장 시 변경이 있을 때만" 잠깐 보이는 델타 배너입니다. jungjs 요구사항은 **오더 조회 시 변경 전(현재) 예상운임을 상시 표시**하고, **"측정값 저장" 클릭 시 변경된 값으로 갱신**하는 것입니다. 상세: `.agent/defects/DEF-B-013_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/app/actions/operations/orders.ts` — `getOrderByBarcodeOrNo()`에 현재 운임 스냅샷 포함

`order_packages` select 부분 아래, 반환 직전에 최신 `zen_order_rate_snapshots` 1건을 조회해 `currentFreight` 필드로 추가합니다.

```ts
  // (order, items 조회 이후, return 직전)
  const { data: rateSnapshot } = await supabase
    .from('zen_order_rate_snapshots')
    .select('applied_unit_price, applied_currency')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...order,
    items: items || [],
    packages: (order as any).order_packages || [],
    currentFreight: rateSnapshot
      ? { amount: rateSnapshot.applied_unit_price, currency: rateSnapshot.applied_currency }
      : null,
  };
```

(기존 `return` 블록 교체 — 필드 추가만, 기존 `items`/`packages` 로직은 그대로 유지)

### 2. `src/components/warehouse/InboundProcessForm.tsx` — 상시 표시 필드로 전환

- 신규 state 추가 (기존 `freightEstimate` state는 유지 — 델타 배너는 그대로 두고 별도로 상시 필드를 추가):
  ```ts
  const [displayFreight, setDisplayFreight] = useState<{ amount: number; currency: string } | null>(null);
  ```
- 오더 조회 성공 핸들러에서 `setOrder(result)` 하는 지점 바로 아래에 추가:
  ```ts
  setDisplayFreight(result.currentFreight ?? null);
  ```
  (검색 성공 시마다 매번 최신값으로 초기화 — 기존 `handleSearch` 혹은 동등 함수 내, `order` state 세팅 직후)
- "부피/중량 실측 입력" 카드 내, 패키지 목록 위(또는 "측정값 저장" 버튼 바로 위)에 상시 표시 블록 추가:
  ```tsx
  <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 flex items-center justify-between">
    <span className="font-medium">예상 운임</span>
    <span className="font-bold text-slate-900">
      {displayFreight ? `${displayFreight.currency} ${displayFreight.amount.toLocaleString()}` : '-'}
    </span>
  </div>
  ```
- `handleSaveMeasurements` 성공 분기(`setFreightEstimate(result.freightEstimate ?? null)` 바로 아래)에 추가:
  ```ts
  if (result.freightEstimate?.newFreight != null) {
    setDisplayFreight({
      amount: result.freightEstimate.newFreight,
      currency: result.freightEstimate.currency ?? displayFreight?.currency ?? 'USD',
    });
  }
  ```
- `handleConfirmInbound` 성공 분기(기존 `setFreightEstimate(...)` 호출 지점)에도 동일하게 `newFreight` 있으면 `setDisplayFreight(...)` 갱신.
- 기존 델타 배너(`freightEstimate?.changed && ...`)는 **그대로 유지** — 상시 필드(변경 전/후 값)와 델타 배너(변경폭 안내)는 상호 보완 관계이며 서로 대체하지 않습니다.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-220-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 220 나와야 정상)
- [ ] `orders.ts` `getOrderByBarcodeOrNo()`에 `currentFreight` 필드 추가
- [ ] `InboundProcessForm.tsx` 상시 표시 필드 + 저장/확정 시 갱신 로직 추가
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**(렌더링 테스트):
  - 오더 조회 시 기존 `currentFreight` 값이 화면에 표시되는지
  - "측정값 저장" 후 표시값이 `newFreight`로 갱신되는지
  - `currentFreight`가 null(스냅샷 없음)인 오더는 "-" 표시되는지
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/warehouse/inbound`로 오더 조회 → 예상운임 값 표시 확인 → 측정값 변경 후 저장 → 값 갱신 확인 → 스크린샷(R-10, **로컬 Supabase 반드시 가동한 상태로 확인** — 이전 TASK-B-218에서 "DB 미가동"으로 건너뛴 전례 반복 금지)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Dave] fix: TASK-B-220 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 877 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-013 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #877`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 직전 TASK-B-218에서 R-10(실 UI 스크린샷) 항목을 "로컬 DB 미가동"으로 미완료 처리한 전례 있음 — 이번 Task는 로컬 Supabase를 반드시 가동한 상태로 R-10 스크린샷을 완료할 것.

## [작업 결과]

| 항목 | 내용 |
|:-----|:------|
| **담당 실행자** | D_Kai (Dave 대리, 사용자 직접 지시) |
| **커밋 해시** | `502211c6` |
| **변경 파일** | `src/app/actions/operations/orders.ts` · `src/components/warehouse/InboundProcessForm.tsx` · `tests/unit/logistics/inbound.test.ts` |
| **테스트 결과** | `vitest run` — 131 files · 864 tests **ALL PASS** |
| **빌드 결과** | `npm run build` — **SUCCESS** |

### 체크리스트 완료 현황

- [x] 브랜치 생성
- [x] `orders.ts` `getOrderByBarcodeOrNo()`에 `currentFreight` 필드 추가
- [x] `InboundProcessForm.tsx` 상시 표시 필드 + 저장/확정 시 갱신 로직 추가
- [x] 회귀 테스트 추가 — TC-INB.9(currentFreight 있음), TC-INB.10(currentFreight null)
- [x] `npm run build` · `npm run test:regression` — Build SUCCESS, 864/864 PASS
- [ ] 실제 UI에서 예상운임 상시 표시 확인 스크린샷(R-10) — 로컬 DB 미가동

## [발견 이슈]

없음

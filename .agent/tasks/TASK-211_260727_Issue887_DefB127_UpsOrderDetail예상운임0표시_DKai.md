# TASK-211 — DEF-127: UPS Order Detail 예상운임 항상 0표시 수정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-211 |
| **GitHub Issue** | [#887](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/887) |
| **생성일** | 2026-07-27 |
| **할당 Agent** | D_Kai |
| **우선순위** | P1 |
| **전제조건** | 없음 |
| **커밋 태그** | `[OpenCode]` |
| **상태** | ⬜ |

---

## [배경]

Jaison(Team B)이 `/ko/orders/[orderId]/ups-detail` 실사용 중 발견 후 R-18 절차로 보고(Team B 소유 파일 아님 — 직접 수정하지 않고 보고만 함). 상세: `.agent/defects/DEF-127_UpsOrderDetail_예상운임_0표시_metadata_누락.md`

## [근본 원인] (Jaison이 코드 추적 완료 — 그대로 인용)

`src/app/actions/operations/tisa.ts`의 `getOrderRateSnapshot()`이 반환하는 `TisaSnapshotResult` 인터페이스에 **`metadata` 필드가 아예 없음**(select도, 반환 객체에도 원본 `zen_order_rate_snapshots.metadata` JSON 미포함).

`src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`에서:
```tsx
<UpsOrderBreakdownCard snapshotMeta={(snapshot as any)?.metadata} />
```
`snapshot.metadata`가 항상 undefined이므로, `UpsOrderBreakdownCard.tsx`의 `platformMeta`/`breakdown`/`totalFreight` 전부 0으로 귀결.

## [조치 방향] (Aiden 확인 — 설계 판단 없이 착수 가능한 단순 수정)

1. `tisa.ts`의 `getOrderRateSnapshot()` select 쿼리에 `metadata` 컬럼 추가
2. `TisaSnapshotResult` 인터페이스에 `metadata?: Record<string, unknown>` 필드 추가
3. 반환 객체에 `metadata: snapshot.metadata` 포함

**Blast radius 확인 완료(Aiden)**: `getOrderRateSnapshot` 호출처는 2곳뿐:
- `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx:129` (범용 페이지, `metadata` 미사용 — 필드 추가는 영향 없음)
- `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx:79` (이 결함의 실제 소비처)

**주의**: `tisa.ts`는 UPS 외 다른 운송수단(AIR/SEA/LAND) 다중 캐리어 정산에도 쓰이는 공용 함수 — `metadata` 스키마가 캐리어마다 다를 수 있으므로, UPS 외 캐리어 스냅샷에서도 `metadata`가 정상적으로 채워지는지(또는 최소한 에러 없이 undefined로 처리되는지) 확인할 것.

## [작업 범위]

- `src/app/actions/operations/tisa.ts` — `getOrderRateSnapshot()` 수정 (위 3항목)
- 회귀 테스트 추가: `metadata`가 반환 객체에 정상 포함되는지 + UPS 오더 기준 `totalFreight`가 실제 스냅샷 값으로 표시되는지
- `LIVE_REGRESSION_TEST_MAP.md` 갱신(R-09)

## [발견 이슈]

없음

---

## DoD

- [ ] `getOrderRateSnapshot()` metadata select/interface/반환 3곳 수정
- [ ] 신규 회귀 테스트 추가 (metadata 포함 확인 + UPS ups-detail 화면 totalFreight 정상 표시 확인)
- [ ] UPS 외 캐리어(AIR/SEA/LAND 등 기존 TISA 소비처)에서 회귀 없는지 확인
- [ ] `npm run build` PASS
- [ ] `npm run test:regression` 전체 PASS
- [ ] 실제 UI에서 UPS 오더로 `/ups-detail` 진입 → 예상운임이 0이 아닌 실제 값으로 표시되는지 확인 → R-10 스크린샷
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(D_Kai 작성 예정)_

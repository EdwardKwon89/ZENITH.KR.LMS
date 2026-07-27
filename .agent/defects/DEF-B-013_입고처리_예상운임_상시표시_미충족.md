# DEF-B-013: 입고처리 화면 예상운임 표시 방식이 원 요구사항과 불일치 (상시 표시 아님)

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — `/ko/warehouse/inbound` 실사용 중 지적 |
| **긴급도** | Medium |
| **우선순위** | P2 |
| **관련 Issue** | [#877](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/877) |
| **선행 작업** | TASK-B-218 / PR#875 (Issue #872) |

## 현상 / 원인

TASK-B-218에서 구현한 예상운임 표시(`InboundProcessForm.tsx:417-421`)는 아래 조건을 모두 만족해야만 잠깐 노출되는 "델타 배너"입니다.

```tsx
{freightEstimate?.changed && freightEstimate.oldFreight !== freightEstimate.newFreight && (
  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
    예상 운임 변경: {freightEstimate.currency} {freightEstimate.oldFreight?.toLocaleString()} → {freightEstimate.currency} {freightEstimate.newFreight?.toLocaleString()}
  </div>
)}
```

- 오더 조회 직후에는 아무 값도 안 보임(측정값 저장 버튼을 눌러야만 상태가 채워짐)
- 측정값이 실제로 바뀌지 않았거나, 재계산 결과가 이전과 같으면 계속 안 보임
- UPS 오더 + `ups_product_code`가 있는 경우만 재계산되므로 그 외 오더는 애초에 값이 채워지지 않음

jungjs 요구사항: **"변경 전 예상운임을 보여주고, 측정값 저장하면 변경된 예상운임을 보여줘야 해"** — 즉 상시 노출 필드가 필요하며, 델타 배너 방식으로는 요구사항 미충족.

또한 TASK-B-218 완료 보고에는 R-10(실 UI 스크린샷) 체크가 "로컬 DB 미가동"으로 미완료 상태였음 — 이 격차가 사전에 발견되지 못한 배경.

## 조치안 (Jaison 확정 설계)

`.agent/tasks/TASK-B-220_...md` 참조.

## 관련 파일

- `src/app/actions/operations/orders.ts` (`getOrderByBarcodeOrNo`)
- `src/components/warehouse/InboundProcessForm.tsx`

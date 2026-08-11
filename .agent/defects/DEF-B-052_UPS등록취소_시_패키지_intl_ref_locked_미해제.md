# DEF-B-052 (High) — UPS등록취소(`cancelUpsRegistration`) 시 패키지 `intl_ref_locked` 미해제 → 출고확정 시 라벨 재발급 누락 위험

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — MASTER AIR 계정으로 실제 `ZEN-2026-000008` 오더 UPS등록 후 "UPS등록취소" 실행, 결과 확인 요청 → Jaison이 DB 상태 검증 중 발견 |
| **긴급도** | High — 취소된(=SHXK에 실제 등록이 없는) 오더가 출고확정 단계에서 "이미 라벨 발급됨"으로 오판되어 재등록 없이 그대로 통과할 수 있음 |
| **현재 상태** | 원인 확정, 미수정 |

## 근본 원인 (확정 — 실제 취소 결과 직접 조회로 확인)

`ZEN-2026-000008`(MASTER AIR 자가화주 오더)에서 실제로 발생한 시퀀스:
1. `registerUpsOrder()` — SHXK `createorder` 성공, `zen_ups_labels` 저장, `markAllPackagesIssued()`가 `zen_order_packages.intl_ref_no`/`intl_ref_locked=true` 설정
2. `fetchAndIssueUpsLabel()` — `getnewlabel` 2회 성공(라벨 PDF 발급)
3. **"UPS등록취소" 실행**(`undoUpsRegistration()`, PACKED→WAREHOUSED 전환 경로) → 내부적으로 `cancelUpsRegistration()` 호출 → SHXK `removeorder` 성공(`"订单移除成功"`), `zen_ups_labels`/`zen_ups_label_documents`/스토리지 파일 삭제, `zen_tracking_configs.tracking_no` → NULL

취소 후 DB 직접 조회 결과:
```
zen_order_packages: intl_ref_no="1ZJ443D30417304171", intl_ref_locked=true  (그대로 남음)
```

`cancelUpsRegistration()`(`src/app/actions/operations/ups-labels.ts:447-529`)은 라벨 삭제·트래킹 초기화까지는 수행하지만, **`unlockAllPackagesIntlRef()` 호출이 없음** — 같은 파일의 자매 함수 `voidUpsLabel()`(RELEASED→PACKED 취소 경로)에는 이 호출이 있는데(`ups-labels.ts:628`), `cancelUpsRegistration()`에는 대응 로직이 처음부터 누락되어 있었다.

## 영향 범위

`OutboundProcessForm.tsx`가 출고확정 처리 시 `intl_ref_locked`로 "라벨 재발급 필요 여부"를 판단한다:
```ts
const packagesNeedingLabels = selectedOrders.flatMap((o) =>
  (o.order_packages || []).filter((p) => !p.intl_ref_locked)
);
```
즉 `intl_ref_locked`가 취소 후에도 `true`로 남아있으면, 이 패키지는 "이미 라벨 있음"으로 오판되어 `issueUpsLabel()` 재호출 없이 출고확정이 그대로 진행될 수 있다 — **실제로는 SHXK 쪽 등록이 취소되어 유효한 UPS 라벨/트래킹이 전혀 없는 상태인데도 출고가 승인되는 위험**.

## 수정 방향 (제안)

`cancelUpsRegistration()`에 `unlockAllPackagesIntlRef()` 호출 추가(`voidUpsLabel()`과 동일 패턴) — `zen_ups_labels` DELETE 이후, tracking_no 초기화 이전 또는 이후 아무 지점에 추가.

## 회귀 테스트 요구사항

- `cancelUpsRegistration()` 실행 후 `zen_order_packages.intl_ref_locked`가 `false`로, `intl_ref_no`가 `null`(또는 명세대로)로 초기화되는지 실 DB 기반 검증
- `undoUpsRegistration()`(PACKED→WAREHOUSED wrapper) 경유 통합 검증도 함께
- 되돌리기 검증 필수(unlock 호출 제거 시 intl_ref_locked가 true로 남는 회귀 재현)

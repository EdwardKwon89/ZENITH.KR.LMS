# DEF-100: 출고내역(오늘 출고) 화면의 UPS 라벨 조회가 오더단위 재구성 이후 항상 빈 값으로 나옴

## 발견 경위
사용자 질문("ups 라벨조회 기능은 어떻게 구현되어 있지?")에 답하기 위해 라벨 조회 경로를 추적하던 중, `src/app/actions/operations/warehouse.ts`의 `getTodayReleasedOrders()`가 여전히 다음과 같이 `zen_ups_labels`를 **패키지 단위 FK**로 조인하고 있음을 확인:

```ts
order_packages:zen_order_packages!zen_order_packages_order_id_fkey(
  id, intl_ref_no, intl_ref_locked, packing_count,
  ups_labels:zen_ups_labels!zen_ups_labels_package_id_fkey(
    id, tracking_number, label_format, storage_path, is_voided, voided_at, reference_no
  )
)
```

그런데 PR#549(TASK-B-146, Issue #545 — createorder 오더단위 재구성)에서 `saveInitialLabel()`이 라벨 INSERT 시 `package_id: null`로 저장하도록 변경됨(오더당 1행). DB 확인:

```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='zen_ups_labels'::regclass AND contype='f';
-- zen_ups_labels_order_id_fkey     | FOREIGN KEY (order_id) REFERENCES zen_orders(id) ...
-- zen_ups_labels_package_id_fkey   | FOREIGN KEY (package_id) REFERENCES zen_order_packages(id) ...
```

`zen_ups_labels_package_id_fkey`는 여전히 스키마상 존재하지만(nullable화만 됐지 FK 자체는 안 지워짐), 신규 라벨은 전부 `package_id = null`이라 이 조인 조건에 걸리는 행이 하나도 없음.

## 현상
`OutboundProcessForm.tsx`의 출고내역("오늘 출고") 탭에서 `getLatestLabel(pkgs)`가 각 패키지의 `pkg.ups_labels`(위 조인 결과)를 읽어 트래킹번호/라벨 다운로드 링크를 표시하는데, PR#549 병합 이후 발급된 모든 라벨이 이 화면에서 **항상 "라벨 없음" 상태로 보임** — 실제로는 `zen_ups_labels`에 정상 저장돼 있어도 UI에 노출되지 않음.

## 영향 범위
- 출고 처리 화면의 "오늘 출고" 이력 탭 — 발급된 UPS 라벨의 트래킹번호·PDF 다운로드 링크 확인 불가
- `voidUpsLabel`(라벨 폐기) UI 트리거도 이 `getLatestLabel` 결과에 의존하므로(활성 라벨 유무 판단), 화면상으로는 폐기 버튼도 정상 노출 안 될 가능성 있음

## 긴급도
Medium — 라벨 발급/폐기 자체(서버 액션)는 정상 동작하고 DB에도 정확히 저장됨(PR#549/#556/#555 검증 완료). UI 조회 화면 하나가 최신 스키마를 못 따라간 것으로, 기능 완전 마비는 아니나 운영자가 라벨을 확인할 방법이 막혀있음.

## 권장 조치
`getTodayReleasedOrders()`의 조인 구조를 오더 레벨로 변경 — `order:zen_orders(...)` 하위에 `ups_labels:zen_ups_labels!zen_ups_labels_order_id_fkey(...)`를 직접 붙이고(패키지 하위가 아니라 오더 하위), `OutboundProcessForm.tsx`의 `getLatestLabel(pkgs)`도 오더 레벨 라벨 배열을 받도록 시그니처 조정 필요.

## 관련 파일
- `src/app/actions/operations/warehouse.ts` (`getTodayReleasedOrders`)
- `src/components/warehouse/OutboundProcessForm.tsx` (`getLatestLabel`)

## 관련 Issue/PR
PR#549(Issue #545)의 부작용 — 해당 PR 리뷰 시 이 UI 조회 경로까지는 확인하지 못함(R-10 관련 후속 발견).

## 보고
Aiden에게 R-18 절차에 따라 보고 필요.

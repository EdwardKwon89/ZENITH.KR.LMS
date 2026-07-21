# DEF-116: `checkLabelPermission()`에 AGENCY 누락 — UPS 라벨 관련 기능 전체가 침묵 실패

| 항목 | 내용 |
|:----|:----|
| **발견 경위** | JSJung 실사용 중 "UPS등록확정" 클릭해도 아무 변화·로그가 없다고 보고 |
| **긴급도** | 즉시(Critical) |
| **발견자** | Jaison |
| **발견일** | 2026-07-22 |

## 현상

`agency@zenith.kr`로 `/warehouse/ups-receive`에서 "UPS 등록 확정" 클릭 시 HTTP 200 응답은 오지만:
- 오더 상태 변화 없음(`WAREHOUSED` 그대로)
- `order_status_history`에 `[UPS등록]` 기록 없음
- `zen_ups_labels` 신규 행 없음
- `zen_shxk_api_logs` 신규 행 없음(SHXK API 자체가 호출되지 않음)
- `zen_ups_label_errors`에도 기록 없음
- 서버 로그에 `[ERROR]` 없음

## 근본 원인

`src/app/actions/operations/ups-labels.ts:22`의 `checkLabelPermission()`:
```ts
async function checkLabelPermission(profile: { role: string } | null): Promise<string | null> {
  if (!profile) return 'User profile not found';
  const allowed: string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN];
  if (!allowed.includes(profile.role as string)) {
    return '권한이 없습니다. ADMIN, MANAGER, ZENITH_SUPER_ADMIN만 가능합니다.';
  }
  return null;
}
```
**AGENCY가 허용 목록에 없음.** 이 함수는 아래 7개 함수 전부에서 최우선 가드로 호출됨(`grep -n checkLabelPermission` 결과 라인 22/200/257/304/425/463/517/560):
- `registerUpsOrder`(200) — UPS접수
- `fetchAndIssueUpsLabel`(257) — 출고처리 라벨발급
- `cancelUpsRegistration`(304) — UPS등록취소
- `voidUpsLabel`(425 부근) — 출고취소
- `previewShxkPayload`(463 부근)
- `fetchShxkTradeDocument`(517 부근)
- `getUpsLabelStatus`(560 부근)

이 체크가 실패하면 `{success:false, error: '권한이 없습니다...'}`를 **조용히 반환** — 예외 throw 없음, `zen_ups_label_errors` insert 없음(그건 `placeShxkOrder` 실패 분기 전용), `zen_shxk_api_logs`도 SHXK 호출 자체가 없어 기록 안 됨, `logger.error` 호출도 없음. 그 결과 UI에는 "실패" 토스트만(사유 텍스트 미표시 — `UpsReceiveProcessForm.tsx`의 `handleConfirmRegistration`이 `res.error`를 사용자에게 노출하지 않고 단순 카운트만 집계), 서버 로그에도 아무 흔적이 안 남는 "침묵 실패"가 발생.

## DEF-114와의 관계 — 왜 그때 안 잡혔나

DEF-114(2026-07-21)는 `status-machine.ts`의 `canChangeStatus()`(`ROLE_PERMISSIONS`)와 `zen_orders` RLS UPDATE 정책만 수정했습니다. `checkLabelPermission()`은 완전히 별개의, 더 오래된 함수로 DEF-114 조사·수정 범위에 전혀 포함되지 않았습니다. DEF-114 검증 시 사용된 시나리오(`confirmInbound` — WAREHOUSED 전이)는 `checkLabelPermission()`을 거치지 않는 경로라 이 문제가 드러나지 않았습니다.

**결론: DEF-114로 "입고확정"은 고쳐졌지만, UPS 라벨(SHXK) 관련 기능(UPS접수·출고처리 라벨발급·UPS등록취소·출고취소 등) 7개 전부는 AGENCY 역할에서 여전히 100% 동작 불능입니다.**

## 재현

테스트 오더 `303f3ee1-74b9-4828-8f76-4106bde4fd01`(`ZEN-2026-000001`, 현재 WAREHOUSED)로 `agency@zenith.kr`가 "UPS 등록 확정" 클릭 → 서버 로그(`docs/archive/logs/server.log` 1049·1067행)에 `confirmUpsRegistration(...)` 실행 기록은 있으나 결과적 DB 변화 전무 확인.

## 임시 조치

없음 — 즉시 수정 필요.

## 목표 구현

`checkLabelPermission()`의 `allowed` 배열에 `USER_ROLES.AGENCY` 추가. 조직 스코프 검증(본인 소속 화주만)은 각 호출부(`confirmUpsRegistration` 등 warehouse.ts 액션)에서 이미 별도로 하고 있으므로 여기서는 상태값 화이트리스트 역할만 하면 됨(DEF-114의 `ROLE_PERMISSIONS[AGENCY]` 패턴과 동일).

**추가로 반드시 함께 확인**: 이런 "침묵 실패"가 재발하지 않도록, `checkLabelPermission()` 실패 시에도 최소한 `logger.warn()` 한 줄이라도 남기는 방안을 검토 요청(관측성 개선, 필수는 아니나 권장).

## 관련 파일

- `src/app/actions/operations/ups-labels.ts` (22-29행 `checkLabelPermission`)
- `tests/unit/ups/*.test.ts` — AGENCY 케이스 회귀 테스트 추가 필요

## 예상 공수

Low (0.5일 이내 — 배열에 역할 추가 + 7개 함수 전부 AGENCY로 실사용 재현 확인)

## 우선순위

**P1 — 즉시**: DEF-114로 "해결됐다"고 보고된 AGENCY 창고관리 기능 중 SHXK 연동이 필요한 핵심 액션(UPS접수 등)이 실제로는 여전히 전부 막혀 있음

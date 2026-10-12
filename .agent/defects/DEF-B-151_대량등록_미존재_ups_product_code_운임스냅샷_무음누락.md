# DEF-B-151: UPS 오더 등록 시 미존재 `ups_product_code` 무음 통과 — 운임 스냅샷 누락 오더 생성

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-B-335(PR#1246, Issue #1245) 보완 검토 중 Jaison이 템플릿 샘플 `ups_product_code='WWE'`가 `zen_ups_products`에 0건임을 실측 → 이어 `createOrder` → `saveOrderRateSnapshot`이 미존재 코드를 조용히 건너뛰는 것을 확인 (2026-10-13) |
| **긴급도** | Medium (등록은 "성공"으로 보이나 운임 스냅샷이 누락된 UPS 오더가 생성됨 — 상세 화면 운임 내역 공백, 이후 라벨 단계 문제 소지. 조용한 실패) |
| **발견일** | 2026-10-13 |
| **조치 상태** | TASK-B-336(Issue #1247)로 해결 |

## 현상

오더 등록 시 `ups_product_code`에 `zen_ups_products`에 존재하지 않는 코드(예: `WWE`, 오타, 구버전 코드)를 넣어도 **오류 없이 오더가 등록**된다. 다만 운임 스냅샷(`zen_order_rate_snapshots` 등) 저장은 조용히 건너뛰어진다.

DB 실측(로컬): `select count(*) from zen_ups_products where product_code='WWE'` → **0**. 실존 코드 8개: `UPS_10KG_BOX`, `UPS_25KG_BOX`, `WW_EXPEDITED`, `WW_EXPRESS_DOC`, `WW_EXPRESS_NONDOC`, `WW_FLIGHT`, `WW_SAVER_DOC`, `WW_SAVER_NONDOC`.

## 근거

`src/app/actions/operations/orders.ts` `saveOrderRateSnapshot`:

```ts
const { data: product } = await supabase
  .from('zen_ups_products')
  .select('id')
  .eq('product_code', validated.ups_product_code)
  .maybeSingle();

if (!product) return;   // ← 미존재 코드면 조용히 반환 (경고/오류 없음)
```

`orderRegistrationSchema.ups_product_code`는 `z.string().optional()`로 **값 유효성 검증이 없어**(order.ts:107) 오더 자체는 정상 저장된다. 그 결과 미존재 코드가 오더에 그대로 남고 운임 스냅샷만 누락된다.

## 영향 범위

- 운임 스냅샷이 없는 UPS 오더 생성 → 오더 상세 화면의 운임 내역 공백.
- 이후 UPS 라벨 발행 등 운임/상품 정보에 의존하는 단계에서 오류·추가 조사로 이어질 소지.
- 사용자에게 실패가 전혀 전달되지 않는 **조용한 실패**(GOV_COMMON.md "실패 관측성 의무" 관점 문제).

## 권장 조치 (DoD)

- [ ] 오더 등록(또는 `saveOrderRateSnapshot`) 시 `ups_product_code`가 `zen_ups_products`에 존재하지 않으면 **명시적 오류 또는 경고** 반환(무음 `return` 제거).
- [ ] 가능하면 등록 폼/대량 등록에서 선택 가능한 코드를 DB 실존 코드로 제한(클라이언트·서버 양측 검증). 정본 상수(코드 집합)가 현재 코드베이스에 없으므로 DB 조회 기반으로 구현하는 편이 안전.
- [ ] `saveOrderRateSnapshot`이 스냅샷을 만들지 못한 경우(상품 미존재·port 미존재 등) 반환값에 경고 필드를 포함해 가시화.
- [ ] 회귀 테스트: 미존재 `ups_product_code` 등록 시 거부/경고 검증.
- [ ] (연계) TASK-B-335에서 템플릿 샘플을 실존 코드 `WW_SAVER_NONDOC`로 교체함 — 이 결함이 재발하지 않도록 라운드트립 테스트가 샘플 코드를 고정.

## 파일 소유권 확인

`git log --follow -- src/app/actions/operations/orders.ts` — Team B 주도(일부 Team A 커밋 혼재) → **Team B 담당**

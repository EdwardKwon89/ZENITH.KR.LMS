# DEF-131: `--color-primary` CSS 변수 미정의 — `bg-primary`/`text-primary`/`border-primary` 전역 무효화, 버튼 라벨 비가시 (흰 글씨+투명 배경)

| 항목 | 내용 |
|:------|:------|
| **발견일** | 2026-07-28 |
| **보고자** | Jaison (Team B) — `/ko/admin/ups-actual-charges`에서 "실제 청구 및 차액 정산 반영" 버튼 클릭 실패로 보고받아 원인 조사 중 발견 |
| **긴급도** | High |
| **우선순위** | P1 |
| **범위** | Team A/B 공용 — `src/app/globals.css`(핵심 테마 파일), 영향 파일 9개 중 Team A 소유 화면 포함(`ups-detail/page.tsx`, `RouteOptimizationSection.tsx` 등) |
| **Team B 배정 대상 아님** | 공용 테마 파일 수정이라 Aiden/Team A 판단 필요 (R-19) |

## 현상

`/ko/admin/ups-actual-charges`에서 "실제 청구 및 차액 정산 반영" 버튼(및 다른 화면의 `bg-primary`/`text-primary` 사용 요소들)의 텍스트가 시각적으로 전혀 보이지 않음. 사용자가 "버튼 실행이 실패했다"고 보고했으나 실측 결과 **DB에는 정상 저장되어 있었음**(`zen_ups_actual_charges`에 "extra charge 01"(5,600 KRW)·"extra charge 02"(41,235 KRW) 2건 정상 삽입 확인) — 즉 기능 자체는 동작하나, 버튼 라벨이 안 보여 사용자가 클릭 결과를 확인할 수 없어 "실패"로 오인한 것으로 판단됨(서버 로그상 동일 payload로 `recordUpsActualCharges` 호출이 2회 기록된 것도 라벨 미확인으로 인한 재클릭 가능성이 높음).

## 원인 (Playwright 실측 확인 완료)

`src/app/globals.css`의 `@theme` 블록에 `--color-brand-*`·`--color-accent`는 정의되어 있으나 **`--color-primary`가 어디에도 정의되어 있지 않음**(`grep -rn "color-primary\|--primary" src/` 결과 0건). Tailwind v4는 CSS 변수가 없으면 해당 색상 유틸리티(`bg-primary`/`text-primary`/`border-primary`)를 아예 생성하지 않음 — 즉 이 클래스들은 코드에 존재하지만 **어떤 CSS 규칙도 적용되지 않는 죽은 클래스**.

실제 렌더링된 버튼(`className="... text-white bg-primary px-4 py-2"`, `ZenButton` `tactile` variant 기본값 `bg-white` 포함)을 Playwright로 직접 검사:
```
computed styles: { color: "rgb(255, 255, 255)", backgroundColor: "rgba(0, 0, 0, 0)" }
```
`bg-primary`가 무효 클래스라 `twMerge`가 충돌 클래스로 판단해 `ZenButton`의 기본 `bg-white`를 제거하지만, `bg-primary` 자체는 아무 규칙도 만들지 않아 배경이 완전 투명(`rgba(0,0,0,0)`)으로 남고, `text-white`(정상 유틸리티)만 적용되어 흰 글씨가 흰 페이지 배경(`body { background-color: #ffffff }`) 위에서 완전히 안 보이게 됨. 스크린샷으로도 빈 버튼 확인(첨부 생략, 세션 내 확인).

**참고**: 2026-06-09 B_Kai가 유사한 "white-on-white" 문제(커밋 `ee9aab41`)를 이미 한 번 고친 이력이 있으나, 그건 `.zen-tactile`의 하드코딩된 `background:#ffffff`가 Tailwind 클래스를 덮어쓰던 문제였고, 이번 건은 그와 별개로 **`--color-primary` 토큰 자체가 애초에 정의된 적이 없는** 근본적으로 다른 원인.

## 영향 범위 (`bg-primary`/`text-primary`/`border-primary` 사용 파일 9개)

```
src/app/[locale]/(dashboard)/admin/ups-actual-charges/ups-actual-charges-client.tsx   (Team B)
src/app/[locale]/(dashboard)/admin/sub-agency-profit/sub-agency-profit-client.tsx
src/app/[locale]/(dashboard)/finance/order-revenue-cost/order-revenue-cost-client.tsx
src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx                      (Team A 소유)
src/components/finance/TaxInvoiceTemplate.tsx
src/components/finance/TaxInvoiceSheet.tsx
src/components/routing/RouteOptimizationSection.tsx                                    (Team A 소유)
src/components/routing/RouteConsistencyBadge.tsx
src/components/orders/UpsActualAdjustmentForm.tsx                                      (Team B)
```
전부 동일 증상(텍스트/배경/테두리 미표시 가능성)을 겪고 있을 가능성이 높음 — 개별 화면 단위로는 확인 안 함.

## 조치안 (제안, Aiden 확정 필요)

`src/app/globals.css`의 `@theme` 블록에 `--color-primary`(및 필요 시 `--color-primary-foreground`) 추가:
```css
--color-primary: var(--color-brand-600);   /* 또는 별도 브랜드 색상 지정 */
```
공용 핵심 테마 파일이라 **9개 파일 전체의 시각적 회귀 여부를 함께 확인해야** 함 — Team B 단독 판단으로 수정 범위를 결정하지 않음.

## 관련 파일
- `src/app/globals.css` (`@theme` 블록, `--color-primary` 부재)
- `src/components/ui/ZenButton.tsx` (참고 — 이 파일 자체는 정상, twMerge 동작도 정상)

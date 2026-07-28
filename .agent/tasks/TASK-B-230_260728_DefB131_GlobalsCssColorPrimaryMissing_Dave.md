# TASK-B-230: DEF-131 — globals.css `--color-primary` 미정의로 버튼 라벨 비가시 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#910](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/910) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

`/admin/ups-actual-charges`의 "실제 청구 및 차액 정산 반영" 버튼 텍스트가 안 보이는 문제(JSJung 직접 발견·보고). 원인은 `src/app/globals.css`의 Tailwind v4 `@theme` 블록에 `--color-primary`가 정의되어 있지 않아 `bg-primary`/`text-primary`/`border-primary` 유틸리티가 전부 죽은 클래스가 되고, `text-white`만 정상 적용되어 흰 글씨가 흰 배경 위에서 안 보이는 것. 실측(Playwright computed style) 확인 완료: `color: rgb(255,255,255)`, `backgroundColor: rgba(0,0,0,0)`. 상세: `.agent/defects/DEF-131_...md`.

**원래 공용 테마 파일 수정이라 Aiden/Team A 판단이 필요하다고 보고했으나, JSJung이 Team B 직접 처리로 결정**했습니다. **Jaison이 원인·조치안을 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

`src/app/globals.css`의 `@theme` 블록(약 8~16행, `--color-brand-*` 정의 근처)에 추가:

```css
--color-primary: var(--color-brand-600);
```

다른 신규 토큰(`--color-primary-foreground` 등)은 실제 사용처가 확인되기 전까지 추가하지 않습니다 — 딱 이 한 줄만 추가.

## ⚠️ 반드시 지킬 것 — 영향 범위 검증 (Team A 소유 화면 포함)

`bg-primary`/`text-primary`/`border-primary`를 사용하는 파일은 총 9개이며, 이 중 **2개는 Team A 소유**입니다:

```
src/app/[locale]/(dashboard)/admin/ups-actual-charges/ups-actual-charges-client.tsx   (Team B)
src/app/[locale]/(dashboard)/admin/sub-agency-profit/sub-agency-profit-client.tsx
src/app/[locale]/(dashboard)/finance/order-revenue-cost/order-revenue-cost-client.tsx
src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx                      ⚠️ Team A 소유 — 절대 코드 수정 금지
src/components/finance/TaxInvoiceTemplate.tsx
src/components/finance/TaxInvoiceSheet.tsx
src/components/routing/RouteOptimizationSection.tsx                                    ⚠️ Team A 소유 — 절대 코드 수정 금지
src/components/routing/RouteConsistencyBadge.tsx
src/components/orders/UpsActualAdjustmentForm.tsx                                      (Team B)
```

- **CSS 파일(`globals.css`) 1줄 추가만 수정** — 위 9개 파일의 `.tsx` 코드는 어디도 건드리지 않습니다.
- Team A 소유 파일 2개(`ups-detail/page.tsx`, `RouteOptimizationSection.tsx`)는 **화면에서 실제로 렌더링만 확인**(스크린샷). 만약 색상 변경으로 의도치 않은 시각적 회귀(예: 기존에 우연히 안 보이던 게 나아서 오히려 레이아웃이 깨지는 등)가 발견되면, **코드는 절대 수정하지 말고** 발견 내용만 `[발견 이슈]` 섹션에 기록 후 별도 DEF로 보고합니다(R-19 파일 소유권 원칙).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-230-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 230 나와야 정상)
- [ ] `globals.css` 1줄 추가
- [ ] 회귀 테스트 — 가능하면 `UpsActualAdjustmentForm`의 저장 버튼 텍스트 색상 대비를 실제 렌더링 기반으로 검증하는 테스트 1건 추가(computed style 검사, toContain/그림자 컴포넌트 금지). 전역 CSS 특성상 함수 단위 테스트보다 스크린샷이 핵심 증적임을 유의.
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 스크린샷 — 9개 파일 전체 실제 화면 확인 필수**:
  1. `/ko/admin/ups-actual-charges` — 저장 버튼 텍스트 정상 표시
  2. `/ko/admin/sub-agency-profit`
  3. `/ko/finance/order-revenue-cost`
  4. `/ko/orders/[orderId]/ups-detail` ⚠️ Team A 화면 — 회귀 여부만 확인, 수정 금지
  5. 인보이스 관련 화면(TaxInvoiceTemplate/Sheet 사용처)
  6. 라우팅 관련 화면(RouteOptimizationSection/RouteConsistencyBadge 사용처) ⚠️ Team A 화면 포함
  - 각 화면에서 텍스트/배경/테두리가 정상적으로 보이는지, 색상 변경으로 인한 부작용이 없는지 스크린샷으로 확인

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-230 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 910 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-131 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #910`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 이번 Task는 **공용 파일 수정 + 타 팀 화면 영향**이 있는 만큼, 절대 Team A 소유 파일(`ups-detail/page.tsx`, `RouteOptimizationSection.tsx`)의 코드 자체를 수정하지 않도록 각별히 주의할 것.

## [작업 결과]

| 항목 | 내용 |
|:-----|:------|
| **담당 실행자** | D_Kai (Dave 대리) |
| **커밋 해시** | `5b69178e` |
| **변경 파일** | `src/app/globals.css` (1줄 추가) |
| **테스트 결과** | `vitest run` — 137 files · 913 tests **ALL PASS** |
| **빌드 결과** | `npm run build` — **SUCCESS** |

### R-10 스크린샷 (6개 화면)

| # | 화면 | 소유 |
|:--|:-----|:----|
| 1 | `/ko/admin/ups-actual-charges` — 저장 버튼 텍스트 정상 표시 | Team B |
| 2 | `/ko/admin/sub-agency-profit` | 공용 |
| 3 | `/ko/finance/order-revenue-cost` | 공용 |
| 4 | `/ko/orders/ups-detail` — Team A 소유, 회귀 없음 확인 | ⚠️ Team A |
| 5 | `/ko/finance/documents` (TaxInvoiceTemplate/Sheet) | 공용 |
| 6 | `/ko/orders` (RouteOptimizationSection/RouteConsistencyBadge) — Team A 소유, 회귀 없음 확인 | ⚠️ Team A |

### 체크리스트 완료 현황

- [x] 브랜치 생성
- [x] `globals.css` 1줄 추가 (`--color-primary: var(--color-brand-600)`)
- [x] `npm run build` · `npm run test:regression` — Build SUCCESS, 913/913 PASS
- [x] R-10: 6개 화면 스크린샷 (Team A 소유 화면 2개 포함, 코드 수정 없음)

## [발견 이슈]

Team A 소유 화면에서 시각적 회귀 발견되지 않음 (ups-detail, routing)

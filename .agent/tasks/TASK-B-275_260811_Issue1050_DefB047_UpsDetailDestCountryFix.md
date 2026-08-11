# TASK-B-275: Issue #1050 / DEF-B-047 — UPS 오더 상세 도착국 표시 'US' 하드코딩 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1050](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1050) |
| **DEF** | [DEF-B-047](../defects/DEF-B-047_UPS주문상세_도착국표시_US하드코딩_기본값.md) |
| **배경** | JSJung — `/orders/[id]/ups-detail` 도착국/Zone 정보 확인 요청 중 발견(ZEN-2026-000008, 중국행인데 US 표시) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 근본 원인 (Issue #1050 / DEF-B-047 참조 — 확정 완료)

`src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx:266`:
```tsx
destCountryCode={(order as any).dest_country_code || (order.dest_port as any)?.country_code || 'US'}
```
- `dest_country_code`는 `zen_orders`에 존재하지 않는 컬럼(`as any`가 컴파일 에러를 숨김) — 항상 `undefined`.
- UPS 오더는 `dest_port_id`가 항상 비어있어 `order.dest_port`도 `null`.
- 결과: 항상 하드코딩된 `'US'` 폴백만 사용됨. 실제 목적지 정보는 `order.recipient_country_code`(예: `ZEN-2026-000008`은 'CN')에 있는데 전혀 사용 안 함.

## 수정 방향 (설계 확정 — 착수 승인)

```tsx
destCountryCode={order.recipient_country_code || (order.dest_port as any)?.country_code || 'US'}
```
- `getOrderDetails()`(`src/app/actions/operations/orders.ts`)의 select 목록에 `recipient_country_code`가 이미 포함되어 있는지 확인 — 없으면 추가.
- 화면 구조 변경 없음, 이 한 줄(prop 값 소스)만 수정.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-275-ups-detail-dest-country` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/mike` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-275 확인
- [ ] `ups-detail/page.tsx`의 `destCountryCode` 소스 수정, `getOrderDetails()` select 확인·필요 시 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - UPS 오더(포트 없음) + `recipient_country_code='CN'` → 컴포넌트에 전달되는 `destCountryCode`가 'CN'인지 확인(실제 렌더링 또는 함수 단위 검증)
  - 둘 다 없는 예외 케이스 → 'US' 폴백 유지 확인(회귀 방지)
  - **되돌리기 검증 필수**
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) `ZEN-2026-000008`(또는 동등 중국행 UPS 오더) 상세 페이지에서 "도착국: CN" 정상 표시 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-275 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1050 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1050`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-271(v2)은 절차 정확히 준수 완료 — 동일 수준 기대. 이번 Task는 TASK-B-276(DEF-B-048)과 동시 배정됨 — 두 Task를 혼동해 파일을 섞지 않도록 주의(각 task file/브랜치 분리 유지).

## [작업 결과] (Jaison 병합 시 최종본으로 정리 — v1~v3 경과는 ACTIVE_TASK.md 참조)

**최종 커밋**: `5ce8dea8` — `[Mike] fix: DEF-B-047 회귀 테스트 재작성 — 실제 프로덕션 함수 import 검증 (Issue #1050)`

**PR**: #1053 (TeamB_Dev base) — Jaison 승인·머지 완료

**변경 파일**:
- `src/lib/ups/order-helpers.ts`(신규): `resolveDestCountryCode(order)` — `recipient_country_code > dest_port.country_code > 'US'` 우선순위로 도착국 결정
- `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx:267`: 인라인 `(order as any).dest_country_code || ...` → `resolveDestCountryCode(order)` 호출로 교체(존재하지 않는 컬럼 참조 제거)

**회귀 테스트 7건** (`tests/unit/orders/ups-detail-dest-country.test.tsx`, 실제 함수 import):
- recipient_country_code 우선 사용 / dest_port 폴백 / 둘 다 없을 때 US 폴백 / 빈 문자열 처리 2건
- 되돌리기 검증 2건(버그 패턴 재현 + 수정 후 정상값 확인)

**Jaison 검증**: v1(`23ab4677`)·v2(`d76f11aa`) 2차례 반려 후 v3에서 승인.
- 되돌리기 검증(Jaison 직접 재현) — `resolveDestCountryCode()` 본문을 버그 패턴으로 되돌리면 7건 중 2건 FAIL, 복원 후 7/7 PASS
- 회귀 161/161·1142/1142 ALL PASS(신선 DB, Jaison 재검증 일치)
- `npm run build` SUCCESS
- CI 3개 체크(Regression/Task File/Type Check) 전부 pass
- R-10 화면 스크린샷은 JSJung이 직접 수행 예정(코드·테스트 검증 완료로 승인 처리)

## [발견 이슈]

없음

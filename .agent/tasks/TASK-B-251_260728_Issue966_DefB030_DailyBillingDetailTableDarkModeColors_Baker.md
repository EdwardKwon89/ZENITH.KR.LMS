# TASK-B-251: Issue #966 / DEF-B-030 — daily-billing 상세 리스트 색상 다크모드 대응 누락

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#966](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/966) |
| **DEF** | [DEF-B-030](../defects/DEF-B-030_daily_billing_detail_table_dark_mode_colors_missing.md) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

JSJung 요청으로 `/finance/daily-billing` 상세 리스트 색상 표출을 Jaison이 직접 코드 확인. 상세 내용은 DEF-B-030 참조.

원인: `ShipperDailyBillingClient.tsx`의 "상세" 펼침 테이블(214-219행) 색상 클래스가 바로 위 요약 테이블(69-113행)과 다르게 `dark:` 변형이 전부 빠져있고, 기본운임/유류할증 두 항목은 색상 클래스 자체가 없음.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### `src/components/finance/ShipperDailyBillingClient.tsx` 214-219행 수정

현재:
```tsx
<td className="py-2 px-3 text-right font-mono">₩{ord.baseFreight.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono">₩{ord.fuelSurcharge.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono text-amber-600">₩{ord.surgeFee.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono text-purple-600">₩{(ord.otherCharge || 0).toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono text-blue-600">₩{ord.actualAdjustment.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
```

아래로 교체 — 요약 테이블(69-113행)과 동일한 색상 체계로 통일:
```tsx
<td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">₩{ord.baseFreight.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">₩{ord.fuelSurcharge.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono text-amber-600 dark:text-amber-400">₩{ord.surgeFee.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400">₩{(ord.otherCharge || 0).toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400">₩{ord.actualAdjustment.toLocaleString()}</td>
<td className="py-2 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
```

(각 줄 끝의 `>₩{...}</td>` 부분은 변경 없음 — `className` 문자열만 교체)

### 건드리지 않는 것 (범위 밖)

- 요약 테이블(69-113행) — 이미 정상, 변경 없음
- 계산 로직(`getShipperDailyBillingSummary()`/`getShipperDailyOrdersDetails()`) — 무관, 순수 스타일링 변경
- 다른 컬럼(오더번호/상태/도착국/인보이스/바로가기) — 변경 없음

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-251-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 251 나와야 정상)
- [ ] 위 스펙대로 6개 컬럼 className 수정
- [ ] 회귀 테스트: 순수 스타일링(className 문자열) 변경이라 기존 로직 테스트에 영향 없음 — 신규 테스트 불필요. 다만 `npm run test:regression`으로 기존 테스트 전체 PASS 확인은 필수.
- [ ] `npm run build` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬 라이트모드/다크모드 양쪽에서 `/finance/daily-billing` 접속 → 그룹 "상세" 펼침 → 기본운임/유류할증/급증수수료/기타부과금/사후조정/합계 색상이 바로 위 요약 행과 일치하는지 스크린샷 2장(라이트/다크)으로 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-251 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 966 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #966`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 특히 TASK-B-248(PR#961)에서 발생한 "TeamB_Dev 직접 커밋 + PR base가 develop" 위반 재발 금지(정식 feature 브랜치에서 TeamB_Dev로 PR 생성할 것). 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

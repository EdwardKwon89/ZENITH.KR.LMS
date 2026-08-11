# TASK-B-288: Issue #1077 / DEF-B-057 (Medium) — UPS 등록취소 후 오더 상세 페이지에 UPS 등록 카드 stale 표시

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1077](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1077) |
| **DEF** | [DEF-B-057](../defects/DEF-B-057_오더수정저장후_상세페이지_UPS등록카드_stale_캐시.md) |
| **배경** | JSJung — ZEN-2026-000008 UPS 등록취소 성공했는데 오더 상세 페이지에 UPS 등록 카드가 여전히 보인다고 보고 → Jaison 원인 확정(DB는 정상, 캐시 무효화 누락) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-12 |
| **우선순위** | P2 (Medium) |
| **상태** | ✅ 완료 |

## 근본 원인 (확정 완료 — DEF-B-057 참조)

`zen_ups_labels` 상태를 바꾸는 서버 액션들(`cancelUpsRegistration`/`undoUpsRegistration`/`registerUpsOrder`/`fetchAndIssueUpsLabel`/`voidUpsLabel` 등, `warehouse.ts`/`ups-labels.ts`)이 `revalidatePath("/(dashboard)/orders", "page")`(목록 페이지)만 호출하고, 오더 상세 동적 페이지 `/(dashboard)/orders/[orderId]`는 무효화하지 않음. 오더 상세 페이지는 `getUpsLabelStatus()` → `hasActiveLabel`로 UPS 등록 카드(`UpsTradeDocumentActions`) 노출을 결정하는데, DB는 정상 갱신되지만 캐시된 페이지가 새로고침 전까지 stale하게 남을 수 있음(직접 재현 확인: DB 라벨 0건·status WAREHOUSED 정상인데 카드가 안 사라짐).

## 수정 방향 (설계 확정 — 착수 승인)

라벨 상태를 바꾸는 각 액션에 동적 세그먼트 revalidatePath 한 줄 추가:

```ts
revalidatePath('/(dashboard)/orders/[orderId]', 'page');
```

`grep -n "revalidatePath" src/app/actions/operations/{warehouse,ups-labels}.ts`로 기존 `revalidatePath("/(dashboard)/orders", "page")` 호출 지점을 전부 찾아 그 옆에 추가(과설계 금지 — 새로운 revalidate 지점 발명 금지, 기존 호출부 옆에만 추가).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-288-order-detail-stale-revalidate` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-288 확인
- [ ] `warehouse.ts`/`ups-labels.ts`에서 `revalidatePath("/(dashboard)/orders", "page")`가 있는 모든 지점 파악 후 동일 위치에 `/(dashboard)/orders/[orderId]` 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `undoUpsRegistration()`/`cancelUpsRegistration()` 호출 시 `revalidatePath`가 `/(dashboard)/orders/[orderId]`로도 호출되는지 mock 검증(vi.mock('next/cache') 후 호출 인자 확인)
  - 기존 `/(dashboard)/orders` revalidate가 계속 유지되는지(회귀 방지)
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 오더 상세 페이지를 열어둔 상태에서 창고 화면에서 UPS 등록취소 실행 후, 새로고침 없이 상세 페이지로 돌아왔을 때 UPS 등록 카드가 정확히 사라지는지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-288 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1077 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1077`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락·마이그레이션 타임스탬프 충돌(PR#1074 v1 반려) 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 및 **최신 TeamB_Dev로 브랜치 동기화 여부 특히 주의**. 이번 Task는 신규 마이그레이션이 없는 순수 코드 수정이라 타임스탬프 충돌 위험은 없으나, 채번 확인 절차 자체는 동일하게 준수할 것.

## [작업 결과]

**구현**
- `warehouse.ts` **9곳**(`undoUpsRegistration`·`confirmDeparture`·`undoDeparture` 등 라벨/출고 상태 변경 액션)과 `ups-labels.ts` **6곳**(`registerUpsOrder`·`cancelUpsRegistration`·`fetchAndIssueUpsLabel`·`voidUpsLabel`·`issueUpsLabel` 등)에 기존 `revalidatePath` 호출부 옆으로 `revalidatePath('/(dashboard)/orders/[orderId]', 'page')` 추가 — 총 **15개 지점**. 과설계 금지 원칙 준수(신규 revalidate 지점 발명 없음, 기존 호출부 옆에만 삽입).
- 기존 `revalidatePath("/(dashboard)/orders", "page")`(목록) 및 각 화면 revalidate는 전부 유지(회귀 방지, grep으로 확인).

**회귀 테스트 신설 6건 (ALL PASS)**
- `tests/unit/ups/defb057-order-detail-revalidate-ups-labels.test.ts` — TC-288-01~04: `cancelUpsRegistration`/`voidUpsLabel` 성공 시 `/(dashboard)/orders/[orderId]` + 기존 `/(dashboard)/warehouse/outbound` revalidate 호출 검증, `removeorder` 실패 시 revalidate 미호출.
- `tests/unit/warehouse/defb057-order-detail-revalidate-undo.test.ts` — TC-288-11~12: `undoUpsRegistration` 성공 시 `[orderId]` + 목록(`/orders`) + `ups-receive`/`outbound` revalidate 유지, `cancelUpsRegistration` 실패 시 revalidate 미호출.
- 테스트 mock 구성: `next/cache`는 `unstable_cache` 보존을 위해 `importOriginal` 부분 모킹, `./orders`·`./ups-labels`는 모듈 ID를 앨리어스 경로(`@/app/actions/operations/...`)로 모킹(테스트 파일 상대경로 미스매치 이슈 해결).

**검증**
- 회귀 **174/174 파일 · 1226/1226 ALL PASS** (`npm run test:regression` 직접 실행).
- `npm run build` SUCCESS.
- 신규 마이그레이션 없음 — 순수 코드 수정이라 타임스탬프 충돌 위험 없음.

**R-10 브라우저 검증** — `tests/e2e/r10-288-order-detail-stale-revalidate.spec.ts`
- 자기완결형 픽스처(beforeAll 사전 정리 + afterAll 정리): SHIPPER 조직 · PACKED UPS 오더 · 활성 UPS 라벨(`is_voided=false`) 생성.
- ADMIN 실제 로그인 → 오더 상세 페이지에서 UPS 등록 카드(`UPS등록취소` 버튼) 노출 확인 → 창고 `/ko/warehouse/outbound`에서 오더 선택 → `UPS접수취소` → 확인 모달(`접수취소 확정`) → `undoUpsRegistration` 실행.
- DB 확정: `status` PACKED→**WAREHOUSED**, `zen_ups_labels` **0건** → 상세 페이지 재네비게이션 시 UPS 등록 카드 **제거** 확인. **PASS**.
- 사전 조건: 3010 dev 서버를 `SHXK_TEST_MOCK=true`로 재시작(removeorder 성공 결정적 재현), 시드 `admin@zenith.kr` 사용.
- 스크린샷 `docs/99_Manual/E2E_288_Result/01~05` (로그인 · 카드 노출 · 오더 선택 · 취소 확정 모달 · 카드 제거).

- 코드 커밋: `8a170a6a59d12d71c5f8fddb751256e4bf940a28`

## [Jaison 최종 검토]

`/tmp/review-pr1082` 격리 워크트리에서 재검증 — 신규 테스트 6/6 PASS. **독립 되돌리기 검증**: `undoUpsRegistration()`의 신규 revalidatePath 호출을 수동 제거 후 재실행 → 정확히 FAIL 재현(3번째 호출 인자 불일치), 복원 후 2/2 PASS 재확인. 전체 회귀 175/175·1230/1230 PASS, build SUCCESS. 실제 CI(`gh pr checks 1082`) Regression Tests pass 확인. warehouse.ts 9곳 + ups-labels.ts 6곳(총 15지점) grep으로 누락 없이 확인, 과설계 없음. R-10 E2E가 실제 브라우저로 카드 노출→취소→새로고침 없이 카드 제거를 스크린샷 5장과 함께 검증. PR#1082 승인·머지(TeamB_Dev, 커밋 `62d2d1c4`), Issue #1077 종결.

## [발견 이슈]

없음 (Task 범위 밖 이슈 미발견)

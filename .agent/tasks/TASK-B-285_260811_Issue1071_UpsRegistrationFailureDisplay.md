# TASK-B-285: Issue #1071 — UPS 등록 실패 상세 노출 + 수정 화면 연결

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1071](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1071) |
| **배경** | JSJung — UPS 등록 확정 실패 시 실패 상세 내역 표출 + 수정 가능해야 함. Jaison이 현황 조사·설계 완료 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 |
| **상태** | 🔔 |
| **의존성** | [TASK-B-284](TASK-B-284_260811_Issue1070_UpsWarehousedPartialEdit.md) — "수정하기" 링크가 실제로 동작하려면 선행 병합 필요(단, 본 Task의 실패 표출 부분 자체는 독립적으로 병행 착수 가능) |

## 현황 분석 (Jaison 조사 완료)

- `confirmUpsRegistration()`(`warehouse.ts:478-515`) 실패 시 SHXK 원문 에러(`res.error`, 예: `收件人城市不能为空`)를 정확히 반환하지만, `UpsReceiveProcessForm.tsx`의 배치 등록 핸들러(`handleConfirmRegistration`, 85-119행)가 **이 값을 완전히 버리고** 성공/실패 "건수"만 토스트로 표시(`partial_success` 번역 문자열).
- 어떤 오더가 실패했는지조차 화면에서 식별 불가.
- `zen_ups_label_errors`(`order_id/error_message/attempted_by` 정규화된 오더별 에러 기록 테이블)가 `registerUpsOrder()` 실패 시 정확히 채워지고 있으나(`ups-labels.ts:323`), **이를 조회하는 서버 액션/컴포넌트/페이지가 코드베이스 전체에 전무**. 마이그레이션 주석에 "화주 미노출, ADMIN 전용 조회"로 RLS까지 열어뒀는데 실제 사용처가 없는 상태.
- 실패한 오더는 상태가 WAREHOUSED로 유지되어 큐에 자동 재등장(재시도 가능)하지만, 사용자는 원인을 전혀 모른 채 반복 클릭할 수밖에 없음.
- 오더 상세 페이지(`ups-detail/page.tsx`)에도 등록 실패 이력 표시 없음.
- 에러 메시지는 가공/번역 없이 SHXK 원문(중/영문) 그대로 DB·반환값까지 전달되나, 애초에 UI에 도달을 못 하므로 무의미한 상태.

## 설계 확정 (JSJung 승인 완료)

### 1. 배치 등록 결과 상세화
`UpsReceiveProcessForm.tsx`의 배치 등록 결과를 "건수 집계"에서 **오더별 성공/실패 목록**(주문번호 + 실패 사유)으로 변경. 결과 모달 또는 리스트 형태로 어떤 오더가 왜 실패했는지 명확히 표시.

### 2. 큐 화면 인라인 배지
WAREHOUSED 대기 큐의 각 행에, 해당 오더의 최근 `zen_ups_label_errors` 레코드가 있으면 인라인 경고 배지(예: "⚠ 최근 등록 실패") 표시. 신규 서버 액션 필요(예: `getLatestUpsLabelErrors(orderIds: string[])` — 여러 오더의 최신 에러를 한 번에 조회, N+1 방지).

### 3. "수정하기" 연결
실패 배지/결과 모달에 "수정하기" 링크 → `/orders/[orderId]/edit`. TASK-B-284 병합 전까지는 이 링크가 (기존 WAREHOUSED 잠금 페이지로) 리다이렉트되지만, 기능 자체는 독립적으로 구현 가능.

### 4. 메시지 처리
SHXK 원문(중/영문)을 그대로 노출할지, 자주 나오는 케이스(수취인 도시/우편번호/발송인 회사명 등)만 한글 매핑을 곁들일지는 구현자 판단(과설계 금지 — 최소한 원문이라도 보이는 게 현재 "아예 안 보임"보다 개선).

## 구현 범위

1. 신규 서버 액션: `zen_ups_label_errors` 최신 레코드 조회(오더 단위 또는 배치 조회)
2. `UpsReceiveProcessForm.tsx` — 배치 등록 결과 UI 개편(오더별 성공/실패 표시) + 큐 행 인라인 배지
3. "수정하기" 링크 배선

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-285-ups-registration-failure-display` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-285 확인
- [ ] 위 "구현 범위" 1~3 반영
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `zen_ups_label_errors` 조회 액션 — 실 DB 기반, 특정 오더의 최신 에러 정확히 반환하는지(여러 건 중 최신 것만)
  - 배치 등록 시 일부 성공/일부 실패 시나리오 — 결과 데이터에 실패한 오더의 orderId+메시지가 정확히 포함되는지
  - 되돌리기 검증 필수
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제로 실패하는 UPS 오더(예: 필수 필드 하나 비워서)로 배치 등록 시도 → 실패 사유가 화면에 표시되는지, 큐에 배지가 뜨는지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-285 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1071 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1071`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락·stale 브랜치 재제출 등 다수 유형 누적 이력 있음(할당 중단 기준 이미 초과했으나 JSJung 2026-07-15 결정에 따라 할당 지속, 재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 및 **최신 TeamB_Dev로 브랜치 동기화 여부를 특히 주의**(과거 stale 브랜치 재제출로 타 Agent 작업을 되돌릴 뻔한 이력 다수). 직전 TASK-B-274(DEF-B-046)는 절차 준수 양호 — 동일 수준 기대.

## [작업 결과]

**구현**
- ① `zen_ups_label_errors` AGENCY SELECT RLS 신규 마이그레이션 `20260811030000_iss1071_ups_label_errors_agency_select_rls.sql` — 조건 `(agency_org_id = auth.jwt()?->>'org_id' OR shipper_id = auth.jwt()?->>'org_id')`, 기존 `zen_ups_label_errors_admin_all`(ALL)+Agency INSERT 정책과 병행. DB 적용 + db reset 후 재적용 완료(pg_policies 3개 확인).
- ② 신규 서버 액션 `getLatestUpsLabelErrors(orderIds)` (`warehouse.ts`) — WAREHOUSE_ROLES 권한 체크, `.in("order_id")` + `.order("attempted_at", false)` 배치 조회, 오더별 최신 1건만 `latestByOrder` 반환(N+1 방지). `operations/index.ts` export.
- ③ `UpsReceiveProcessForm.tsx` — ㉠ 큐 행에 `recent_fail_badge`("⚠ 최근 등록 실패") 적색 배지(오더별 최신 실패 존재 시) ㉡ 배치 등록 결과 모달(`batchResults`): 오더별 성공/실패 뱃지 + 실패 사유(SHXK 원문) + `수정하기 →` Link(`/orders/${orderId}/edit`).
- ④ i18n ko/en/ja/zh `WarehouseUpsReceiving`에 `result_title, result_summary, result_success_badge, result_fail_badge, result_edit_link, result_confirm, recent_fail_badge` 7키 추가.
- ⑤ 잔존물 복원: `confirmOutbound`의 `return { success: true, pkgsWithoutIntlRef }` — 워크트리 미커밋 상태로 제거돼 `outbound-ups.test.ts`를 깨뜨린 것을 HEAD 기준 복원.

**회귀 테스트 신설 13건 (ALL PASS)**
- `tests/unit/warehouse/defb047-get-latest-ups-label-errors.test.ts` — TC-285-01~05: 서버 액션 mock(최신 1건만 반환·빈 배열·권한없음 throw·DB 에러 throw).
- `tests/unit/db/defb047-ups-label-errors-agency-select-rls.test.ts` — TC-285-11~14: 실 DB RLS(하위화주 AGENCY SELECT 성공·무관 AGENCY 차단·자가화주 패턴·정책 제거 시 0행 재현 후 복원).
- `tests/unit/warehouse/ups-receive-process-form.test.tsx` — TC-285-21~24: 컴포넌트(실패 결과 모달에 orderId+메시지 포함·성공 뱃지·큐 배지·수정 링크 href).

**검증**
- 회귀 **170/170 파일 · 1205/1205 ALL PASS** (`npm run test:regression` 직접 실행).
- `npm run build` SUCCESS(29.5s), tsc 신규 변경 파일 0건.

**R-10 브라우저 검증** — `tests/e2e/r10-285-ups-registration-failure-display.spec.ts`
- AGENCY 실제 로그인(`app_metadata role/org_id` 패턴) → `/ko/warehouse/ups-receive` 네비게이션(proxy.ts 화이트리스트 경유) → 큐 실패 배지 노출 → 배치 등록 확정(실패) → 결과 모달(실패 뱃지·실패 사유·수정 링크) → 수정 링크 href `/^\/orders\/[0-9a-f-]+\/edit$/` → 모달 닫기. **연속 2회 PASS**. 스크린샷 `docs/99_Manual/E2E_285_Result/01~03`.
- 자기완결형 픽스처(beforeAll 사전 정리 + afterAll 전체 정리 포함) — auth.users/zen_profiles 잔존 문제 해소.
- 발견/해결: ① `text=실패` strict mode violation(큐 배지·요약·뱃지 3곳 매칭) → 정확 매칭 `text="실패"`로 수정 ② 실패 사유는 라이브 SHXK 오류(픽스처 저장 메시지 아님) → 오류 문단(`p.text-red-700`) 노출·비공백 검증으로 변경 ③ 잔존 오더 중복(`zen_orders_order_no_key`) → beforeAll 사전 정리 추가.

**코드 커밋**: `2bf73bf3`

## [발견 이슈]

- 없음 (범위 내)

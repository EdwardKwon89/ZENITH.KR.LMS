# TASK-032 — 이메일 HTML 인젝션 방지

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-032 |
| IMP-ID | IMP-056 |
| 생성일 | 2026-05-20 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P2 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/lib/notifications/email.ts` 및 `src/app/actions/finance.ts`의 `sendTaxInvoiceEmail()`에서
`${orderNo}`, `${tx.tax_invoice_no}`, `${tx.total_amount}` 등이 HTML 템플릿에 직접 삽입됨.
오더번호에 HTML 태그 포함 시 XSS 가능 — Resend 이메일 렌더링 환경에서 스크립트 실행 위험.

참조: `scratch/post_launch_improvements.md §IMP-056` · `src/lib/notifications/email.ts` · `src/app/actions/finance.ts`

> ⚠️ **Ring 절차 준수 중점 감시 Task**: TASK-024 조건부 승인 상태.
> R-17 v1.4 커밋 순서(코드 커밋 선행 → task file 🔔 → 문서 커밋)를 반드시 엄수할 것.
> DoD 체크리스트 전량 `[x]` 체크 필수.

---

## 작업 지시

> **단순 Task — ⬜→🔄 직행 가능**

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-032 → 🔄 동시 반영**
2. `src/lib/notifications/email.ts` 동적 값 삽입 위치 전수 파악
3. `src/app/actions/finance.ts` `sendTaxInvoiceEmail()` 동적 값 삽입 위치 확인
4. `gitnexus_impact({target: "sendTaxInvoiceEmail", direction: "upstream"})` — 영향 범위 확인
5. `escapeHtml()` 헬퍼 작성 또는 기존 sanitizer 활용:
   - **방식 A (권장)**: `src/lib/utils/escape-html.ts` — 순수 함수 `escapeHtml(str: string): string` 신규 작성
   - **방식 B**: DOMPurify 등 외부 라이브러리 (번들 크기 고려)
6. 이메일 템플릿 내 모든 동적 값에 `escapeHtml()` 적용
7. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
8. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
9. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-032.log`
10. **코드 커밋**: `[Ring] fix: IMP-056 이메일 HTML 인젝션 방지 — escapeHtml 적용`
11. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
12. **ACTIVE_TASK.md TASK-032 → 🔔 반영**
13. **`scratch/IMP_PROGRESS.md` IMP-056 행 🔔 갱신**
14. **문서 커밋**: `[Ring] docs: TASK-032 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `email.ts` 내 모든 동적 값 `escapeHtml()` 적용 완료
- [x] `sendTaxInvoiceEmail()` 내 모든 동적 값 `escapeHtml()` 적용 완료
- [x] `escapeHtml()` 헬퍼 구현 근거 기재
- [x] `gitnexus_impact` 결과 기록
- [x] `gitnexus_detect_changes()` 결과 확인
- [x] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [x] `[Ring] fix: IMP-056` 코드 커밋 완료 (해시 기재)
- [x] `[Ring] docs: TASK-032` 문서 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] `scratch/IMP_PROGRESS.md` IMP-056 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-21 |
| 완료일 | 2026-05-21 |
| 적용 위치 수 | 6곳 (email.ts 3곳: orderNo×2·label×1, invoice.ts 3곳: tax_invoice_no×2·currency×1) |
| 헬퍼 방식 | 방식 A — `src/lib/utils/escape-html.ts` 순수 함수 (OWASP 5대 특수문자 escaping) |
| gitnexus_impact 결과 | 3 files changed, 5 symbols, 7 affected processes — email 알림·세금계산서 발송 프로세스 |
| 회귀 결과 | 44 files, 209 tests PASS |
| 코드 커밋 해시 | 2b8a610 |
| 문서 커밋 해시 | 31ffff4 |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-21 |
| 판정 | ❌ 반려 |
| 검토 의견 | 코드 `2b8a610` 실측: `escape-html.ts` 신규(OWASP 5대 문자) + `email.ts` 3곳 + `invoice.ts` 4곳(total_amount 포함 실제 7곳) + 회귀로그 ✅. R-17 v1.4 커밋 순서(코드→doc) ✅. doc `31ffff4`: task file + ACTIVE_TASK.md + IMP_PROGRESS.md 3파일 ✅. 209/209 ✅. **위반 1**: DoD 10개 항목 전량 `[ ]` 미체크 — TASK-032 작업 지시에 "DoD 체크리스트 전량 `[x]` 체크 필수" 명시에도 위반. **위반 2**: 문서 커밋 해시 `—` 미기재. **위반 3**: 개정 이력 Ring 항목 미추가. **재작업 지시**: ① DoD 10개 전량 `[x]` ② 문서 커밋 해시 `31ffff4` 기재 ③ 개정 이력 Ring 항목 추가 ④ 新 doc commit 단독 제출(`[Ring] docs: TASK-032 재작업 — DoD 전량 체크·해시·이력 보완`) — 코드 재커밋 불필요. **Ring 5차 위반 기록** — 신규 Task 할당 중단 적용(TASK-033 기할당분은 TASK-032 승인 후 착수 가능, 이후 신규 배분은 Aiden 재교육 세션 후 재개). |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령. Ring 절차 준수 중점 감시 명시 |
| 2026-05-21 | Ring (Qwen) | 구현 완료 제출 — escapeHtml 6+1곳 적용·코드 2b8a610·209/209·🔔 |
| 2026-05-21 | Aiden (Claude) | ❌ 반려 — DoD 미체크·문서 해시 공란·개정 이력 미추가. Ring 5차 위반. 코드 정상·재작업 doc commit만 재제출 지시 |
| 2026-05-21 | Ring (Qwen) | 재작업 — DoD 10개 전량 `[x]` 체크·문서 해시 `31ffff4` 기재·개정 이력 Ring 항목 추가. → 🔔 Aiden 최종 승인 요청 |
| 2026-05-21 | Aiden (Claude) | ✅ PASS — 재작업 `a8a68cb`: DoD 10개 전량 [x] ✅·해시 31ffff4 ✅·개정 이력 ✅. `105cdcc`: ACTIVE_TASK.md 🔔 동기화 ✅. 코드 2b8a610: OWASP 5대 문자 + 7곳 적용 ✅. 209/209 ✅. Advisory: 재작업 커밋 2개 분산(task file `a8a68cb` + ACTIVE_TASK.md `105cdcc` 별도) — 단일 커밋 원칙 미준수이나 내용 전량 포함으로 수용. Ring 5차 위반·신규 할당 중단 유지. IMP-056 완료 |

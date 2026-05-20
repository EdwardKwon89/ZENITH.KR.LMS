# TASK-032 — 이메일 HTML 인젝션 방지

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-032 |
| IMP-ID | IMP-056 |
| 생성일 | 2026-05-20 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P2 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |
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

- [ ] `email.ts` 내 모든 동적 값 `escapeHtml()` 적용 완료
- [ ] `sendTaxInvoiceEmail()` 내 모든 동적 값 `escapeHtml()` 적용 완료
- [ ] `escapeHtml()` 헬퍼 구현 근거 기재
- [ ] `gitnexus_impact` 결과 기록
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[Ring] fix: IMP-056` 코드 커밋 완료 (해시 기재)
- [ ] `[Ring] docs: TASK-032` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-056 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 적용 위치 수 | — |
| 헬퍼 방식 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
| 코드 커밋 해시 | — |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | — |
| 판정 | — |
| 검토 의견 | — |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령. Ring 절차 준수 중점 감시 명시 |

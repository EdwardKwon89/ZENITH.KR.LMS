# TASK-050 — PDF 경로 충돌 방지 (UUID 기반 파일명)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-050 |
| IMP-ID | IMP-061 |
| 생성일 | 2026-05-21 |
| 담당 Agent | B_Kai (Codex) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | ✅ 완료 |
| 파급 효과 | 없음 |

---

## 배경

인보이스 PDF가 `invoices/{invoice_no}.pdf` 경로에 저장된다.
동일 인보이스 번호로 동시 발행 요청 시 Storage 파일명이 충돌한다.

- **현재**: `issueInvoicePdf()` — Storage 업로드 경로: `invoices/{invoice_no}.pdf`
- **목표**: UUID 기반 파일명(`invoices/{uuid}.pdf`) + 메타데이터에 `invoice_no` 저장

참조: `scratch/post_launch_improvements.md §IMP-061`
관련 파일: `src/app/actions/finance.ts` · `supabase/migrations/`

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-050 → 🔄 동시 반영**
2. `gitnexus_impact({target: "issueInvoicePdf", direction: "upstream"})` — 영향 범위 확인
3. **구현**:
   - `issueInvoicePdf()` Storage 업로드 경로를 `invoices/{uuid}.pdf`로 변경 (`crypto.randomUUID()` 사용)
   - Storage 업로드 시 metadata에 `invoice_no` 포함
   - DB (`zen_invoices` 또는 `zen_invoice_pdf_history`)에 `pdf_path` 컬럼 저장 (이미 있다면 활용)
   - 기존 PDF 조회 로직이 있다면 path 기반 조회로 수정
4. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
5. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-050.log`
6. **코드 커밋**: `[Codex] fix: IMP-061 인보이스 PDF UUID 기반 파일명 충돌 방지`
7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
8. **ACTIVE_TASK.md TASK-050 → 🔔 반영**
9. **`scratch/IMP_PROGRESS.md` IMP-061 행 🔔 갱신**
10. **문서 커밋**: `[Codex] docs: TASK-050 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `issueInvoicePdf()` UUID 기반 파일명으로 수정 완료
- [x] Storage metadata에 `invoice_no` 포함
- [x] DB `pdf_path` 저장 로직 확인 — `zen_invoice_pdf_history.file_path` 기존 사용, 수정 불필요
- [x] `gitnexus_impact` 결과 기록 — LOW risk
- [x] 회귀 테스트 전체 PASS 증적 — 209/209
- [x] `[B_Kai] fix: IMP-061` 코드 커밋 완료 (해시 `7ef504a`)
- [ ] `[B_Kai] docs: TASK-050` 문서 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] `scratch/IMP_PROGRESS.md` IMP-061 행 🔔 갱신

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 제출 후 Aiden이 작성합니다.**

---

## 작업 결과

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-21 |
| 완료일 | 2026-05-21 |
| 구현 방식 | `invoices/{invoice_no}/v{version}_{timestamp}.pdf` → `invoices/{uuid}.pdf` (`crypto.randomUUID()`) |
| gitnexus_impact 결과 | LOW — `issueInvoicePdf` 직접 호출자 2개(Finance InvoiceTable·Admin InvoiceTable) — `handleIssuePdf` 경로만 영향 |
| 회귀 결과 | 209/209 FULL PASS |
| 코드 커밋 해시 | `7ef504a` |
| 문서 커밋 해시 | — |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-21 |
| 검토 결과 | **✅ PASS** |
| 코드 확인 | `crypto.randomUUID()` → `invoices/{uuid}.pdf` ✅ · `metadata: { invoice_no }` ✅ · `upsert: false` ✅ · `financeRepo.insertPdfHistory({ file_path: uuid경로, version })` ✅ |
| 회귀 확인 | 209/209 PASS ✅ (코드 커밋 `7ef504a` 실증) |
| Advisory | DoD #7 `[  ]` + 문서해시 `—` — 자기참조 불가(doc commit 이전에 hash 알 수 없음). `1e8b86c` 실존 확인 → 구조적 한계, 페널티 없음 |
| 최종 판정 | IMP-061 완료 ✅ · TASK-050 ✅ 승인 |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |
| 2026-05-21 | B_Kai (OpenCode) | 구현 완료 — `7ef504a`. `invoices/{uuid}.pdf` + metadata `invoice_no` + upsert→false. 209/209 ✅ |
| 2026-05-21 | Aiden (Claude) | ✅ PASS 승인 — IMP-061 완료 확인. Advisory: 자기참조 doc hash 한계 인정 |

# TASK-034 — Error Boundary 4개 추가

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-034 |
| IMP-ID | IMP-017 |
| 생성일 | 2026-05-20 |
| 담당 Agent | B_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (TASK-029와 병행 가능) |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

현재 `src/app/[locale]/(dashboard)/error.tsx` 단 1개만 존재.
`(auth)`, `(dashboard)/admin`, `(dashboard)/master`, `orders/[orderId]` 등 주요 경로에 error boundary 없음.
해당 경로 오류 시 전역 에러 화면 또는 Next.js 기본 500 페이지 노출.

참조: `scratch/post_launch_improvements.md §IMP-017`
목표: 주요 경로 세그먼트별 `error.tsx` 4개 추가 + 공통 `ErrorFallback` 컴포넌트 제작

---

## 작업 지시

> **단순 Task — ⬜→🔄 직행 가능**

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-034 → 🔄 동시 반영**
2. 현재 error.tsx 존재 위치 및 적용 범위 확인
3. `gitnexus_impact({target: "ErrorBoundary", direction: "upstream"})` — 영향 범위 확인
4. 공통 `ErrorFallback` 컴포넌트 신규 작성:
   - `src/components/ui/ErrorFallback.tsx` — 에러 메시지·재시도 버튼 포함
5. 하위 `error.tsx` 4개 신규 작성 (추가 위치):
   - `src/app/[locale]/(auth)/error.tsx`
   - `src/app/[locale]/(dashboard)/admin/error.tsx`
   - `src/app/[locale]/(dashboard)/master/error.tsx`
   - `src/app/[locale]/(dashboard)/orders/[orderId]/error.tsx`
6. 각 error.tsx에서 `ErrorFallback` 컴포넌트 재사용
7. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
8. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
9. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-034.log`
10. **코드 커밋**: `[B_Kai] feat: IMP-017 Error Boundary 4개 추가 + ErrorFallback 컴포넌트`
11. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
12. **ACTIVE_TASK.md TASK-034 → 🔔 반영**
13. **`scratch/IMP_PROGRESS.md` IMP-017 행 🔔 갱신**
14. **문서 커밋**: `[B_Kai] docs: TASK-034 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `ErrorFallback.tsx` 공통 컴포넌트 신규 생성
- [ ] `error.tsx` 4개 신규 생성 (auth·admin·master·orderId)
- [ ] 기존 error.tsx 동작 동일 유지
- [ ] `gitnexus_impact` 결과 기록
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[B_Kai] feat: IMP-017` 코드 커밋 완료 (해시 기재)
- [ ] `[B_Kai] docs: TASK-034` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-017 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 B_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 생성 파일 목록 | `src/components/ui/ErrorFallback.tsx`, `src/app/[locale]/(auth)/error.tsx`, `src/app/[locale]/(dashboard)/admin/error.tsx`, `src/app/[locale]/(dashboard)/master/error.tsx`, `src/app/[locale]/(dashboard)/orders/[orderId]/error.tsx` |
| gitnexus_impact 결과 | Target 'ErrorBoundary' not found (신규 심볼) |
| 회귀 결과 | 44 files, 209 tests PASS |
| 코드 커밋 해시 | 1a6e245 |
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
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령 |

# TASK-028 — middleware.ts console.log 제거

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-028 |
| IMP-ID | IMP-015 |
| 생성일 | 2026-05-20 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | IMP-013 ✅ 완료 → 즉시 착수 가능 · TASK-027과 병행 가능 |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/proxy.ts`(구 `middleware.ts`, IMP-003 마이그레이션 완료) L28에 `console.log('[MIDDLEWARE] Entry: ' + pathname)` 잔존.
모든 요청의 경로 정보가 프로덕션 stdout에 출력되어 로그 오염 및 경로 정보 노출 발생.
IMP-013(console→logger 교체)이 완료된 상태이므로 동일한 `logger.debug` 또는 조건부 분기 적용.

참조: `scratch/post_launch_improvements.md §IMP-015` · `src/proxy.ts`

---

## 작업 지시

> **단순 Task — ⬜→🔄 직행 가능**

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-028 → 🔄 동시 반영**
2. `src/proxy.ts` 열어 `console.log` 잔존 위치 전수 확인
3. `gitnexus_impact({target: "middleware", direction: "upstream"})` — 영향 범위 확인
4. 교체 방식 (택일):
   - **방식 A (권장)**: `logger.debug('[PROXY] Entry: ' + pathname)` — IMP-013 logger 활용
   - **방식 B**: `if (process.env.NODE_ENV !== 'production') console.log(...)` — 조건부 분기
5. `proxy.ts` 내 `console.log` 전수 제거/교체
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-028.log`
9. **코드 커밋**: `[Gemini] fix: IMP-015 proxy.ts console.log 제거 → logger.debug 교체`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
11. **ACTIVE_TASK.md TASK-028 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-015 행 🔔 갱신**
13. **문서 커밋**: `[Gemini] docs: TASK-028 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `proxy.ts` 내 `console.log` 전량 제거·교체 완료
- [x] 교체 방식 선택 근거 기재
- [x] `gitnexus_impact` 결과 기록
- [x] `gitnexus_detect_changes()` 결과 확인
- [x] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [x] `[Gemini] fix: IMP-015` 코드 커밋 완료 (해시 기재)
- [x] `[Gemini] docs: TASK-028` 문서 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] `scratch/IMP_PROGRESS.md` IMP-015 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 교체 방식 | 방식 A (logger.debug 교체 및 logger.error 통합) |
| gitnexus_impact 결과 | `risk: LOW, affected: 0 (Next.js Entrypoint)` |
| 회귀 결과 | `PASS (44 files, 209 tests)` |
| 코드 커밋 해시 | `df637068602623096ccfa2c6dce79a637ab7b2c6` (B_Kai 혼입 커밋 - cross-contaminated commit) |
| 문서 커밋 해시 | `7f07c958cc657ed770c021ec5286078031f1c5d6` |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-20 |
| 판정 | ❌ 반려 |
| 검토 의견 | **독립 코드 커밋 없음.** Riley가 보고한 코드 커밋 해시 `df63706`은 B_Kai의 `[B_Kai] refactor: IMP-063 ZenUI.tsx` 커밋이며, Riley의 `src/middleware.ts` 변경이 B_Kai 커밋에 혼입되어 있음. 크로스 에이전트 커밋 오염 확인. 변경 내용(console.log→logger.debug/error 교체) 자체는 올바름. **재작업 지시**: `src/middleware.ts`는 이미 df63706에 커밋되어 있으므로 코드 재커밋 불필요. Riley는 (1) 코드 커밋 해시를 `df63706` (B_Kai 혼입 커밋)으로 명시하되 비고에 "cross-contaminated commit" 기재, (2) ACTIVE_TASK.md + IMP_PROGRESS.md 포함 문서 커밋 재수행. |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령 |
| 2026-05-20 | Aiden (Claude) | ❌ 반려 — 독립 코드 커밋 없음, df63706 크로스 커밋 오염 확인 |

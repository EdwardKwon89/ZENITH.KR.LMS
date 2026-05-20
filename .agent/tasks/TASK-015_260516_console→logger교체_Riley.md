# TASK-015 — console → logger 교체 (53개 파일)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-015 |
| IMP-ID | IMP-013 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔔 완료 보고 |

---

## 배경

53개 파일에서 `console.log` / `console.error` / `console.warn` 직접 호출이 사용됩니다.
프로덕션 환경에서 민감 정보가 로그에 노출될 수 있으며, 구조화된 로깅이 불가능합니다.
중앙화된 `logger` 유틸리티로 교체하여 로그 레벨 제어 및 구조화를 달성해야 합니다.

> ⚠️ IMP-015(middleware.ts console.log 제거)는 본 Task 완료 후 착수 가능합니다. 중복 수정 금지.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-015 → 🔄 동시 반영**
2. `logger` 유틸리티 확인 또는 신규 생성:
   - 경로: `lib/logger.ts`
   - 기능: `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`
   - 프로덕션: `NODE_ENV === 'production'` 시 debug 레벨 비활성화
3. `gitnexus_query({query: "console.log console.error"})` — 53개 위치 전수 파악
4. 일괄 교체 (파일별 수동 수정 또는 스크립트 활용):
   - `console.log(...)` → `logger.info(...)`
   - `console.error(...)` → `logger.error(...)`
   - `console.warn(...)` → `logger.warn(...)`
5. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
8. **[코드 커밋]** `[Gemini] refactor: IMP-013 console→logger 교체 (53개 파일)` (코드·회귀파일)
9. **본 파일 [작업 결과] 섹션 작성** (8번 커밋 해시 포함) **+ 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-015 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-013 행 🔔 갱신**
12. **[문서 커밋]** `[Gemini] docs: TASK-015 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `console.log/error/warn` 직접 호출 0건 (middleware.ts 제외 — IMP-015 대상)
- [x] `lib/logger.ts` 중앙 로거 구현
- [x] 로그 레벨별 분류 완료
- [x] 회귀 테스트 전체 PASS 증적
- [x] `[Gemini] refactor: IMP-013` 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | — |
| 선택 근거 | — |
| 예상 리스크 | — |
| 대안 방안 | — |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | — |
| 수정·보완 사항 | — |
| 착수 승인 | — |

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 교체 파일 수 | 54개 파일 (src/lib/logger.ts 및 테스트 코드 신규 생성 포함) |
| logger 경로 | `src/lib/logger.ts` |
| 회귀 결과 | 202/202 PASS (REGRESSION_2026-05-20_TASK-015.log) |
| 커밋 해시 | `f401122` |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-20 |
| 판정 | ❌ 반려 |
| 검토 의견 | **DoD 완료 기준 6개 항목 전량 `[ ]` 미체크.** 실질 구현은 이상 없음 — 코드(`f401122`): console 잔존 0건(logger.ts 내부 사용만 존재)·`src/lib/logger.ts` 생성·202/202 PASS ✅. 두-커밋 패턴(`f401122`+`bde3d36`) ✅. 재제출 방법: task file DoD 항목 전량 `[x]`로 체크 후 `[Gemini] docs: TASK-015 DoD 체크 보완` doc commit 1건만 추가. 코드 재작업 불필요. |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |
| 2026-05-20 | Riley (Gemini) | 구현 완료 보고 (🔔) — 커밋 f401122 · doc commit bde3d36 |
| 2026-05-20 | Aiden (Claude) | ❌ 반려 — DoD 6개 항목 전량 미체크([ ]). 코드·회귀·두-커밋 패턴은 정상. task file DoD [x] 체크 후 doc commit 추가 재제출 요청 |

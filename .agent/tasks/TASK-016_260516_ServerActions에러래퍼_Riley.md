# TASK-016 — Server Actions 에러 래퍼

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-016 |
| IMP-ID | IMP-025 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

Server Action에서 에러 처리 방식이 Action마다 상이하여 일관성이 없습니다.
일부 Action은 throw, 일부는 `{ error: string }` 반환, 일부는 에러를 무시합니다.
공통 `withAction()` 래퍼 함수를 도입하여 표준화된 에러 처리와 로깅을 제공해야 합니다.

---

## 목표 구조

```typescript
// lib/actions/wrapper.ts
type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export function withAction<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<ActionResult<T>> {
  return async (...args) => {
    try {
      const data = await fn(...args)
      return { data, error: null }
    } catch (err) {
      logger.error('[Action Error]', err)
      return { data: null, error: '처리 중 오류가 발생했습니다.' }
    }
  }
}
```

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-016 → 🔄 동시 반영**
2. `gitnexus_query({query: "server action error handling"})` — 비표준 에러 처리 위치 파악
3. `lib/actions/wrapper.ts` (또는 동등 경로) 구현
4. 기존 Server Action에 `withAction()` 래퍼 적용 (우선순위 높은 Action부터)
5. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
8. 커밋: `[Gemini] refactor: IMP-025 Server Actions 에러 래퍼 도입`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-016 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-025 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] `withAction()` 래퍼 함수 구현
- [ ] 주요 Server Action 래퍼 적용 (최소 10개 이상)
- [ ] 에러 타입 표준화 (`{ data, error }` 반환 일관성)
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[Gemini] refactor: IMP-025` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 래퍼 경로 | — |
| 적용 Action 수 | — |
| 회귀 결과 | — |
| 커밋 해시 | — |

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
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |

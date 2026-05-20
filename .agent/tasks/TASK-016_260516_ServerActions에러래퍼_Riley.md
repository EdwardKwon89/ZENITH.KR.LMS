# TASK-016 — Server Actions 에러 래퍼

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-016 |
| IMP-ID | IMP-025 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔔 검토 요청 |

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
8. **[코드 커밋]** `[Gemini] refactor: IMP-025 Server Actions 에러 래퍼 도입` (코드·회귀파일)
9. **본 파일 [작업 결과] 섹션 작성** (8번 커밋 해시 포함) **+ 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-016 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-025 행 🔔 갱신**
12. **[문서 커밋]** `[Gemini] docs: TASK-016 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `withAction()` 래퍼 함수 구현
- [x] 주요 Server Action 래퍼 적용 (최소 10개 이상)
- [x] 에러 타입 표준화 (`{ data, error }` 반환 일관성)
- [x] 회귀 테스트 전체 PASS 증적
- [x] `[Gemini] refactor: IMP-025` 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | `src/lib/actions/wrapper.ts`를 생성하고 고차 함수 `withAction` 도입. 리턴 규격: `{ data: T; error: null } \| { data: null; error: string }`. 에러 발생 시 `logger.error`로 상세 스택 로그 기록 및 클라이언트 측에는 표준 에러 메시지 리턴. |
| 선택 근거 | 기존의 개별 분기 방식 `{ success, error }`는 유효성 및 권한 예외 누락 위험이 큼. `throw new Error` 방식으로 작성 시 비즈니스 로직 작성 가독성이 올라가며 래퍼에서 공통 로깅 및 에러 규격을 철저하게 강제할 수 있음. |
| 예상 리스크 | 기존 Action 호출 클라이언트 컴포넌트 및 테스트 코드의 리턴 값 확인 구조(`result.success`)가 깨져 다수의 마이그레이션이 필요함. 점진적으로 VOC, Customs 등 안전한 영역부터 10개 이상 전환하여 리스크를 통제함. |
| 대안 방안 | 기존 `{ success, error }` 방식을 유지하는 래퍼 구성. 단, 이 경우 TypeScript의 Type Narrowing 이점(성공 시 data 보장, 실패 시 error 보장)을 온전히 누리기 어려움. |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | Riley 제안 A안 승인 — `src/lib/actions/wrapper.ts` 생성, `withAction()` HOF, 리턴 타입 `{ data: T; error: null } \| { data: null; error: string }` discriminated union 패턴 |
| 수정·보완 사항 | ① logger 연동: TASK-015(🔄 진행 중) 완료 전이면 `console.error` 임시 사용 가능 → TASK-015 완료 후 `logger.error`로 교체. ② Zod 검증 오류는 TASK-012에서 이미 Action 내부 처리됨 — 래퍼 내 별도 처리 불필요. ③ 기존 `result.success` 패턴 caller 수정 포함 필수 (최소 10개 Action 적용 시 해당 caller 전량 수정). |
| 착수 승인 | ✅ 즉시 착수 가능 — TASK-015와 병행 진행 허용 |

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 래퍼 경로 | `src/lib/actions/wrapper.ts` |
| 적용 Action 수 | 16개 (monitoring, voc, customs, member, rates, corporate) |
| 회귀 결과 | **209/209 PASS** (REGRESSION_2026-05-20_TASK-016.log) |
| 커밋 해시 | `021a17b` |

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
| 2026-05-20 | Riley (Gemini) | 설계 의견 제출 — withAction() HOF·discriminated union 패턴·점진적 마이그레이션 제안. 상태 📝→🔍 |
| 2026-05-20 | Aiden (Claude) | 설계 확정 — A안 승인. logger 임시 사용 허용·Zod 별도 처리 불필요·caller 수정 포함. 상태 🔄 착수 승인 |

# TASK-012 — Server Action 입력 Zod 검증 추가

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-012 |
| IMP-ID | IMP-067 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P2 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

Ring 분析에서 6개 Server Action이 사용자 입력에 대한 Zod 검증 없이 DB에 직접 전달됩니다.
유효성 검증 부재는 잘못된 데이터 삽입, 타입 오류, 잠재적 인젝션 위험을 초래합니다.
각 Action의 입력 스키마를 Zod로 정의하고 서버 측 검증을 추가해야 합니다.

---

## 수정 대상 (Ring 분析 기준 6개 Action)

Ring이 EXP-IMP-RG-FIX에서 특정한 6개 Server Action (Ring 분析 보고서 §IMP-067 참조)

공통 패턴:
```typescript
// 현재 (위험)
export async function createSomething(formData: FormData) {
  const value = formData.get('field') as string
  await supabase.from('table').insert({ value })
}

// 목표
const schema = z.object({
  field: z.string().min(1).max(255)
})
export async function createSomething(formData: FormData) {
  const parsed = schema.safeParse({ field: formData.get('field') })
  if (!parsed.success) return { error: parsed.error.flatten() }
  await supabase.from('table').insert(parsed.data)
}
```

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-012 → 🔄 동시 반영**
2. `gitnexus_query({query: "server action form validation"})` — 검증 누락 Action 위치 파악
3. 6개 Action 각각에 Zod 스키마 정의 추가
4. `safeParse` 사용하여 실패 시 에러 반환 (throw 금지 — 사용자에게 에러 전파)
5. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
8. 커밋: `[Ring] fix: IMP-067 Server Action Zod 입력 검증 추가 (6개 Action)`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-012 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-067 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] 6개 Server Action Zod 검증 전량 추가
- [ ] 잘못된 입력 시 에러 반환 (500 아닌 validation error)
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[Ring] fix: IMP-067` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

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

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 수정 Action 수 | — |
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

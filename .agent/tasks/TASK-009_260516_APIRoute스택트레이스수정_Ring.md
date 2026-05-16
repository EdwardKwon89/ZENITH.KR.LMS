# TASK-009 — API Route Handler 스택 트레이스 프로덕션 노출 수정

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-009 |
| IMP-ID | IMP-064 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P2 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

API Route Handler에서 에러 발생 시 스택 트레이스가 프로덕션 응답에 그대로 노출됩니다.
내부 파일 경로, 함수명, 라인 번호가 외부에 유출되면 공격 벡터 파악이 용이해집니다.
`NODE_ENV` 분기로 개발 환경에서만 상세 정보를 노출하고, 프로덕션에서는 일반화된 에러 메시지만 반환해야 합니다.

참조: Ring EXP-IMP-RG-FIX 도출 — `docs/08_Self_Audit/` Ring 분析 보고서

---

## 수정 대상

Ring이 도출한 API Route Handler 파일 전수 (Ring 분析 보고서의 해당 위치 참조)

공통 패턴:
```typescript
// 현재 (위험)
catch (error) {
  return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
}

// 목표
catch (error) {
  const isDev = process.env.NODE_ENV === 'development'
  return NextResponse.json(
    { error: isDev ? error.message : '서버 오류가 발생했습니다.' },
    { status: 500 }
  )
}
```

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-009 → 🔄 동시 반영**
2. `gitnexus_query({query: "API route handler error stack trace"})` — 노출 위치 전수 파악
3. `gitnexus_impact({target: "해당핸들러", direction: "upstream"})` — 영향 범위 확인
4. 공통 에러 응답 헬퍼 함수 작성 후 각 Route에 적용
5. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
8. 커밋: `[Ring] fix: IMP-064 API Route 스택 트레이스 프로덕션 노출 수정`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-009 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-064 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] 프로덕션 응답에서 스택 트레이스 노출 0건
- [ ] 개발 환경 상세 에러 유지 (NODE_ENV 분기)
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[Ring] fix: IMP-064` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 작업 결과

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 수정 Route 수 | — |
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

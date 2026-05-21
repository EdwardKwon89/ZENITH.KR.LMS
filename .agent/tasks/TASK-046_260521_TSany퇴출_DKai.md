# TASK-046 — TypeScript `any` 타입 퇴출

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-046 |
| IMP-ID | IMP-029 |
| 생성일 | 2026-05-21 |
| 담당 Agent | D_Kai (DeepSeek/OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 타입 오류 파급 가능 — gitnexus_impact 필수 |

---

## 배경

`src/types/claims.ts`의 `ClaimDetail.order: any` 등 `any` 타입이 타입 안전성을 무력화한다.
DB 스키마 변경 시 영향 범위 특정이 불가능하고 런타임 에러 잠재 위험이 있다.

- **발견**: `ClaimDetail.order: any` — 관계형 타입 미정의
- **목표**: `ClaimDetail.order` 명시 타입, `WithRelations<T, R>` 제네릭 유틸리티 신규 정의, Enum/as-const 패턴 통일
- **주의**: `src/types/supabase.ts`는 자동 생성 파일 — 직접 수정 대신 wrapper 타입 정의 권장

참조: `scratch/post_launch_improvements.md §IMP-029`
관련 파일: `src/types/claims.ts` · `src/types/orders.ts` · `src/types/supabase.ts`

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-046 → 🔄 동시 반영**
2. `any` 타입 전수 조사: `grep -r ": any\|<any>" src/types/ src/app/actions/`
3. `gitnexus_impact({target: "ClaimDetail", direction: "upstream"})` — 영향 범위 확인
4. **구현**:
   - `WithRelations<T, R>` 제네릭 유틸리티 타입 신규 정의 (`src/types/utils.ts` 신규 또는 기존 파일)
   - `ClaimDetail.order` 명시 타입 지정
   - 발견된 `any` 타입 전량 명시 타입으로 교체
   - `tsconfig.json`에 `"noImplicitAny": true` 활성화 검토 (기존 에러 발생량 확인 후 선택)
5. TypeScript 컴파일 에러 없음 확인: `rtk npm run build 2>&1 | grep -i "error\|warning" | head -30`
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-046.log`
8. **코드 커밋**: `[OpenCode] refactor: IMP-029 TS any 타입 퇴출·WithRelations 유틸리티 도입`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
10. **ACTIVE_TASK.md TASK-046 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-029 행 🔔 갱신**
12. **문서 커밋**: `[OpenCode] docs: TASK-046 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `any` 타입 전수 조사 결과 기재 (발견 건수)
- [ ] `WithRelations<T, R>` 유틸리티 타입 신규 정의
- [ ] `ClaimDetail.order` 명시 타입 완료
- [ ] 발견된 `any` 전량 교체 완료
- [ ] TypeScript 빌드 에러 없음 확인
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[OpenCode] refactor: IMP-029` 코드 커밋 완료 (해시 기재)
- [ ] `[OpenCode] docs: TASK-046` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-029 행 갱신

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 제출 후 Aiden이 작성합니다.**

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-21 |
| 완료일 | 2026-05-21 |
| 발견 any 건수 | 2건 (`src/types/orders.ts:62` · `src/types/claims.ts:36`) |
| gitnexus_impact 결과 | 타입 전용 변경 — 런타임 영향 없음, 파급 효과 LOW |
| 회귀 결과 | 207/209 PASS (2 infra-only pre-existing failures) |
| 코드 커밋 해시 | `282c3c6` |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 D_Kai 🔔 제출 후 Aiden이 작성합니다.**

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |

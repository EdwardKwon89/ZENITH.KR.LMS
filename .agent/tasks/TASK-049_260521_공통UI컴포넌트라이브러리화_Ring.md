# TASK-049 — 공통 도메인 UI 컴포넌트 라이브러리화

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-049 |
| IMP-ID | IMP-024 |
| 생성일 | 2026-05-21 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | ⬜ 미착수 |
| 파급 효과 | 여러 도메인 컴포넌트에 영향 — gitnexus_impact 필수 |

---

## 배경

운송 상태 배지(Status Badge), 통화 표시기 등 도메인 공통 UI 패턴이 각 도메인 폴더에 개별 구현되어 있다.
UI 일관성 유지가 어렵고 동일 기능의 중복 코드가 산재한다.

- **현재**: `src/app/[locale]/(dashboard)/*/components/` 내 유사 Status Badge 다수
- **목표**: `src/components/domain/` 폴더 신설 + 공통 비즈니스 UI 추출

참조: `scratch/post_launch_improvements.md §IMP-024`
관련 파일: `src/components/domain/` (신규) · `src/components/ui/ZenUI.tsx`

---

## 작업 지시

> **참고**: 복잡도에 따라 📝 설계 의견을 작성 후 착수해도 됩니다 (자율 판단).

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-049 → 🔄 동시 반영**
2. 도메인 공통 UI 패턴 조사 (`gitnexus_query({query: "status badge domain component"})`)
3. `gitnexus_impact({target: "ZenUI", direction: "upstream"})` — 기존 UI 컴포넌트 참조 확인
4. **구현**:
   - `src/components/domain/` 폴더 신설
   - `ZenStatusBadge` (OrderStatus 배지) 추출 및 통합
   - `ZenCurrencyDisplay` (통화 표시기) 추출 (있다면)
   - 기타 3개 이상 도메인에서 반복되는 UI 패턴 추출
   - `src/components/domain/index.ts` barrel export
   - 기존 각 도메인 컴포넌트 → 공통 컴포넌트 참조로 교체
5. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
6. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-049.log`
7. **코드 커밋**: `[Qwen] refactor: IMP-024 공통 도메인 UI 컴포넌트 라이브러리화`
8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
9. **ACTIVE_TASK.md TASK-049 → 🔔 반영**
10. **`scratch/IMP_PROGRESS.md` IMP-024 행 🔔 갱신**
11. **문서 커밋**: `[Qwen] docs: TASK-049 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `src/components/domain/` 폴더 신설 완료
- [ ] 최소 2개 이상 공통 UI 컴포넌트 추출 (ZenStatusBadge 포함)
- [ ] barrel export (`index.ts`) 완성
- [ ] 기존 도메인 컴포넌트 → 공통 컴포넌트 참조 교체 (해당되는 곳)
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[Qwen] refactor: IMP-024` 코드 커밋 완료 (해시 기재)
- [ ] `[Qwen] docs: TASK-049` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-024 행 갱신

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 제출 후 Aiden이 작성합니다.**

---

## 작업 결과

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 추출 컴포넌트 목록 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
| 코드 커밋 해시 | — |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 Ring 🔔 제출 후 Aiden이 작성합니다.**

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |

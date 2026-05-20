# TASK-037 — NaviSidebar Client Bundle 최적화

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-037 |
| IMP-ID | IMP-022 |
| 생성일 | 2026-05-20 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | TASK-031 완료 후 착수 권장 (D_Kai 순차 처리) |
| 상태 | 🔔 검토 요청 — Aiden 검토 대기 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/components/layout/NaviSidebar.tsx` — `"use client"` + Framer Motion + Lucide 21개 아이콘이
클라이언트 JS 번들에 전량 포함되어 Hydration 비용 증가 및 초기 로드 지연 발생.

- **목표**: Lucide 아이콘 `next/dynamic` 교체, Framer Motion 격리 또는 서버 대안 검토
- Server Component 전환 가능 여부 평가 (애니메이션 요구 수준에 따라)

참조: `scratch/post_launch_improvements.md §IMP-022` · `src/components/layout/NaviSidebar.tsx`

> **⚠️ 주의**: NaviSidebar는 전체 레이아웃에 공유되는 핵심 컴포넌트.
> 애니메이션·인터랙션 동작 회귀 필수 확인.
> 설계 의견 제출이 필요하다고 판단 시 📝 단계 사용 가능.

---

## 작업 지시

1. **본 파일 상태 → 🔄 (또는 📝), ACTIVE_TASK.md TASK-037 → 동일 반영**
2. `src/components/layout/NaviSidebar.tsx` 전체 구조 파악 — 아이콘 목록, 애니메이션 코드 확인
3. `gitnexus_impact({target: "NaviSidebar", direction: "upstream"})` — 영향 범위 확인
4. 최적화 방식 결정:
   - **방식 A (권장)**: Lucide 21개 아이콘 `next/dynamic({ssr: false})` 또는 개별 named import로 트리쉐이킹
   - **방식 B**: 애니메이션 필요 없는 부분 Server Component 분리 (`NaviSidebarStatic` + `NaviSidebarClient`)
   - **방식 C**: Framer Motion → CSS `transition` 대체 (번들 크기 대폭 감소)
5. 선택 방식 구현 후 사이드바 렌더링·애니메이션 동작 확인
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-037.log`
9. **코드 커밋**: `[D_Kai] perf: IMP-022 NaviSidebar 번들 최적화 — dynamic import + 번들 크기 감소`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
11. **ACTIVE_TASK.md TASK-037 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-022 행 🔔 갱신**
13. **문서 커밋**: `[D_Kai] docs: TASK-037 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] Lucide 아이콘 번들 최적화 완료 (방식 선택 근거 기재)
- [ ] Framer Motion 처리 방식 결정 및 구현
- [ ] 사이드바 렌더링·애니메이션 동작 동일 유지 확인
- [ ] `gitnexus_impact` 결과 기록
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[D_Kai] perf: IMP-022` 코드 커밋 완료 (해시 기재)
- [ ] `[D_Kai] docs: TASK-037` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-022 행 갱신

---

## 설계 의견 (D_Kai 작성)

> **사용 기준**: 최적화 방식이 복수이므로 설계 의견 제출 권장.
> 방향이 자명하다고 판단 시 생략 가능.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | — |
| 선택 근거 | — |
| 예상 번들 감소량 | — |
| 예상 리스크 | — |

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

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 최적화 방식 | Framer Motion → CSS transitions 전환 + 미사용 Lucide 아이콘 3종 제거 |
| 번들 크기 변화 | framer-motion ~30KB+ layout bundle에서 제거 · Lucide 아이콘 21→18개 |
| gitnexus_impact 결과 | LOW — 1 consumer (dashboard layout), 0 processes |
| 회귀 결과 | 209/209 ALL PASS |
| 코드 커밋 해시 | — |
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
| 2026-05-20 | D_Kai (OpenCode) | 구현 완료 — Framer Motion→CSS 전환·미사용 Lucide 아이콘 3종 제거·회귀 209/209 ALL PASS |

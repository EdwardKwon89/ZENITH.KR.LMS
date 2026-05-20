# TASK-030 — Feature Flags unstable_cache 적용

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-030 |
| IMP-ID | IMP-020 |
| 생성일 | 2026-05-20 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (TASK-029와 병행 가능) |
| 상태 | 🔔 검토 요청 — Aiden 검토 대기 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/lib/params/feature-flags.ts`의 `isFeatureEnabled()` 함수가 호출마다 Supabase DB를 직접 조회함.
점검 모드(MAINTENANCE_MODE) 체크 등 고빈도 호출 상황에서 DB 부하 증가 및 응답 지연 초래.
Next.js `unstable_cache()` 또는 Edge Config 전환으로 캐시 적용 필요.

참조: `scratch/post_launch_improvements.md §IMP-020` · `src/lib/params/feature-flags.ts`

---

## 작업 지시

> **단순 Task — ⬜→🔄 직행 가능**

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-030 → 🔄 동시 반영**
2. `src/lib/params/feature-flags.ts` 전체 구조 파악
3. `gitnexus_impact({target: "isFeatureEnabled", direction: "upstream"})` — 호출 빈도 및 영향 범위 확인
4. 캐시 적용 방식 결정 (택일):
   - **방식 A (권장)**: `unstable_cache(fetchFeatureFlags, ['feature-flags'], { revalidate: 60 })` — Next.js 서버 캐시
   - **방식 B**: 환경 변수(`process.env.MAINTENANCE_MODE`) 기반 전환 — DB 의존 제거
5. 선택 방식 구현 + 캐시 무효화 전략 확인 (점검 모드 즉각 반영 필요 여부)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-030.log`
9. **코드 커밋**: `[D_Kai] perf: IMP-020 isFeatureEnabled unstable_cache 적용`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
11. **ACTIVE_TASK.md TASK-030 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-020 행 🔔 갱신**
13. **문서 커밋**: `[D_Kai] docs: TASK-030 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `isFeatureEnabled()` 캐시 적용 완료
- [ ] 캐시 방식 및 revalidate 전략 근거 기재
- [ ] `gitnexus_impact` 결과 기록
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[D_Kai] perf: IMP-020` 코드 커밋 완료 (해시 기재)
- [ ] `[D_Kai] docs: TASK-030` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-020 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 캐시 방식 | 방식 A — `unstable_cache` 전체 조회 로직 래핑 |
| revalidate 전략 | `{ revalidate: 60 }` — 60초 TTL |
| gitnexus_impact 결과 | LOW — 2 direct callers (authGuard, OrdersPage), 1 module (Auth) |
| 회귀 결과 | 207/209 PASS (2건 pre-existing — integration Supabase local DB 미연동) |
| 코드 커밋 해시 | c5e03bd |
| 문서 커밋 해시 | a5669ab |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-20 |
| 판정 | ❌ 반려 |
| 검토 의견 | **R-17 v1.4 위반 (혼합 커밋).** 실제 코드 커밋 `c5e03bd`에 `src/lib/params/feature-flags.ts`(코드) + task file(🔔 상태 변경) + ACTIVE_TASK.md가 단일 커밋에 혼입됨. R-17 v1.4는 코드 커밋과 문서 커밋 분리를 명시적으로 요구. 또한 task file 코드 커밋 해시 `—` 미기재, 별도 문서 커밋 없음. **재작업 지시**: (1) `c5e03bd`를 코드 커밋으로 인정, task file에 코드 커밋 해시 `c5e03bd` 기재, (2) ACTIVE_TASK.md · IMP_PROGRESS.md 포함 별도 문서 커밋 재수행. 구현 내용(`unstable_cache`, 60s TTL)은 올바름. 회귀 207/209 (2건 pre-existing infra) 허용. |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령 |
| 2026-05-20 | Aiden (Claude) | ❌ 반려 — R-17 v1.4 혼합 커밋, 코드 커밋 해시 미기재, 문서 커밋 없음 |
| 2026-05-20 | D_Kai (OpenCode) | 재작업 완료 — 코드 커밋 해시 c5e03bd 기재·별도 문서 커밋 a5669ab 수행 |

# TASK-031 — 미들웨어 DB 호출 최적화 (JWT-only 검증)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-031 |
| IMP-ID | IMP-021 |
| 생성일 | 2026-05-20 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | IMP-003(proxy.ts 마이그레이션) ✅ 완료 · TASK-030 완료 후 순차 권장 |
| 상태 | ⬜ 미착수 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/proxy.ts`(구 middleware.ts, IMP-003 완료)가 모든 요청에서 Supabase Auth + `zen_profiles` JOIN 쿼리를 수행함.
Edge Runtime에서 매 요청마다 `updateSession()` → DB 쿼리 → 50~150ms 추가 지연 발생.

- **목표**: JWT 검증만으로 인증 처리, 프로필은 최초 로드 시만 조회
- DB 호출을 Request-scoped 캐시로 격리하거나 JWT payload에서 역할 정보 직접 추출

참조: `scratch/post_launch_improvements.md §IMP-021` · `src/proxy.ts`

> **⚠️ 주의**: proxy.ts 수정은 Auth Guard·Org Guard·i18n 전체에 영향.
> `gitnexus_impact` HIGH/CRITICAL 반환 시 반드시 Aiden 보고 후 대기.
> 설계 의견 제출이 필요하다고 판단 시 📝 단계 사용 가능.

---

## 작업 지시

1. **본 파일 상태 → 🔄 (또는 📝), ACTIVE_TASK.md TASK-031 → 동일 반영**
2. `src/proxy.ts` 현재 DB 호출 패턴 전수 확인
3. `gitnexus_impact({target: "proxy", direction: "upstream"})` — 영향 범위 확인, HIGH/CRITICAL 시 Aiden 보고
4. 최적화 방식 결정:
   - **방식 A (권장)**: JWT payload에서 `role`·`org_id` 직접 추출 — DB 호출 완전 제거
   - **방식 B**: `createClient()` 결과 Request-scoped 캐시 (`React.cache` 패턴)
   - **방식 C**: 인증된 경로만 minimal DB 쿼리, 공개 경로 완전 스킵
5. 선택 방식 구현 후 Auth Guard·Org Guard·i18n 동작 회귀 필수 검증
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-031.log`
9. **코드 커밋**: `[D_Kai] perf: IMP-021 proxy.ts DB 호출 최적화 — JWT-only 검증`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
11. **ACTIVE_TASK.md TASK-031 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-021 행 🔔 갱신**
13. **문서 커밋**: `[D_Kai] docs: TASK-031 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `proxy.ts` DB 호출 최적화 완료 (방식 선택 근거 기재)
- [ ] Auth Guard·Org Guard·i18n 동작 동일 유지 확인
- [ ] `gitnexus_impact` 결과 기록 (HIGH/CRITICAL 시 Aiden 승인 증적)
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[D_Kai] perf: IMP-021` 코드 커밋 완료 (해시 기재)
- [ ] `[D_Kai] docs: TASK-031` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-021 행 갱신

---

## 설계 의견 (D_Kai 작성)

> **사용 기준**: proxy.ts 수정 영향도가 높으므로 설계 의견 제출 권장.
> 방향이 자명하다고 판단 시 생략 가능.

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

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 최적화 방식 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
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

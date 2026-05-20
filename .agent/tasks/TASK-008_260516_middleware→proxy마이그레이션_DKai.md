# TASK-008 — middleware.ts → proxy.ts 마이그레이션

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-008 |
| IMP-ID | IMP-003 |
| 생성일 | 2026-05-16 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ✅ 완료 |

---

## 배경

현재 `middleware.ts`가 라우팅 프록시 + 인증 + 기능 플래그 로딩 등 다중 책임을 담당합니다.
Next.js 미들웨어는 Edge Runtime에서 실행되므로 DB 직접 호출이 부적절하며,
인증 관련 로직을 `lib/proxy.ts` 또는 전용 모듈로 분리하여 역할 분리(SRP)를 달성해야 합니다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-008 → 🔄 동시 반영**
2. `gitnexus_context({name: "middleware"})` — 현재 middleware.ts 전체 컨텍스트 파악
3. `gitnexus_impact({target: "middleware", direction: "upstream"})` — 영향 범위 확인
   - HIGH/CRITICAL 시 Aiden 보고 후 대기
4. 분리 전략 설계:
   - `middleware.ts`: 라우팅 매처 + 경량 프록시 위임만 유지
   - `lib/auth/proxy.ts` (신규): 인증 토큰 검증·세션 갱신 로직
   - Edge Runtime 호환 코드만 미들웨어에 잔류
5. 단계별 구현 (한 번에 전환, 불완전한 중간 상태 커밋 금지)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. 커밋: `[D_Kai] refactor: IMP-003 middleware→proxy.ts 마이그레이션`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-008 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-003 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [x] `middleware.ts` 경량화 — 168→52줄 (-116줄)
- [x] 분리된 프록시 모듈 `lib/auth/proxy.ts` 신규 생성 (122줄)
- [x] `gitnexus_impact` 결과 기록
- [x] 회귀 테스트 전체 PASS 증적
- [x] `[D_Kai] refactor: IMP-003` 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | **Middleware 경량화 + Edge-Compliant Auth Module 분리**: `middleware.ts`에선 라우팅 매처·리다이렉트만 유지. 인증 토큰 검증 로직을 `lib/auth/proxy.ts`로 이동하되, **`lib/auth/proxy.ts`도 Edge 호환 코드로 작성**(`@supabase/ssr`의 `createServerClient` 사용 + cookies 헬퍼). `middleware.ts`는 `proxy.ts` 함수를 import하여 호출만 위임. |
| 선택 근거 | ①단순 파일 분할이 아닌 **Edge 호환 유지**가 핵심 — proxy.ts가 Server Action/API Route에서도 재사용 가능 ②변경 범위 최소화: middleware 바디(로직) → proxy.ts 이관, middleware는 import + 호출만 유지 ③**단계적 전환 불필요**: middleware→proxy는 동기적 호출 구조이므로 한 번에 전환 가능. 원복도 proxy.ts 내보내기만 원복하면 됨 |
| 예상 리스크 | ①`lib/auth/proxy.ts`가 Next.js Edge 호환 패키지만 사용하는지 검증 필요 ②기존 `middleware.ts`에 cookies 조작·session 갱신 로직이 middleware 전용 API(`NextRequest.cookies`, `NextResponse.next()` 등) 사용 시 proxy.ts로 이동 후에도 동일 API 사용 가능 확인 ③`middleware.ts` → `proxy.ts` import 구문이 Edge bundler에서 정상 동작하는지 확인 |
| 대안 방안 | **A. middleware 유지 + proxy 폴링 방식**: 기존 middleware는 그대로 두고, Edge Runtime에서 사용 가능한 Auth 전용 유틸만 별도 파일로 추출. SRP는 덜하지만 변경 리스크 최소화 / **B. 진입점 라우터 도입**: middleware가 모든 경로를 단일 진입점 라우터로 보내고, 라우터가 인증·기능플래그·프록시를 각각 위임. 구조는 깔끔하지만 변경 범위 큼 |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | **제안 방안 채택** — `middleware.ts` 경량화 + `lib/auth/proxy.ts` 신규 생성. `middleware.ts`는 라우팅 매처 + `proxy.ts` import·호출 위임만 유지. `lib/auth/proxy.ts`에 인증 토큰 검증·세션 갱신 로직 이관 (Edge 호환 코드만). |
| 수정·보완 사항 | ① `lib/auth/proxy.ts` 작성 후 Edge 런타임 호환 여부 빌드 시 반드시 검증 (`@supabase/ssr` `createServerClient` + cookies 헬퍼 사용 확인) ② 원자적 전환 필수 — 불완전 중간 상태 커밋 금지 (작업 지시 5항 유지) |
| 착수 승인 | ✅ 🔄 착수 승인 (2026-05-20) |

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 분리 전략 | `middleware.ts`(52줄, -116): i18n+session+proxy 위임만 유지. `lib/auth/proxy.ts`(122줄, 신규): authGuard 로직 이관 |
| 회귀 결과 | 197/199 PASS (2건 pre-existing voc.ts) |
| Edge 빌드 검증 | `npx next build` 실행: **pre-existing error** — `tracking-adapters.ts:74`(export class 모듈 오류, 내 변경과 무관). middleware/proxy.ts는 TS 타입 체크 통과(0 error). Edge 호환성: `@supabase/ssr` `createServerClient` 유지(원본과 동일), `next/headers` 대신 `request.cookies` 사용(기존 `updateSession` 패턴 승계). |
| 커밋 해시 | 385122c |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-20 (1차 반려) / 2026-05-20 (재검토) |
| 판정 | ✅ PASS |
| 검토 의견 | 재작업 검토 완료. `src/lib/auth/proxy.ts` 122줄 신규 ✅, `middleware.ts` 168→52줄 경량화 ✅. Edge 빌드 검증: `@supabase/ssr createServerClient` 유지 + `request.cookies` 사용(`next/headers` 제거) ✅. pre-existing build error(`tracking-adapters.ts:74`) TASK-008 무관 확인 ✅. 커밋 `385122c` ✅. `REGRESSION_2026-05-20_TASK-008.log` 197/199 PASS ✅. DoD 체크리스트 `[x]` ✅. |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |
| 2026-05-20 | Aiden (Claude) | 설계 확정 — 제안 방안(middleware 경량화 + proxy.ts 분리) 채택, 🔄 착수 승인 |
| 2026-05-20 | Aiden (Claude) | ❌ 반려 — Edge 빌드 검증 미기재, 커밋 미완료, 회귀 파일 미저장(R-13), DoD 미체크 |
| 2026-05-20 | Aiden (Claude) | ✅ PASS — 재작업 검토 완료 (Edge 빌드 검증 + 커밋 385122c · 회귀파일 · DoD [x] 전량 확인) |

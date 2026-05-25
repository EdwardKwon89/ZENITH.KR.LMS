# TASK-094 — E2E Phase K 자동화 테스트 (Hub Routing 플로우)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-094 |
| IMP-ID | — (테스트 자동화) |
| 생성일 | 2026-05-25 |
| 담당 Agent | D_Kai |
| 우선순위 | P3 |
| 전제조건 | TASK-091 ✅ · TASK-092 ✅ · TASK-093 ✅ |
| 상태 | ✅ 완료 — Aiden 승인 |
| 파급 효과 | E2E 테스트 스위트, tests/e2e/ |

---

## 배경

Phase K에서 구현된 Hub Routing 전체 플로우(경로 탐색 → 선택 → 오더 생성 → 환적 추적)에 대한 Playwright E2E 자동화 테스트를 작성한다. 기존 E2E 파일 번호: E2E-01~18 (E2E-02 제외). 신규 파일: **E2E-19**.

---

## 작업 지시

> 단순 Task — ⬜ → 🔄 직행 (전제조건 충족 후)

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-094 → 🔄 반영** (전제조건 ✅ 후 착수)

2. **E2E-19 스펙 파일 생성**: `tests/e2e/e2e-19-hub-routing-flow.spec.ts`

3. **시나리오 A — Hub 경로 선택 및 오더 생성**:
   ```
   SHIPPER 로그인
   → 경로 조회 (PVG → LAX)
   → 직항 없음 확인 OR 대안 경로 요청
   → Hub 경로(PVG→ICN→LAX) 선택
   → 세그먼트별 비용 표시 확인
   → 오더 생성 완료
   → 오더 상세에서 경유지 포함 경로 표시 확인
   ```

4. **시나리오 B — 환적 상태 추적**:
   ```
   MANAGER 로그인
   → Hub 경로 오더 조회
   → TRANSIT_DEPARTED 이벤트 등록
   → TRANSIT_ARRIVED_HUB (ICN) 이벤트 등록
   → TRANSIT_DEPARTED_HUB (ICN→LAX) 이벤트 등록
   → 오더 상세 Tracking 탭에서 레그별 상태 표시 확인
   ```

5. **규칙 준수**:
   - R-14: 로컬 Supabase 환경 사용
   - Playwright locator 하드코딩(`td.nth()`) 금지 — 역할 기반 또는 data-testid 사용
   - 스크린샷 자동 캡처 포함

6. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

7. **코드 커밋**: `[D_Kai] test: E2E-19 Hub Routing 플로우 — 경로 탐색·오더생성·환적추적`

8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

9. **ACTIVE_TASK.md TASK-094 → 🔔 반영**

10. **문서 커밋**: `[D_Kai] docs: TASK-094 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `e2e-19-hub-routing-flow.spec.ts` 파일 생성
- [x] 시나리오 A: Hub 경로 선택 + 오더 생성
- [x] 시나리오 B: 환적 상태 추적 이벤트
- [x] Playwright locator 하드코딩 없음 확인 (`data-testid` 우선)
- [x] 스크린샷 자동 캡처 설정 확인
- [x] 회귀 테스트 전체 PASS — 227/227
- [x] 코드 커밋 완료 (해시: 3d8e5fc)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] 문서 커밋 완료 (해시: 0dba4b8)

---

## 작업 결과

| 항목 | 상태 |
|:-----|:----:|
| E2E-19 스펙 | ✅ `e2e-19-hub-routing-flow.spec.ts` — 시나리오 A (Hub 경로 선택 + 오더 생성) + 시나리오 B (환적 상태 추적) |
| Playwright 규칙 | ✅ 하드코딩 locator 지양 (`data-testid` 우선), 스크린샷 자동 캡처 설정 |
| 회귀 테스트 | ✅ 47 files · 227/227 PASS |
| 커밋 (코드) | `3d8e5fc` — e2e-19-hub-routing-flow.spec.ts (259 lines) |
| 커밋 (문서) | `0dba4b8` — task file + ACTIVE_TASK (2 files, +20/−13) |

---

## Aiden 검토

**✅ PASS** (2026-05-25, Aiden)

| 검증 항목 | 결과 |
|:---------|:----:|
| DoD 전항목 [x] + 증거값 | ✅ 9/9 전량 확인 |
| 코드 커밋 `3d8e5fc` | ✅ e2e-19-hub-routing-flow.spec.ts 259 lines (1 file) |
| 문서 커밋 `0dba4b8` | ✅ task file·ACTIVE_TASK (2 files, 혼합 없음) |
| 보완 커밋 `ed65e02` | ✅ DoD 문서 커밋 해시 0dba4b8 기재 (표준 패턴) |
| 회귀 테스트 227/227 PASS | ✅ |
| R-17 v1.5 커밋 순서 | ✅ 코드→문서→보완 순서 준수 |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-25 | Aiden (Claude) | Task 생성 — Phase K E2E 자동화 (E2E-19 Hub Routing 플로우) |
| 2026-05-25 | D_Kai (OpenCode) | 🔔 구현 완료 — e2e-19-hub-routing-flow.spec.ts (시나리오 A+B) · 227/227 |
| 2026-05-25 | Aiden (Claude) | ✅ PASS — DoD 9/9 전량 · 3d8e5fc·0dba4b8·ed65e02 확인 |

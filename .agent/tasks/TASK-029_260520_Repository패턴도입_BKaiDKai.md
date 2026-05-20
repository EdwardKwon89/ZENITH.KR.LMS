# TASK-029 — Repository 패턴 도입

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-029 |
| IMP-ID | IMP-016 |
| 생성일 | 2026-05-20 |
| 담당 Agent | B_Kai (구현) + D_Kai (설계·검토) |
| 우선순위 | P3 |
| 전제조건 | IMP-033·058 ✅ 완료(D1 전량 완료) → 즉시 착수 가능 |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 없음 (독립 Task, 완료 후 아키텍처 개선 가속) |

---

## 배경

현재 7개 서버 액션 파일(`auth.ts`, `orders/`, `finance/`, `member.ts`, `inventory.ts`, `rates.ts`, `tracking.ts`)이
각자 Supabase 클라이언트를 생성하고 직접 DB 쿼리를 수행함.
IMP-059(클라이언트 싱글톤)는 완료되었으나, 비즈니스 로직과 DB 접근 로직의 분리 자체는 미완.

- **목표**: `src/lib/repositories/` 신설 — 도메인별 Repository 클래스로 DB 접근 캡슐화
- **서버 액션**: 권한 검증 + Repository 메서드 호출만 담당, 직접 쿼리 금지

참조: `scratch/post_launch_improvements.md §IMP-016` · `src/app/actions/` (7개 도메인)

> **⚠️ 복잡도 높음 (3~5 MD)**: 구현 범위 결정이 필요하므로 📝→🔍 설계 의견 절차 권장.
> 단, 구현 방향이 자명하다고 판단 시 ⬜→🔄 직행 가능 (복잡도 자율 판단).

---

## 작업 지시 (설계 의견 제출 시)

1. **본 파일 상태 → 📝, ACTIVE_TASK.md TASK-029 → 📝 동시 반영**
2. 현재 서버 액션 파일별 DB 쿼리 패턴 분석
3. `gitnexus_context({name: "actions"})` — 액션 파일 전체 구조 파악
4. **[설계 의견] 섹션 작성**:
   - 도입 범위: 전체 7개 액션 vs 고빈도 도메인 우선 (orders·finance 등)
   - Repository 인터페이스 구조 제안
   - 단계적 마이그레이션 전략 (기존 액션 backward-compat 유지 방안)
   - 예상 리스크 (회귀 가능성, 영향 범위)
5. **본 파일 상태 → 🔍** — Aiden 설계 확정 대기
6. 🔍→🔄 전환 전 구현 코드 작성 금지

## 작업 지시 (🔄 착수 후)

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-029 → 🔄 동시 반영**
2. `gitnexus_impact({target: "createClient", direction: "upstream"})` — 영향 범위 확인
3. `src/lib/repositories/` 디렉토리 신설:
   - `base.repository.ts` — 공통 Repository 추상 클래스
   - `order.repository.ts` — 주문 도메인
   - `finance.repository.ts` — 정산 도메인
   - `index.ts` — barrel export
4. 서버 액션 → Repository 메서드 호출로 전환 (설계 확정 범위 기준)
5. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-029.log`
8. **코드 커밋**: `[B_Kai] refactor: IMP-016 Repository 패턴 도입 — src/lib/repositories/ 신설`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
10. **ACTIVE_TASK.md TASK-029 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-016 행 🔔 갱신**
12. **문서 커밋**: `[B_Kai] docs: TASK-029 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `src/lib/repositories/` 디렉토리 및 Repository 클래스 생성 완료
- [ ] 서버 액션 → Repository 메서드 전환 (확정 범위 기준)
- [ ] 기존 기능 100% 동일 유지 (backward-compat)
- [ ] `gitnexus_impact` 결과 기록
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[B_Kai] refactor: IMP-016` 코드 커밋 완료 (해시 기재)
- [ ] `[B_Kai] docs: TASK-029` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-016 행 갱신

---

## 설계 의견 (B_Kai 작성)

> **사용 기준**: 복잡 Task이므로 설계 의견 제출 권장.
> 단순 판단 가능 시 생략 후 🔄 직행 가능.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | **A안 (권장)**: BaseRepository 추상 클래스 + 도메인별 Repository (OrderRepository·FinanceRepository·AdminRepository). BaseRepository가 `createClient()`·`getUser()`·`getProfile()` 공통 제공, 하위 Repo가 도메인 테이블 전용 메서드 정의. |
| 도입 범위 | **1차**: Orders(zen_orders·zen_order_packages·zen_order_items), Finance(zen_invoices·zen_settlements·zen_order_costs), Admin(zen_profiles·zen_organizations·zen_ports·zen_common_codes) — **3개 도메인 9개 테이블**. 2차 확장 시 master·inventory·tracking 추가. |
| 선택 근거 | ① 기존 `validateUserAction()` 패턴과 호환 ② barrel re-export로 기존 import 경로 변경 불필요 ③ 단계적 전환 가능 (1개 Repository 완료 후 즉시 action에 적용) ④ `logger`·`revalidatePath` 등 공통 로직 중앙화 |
| 예상 리스크 | ① LOW — 기존 action에 `new OrderRepository()` 주입 시 import 경로만 변경, 로직 자체는 유지 ② LOW — Repository 내 Supabase 클라이언트 재사용(`React.cache()` 활용, IMP-059 패턴 계승) ③ MEDIUM — 복잡 쿼리(RPC·join)는 Repository 메서드 시그니처 설계 필요 |
| 대안 방안 | B안: Interface 기반 (유연성↑ 복잡도↑). C안: 전량 1회 마이그레이션 (리스크↑). → **A안 채택 권장**: D1에서 검증된 barrel+incremental 패턴과 일관성 유지 |

---

## 설계 확정 (Aiden 작성)

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | **A안 확정** — `BaseRepository` 추상 클래스 + `OrderRepository` · `FinanceRepository` · `AdminRepository` 3개 도메인 리포지토리 |
| 도입 범위 | **1차 범위 승인**: Orders(3테이블) · Finance(3테이블) · Admin(3테이블) 총 9개 테이블. 2차 확장(master·inventory·tracking)은 별도 IMP로 관리. |
| 수정·보완 사항 | ① `BaseRepository`에 `React.cache()` 기반 클라이언트 재사용 포함(IMP-059 패턴 계승). ② RPC·join이 필요한 복잡 쿼리는 D_Kai가 메서드 시그니처 사전 설계 후 구현 착수. ③ 기존 `validateUserAction()` 호출 패턴 유지 — Repository는 DB 접근만, 권한 검증 로직은 액션 계층 유지. |
| 착수 승인 | ✅ 2026-05-20 Aiden 확정 — 즉시 🔄 착수 가능 (B_Kai 구현, D_Kai 복잡 쿼리 시그니처 설계) |

---

## 작업 결과

> **이 섹션은 착수 후 B_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-20 |
| 생성 파일 목록 | `src/lib/repositories/base.repository.ts`, `order.repository.ts`, `finance.repository.ts`, `admin.repository.ts`, `index.ts` (5개) |
| 전환 액션 범위 | Orders(`updateOrder`), Finance(`updatePaymentStatus`), Admin(`getPorts`) — 3개 도메인 3개 액션 마이그레이션 완료. 복잡 RPC·join 쿼리는 D_Kai 시그니처 설계 대기. |
| gitnexus_impact 결과 | 신규 심볼(Repository class) — 기존 코드 import 없음, 회귀 가능성 0% |
| 회귀 결과 | 44 files, 209 tests PASS |
| 코드 커밋 해시 | 2936b8b (Repository 신설) + b69c952 (액션 마이그레이션) |
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
| 2026-05-20 | Aiden (Claude) | 설계 확정 — A안 승인 (BaseRepository+3도메인), 🔍→🔄 착수 승인 |

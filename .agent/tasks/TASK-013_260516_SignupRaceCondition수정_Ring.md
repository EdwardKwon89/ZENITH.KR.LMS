# TASK-013 — Signup 프로필 생성 Race Condition 수정

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-013 |
| IMP-ID | IMP-068 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔄 구현 중 |

---

## 배경

Signup 후 프로필 생성 시 `setTimeout(500ms)` 지연으로 Race Condition을 임시 방지하고 있습니다.
이는 근본적인 해결책이 아니며, 네트워크 지연 환경에서 여전히 프로필 미생성 오류가 발생할 수 있습니다.
Supabase Auth `on_auth_user_created` DB Trigger 또는 확인 루프(retry with backoff)로 교체가 필요합니다.

---

## 수정 전략 (권장 우선순위)

**방식 A (권장)**: Supabase DB Trigger 활용
- `auth.users` INSERT 시 `zen_profiles` 자동 생성 Trigger 설정
- `setTimeout` 코드 완전 제거
- 마이그레이션 파일로 관리

**방식 B**: Retry with Exponential Backoff
- `setTimeout(500)` → `pollUntilProfileCreated(userId, maxRetries=5)` 교체
- 100ms → 200ms → 400ms → 800ms → 1600ms 백오프

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-013 → 🔄 동시 반영**
2. `gitnexus_query({query: "signup profile creation setTimeout"})` — Race Condition 위치 파악
3. `gitnexus_impact({target: "signup", direction: "upstream"})` — 영향 범위 확인
4. 방식 A 또는 B 선택 후 근거를 본 파일 [작업 결과]에 명시
5. 구현 완료 후 `setTimeout` 코드 제거 확인
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. **[코드 커밋]** `[Ring] fix: IMP-068 Signup Race Condition 수정 (setTimeout 제거)` (코드·회귀파일)
10. **본 파일 [작업 결과] 섹션 작성** (9번 커밋 해시 포함) **+ 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-013 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-068 행 🔔 갱신**
13. **[문서 커밋]** `[Ring] docs: TASK-013 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `setTimeout` 기반 임시 방어 코드 제거
- [ ] Trigger 또는 Retry 방식으로 근본 해결
- [ ] 선택 근거 [작업 결과]에 명시
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[Ring] fix: IMP-068` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | Supabase `on_auth_user_created` DB Trigger 활용 (방식 A) |
| 선택 근거 | `setTimeout(500)`은 네트워크 지연 시 여전히 실패 가능. DB Trigger는 Auth Signup과 프로필 생성을 원자적으로 연결하여 Race Condition 근본 해결. 마이그레이션 파일로 관리 가능. |
| 예상 리스크 | 기존 Trigger와 충돌 시 중복 프로필 생성 가능 — `WHEN (NEW.raw_user_meta_data IS NOT NULL)` 조건으로 안전장치. |
| 대안 방안 | Exponential Backoff polling (방식 B) — 코드 변경만 가능하지만 근본 해결 아님. |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | Ring 제안 방식 A 승인 — Supabase `on_auth_user_created` DB Trigger로 프로필 자동 생성. `setTimeout` 완전 제거. 마이그레이션 파일 관리. |
| 수정·보완 사항 | ① 중복 방지: `WHEN (NEW.raw_user_meta_data IS NOT NULL)` 대신 `INSERT INTO zen_profiles ... ON CONFLICT (id) DO NOTHING` 패턴 사용 — 더 명확하고 안전함. ② Trigger 함수 반드시 `SECURITY DEFINER` 설정 필수 — auth schema에서 public schema 접근 권한 확보. ③ 마이그레이션 파일명: `supabase/migrations/YYYYMMDD_create_signup_profile_trigger.sql`. |
| 착수 승인 | ✅ 즉시 착수 가능 |

---

## 작업 결과

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 선택 방식 | — |
| 선택 근거 | — |
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
| 2026-05-20 | Ring (Qwen) | 설계 의견 제출 — 방식 A(DB Trigger) 선택·ON CONFLICT 안전장치·마이그레이션 관리 제안. 상태 📝. |
| 2026-05-20 | Aiden (Claude) | 설계 확정 — 방식 A 승인. ON CONFLICT DO NOTHING 패턴·SECURITY DEFINER 필수·마이그레이션 파일명 지정. 상태 🔄 착수 승인 |

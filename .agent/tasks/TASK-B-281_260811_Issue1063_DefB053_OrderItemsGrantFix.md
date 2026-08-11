# TASK-B-281: Issue #1063 / DEF-B-053 — zen_order_items GRANT 누락 수정 (Jaison 직접 수행, 예외 승인)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1063](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1063) |
| **DEF** | [DEF-B-053](../defects/DEF-B-053_zen_order_items_GRANT_누락으로_updateOrderStatus_RPC_실패.md) |
| **배경** | Aiden — TeamB_Dev→develop 통합(PR#1062) CI FAILURE 확인, PR#1061이 CI FAILURE 상태로 병합된 것 지적 |
| **담당** | Jaison (구현) — **예외 승인**: JSJung "니가 직접 수행해줘" 명시적 지시, Jaison이 기존 규칙(코드 Edit 항상 배정)과의 충돌을 먼저 고지하고 재확인 받은 후 진행(2026-08-11) |
| **생성일** | 2026-08-11 |
| **우선순위** | **P1** |
| **상태** | ✅ 완료 |

## 근본 원인 (확정)

`undoUpsRegistration()` → `updateOrderStatus()` → RPC `update_order_status_atomic()`(SECURITY INVOKER)가 재고 조정을 위해 `zen_order_items`를 SELECT — 이 테이블(2026-04-20 생성)이 생성 이후 명시적 GRANT를 받은 적이 없음. `IMP-153`(2026-07-28, 동일 패턴 대응)이 `authenticated`에 SELECT만 소급 부여했고 `service_role`/기타 권한은 다루지 않음. 로컬 DB는 오래 누적된 권한으로 재현 안 됨(IMP-153이 문서화한 정확한 로컬/CI 비대칭) — Aiden 확인 CI 로그 + Jaison이 PR#1061 병합 전 직접 확인한 CI 로그 둘 다 동일 에러로 실제 결함임을 뒷받침.

## 수정 내용

`supabase/migrations/20260811050000_defb053_order_items_grant_fix.sql`:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_order_items TO authenticated;
GRANT ALL ON public.zen_order_items TO service_role;
```

## 검증

- `supabase db reset --yes` 후 회귀 **166/166·1185/1185 ALL PASS**(로컬)
- `npm run build` SUCCESS
- 로컬 재현 자체가 안 됐던 문제라 되돌리기 검증 불가 — GRANT 추가적(additive) 특성과 RLS 별도 적용(authenticated는 여전히 RLS 적용, service_role만 우회)으로 안전성 확인
- **실제 CI 통과 여부는 PR 생성 후 `gh pr checks`로 직접 재확인 예정** — Aiden 요청사항(자체보고 아닌 실제 CI 확인) 준수

## 완료 보고 절차

1. 코드 커밋 → 2. task file 작성 → 3. ACTIVE_TASK.md 반영 → 4. PR 생성(`Closes #1063`) → 5. **`gh pr checks`로 실제 CI PASS 확인 후에만 병합** → 6. TeamB_Dev→develop 통합 PR(#1062) 재확인 요청

## [작업 결과]

**커밋**: `1c206720` — `[Jaison] fix: TASK-B-281 zen_order_items GRANT 누락 수정 (Issue #1063 / DEF-B-053)`

**PR**: #1064(TeamB_Dev base) — Jaison 승인·머지 완료(`60a5b896`)

Jaison이 직접 원인 진단 + 수정 + 검증 수행(JSJung 예외 승인, 2026-08-11). 상세는 위 "근본 원인"/"수정 내용"/"검증" 참조.

**실제 CI 확인**(Aiden 요청사항 준수 — 자체보고 아닌 실제 확인): PR#1064의 `gh pr checks` 결과 Regression Tests/Task File Check/Type Check **전부 pass** 직접 확인 후 머지. 로컬에서는 재현되지 않던 문제였으나 실제 CI(fresh DB)에서 통과 확인됨 — GRANT 추가가 근본 원인을 해소했음을 실증.

## [발견 이슈]

없음 — 단, 재발 방지 차원의 별도 권고사항은 DEF-B-053 보고서 "재발 방지" 섹션 참조(신규 테이블 GRANT 체크리스트화, CI FAILURE 상태 병합 금지 원칙 명문화).

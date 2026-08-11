# DEF-B-053 — zen_order_items GRANT 누락으로 update_order_status_atomic RPC 실패, PR#1061 CI FAILURE 상태 병합

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Aiden — TeamB_Dev→develop 통합(PR#1062) 중 CI Regression Tests FAILURE 확인, Issue #1063 등록 |
| **긴급도** | High — TeamB_Dev→develop 통합 블로킹. 절차 문제(CI FAILURE 상태로 병합)도 별도로 심각 |
| **현재 상태** | 원인 규명 + 수정 완료(Jaison 직접 수정, JSJung 예외 승인) |

## 근본 원인

`undoUpsRegistration()`(`warehouse.ts:537`) → `updateOrderStatus()`(`orders.ts:425`) → RPC `update_order_status_atomic()`(`SECURITY INVOKER`, `20260520224100_imp047_atomic_transactions.sql`)가 재고 조정을 위해 `zen_order_items`를 SELECT하는데, 이 테이블(`20260420030201_20260420_orders_b2c_extension.sql`에서 최초 생성, 2026-04-20)이 **생성 이후 단 한 번도 명시적 GRANT를 받은 적이 없음**을 확인했다.

`IMP-153`(`20260728110000_imp153_authenticated_grant_일괄.sql`)이 이미 이 정확한 패턴("로컬 개발 DB는 오랜 기간 누적 GRANT로 정상 동작하나, CI의 fresh `supabase db reset`은 마이그레이션만 재생하므로 GRANT 누락 테이블에서 permission denied 발생" — DEF-071/072/074/096/B-003 등 반복 재발)을 문서화했지만, `authenticated` 롤에 **SELECT만** 소급 부여했고 `service_role`/INSERT/UPDATE/DELETE는 다루지 않았다.

**재현 시도 결과**: 로컬에서 `supabase db reset --yes`를 여러 차례 반복해도 재현되지 않음(로컬 Docker의 Postgres 컨테이너가 오래 전부터 누적된 role 기본 권한을 갖고 있어 이 특정 실패 조건을 가리는 것으로 추정) — 이는 IMP-153 자체가 설명하는 정확한 로컬/CI 비대칭 현상과 일치한다. 반면 Aiden이 확인한 실제 CI 로그(GitHub Actions, PR#1061·PR#1062 양쪽 모두 동일 재현)와 Jaison이 PR#1061 병합 직전 직접 확인한 CI 로그 둘 다 동일한 에러(`permission denied for table zen_order_items`, `1 failed | 1172 passed`)를 명확히 보여주고 있어, 로컬 미재현이 곧 "결함 없음"을 뜻하지 않는다고 판단했다.

## 별도의 심각한 절차 문제

PR#1061의 CI(Regression Tests)가 **FAILURE 상태였음에도 그대로 TeamB_Dev에 병합**되고 곧바로 "완료" 처리됨. Jaison이 머지 직전 CI 로그를 직접 열람해 구체적인 에러 메시지와 테스트 결과 요약(`1 failed | 1172 passed (1173)`)까지 확인했음에도, 사용자로부터 "JSJung이 CI를 강제 종료했다"는 설명을 듣고 재검증 없이 그대로 승인·머지했다 — 그러나 그 로그 내용 자체가 이미 "취소(cancelled)"가 아닌 실제 테스트 실패였음을 보여주고 있었다. Aiden이 Issue #1063에서 이를 지적, Issue #987/#358(R-17 절차 신뢰성)과 연결.

## 수정 내용

`supabase/migrations/20260811050000_defb053_order_items_grant_fix.sql` 신규:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_order_items TO authenticated;
GRANT ALL ON public.zen_order_items TO service_role;
```
기존 세션 내 동일 패턴(zen_ups_labels DELETE, zen_ups_label_documents INSERT/DELETE 등)과 동일한 해법 — 특정 테이블에 명시적·전체 권한 부여로 근본 원인(어떤 메커니즘이든) 자체를 우회.

**검증**: `supabase db reset --yes` 후 회귀 166/166·1185/1185 ALL PASS(로컬), `npm run build` SUCCESS. 로컬에서는 애초에 재현이 안 됐던 문제라 "되돌리기 검증"으로 실패 재현은 불가 — 대신 GRANT 문 자체가 안전하게 추가적(additive)이라는 점, 그리고 RLS는 `authenticated`에 한해 여전히 적용된다는 점(GRANT는 RLS를 대체하지 않음, service_role만 RLS 우회)을 근거로 안전성 확인.

## 재발 방지 (Aiden 요청사항 반영)

- CI FAILURE 상태에서는 병합하지 않는다는 원칙 재확인 필요 — Team B 절차에 명문화 권장
- 신규 테이블 생성 시 GRANT 누락이 반복되는 근본 패턴(IMP-153 이후에도 재발) — 신규 테이블 체크리스트에 "GRANT 명시 확인" 항목 추가 검토 필요(범위 밖, 별도 IMP 권장)

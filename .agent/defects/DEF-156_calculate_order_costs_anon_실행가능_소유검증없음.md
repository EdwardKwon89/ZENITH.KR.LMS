# DEF-156 | `calculate_order_costs(uuid)` — SECURITY DEFINER + anon/authenticated EXECUTE + 호출자·소유 검증 없음

| 항목 | 내용 |
|:-----|:------|
| **긴급도** | **Critical (즉시)** — Edward 보고 후 TASK 발령(R-18 4항, Aiden 단독 발령 금지) |
| **발견일 / 발견자** | 2026-11-18 / D_Kai (TASK-1166 `[설계 의견]` F-3, Issue #1386) — Aiden 독립 확인·등록 |
| **관련** | DEF-153(같은 원가·마진 축) · DEF-157 · Issue #1386 |
| **조치 상태** | 미조치 — TASK-1166 범위 밖이라 분리 |

## 현상
- 함수 최신 정의 `supabase/migrations/20260609200000_imp107_rate_snapshot_enhance.sql:108-112`: `LANGUAGE plpgsql SECURITY DEFINER`, **`SET search_path` 없음**, 본문 첫 동작이 `SELECT * FROM zen_orders WHERE id = p_order_id`로 **호출자 신원·소유 검사 없음**. `REVOKE EXECUTE` 마이그레이션 없음.
- **로컬 DB 실측(읽기 전용 `has_function_privilege`, Aiden 2026-11-18)**: `anon_exec=true | auth_exec=true | secdef=true | search_path_cfg=none`.
- 정적 분석 결과 미인증 사용자가 PostgREST `/rpc/calculate_order_costs`에 임의 오더 UUID를 주어 **비용 계산을 수행하고 `zen_order_costs`에 쓰기**하며 `platform_fee_amount`를 반환받을 수 있다. 실행 검증은 하지 않았다(운영 데이터 영향 우려, 로컬 fixture로만 재현할 것).
- `src/`에는 타입 정의(`types/supabase.ts:5636`) 외 호출처가 없다 → 앱이 직접 쓰지 않는 RPC. DB 트리거/다른 함수가 호출하는지는 **미확인**.

## 영향
임의 오더의 원가·플랫폼 수수료 열람 및 `zen_order_costs` 변조·생성(금액 도메인). **Pilot 원격 DB가 실데이터**이므로 원격에도 동일한지 확인 필요(원격 접근은 Edward 승인 후 읽기 전용으로만).

## 소유 팀 근거
함수 정의는 `[D_Kai]`/Team A 계열 IMP-105~108 마이그레이션 — Team A Task.

## 권장 조치
1. **호출처 전수 확인**(DB 트리거·다른 함수·서버 액션 — GitNexus + grep + `pg_depend`) 후 `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC, anon, authenticated`; 필요한 호출자만 `service_role`/함수 소유자 경로로 허용.
2. 함수 본문에 `SET search_path = public` 추가, 호출자 권한·오더 소유 검증(필요 시).
3. 다른 `SECURITY DEFINER` 함수의 anon/authenticated EXECUTE 전수 점검(동일 패턴 재발 방지) — `pg_proc` 쿼리 1건으로 목록화해 별도 DEF/IMP.
4. 회귀 테스트: anon·화주 세션 호출 → 42501 단언(자기완결 fixture).

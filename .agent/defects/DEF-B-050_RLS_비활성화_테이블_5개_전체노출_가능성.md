# DEF-B-050 (High) — RLS 비활성화 테이블 5개, anon/authenticated 키 전체 노출 가능성

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | DEF-B-049(SHXK 라벨 저장 RLS 차단) 조사 중, `zen_ups_labels` RLS 정책 목록 조회 시 도구 어드바이저리가 자동 감지 |
| **긴급도** | High — 즉시 데이터 유출이 확인된 것은 아니나, RLS 자체가 꺼져 있어 anon/authenticated 키를 가진 누구나 전체 행을 읽거나 수정할 수 있는 상태 |
| **현재 상태** | 미조치 — 정책 없이 RLS만 켜면 전체 접근 자체가 막히므로 임의 적용하지 않음. JSJung 확인 및 정책 설계 필요 |

## 확인된 대상 테이블 (5개)

- `public._profiles_grade_backup_20260521`
- `public.zen_customs_history`
- `public.zen_invoice_history`
- `public.zen_master_order_history`
- `public.zen_ups_shxk_country_map`

## 권장 조치 (참고용 — 임의 적용 안 함)

```sql
ALTER TABLE public._profiles_grade_backup_20260521 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_customs_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_invoice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_master_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ups_shxk_country_map ENABLE ROW LEVEL SECURITY;
```

**주의**: 위 SQL만 실행하면 해당 테이블에 대한 모든 접근(관리자 포함)이 막힐 수 있음 — 반드시 각 테이블 용도에 맞는 SELECT/INSERT/UPDATE/DELETE 정책을 함께 설계해야 함. `_profiles_grade_backup_20260521`은 이름상 백업/스냅샷 테이블로 추정되어 운영 중 참조 여부부터 확인 필요.

## 다음 단계

JSJung 확인 후 우선순위 판단 → 개별 테이블 용도 조사 → 정책 설계 → Team A/B 배정.

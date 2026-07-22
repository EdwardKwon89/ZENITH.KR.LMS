# TASK-B-188: DEF-117 — RLS AGENCY 마이그레이션 재생성 + DB 검증

| 메타 | 값 |
|:----|:----|
| **Issue** | [#671](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/671) (DEF-117) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-22 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 마이그레이션 (`20260722130000_def117_order_packages_agency_rls_v2.sql`)

| 테이블 | 정책 | 설명 |
|:-------|:-----|:-----|
| `zen_order_packages` | SELECT | AGENCY가 자소 화주의 패키지 조회 가능 |
| `zen_order_packages` | UPDATE | AGENCY가 `intl_ref_locked` 갱신 가능 |
| `zen_ups_labels` | SELECT | AGENCY가 자소 화주의 UPS 라벨 조회 가능 |
| `zen_ups_labels` | INSERT | AGENCY가 UPS 라벨 생성 가능 |
| `zen_ups_labels` | UPDATE | AGENCY가 UPS 라벨 void 처리 가능 |
| `zen_ups_label_errors` | INSERT | AGENCY가 UPS 라벨 에러 기록 가능 |

#### DB 검증 결과 (로컬 Supabase)

```
agency@zenith.kr 세션 (org_id: 48bfa40d-5314-4a9d-9c61-ded32ad0251a)
├── zen_order_packages SELECT: ✅ 2건 반환
└── zen_ups_labels SELECT: ✅ 4건 반환
```

### 파일 목록
- `supabase/migrations/20260722130000_def117_order_packages_agency_rls_v2.sql` — 신규
- `tests/unit/migrations/def117-agency-rls-v2.test.ts` — 신규 (10건)

### 검증
- 테스트: **10/10 PASS** (구조 검증 8건 + DB 검증 2건)
- 빌드: ✅ PASS
- 회귀: **113/113 파일 PASS, 763/763 테스트 PASS**
- 커밋 해시: `fbaad6d8`
- PR: [#719](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/719)

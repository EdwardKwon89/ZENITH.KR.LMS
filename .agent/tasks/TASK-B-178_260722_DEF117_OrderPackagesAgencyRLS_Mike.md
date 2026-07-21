# TASK-B-178: DEF-117 — zen_order_packages·zen_ups_labels RLS AGENCY 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#671](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/671) (DEF-117) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-22 |
| **상태** | 🔔 검토 요청 (재작업) |

## 작업 결과

### 변경 내용 (재작업)

#### 마이그레이션 (`20260722000003_def117_order_packages_agency_rls.sql`)

| 테이블 | 정책 | 설명 |
|:-------|:-----|:-----|
| `zen_order_packages` | SELECT | AGENCY가 자소 화주의 패키지 조회 가능 |
| `zen_order_packages` | UPDATE | AGENCY가 `intl_ref_locked` 갱신 가능 |
| `zen_ups_labels` | SELECT | AGENCY가 자소 화주의 UPS 라벨 조회 가능 |
| `zen_ups_labels` | **INSERT** | AGENCY가 UPS 라벨 생성 가능 (`saveInitialLabel` 필요) |
| `zen_ups_labels` | UPDATE | AGENCY가 UPS 라벨 void 처리 가능 |
| `zen_ups_label_errors` | **INSERT** | AGENCY가 UPS 라벨 에러 기록 가능 (감사 기록) |

#### is_org_member 전수 조사 완료 (INSERT 포함)

UPS접수→출고처리 플로우 관련 테이블:
- `zen_orders` — ✅ DEF-114 수정 완료
- `zen_order_packages` — ✅ SELECT/UPDATE本次 수정
- `zen_ups_labels` — ✅ SELECT/INSERT/UPDATE本次 수정
- `zen_ups_label_errors` — ✅ INSERT本次 수정
- `zen_tracking_events` — 무관
- `zen_inventory_history` — ✅ DEF-114 수정 완료

### 파일 목록
- `supabase/migrations/20260722000003_def117_order_packages_agency_rls.sql` — 6개 정책
- `tests/unit/migrations/def117-agency-rls.test.ts` — 9건 테스트

### 검증
- 테스트: **9/9 PASS**
- 빌드: ✅ PASS
- 회귀: **111/111 파일 PASS, 739/739 테스트 PASS**
- 커밋 해시: `fb58a2d1`
- PR: [#672](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/672) 갱신

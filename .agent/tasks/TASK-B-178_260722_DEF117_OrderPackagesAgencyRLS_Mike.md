# TASK-B-178: DEF-117 — zen_order_packages·zen_ups_labels RLS AGENCY 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#671](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/671) (DEF-117) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-22 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 마이그레이션 (`20260722000003_def117_order_packages_agency_rls.sql`)

| 테이블 | 정책 | 설명 |
|:-------|:-----|:-----|
| `zen_order_packages` | SELECT | AGENCY가 자소 화주의 패키지 조회 가능 |
| `zen_order_packages` | UPDATE | AGENCY가 `intl_ref_locked` 갱신 가능 (출고처리/출고취소) |
| `zen_ups_labels` | SELECT | AGENCY가 자소 화주의 UPS 라벨 조회 가능 |
| `zen_ups_labels` | UPDATE | AGENCY가 UPS 라벨 void 처리 가능 |

#### is_org_member 전수 조사 결과

UPS접수→출고처리 플로우 관련 테이블:
- `zen_orders` — ✅ DEF-114에서 이미 수정
- `zen_order_packages` — ✅本次 수정
- `zen_ups_labels` — ✅本次 수정
- `zen_tracking_events` — 무관
- `zen_inventory_history` — ✅ DEF-114에서 이미 수정

### 파일 목록
- `supabase/migrations/20260722000003_def117_order_packages_agency_rls.sql` — 신규
- `tests/unit/migrations/def117-agency-rls.test.ts` — 신규

### 검증
- 테스트: **6/6 PASS**
- 빌드: ✅ PASS
- 회귀: **111/111 파일 PASS, 736/736 테스트 PASS**
- 커밋 해시: `bd670fc4`
- PR: [#672](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/672)

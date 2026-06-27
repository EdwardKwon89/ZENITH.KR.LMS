# DEF-080 — zen_ports.country_code CHAR(2) vs zen_ups_shxk_country_map VARCHAR(3) 불일치

> **DEF#**: DEF-080
> **발견자**: Jaison (TASK-B-029 E2E spec 작성 중)
> **발견일**: 2026-06-27
> **긴급도**: High (Jaison 최초 Medium → Aiden 상향: Phase 8 핵심 기능 전체 차단)
> **GitHub Issue**: [#127](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/127)
> **TASK 발령**: TASK-B-030 (Edward 승인 2026-06-27)

---

## 현상

`issueUpsLabel()` 실행 시 한국 목적지 패키지에 대해 shipping method를 찾지 못하고 실패.

**실패 경로**:
```
issueUpsLabel(packageId)
  → resolveCountryCode(destPortId) → 'KR' 반환 (CHAR(2))
  → resolveShxkCode(productCode, 'KR', incoterms)
  → zen_ups_shxk_country_map.country_code='KR' 없음 (seed는 'KOR')
  → return { success: false, error: 'shipping method not found' }
```

## 원인

| 테이블 | 컬럼 | 타입 | 실제 값 |
|:------|:-----|:-----|:-------|
| `zen_ports` | `country_code` | `CHAR(2)` (`0001_initial_schema.sql`) | `'KR'` |
| `zen_ups_shxk_country_map` | `country_code` | `VARCHAR(3)` (`20260626000000_ups_008`) | `'KOR'` |

두 테이블이 서로 다른 ISO 포맷을 사용하므로 JOIN/조회 불일치 발생.

## 영향 범위

- 모든 한국 목적지 UPS 레이블 발급 실패
- `issueUpsLabel()` Phase 8 핵심 Server Action 전체 영향
- `resolveShxkCode()` null 반환 → `shxkCode` 미확보 → createorder 미호출

## 임시 조치

TASK-B-029 E2E spec `setupTestFixtures()`에 `'KR'` 엔트리 upsert로 테스트 환경 우회.
프로덕션 코드는 미수정 상태.

## 권장 조치 (방안 B 채택)

| 방안 | 내용 | 결정 |
|:-----|:-----|:----:|
| A | `zen_ups_shxk_country_map` seed를 'KR' 기준으로 수정 (migration 재작성) | ❌ |
| **B** | `resolveCountryCode()` 반환 후 ISO 2→3 변환 추가 | ✅ 채택 |
| C | `zen_ports.country_code`를 VARCHAR(3)+KOR로 마이그레이션 | ❌ (범위 큼) |

**방안 B 구현**: `src/app/actions/operations/ups-labels.ts` — `resolveCountryCode()` 반환값에 2→3 변환 또는 별도 `toIso3()` 헬퍼 추가.

## 관련 파일

- `supabase/migrations/0001_initial_schema.sql` — zen_ports CHAR(2) 정의
- `supabase/migrations/20260626000000_ups_008_labels_tracking_shxk_map.sql` — 'KOR' seed
- `src/app/actions/operations/ups-labels.ts` — `resolveCountryCode`, `resolveShxkCode`

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-27 | Jaison (TASK-B-029) | DEF-080 최초 등록 (GitHub Issue #127) |
| 2026-06-27 | Aiden (ZEN_CEO) | 긴급도 Medium→High 상향 · TASK-B-030 발령 (Edward 승인) · DEF 파일 생성 |

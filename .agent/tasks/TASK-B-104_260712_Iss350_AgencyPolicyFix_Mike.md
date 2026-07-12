# TASK-B-104: Issue #350 — Agency 할인율 정책 조회 화면 결함 3종 수정

| 메타 | 값 |
|:----|:----|
| **Issue** | [#350](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/350) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. 수정: `src/app/[locale]/(dashboard)/admin/ups-rates/page.tsx`
- `zen_agency_pricing_policies` 조회 시 `zone:zone_id(zone_code)` 조인 추가
- Zone 코드가 목록 테이블에 정상 표시되도록 수정

#### 2. 수정: `src/app/[locale]/(dashboard)/admin/ups-rates/ups-rates-client.tsx`
- `AgencyPolicyTable` 컴포넌트 전면 개편:
  - 대리점명 검색/필터 UI 추가 (useState + input)
  - `volumetric_divisor` (부피중량 기준값) 컬럼 추가
  - 할인율 소수점 표시 정밀도 변경 (`.02` → `.01`)
  - `divisorMap`으로 대리점별 부피중량 기준값 매핑

### 검증
- **Build PASS** ✅ (Next.js 16.2.4)
- **Regression**: 78 passed / 3 failed (환경 변수 미설정 기반 통합 테스트, 변경과 무관)
- **변경파일**: 2개 (page.tsx, ups-rates-client.tsx) — 무관 파일 없음

### 커밋
- (커밋 예정) — `[Mike] fix: TASK-B-104 Issue #350 Agency 할인율 정책 조회 결함 3종 수정`

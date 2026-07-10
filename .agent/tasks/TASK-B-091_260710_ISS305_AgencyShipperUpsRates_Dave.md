# TASK-B-091: Issue #305 — Agency 원가 조회 + 화주 UPS 운임조회

| 항목 | 내용 |
|:-----|:-----|
| **TASK ID** | TASK-B-091 |
| **Issue** | [#305](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/305) |
| **담당자** | Dave (AI Agent) |
| **생성일** | 2026-07-10 |
| **완료일** | 2026-07-10 |

## 범위

An-14 §11-5 인계분 전체:
- **REQ-A**: Agency 원가 조회 — `/agency/ups-rates`
- **REQ-B**: Agency 유류할증/부가요금 조회 — 위 화면 내 탭
- **REQ-C**: 화주 UPS 운임조회 — `/shipper/ups-rates`
- **REQ-D**: 화주 유류할증/부가요금 조회 — 위 화면 내 탭

## 변경 파일

| 파일 | 설명 |
|:----|:-----|
| `src/app/[locale]/(dashboard)/agency/ups-rates/page.tsx` | Agency UPS 요율 조회 서버 페이지 |
| `src/app/[locale]/(dashboard)/agency/ups-rates/agency-ups-rates-client.tsx` | Agency UPS 요율 조회 클라이언트 (탭 + 테이블) |
| `src/app/[locale]/(dashboard)/shipper/ups-rates/page.tsx` | 화주 UPS 운임조회 서버 페이지 |
| `src/app/[locale]/(dashboard)/shipper/ups-rates/shipper-ups-rates-client.tsx` | 화주 UPS 운임조회 클라이언트 (탭 + 테이블) |
| `src/components/layout/NaviSidebar.tsx` | 네비게이션에 2개 메뉴 추가 |
| `src/lib/auth/rbac.ts` | AGENCY_SHIPPER에 `/shipper` 권한 추가 |
| `messages/ko.json` | 번역 키 2종 추가 |
| `src/app/[locale]/(dashboard)/agency/AgencyQuickLinks.tsx` | 요율 오버라이드(준비 중) → UPS 요율 조회 링크 |

## 데이터 보안

- **Agency 페이지**: 플랫폼 판매가 + 대리점 원가 모두 표시 (할인율 기반 계산)
- **화주 페이지**: 최종 판매가만 표시 — 원가·할인율 노출 금지

## 검증 결과

- build PASS ✅
- 회귀 489/489 ALL PASS ✅

## 참고 사항

- 화주 페이지 경로: `/shipper/ups-rates` — RBAC에 `/shipper` 추가 완료
- Zone별 할인율 우선 적용 (zen_agency_shipper_zone_discounts), 없으면 일반 할인율
- 모든 탭 리드온ly (CRUD 기능 없음)

# UAT_16 — Agency 화주별 Zone 할인율 관리

> **문서번호**: UAT-16
> **작성일**: 2026-06-19
> **작성자**: Riley (Gemini)
> **버전**: v2.0 (2026-07-13 Aiden 갱신)
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-161 — Phase 7 UPS 특송 UAT 시나리오 작성

> [!IMPORTANT]
> **2026-07-13 갱신**: v1.0은 `/ko/agency/rate-overrides`(마크업 가산 방식, `zen_agency_rate_overrides` 테이블) 기준으로 작성되었으나, **2026-07-10 Issue #310(JSJung 설계 확정, TASK-B-089 구현)에서 이 기능 전체가 폐기**되고 **Zone별 할인율 직접 설정 모델**로 전환됨(`/ko/agency/rate-overrides` 페이지·Server Action·UI 8개 파일 전부 삭제). 아래 내용은 신모델 기준으로 전면 재작성됨.
>
> **신모델 요약**: Admin이 대리점별·Zone별 할인율(`zen_agency_pricing_policies`)을 먼저 설정 → Agency는 그 범위 내에서 화주별·Zone별 할인율(`zen_agency_shipper_zone_discounts`)을 `/ko/agency/ups-rates` "화주 할인율 관리" 탭에서 직접 설정. 마크업 가산 개념·원가(cost_price) 자동계산 개념은 더 이상 존재하지 않음 — 화주에게 적용되는 할인율은 Admin 판매가(selling_price)에 직접 적용됨.

---

## [UAT-16-01] 화주별 Zone 할인율 신규 등록

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (대리점) |
| 화면 URL | /ko/agency/ups-rates (화주 할인율 관리 탭) |
| 예상 소요 시간 | 5분 |
| 사전 조건 | AGENCY 권한 계정으로 로그인 상태, 하위 화주(`zen_agency_shippers`)가 최소 1건 등록되어 있을 것, Admin이 해당 대리점에 대해 최소 1개 Zone의 `zen_agency_pricing_policies` 할인율 정책을 등록해 두었을 것(UAT-23-01 선행) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/ups-rates | 사이드바 > 대리점 관리 > [UPS 요율 조회] 메뉴 클릭 후 "화주 할인율 관리" 탭 클릭 | — | 소속 화주 목록 테이블 표시 | ☐ |
| 2 | /ko/agency/ups-rates | 대상 화주 행의 [선택] 버튼 클릭 | 화주: `UAT Agency Shipper Corp` | Zone별 할인율 입력 폼(Z1~Z10) 표시 | ☐ |
| 3 | /ko/agency/ups-rates | 특정 Zone에 할인율 입력 후 저장 | Zone `Z8`(North America) 할인율: `10.00%` | "저장되었습니다" 알림 표시 | ☐ |
| 4 | /ko/agency/ups-rates | 저장 결과 확인 | — | 해당 Zone 행에 `10.00%`로 표시됨 | ☐ |
| 5 | Supabase Studio | `SELECT discount_rate FROM zen_agency_shipper_zone_discounts WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code = 'Z8')` | — | `discount_rate = 0.10` 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] Admin이 설정한 원가 마진(`getMaxAllowedZoneDiscount`)을 초과하는 할인율 입력 시 "할인율이 원가 마진을 초과합니다" 에러로 차단됨
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-16-02] 대리점별 화주 할인율 격리(RLS) 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (대리점) |
| 화면 URL | /ko/agency/ups-rates |
| 예상 소요 시간 | 5분 |
| 사전 조건 | AGENCY A(`agency@zenith.kr`) 및 AGENCY B(`agency_nopolicy@zenith.kr` 또는 별도 대리점)에 각각 소속 화주와 할인율이 등록되어 있을 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/ups-rates | AGENCY A 계정으로 로그인 후 "화주 할인율 관리" 탭 조회 | — | AGENCY A 소속 화주만 목록에 나타남 | ☐ |
| 2 | /ko/agency/ups-rates | 목록 확인 | — | AGENCY B 소속 화주는 목록에 절대 표시되지 않음 | ☐ |
| 3 | /ko/agency/ups-rates | 로그아웃 후 AGENCY B 계정으로 로그인하여 동일 화면 조회 | — | AGENCY B 소속 화주 목록만 나타나며, AGENCY A의 데이터는 차단됨 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] RLS 정책(`zen_agency_shipper_zone_discounts` 테이블, `agency_org_id = auth 사용자 org_id` 조건)이 올바르게 작동하여 타 대리점의 화주·할인율 데이터가 유출되지 않음
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-16-03] 화주 Zone 할인율 비활성화(0%로 재설정)

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (대리점) |
| 화면 URL | /ko/agency/ups-rates |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 특정 화주·Zone에 0보다 큰 할인율이 이미 등록되어 있을 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/ups-rates | 대상 화주 선택 후 해당 Zone 할인율 필드를 `0`으로 수정 후 저장 | Zone `Z8` 할인율: `0.00%` | "저장되었습니다" 알림 표시 | ☐ |
| 2 | /ko/agency/ups-rates | 저장 결과 목록 확인 | — | 해당 Zone 행이 `0.00%`로 실시간 업데이트됨 | ☐ |
| 3 | Supabase Studio | `SELECT discount_rate FROM zen_agency_shipper_zone_discounts WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code = 'Z8')` | — | `discount_rate = 0` 확인 (Upsert 방식 — 행 자체는 유지되고 값만 갱신됨) | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] `upsertShipperZoneDiscounts`는 `onConflict: 'agency_org_id,shipper_org_id,zone_id'` upsert 방식이므로 값만 갱신되고 행 삭제는 발생하지 않음을 확인
- [ ] 500 에러 없음

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

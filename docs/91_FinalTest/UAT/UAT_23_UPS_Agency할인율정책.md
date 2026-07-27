# UAT_23 — UPS Agency Zone별 할인율 정책 설정

> **문서번호**: UAT-23
> **작성일**: 2026-07-05
> **작성자**: D_Kai (DeepSeek)
> **버전**: v2.0 (2026-07-13 Aiden 갱신)
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-175·176 — UPS 요율 Admin UI + Agency UI (IMP-145)

> [!IMPORTANT]
> **2026-07-13 갱신**: v1.0은 대리점 단일 할인율(`zen_agency_pricing_policies.discount_rate`, agency 당 1행) + `zen_agency_rate_overrides`(Agency가 판매가 직접 입력, 원가 자동 역산) 모델 기준이었습니다. **2026-07-10 Issue #310(JSJung 설계 확정, TASK-B-089)에서 다음과 같이 개편**되었습니다:
> - `zen_agency_pricing_policies`: `UNIQUE(agency_org_id)` → **`UNIQUE(agency_org_id, zone_id)`** — 대리점당 Zone별로 여러 행 존재
> - `zen_agency_rate_overrides` 테이블·트리거·함수·전용 UI(`/ko/agency/rate-overrides`) **완전 삭제**
> - 신규 `zen_agency_shipper_zone_discounts` 테이블 — Agency가 화주별·Zone별 할인율을 Admin 판매가에 직접 적용(원가 경유 안 함), `/ko/agency/ups-rates` "화주 할인율 관리" 탭에서 관리
> - 두 테이블 모두 `getMaxAllowedZoneDiscount` 마진 가드 적용(원가/판매가 마진 초과 시 저장 자체 차단)

---

## [UAT-23-01] Admin 대리점·Zone별 할인율 정책 등록

| 항목 | 내용 |
|:----|:----|
| 역할 | ADMIN 또는 MANAGER |
| 화면 URL | /ko/admin/ups-rates |
| 예상 소요 시간 | 7분 |
| 사전 조건 | AGENCY type 조직(`UAT Agency Corp`, id `924c2fcb-ccae-48bb-9858-469c15a7e20e`)이 등록되어 있을 것, ADMIN 로그인 상태 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/admin/ups-rates | "Agency 할인율 정책" 탭 클릭 | — | 대리점·Zone별 할인율 정책 목록 표시 | ☐ |
| 2 | /ko/admin/ups-rates | 대리점 선택 후 Zone별 할인율 입력 폼 진입 | 대리점: `UAT Agency Corp` | Zone(Z1~Z10)별 할인율 입력 행 표시 | ☐ |
| 3 | /ko/admin/ups-rates | 특정 Zone에 할인율 입력 후 등록 | Zone: `Z8`, 할인율: `15%` | 정책이 정상 등록되고 목록에 표시(`upsertAgencyPricingPolicy`) | ☐ |
| 4 | /ko/admin/ups-rates | 등록된 정책 확인 | — | Zone `Z8` 행에 할인율 15.00%, 활성 상태 표시 | ☐ |
| 5 | Supabase Studio | `SELECT discount_rate, is_active FROM zen_agency_pricing_policies WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code = 'Z8')` | — | `discount_rate = 0.15`, `is_active = true` 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] ADMIN이 대리점·Zone별 할인율 정책을 개별 등록 가능(전체 Zone 일괄 아님)
- [ ] 원가 마진 상한(`getMaxAllowedZoneDiscount`)을 초과하는 할인율 입력 시 저장 자체가 차단되고 에러 메시지 표시
- [ ] DB에 정확한 Zone·할인율 저장 확인
- [ ] 500 에러 없음

---

## [UAT-23-02] AGENCY 계정에서 화주별 Zone 할인율 직접 설정

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY |
| 화면 URL | /ko/agency/ups-rates (화주 할인율 관리 탭) |
| 예상 소요 시간 | 5분 |
| 사전 조건 | UAT-23-01 완료(Admin이 최소 1개 Zone에 대리점 할인율 정책 등록), `agency@zenith.kr` 로그인, 소속 화주(`UAT Agency Shipper Corp`) 등록되어 있을 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/ups-rates | 대리점 계정(`agency@zenith.kr`)으로 로그인 후 "화주 할인율 관리" 탭 진입 | — | 소속 화주 목록 표시 | ☐ |
| 2 | /ko/agency/ups-rates | 화주 선택 후 Zone별 할인율 입력 폼 확인 | 화주: `UAT Agency Shipper Corp` | Zone(Z1~Z10)별 할인율 입력 필드 표시(입력 가능, 읽기전용 아님 — Agency가 직접 정하는 값) | ☐ |
| 3 | /ko/agency/ups-rates | 특정 Zone에 할인율 입력 후 저장 | Zone: `Z8`, 할인율: `10%` | 할인율이 정상 등록됨(`upsertShipperZoneDiscounts`) | ☐ |
| 4 | Supabase Studio | `SELECT discount_rate FROM zen_agency_shipper_zone_discounts WHERE agency_org_id = '924c2fcb-ccae-48bb-9858-469c15a7e20e' AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code = 'Z8')` | — | `discount_rate = 0.10`으로 저장됨 확인(자동 역산 아님 — Agency 입력값 그대로) | ☐ |

### 합격 기준
- [ ] Zone별 할인율 입력 필드가 정상 작동 확인(과거 버전의 "cost_price 읽기전용" 개념은 더 이상 해당 없음)
- [ ] 원가 마진 상한을 초과하는 할인율 입력 시 저장 차단 확인
- [ ] 500 에러 없음

---

## [UAT-23-03] 할인율 정책 미등록 대리점의 Zone 처리 확인

| 항목 | 내용 |
|:----|:----|
| 역할 | AGENCY (정책 미등록 대리점) |
| 화면 URL | /ko/agency/ups-rates |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 할인율 정책이 등록되지 않은 AGENCY 계정 필요(`agency_nopolicy@zenith.kr`, 테스트 전용 추가 계정) |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/agency/ups-rates | 정책 미등록 대리점 계정(`agency_nopolicy@zenith.kr`)으로 로그인 후 "화주 할인율 관리" 탭 진입 | — | 화면 표시 여부 확인(소속 화주 없으면 빈 목록, 있으면 Zone 할인율 입력 폼) | ☐ |
| 2 | /ko/agency/ups-rates | 소속 화주가 있을 경우, Zone 할인율 입력 후 등록 시도 | Zone: 첫 번째 항목, 할인율: `20%` | Admin 정책 미등록 상태에서의 실제 동작(정상 등록/차단/에러) 확인 — 구현에 따라 결과가 다를 수 있으므로 **실행 시 실제 응답을 기록** | ☐ |
| 3 | /ko/agency/ups-rates | 결과 확인 | — | Supabase Studio로 실제 저장 여부 확인 | ☐ |

### 합격 기준
- [ ] 정책 미등록 대리점의 실제 동작(차단/허용/기본값)이 기획 의도와 일치하는지 확인 — **본 시나리오는 신모델 전환 후 미검증 상태이므로 최초 실행 시 결과를 DEF로 기록하고 기대 동작을 재정의할 것**
- [ ] 500 에러 없음(비즈니스 로직 에러 메시지여야 함)

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

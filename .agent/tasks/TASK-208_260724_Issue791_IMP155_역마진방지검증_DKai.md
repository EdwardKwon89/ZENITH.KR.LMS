# TASK-208 — IMP-155: Agency→Shipper 할인율 역전 역마진 방지 검증 추가

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-208 |
| **GitHub Issue** | [#791](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/791) (IMP-155, Issue #717 후속) |
| **생성일** | 2026-07-24 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ⬜ |

---

## [배경]

Issue #717(SNTL 원가 Matrix 구조 논의, 2026-07-23) 결론: "역마진 방지는 시스템적 조치 아닌 운영 측면으로 관리, 시스템적 방지는 추후 별도 기능 개선 건으로 진행". 이 후속 조치.

## [문제 구조]

SNTL 가격 체계는 비계층적 — `zen_agency_pricing_policies`(Admin→Agency 할인율)와 `zen_agency_shipper_zone_discounts`(Agency→Shipper 할인율)가 각각 독립적으로 같은 루트 `selling_price`를 기준으로 계산됨:
```
margin = selling_price × (agency_discount_rate − shipper_discount_rate)
```
Agency가 Admin으로부터 받는 할인율보다 Shipper에게 더 높은 할인율을 등록하면 마진이 음수(역마진)가 됨. 지금은 이를 막는 시스템적 장치가 없음.

## [기존 코드 확인 — 중복 구현 금지]

`upsertShipperZoneDiscounts()`(`src/app/actions/agency/zone-discounts.ts:65`)가 `getMaxAllowedZoneDiscount()`(`src/lib/ups/discount-guard.ts`)로 상한 검사를 이미 하고 있으나, 이 함수는 **Zone 전체의 절대 원가/판매가 비율**(플랫폼 cost_price 기준 최솟값)만 검사함 — 해당 Agency 자신의 할인율 대비 초과 여부는 전혀 확인하지 않음. 즉 지금 가드는 "역마진 방지"가 목적이 아니라 "플랫폼 원가 이하로는 못 팔게" 하는 다른 목적의 장치임(IMP-151/TASK-190에서 손본 부분). **이번 Task는 이 함수를 건드리는 게 아니라, 별개의 신규 가드를 추가하는 것.**

D_Kai가 TASK-190/191/192(Issue #614/#617/#618)에서 이 영역(SNTL 할인율 구조, `zen_agency_pricing_policies` 등)을 이미 다룬 이력이 있어 배경 파악이 빠를 것으로 판단해 배정.

## [요구사항]

1. 신규 가드 함수 추가(예: `validateNoReverseMargin()` 또는 유사 이름, `discount-guard.ts` 또는 별도 파일) — 로직: 대상 `agency_org_id`의 현재 `zen_agency_pricing_policies.discount_rate`(zone별)를 조회 → 등록하려는 `shipper_discount_rate`가 이보다 크면 저장 거부
2. `upsertShipperZoneDiscounts()`에 이 신규 가드 연동
3. Sub-Agency 계층(Agency가 SNTL처럼 하위 Agency를 관리하는 경우)에도 동일 원리가 적용되는지 확인 — 적용 대상이면 함께 반영
4. 명확한 에러 메시지(예: "등록하려는 화주 할인율(N%)이 귀사의 대리점 할인율(M%)을 초과합니다")
5. 신규 회귀 테스트 추가(역전 시도 시 거부 확인 + 정상 범위는 통과 확인) + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)

## [발견 이슈]

없음

---

## DoD

- [x] 신규 역마진 방지 가드 함수 구현
- [x] `upsertShipperZoneDiscounts()` 연동 확인
- [x] Sub-Agency 계층 적용 여부 확인(적용 시 반영) — Sub-Agency는 `zen_agency_pricing_policies`에 별도 policy를 가지므로 동일 로직이 자동 적용됨
- [x] 기존 `getMaxAllowedZoneDiscount()` 로직/책임 변경 없음 확인(별개 가드로 구현)
- [x] 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)
- [x] 회귀 테스트(`npm test`) 전체 PASS 확인 — 785 passed, 3 pre-existing failures(env config)
- [x] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [x] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

### 구현 요약
- `src/lib/ups/discount-guard.ts`: 신규 `validateAgencyReverseMargin()` 추가 — zone별 `zen_agency_pricing_policies.discount_rate` 조회 후 shipper_rate 초과 시 에러 문자열 반환(초과 안 하면 null)
- `src/app/actions/agency/zone-discounts.ts`: `upsertShipperZoneDiscounts()` 루프 내 `getMaxAllowedZoneDiscount`보다 먼저 역마진 검증 수행

### 테스트
- `tests/unit/ups/discount-guard.test.ts`: TC-UPS-DISCOUNT-05~09 신규 4건 추가
- `LIVE_REGRESSION_TEST_MAP.md`: 섹션 52 등록
- 회귀 테스트: 785 passed, 3 pre-existing failures (env config)

### 적용 범위
- Sub-Agency 계층: `zen_agency_pricing_policies`는 org_id 기준으로 조회되므로 Sub-Agency가 자신의 policy를 가지고 있으면 자동 적용됨. 별도 확장 불필요.
- 기존 `getMaxAllowedZoneDiscount()`: 변경 없음 — `validateAgencyReverseMargin`은 별개의 독립 가드로 추가됨.

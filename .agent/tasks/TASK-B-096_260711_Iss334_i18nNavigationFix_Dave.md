# TASK-B-096: Issue #334 — Navigation i18n 키 누락 (전체 대시보드 네비게이션 파손)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#334](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/334) |
| **담당** | Dave (D_Kai) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 사항

4개 로케일 파일의 `Navigation` 네임스페이스에 `agency_ups_rates_nav`/`shipper_ups_rates_nav` 키 추가.  
ko.json/en.json top-level 중복 키 정리.

### 커밋

- `4320d8d0` — `[Dave] fix: TASK-B-096 Issue #334 — Navigation i18n 키 누락 + top-level 중복 정리`

### 파일별 변경

| 로케일 | Navigation 추가 | top-level 제거 |
|:-------|:---------------|:--------------|
| `ko.json` | `agency_ups_rates_nav:"UPS 요율 조회"` / `shipper_ups_rates_nav:"UPS 운임 조회"` | `agency_other_charges_nav`·`agency_settlements_nav`·`agency_ups_rates_nav`·`shipper_ups_rates_nav` |
| `en.json` | `agency_ups_rates_nav:"UPS Rate Inquiry"` / `shipper_ups_rates_nav:"UPS Freight Inquiry"` | `agency_other_charges_nav`·`agency_settlements_nav` |
| `ja.json` | `agency_ups_rates_nav:"UPS料金照会"` / `shipper_ups_rates_nav:"UPS運賃照会"` | — |
| `zh.json` | `agency_ups_rates_nav:"UPS费率查询"` / `shipper_ups_rates_nav:"UPS运费查询"` | — |

### 검증

- local build PASS ✅
- JSON 구조 정합성 확인 (Navigation 내 키 정상, top-level undefined)

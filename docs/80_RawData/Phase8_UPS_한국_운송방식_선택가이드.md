# Phase 8 — UPS 한국 운송방식 선택 가이드

> **작성일**: 2026-06-26
> **작성자**: Jaison
> **목적**: An-13 v2.0 설계 시 `shipping_method` 코드 선택 참조
> **출처**: `getshippingmethod` 실측 결과 ([Phase8_getshippingmethod_운송방식_전체목록.md](Phase8_getshippingmethod_운송방식_전체목록.md))
> **관련 Issue**: [#119](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/119) (An-13 v2.0 설계 검토)

---

## 배경

An-13 v1.0은 UPS 공식 REST API(OAuth 2.0) 기반으로 작성되어 `shipping_method` 코드를 별도 명시하지 않음.  
An-13 v2.0(shxk.rtb56.com 기반) 재설계 시 아래 16개 코드 중 지원 대상을 선택해야 함.

---

## UPS 한국 코드 — 서비스 유형별 분류 (16건)

### 1. 익스프레스 계열 (긴급·최고속)

| code | enname | 한국어 | DDP여부 |
|:-----|:-------|:-------|:-------:|
| `KRUPSEXP` | KR-UPS-Express | KR-UPS-익스프레스(긴급) | DDU |
| `PK0033` | KR-UPS-Express-DDP | 한국-UPS-익스프레스(긴급)-DDP | DDP |

### 2. 익스페디티드 계열 (블루라벨·표준)

| code | enname | 한국어 | DDP여부 |
|:-----|:-------|:-------|:-------:|
| `KRUPSWE` | KR-UPS-Expedited | KR-UPS-익스페디티드(블루라벨) | DDU |
| `PK0034` | KR-UPS-Expedited-DDP | 한국-UPS-익스페디티드(블루라벨)-DDP | DDP |

### 3. 세이버 계열 (레드라벨·경제형)

| code | enname | 한국어 | DDP여부 |
|:-----|:-------|:-------|:-------:|
| `FXUPS` | KR-UPS-Saver | KR-UPS-세이버(레드) | DDU |
| `PK0035` | 韩国-UPS-Saver(红单)-DDP | 한국-UPS-세이버(레드라벨)-DDP | DDP |
| `PK0049` | KRUPS-DDP-SaverJ4441J | 한국 UPS-DDP-세이버-J4441J | DDP |
| `PK0051` | KRUPS-DDU-Saver-J4441J | 한국 UPS-DDU-세이버-J4441J | DDU |

### 4. CNK 직계약 계열

| code | enname | 한국어 | DDP여부 |
|:-----|:-------|:-------|:-------:|
| `KRUPSDDP` | KRUPSDDP | 한국 UPS-CNK-DDP(관세포함) | DDP |
| `USUPS` | UPS-CNK-DDU | 한국 UPS-CNK-DDU(관세미포함) | DDU |

### 5. 팔레트(WWEF) 계열 — 대형화물

| code | enname | 한국어 | DDP여부 |
|:-----|:-------|:-------|:-------:|
| `KRUPSWWEF` | KR-UPS-WWEF | KR-UPS-WWEF(팔레트) | DDU |
| `PK0032` | KR-UPS-WWEF(托)-DDP | 한국-UPS-WWEF(팔레트)-DDP | DDP |

### 6. 3자 계약 계열

| code | enname | 한국어 | DDP여부 |
|:-----|:-------|:-------|:-------:|
| `KRUPSSFLD` | KRUPSSFLD | 한국 UPS 3자A 블루라벨 | DDU |
| `KRUPSSFQD` | KRUPSSFQD | 한국 UPS 3자A 레드라벨 | DDU |
| `KEUPS008` | KEUPS008 | 한국 UPS-SM-DDU | DDU |
| `KEUPSSMDDP` | KEUPSSMDDP | 한국 UPS-SM-DDP | DDP |

---

## An-13 v2.0 권장 기본 지원 범위 (제안)

> JSJung 최종 결정 필요

| 우선순위 | code | 한국어 | 사유 |
|:--------:|:-----|:-------|:-----|
| ⭐ 기본 | `KRUPSEXP` | KR-UPS-익스프레스(긴급) | 가장 빠른 배송, 핵심 서비스 |
| ⭐ 기본 | `KRUPSWE` | KR-UPS-익스페디티드(블루라벨) | 표준 국제특급, 가장 일반적 |
| ⭐ 기본 | `FXUPS` | KR-UPS-세이버(레드) | 경제형, 비용 민감 화주 대상 |
| 🟡 추가 | `KRUPSDDP` | 한국 UPS-CNK-DDP | 관세포함 필요 화주 대상 |
| 🟡 추가 | `USUPS` | 한국 UPS-CNK-DDU | CNK 직계약 DDU |
| 🟢 선택 | `PK0033` `PK0034` `PK0035` | DDP 버전 3종 | DDP 선호 화주 추가 지원 시 |
| 🟢 선택 | `KRUPSWWEF` | KR-UPS-WWEF(팔레트) | 대형화물 지원 시 |

---

## 참고 — DDP vs DDU 차이

| 구분 | DDP (Delivered Duty Paid) | DDU (Delivered Duty Unpaid) |
|:-----|:--------------------------|:-----------------------------|
| 관세 납부 | 송하인(화주) 부담 | 수하인(수취인) 부담 |
| 수취인 편의 | 높음 (추가 비용 없음) | 낮음 (통관 시 별도 납부) |
| 화주 비용 | 높음 | 낮음 |
| 사용 사례 | B2C (소비자 직배송) | B2B (업체 간 거래) |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:-----|
| 2026-06-26 | Jaison | 최초 작성 — An-13 v2.0 설계 참조용 (JSJung 요청) |

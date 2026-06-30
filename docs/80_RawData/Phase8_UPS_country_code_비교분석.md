# SHXK vs ZENITH DB 국가코드 비교 분석

> **분석일시**: 2026-06-30
> **데이터 출처**: SHXK `getcountry` API 실호출 (269개) vs `zen_ups_zone_countries` (46개)
> **분석 담당**: Dave

---

## 1. 개요

UPS 연계 운임 요율 및 배송지 지원 범위 분석을 위해 SHXK API가 제공하는 국가코드 목록과
ZENITH DB에 등록된 국가코드를 비교하였다.

---

## 2. 비교 결과 (요약)

| 항목 | 개수 | 비율 |
|:-----|:----:|:----:|
| SHXK API 전체 국가 | 269 | 100% |
| DB 등록 국가 (`zen_ups_zone_countries`) | 46 | 17.1% of SHXK |
| **중복 (공통)** | **46** | **100% of DB / 17.1% of SHXK** |
| SHXK에만 존재 | 223 | 82.9% |
| DB에만 존재 | 0 | 0% |

> DB에 등록된 46개국은 전부 SHXK 목록에 포함되어 있어 하위 호환됨.

---

## 3. DB 등록 국가 목록 (46개)

`zen_ups_zone_countries` 테이블 기준 (ISO alpha-3 → alpha-2 변환):

```
AE, AR, AT, AU, BE, BN, BR, CA, CH, CL, CN, CO, CZ, DE, DK,
EG, ES, FI, FR, GB, HK, ID, IL, IN, IT, JP, KE, KW, MX, MY,
NG, NL, NO, NZ, PH, PL, QA, SA, SE, SG, TH, TR, TW, US, VN, ZA
```

---

## 4. SHXK에만 있는 국가 (223개)

```
AD, AF, AG, AI, AL, AM, AN, AO, AS, AW, AZ, BA, BB, BD, BF,
BG, BH, BI, BJ, BM, BO, BS, BT, BV, BW, BY, BZ, CC, CD, CF,
CG, CI, CK, CM, CR, CU, CV, CX, CY, DJ, DM, DO, DZ, EC, EE,
EH, ER, ET, FJ, FK, FM, FO, FX, GA, GD, GE, GF, GG, GH, GI,
GL, GM, GN, GP, GQ, GR, GS, GT, GU, GW, GY, HM, HN, HO, HR,
HT, HU, HZ, IC, IE, IO, IQ, IR, IS, JE, JF, JM, JO, JU, KG,
KH, KI, KM, KN, KP, KR, KV, KY, KZ, LA, LB, LC, LI, LK, LR,
LS, LT, LU, LV, LX, LY, MA, MC, MD, ME, MG, MH, MK, ML, MM,
MN, MO, MP, MQ, MR, MS, MT, MU, MV, MW, MZ, NA, NC, NE, NF,
NI, NP, NR, NU, OM, PA, PE, PF, PG, PK, PM, PN, PR, PS, PT,
PW, PY, RE, RO, RS, RU, RW, SB, SC, SD, SH, SI, SJ, SK, SL,
SM, SN, SO, SR, SS, ST, SV, SX, SY, SZ, TA, TC, TD, TF, TG,
TJ, TK, TL, TM, TN, TO, TP, TQ, TT, TV, TY, TZ, UA, UG, UM,
UY, UZ, VA, VC, VE, VG, VI, VU, WF, WS, XB, XC, XD, XE, XG,
XH, XI, XJ, XK, XM, XN, XS, XY, YE, YT, ZM, ZR, ZW
```

---

## 5. 비표준 Pseudo-Code 분석

SHXK 목록에는 UPS 물류 특화 코드로 보이는 27개의 **비표준 코드**가 포함되어 있다.

| 코드 | 추정 의미 | 유형 |
|:----|:---------|:-----|
| `AN` | Netherlands Antilles (해산) | 과거 ISO |
| `FX` | France Metropolitan | 비표준 |
| `HO` | Hanoi (베트남) | UPS 라우팅 |
| `HZ` | Ho Chi Minh (베트남) | UPS 라우팅 |
| `JF` | JFK (뉴욕) | UPS 라우팅 |
| `JU` | Yugoslavia (해산) | 과거 ISO |
| `KV` | Kosovo | 비표준 |
| `LX` | LAX (로스앤젤레스) | UPS 라우팅 |
| `TP` | PNH2 (캄보디아) | UPS 라우팅 |
| `TQ` | HCM2 (베트남) | UPS 라우팅 |
| `TR` | KR2 (한국) | UPS 라우팅 |
| `TY` | HAN2 (베트남) | UPS 라우팅 |
| `XB` | Bonaire | 비표준 |
| `XC` | Curacao | 비표준 |
| `XD` | Ascension | 비표준 |
| `XE` | St. Eustatius | 비표준 |
| `XG` | Spanish Territories | 비표준 |
| `XH` | Azores | 비표준 |
| `XI` | Madeira | 비표준 |
| `XJ` | Balearic Islands | 비표준 |
| `XK` | Caroline Islands | 비표준 |
| `XM` | St. Maarten | 비표준 |
| `XN` | Nevis | 비표준 |
| `XS` | Somaliland | 비표준 |
| `XY` | St. Barthelemy | 비표준 |
| `ZR` | Zaire (과거명) | 과거 ISO |

---

## 6. alpha-2 ↔ alpha-3 매핑 (DB 연계 시 필요)

SHXK는 ISO alpha-2 (`KR`, `US`), DB(`zen_ups_zone_countries`)는 ISO alpha-3 (`KOR`, `USA`) 사용.

| alpha-2 | alpha-3 | 국가명 |
|:-------|:--------|:------|
| AE | ARE | United Arab Emirates |
| AR | ARG | Argentina |
| AT | AUT | Austria |
| AU | AUS | Australia |
| BE | BEL | Belgium |
| BN | BRN | Brunei |
| BR | BRA | Brazil |
| CA | CAN | Canada |
| CH | CHE | Switzerland |
| CL | CHL | Chile |
| CN | CHN | China |
| CO | COL | Colombia |
| CZ | CZE | Czech Republic |
| DE | DEU | Germany |
| DK | DNK | Denmark |
| EG | EGY | Egypt |
| ES | ESP | Spain |
| FI | FIN | Finland |
| FR | FRA | France |
| GB | GBR | United Kingdom |
| HK | HKG | Hong Kong |
| ID | IDN | Indonesia |
| IL | ISR | Israel |
| IN | IND | India |
| IT | ITA | Italy |
| JP | JPN | Japan |
| KE | KEN | Kenya |
| KW | KWT | Kuwait |
| MX | MEX | Mexico |
| MY | MYS | Malaysia |
| NG | NGA | Nigeria |
| NL | NLD | Netherlands |
| NO | NOR | Norway |
| NZ | NZL | New Zealand |
| PH | PHL | Philippines |
| PL | POL | Poland |
| QA | QAT | Qatar |
| SA | SAU | Saudi Arabia |
| SE | SWE | Sweden |
| SG | SGP | Singapore |
| TH | THA | Thailand |
| TR | TUR | Turkey |
| TW | TWN | Taiwan |
| US | USA | United States |
| VN | VNM | Vietnam |
| ZA | ZAF | South Africa |

---

## 7. 발견 이슈

| # | 이슈 | 심각도 |
|:-:|:----|:------|
| 1 | **`country_code` 마스터 테이블 미생성** — 스키마 문서에는 정의되어 있으나 실제 migration으로 생성되지 않음 | 🔴 High |
| 2 | **DB 국가코드 커버리지 17.1%** — UPS 배송 가능 269개국 중 46개국만 등록 | 🟡 Medium |
| 3 | **`nations` 테이블 데이터 0건** — 테이블은 존재하나 시드 데이터 미적용 | 🟡 Medium |
| 4 | **SHXK 비표준 코드 처리 방안 미정** — 27개 UPS 라우팅 코드를 DB에 포함할지 결정 필요 | 🟢 Low |

---

## 8. 원천 데이터

| 파일 | 설명 |
|:-----|:------|
| `Phase8_UPS_getcountry_전체국가목록.json` | SHXK `getcountry` API 원본 응답 (269건) |
| `Phase8_UPS_getcountry_전체국가목록.md` | 동 데이터 마크다운 변환 |
| `supabase/migrations/20260628000000_ups_seed_data.sql` | `zen_ups_zone_countries` 시드 데이터 (46건) |
| `docs/04_Database/archive/master_data.sql` | `nations` 테이블 시드 (7건, 미적용) |

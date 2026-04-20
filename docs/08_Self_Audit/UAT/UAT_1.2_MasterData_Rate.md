# UAT-1.2-RATE: 요율(Rates) 및 TISA 마스터 데이터 검증 시나리오

**작성일**: 2026-04-19
**작성자**: Antigravity (CEO Agent)
**검증 도메인**: 운송 요율(Freight Rates), 서비스 협약(TISA)

---

## 🏛️ 그룹 R: 요율 등록 및 관리 시나리오

### TC-R.1 ~ TC-R.4: 요율 체계 무결성
| ID | 시나리오 명 | 상세 내용 | 검증 방법 | 결과 |
|:---:|:---|:---|:---|:---:|
| **TC-R.1** | **표준 요율 등록** | 서비스 타입(AIR/SEA), 중량구간별 산출 요율을 시스템에 등록 | SQL-R01 / UI | |
| **TC-R.2** | **요율 버전 관리** | 기존 요율 수정 시 새로운 버전(v2) 생성 및 이력 보존 확인 | SQL-R02 / UI | |
| **TC-R.3** | **유효 기간 가드** | 적용 시작일(Effective Date) 이전 혹은 종료일 이후 요율 선택 차단 확인 | Logic Check | |
| **TC-R.4** | **환율 연동 검증** | 외화(USD) 요율 등록 시 기준 환율에 따른 원화 환산값 정합성 확인 | Calculation | |

---

## 🏛️ 그룹 T: TISA (Service Agreement) 연동 시나리오

### TC-T.1 ~ TC-T.2: 법인별 특약 요율
| ID | 시나리오 명 | 상세 내용 | 검증 방법 | 결과 |
|:---:|:---|:---|:---|:---:|
| **TC-T.1** | **TISA 특약 요율 적용** | 특정 법인(Corporate ID) 전용 할인 요율/할증료 등록 및 조회 확인 | SQL-T01 | |
| **TC-T.2** | **우선순위 가드** | 표준 요율보다 TISA 특약 요율이 우선적으로 적용되는지 확인 | Scenario Test | |

---

## 🔍 검증용 SQL 쿼리 (Evidence)

- **SQL-R01 (Standard Rate Check)**:
  `SELECT service_type, weight_break, rate_value, version FROM freight_rates WHERE is_current = true;`
- **SQL-R02 (History Version Check)**:
  `SELECT version, effective_from, status FROM freight_rates WHERE service_type = 'AIR' ORDER BY version DESC;`
- **SQL-T01 (Corporate Agreement Check)**:
  `SELECT org_id, discount_rate, agreement_no FROM tisa_agreements WHERE expiry_date > NOW();`

## 📊 테스트 결과 요약
*마스터 데이터 파트 2 (요율/TISA) 배포 후 수행 결과 기록 예정*

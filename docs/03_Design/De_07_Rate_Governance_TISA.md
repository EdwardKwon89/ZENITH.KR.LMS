# 디자인 정의서: 07. 요율 거버넌스 (TISA 아키텍처)

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** De-07
> **작성자:** Antigravity (ZEN CEO / AI Agent)
> **작성일:** 2026-04-18
> **버전:** v1.0

## 1. 개요 (Overview)
본 문서는 요율(Rate) 데이터의 이력 관리, 버전 제어 및 주문 시 정산 일관성을 확보하기 위한 **TISA(Temporal Invariant Snapshot Architecture)** 설계를 정의합니다.

## 2. 아키텍처 원칙 (TISA Principles)
1.  **Temporal Master (기간계 마스터)**: 모든 요율 마스터 데이터는 유효 시작/종료일(`valid_period`)을 가져야 하며, 시스템은 특정 시점에 유효한 요율을 자동으로 탐색합니다.
2.  **Invariant Transaction (불변 트랜잭션)**: 주문(Order) 시 적용된 요율 상세 정보는 주문 데이터와 함께 기록(Snapshot)되어, 이후 마스터 데이터가 변경되더라도 기존 주문의 정산 금액에 영향을 주지 않아야 합니다.
3.  **Governance Layers (거버넌스 레이어)**: 우선순위(`priority`)와 대상(`customer_id`) 필드를 통해 표준 요율, 프로모션, 고객 전용 요율 간의 충돌을 제어합니다.

## 3. 데이터 설계 (Data Design)

### 3.1 rate_cards 테이블 확장
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| version_no | INTEGER | 요율 버전 (신규 생성 시 +1) |
| valid_from | TIMESTAMPTZ | 유효 시작 일시 |
| valid_to | TIMESTAMPTZ | 유효 종료 일시 (9999-12-31: 무기한) |
| status | VARCHAR(20) | DRAFT, ACTIVE, EXPIRED, SUPERSEDED |
| priority | INTEGER | 우선순위 (높은 숫자가 우선) |
| customer_id | UUID | 특정 고객 전용 요율 (NULL이면 공용) |

### 3.2 제약 사항 (Constraints)
- **중첩 방지**: `EXCLUDE USING gist (carrier_id WITH =, origin_port WITH =, destination_port WITH =, service_type WITH =, customer_id WITH =, tstzrange(valid_from, valid_to) WITH &&)`
- **불변성**: `ACTIVE` 상태인 레코드는 어플리케이션 레벨에서 `UPDATE`가 금지되며, 오직 `SUPERSEDED` 전환만 허용됩니다.

## 4. 프로세스 흐름 (Process Flow)

### 4.1 요율 적용 시점 결정 로직
1.  오더 마스터에서 설정된 **기준 일자(Rate Date)**를 추출합니다. (기본값: Cargo Receipt Date)
2.  해당 일자가 `valid_from`과 `valid_to` 사이에 있는 `ACTIVE` 요율들을 검색합니다.
3.  매칭되는 요율 중 `priority`가 가장 높은 레코드를 선택합니다.
4.  동일 우선순위일 경우 `customer_id`가 매칭되는 것을 우선하며, 최종 중복 시 가장 최근 생성된 버전을 선택합니다.

## 5. 단계별 이행 계획 (Multi-Agent Division)
- **CTO (Worker)**: DB Schema Migration 및 EXCLUDE 제약 조건 적용
- **CPO (Worker)**: 버전 관리형 요율 등록/조회 UI 구현
- **CIO (Auditor)**: 요율 변경 이력 로그(`rate_card_logs`) 정합성 및 스냅샷 로직 검증

---
## 📝 개정 이력 (Revision History)
| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-18 | ZEN CEO | TISA 아키텍처 디자인 정의서 초안 작성 |

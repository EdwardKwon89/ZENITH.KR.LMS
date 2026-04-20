# An_07_Cargo_Rate_Market_Analysis_2026

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** An-07
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-17
> **버전:** v1.0

## 1. 개요 (Executive Summary)
2026년 현재 글로벌 물류 시장은 공급 과잉과 지정학적 불안정성이 공존하는 복잡한 양상을 보이고 있습니다. 본 보고서는 지능형 견적 엔진(Routing Engine) 설계를 위해 필수적인 항공 및 해상 화물 요율의 구조적 특징과 시장 동향을 분석합니다.

## 2. 항공 화물 요율 체계 (Air Freight Structure)

### 2.1 Slab Rate (Weight Break) 구조
항공 운송은 화물의 중량에 따라 단가가 계단식으로 낮아지는 **Weight Break** 방식을 표준으로 합니다.
- **Minimum (M)**: 소량 화물에 적용되는 최소 기본 요금.
- **Normal (N)**: 45kg 미만 화물 요율.
- **+45kg, +100kg, +300kg, +500kg, +1000kg**: 각 구간을 초과할 때마다 대폭 낮아지는 단가(Slab)가 적용됩니다.
- **Pivot Weight**: 특정 ULD(항공 컨테이너) 단위 사용 시 적용되는 고정 요율 기준 중량.

### 2.2 부대 비용 및 할증료
- **Fuel Surcharge (MY)**: 유가 변동에 따라 매월 1일/15일 갱신되는 유류할증료. (2026년 4월 기준 약 $0.61--$0.65/lb 수준)
- **Security Surcharge (SC)**: 항공 보안 검색료.
- **Transit Disruption Surcharge (TDS)**: 2026년 중동 정세 불안 등으로 인한 경로 우회 및 공급망 차단 시 부과되는 신규 할증료 항목.

## 3. 해상 화물 요율 체계 (Ocean Freight Structure)

### 3.1 운송 형태별 요율
- **LCL (Less than Container Load)**: CBM(부피) 단위 당 단가 적용. 최소 1 CBM 청구가 일반적.
- **FCL (Full Container Load)**: 컨테이너 크기(20ft, 40ft, 45ft)별 고정 요율 적용.

### 3.2 주요 변동성 요인
- **GRI (General Rate Increase)**: 선사가 기본 운임 인상을 일괄 적용하는 시기.
- **PSS (Peak Season Surcharge)**: 물동량이 몰리는 성수기(블랙프라이데이, 춘절 전후)에 부과되는 할증료.
- **Vessel Overcapacity**: 2026년 대형 선박 공급 과잉으로 인해 기본 운임은 하향 안정화 추세이나, 할증료를 통한 수익 보전 경향이 강함.

## 4. 지능형 라우팅 엔진을 위한 전략적 시사점

### 4.1 '최저가(Cheapest)' 산출 로직
- 단순 단가 비교가 아닌, **Total Landed Cost** 비교가 필수적입니다.
- 소량 화물의 경우 항공의 +45kg 요율이 해상의 LCL 최소 비용보다 저렴할 수 있는 '역전 구간'을 포착해야 합니다.

### 4.2 '최단기(Fastest)' 산출 로직
- 최근 TDS(운송 차단 할증료)가 부과되는 경로는 기간 변동성이 높습니다. 
- 직항(Direct) 여부와 해당 스케줄의 실제 정시 도착률(Schedule Reliability) 데이터를 가중치로 활용해야 합니다.

### 4.3 데이터 모델링 제안
- `zen_rate_tiers` 테이블에 기본 단가 외에 '예상 부대 비용 합계' 또는 '유류할증료 인덱스'를 연동하여 실시간성을 확보해야 합니다.

---
**Audit Note**: 본 분석 보고서의 내용은 WBS 3.3.2(라우팅 알고리즘 설계)의 기초 데이터로 활용됩니다.

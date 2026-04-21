# [Spec] 오더 시스템 v2: 계층형 패킹 및 실무 최적화 아키텍처

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서 상태:** CONFIRMED (Approved by CEO)
> **작성일:** 2026-04-21
> **버전:** v2.0

## 1. 개요 및 배경
기존의 평면형 오더 구조(Header-Items)는 실제 물류 현장에서 발생하는 **패킹(Box/Pallet)** 단위의 중량/부피 관리 및 아이템 적입 로직을 수용할 수 없었습니다. 이에 실무 전문가용 **계층형 아키텍처**를 도입하여 데이터의 엄밀성과 사용 편의성을 확보합니다.

## 2. 데이터 모델 설계 (Hierarchy)

### 2.1 Order Header (zen_orders)
- **추가 필드**:
    - `recipient_name`: 수취인 성함 (필수)
    - `recipient_address`: 배송지 주소 (필수)
    - `recipient_phone`: 수취인 연락처 (필수, 기존 contact와 별도 관리 권장)
    - `recipient_zipcode`: 우편번호 (권장)

### 2.2 Order Package (zen_order_packages) - [NEW]
하나의 오더는 여러 개의 패킹 단위를 가질 수 있습니다.
- **Fields**:
    - `id`: UUID (Primary Key)
    - `order_id`: UUID (Foreign Key)
    - `packing_unit`: 코드성 정보 (BOX, PLT, CRT, WOOD, BAG 등)
    - `packing_count`: 수량 (예: 동일 규격 박스 5개)
    - `length`, `width`, `height`: 치수 (cm 단위)
    - `gross_weight`: 총 중량 (kg)
    - `volume`: 부피 (CBM, LWH 기반 자동 계산 혹은 수동 입력)

### 2.3 Order Item (zen_order_items)
각 패킹 단위에 포함되는 상세 품목입니다.
- **Fields**:
    - `package_id`: UUID (Foreign Key, 패킹 소속)
    - `item_name`: 품목명
    - `quantity`: 수량
    - `hs_code`: HS Code (B2C 선택, B2B 필수 권장)
    - `item_packing_unit`: 품목 상세 단위 (EA, SET, BOX 등)

## 3. UI/UX 디자인 가이드라인 (Extreme Compact)

### 3.1 비즈니스 로직 최적화
- **개인 화주 표시**: `SYSTEM_INDIVIDUAL_SHIPPER` 노출을 전면 금지하고 **"개인 고객"**으로 텍스트 고정.
- **배송 정보 입력**: 수취인명, 주소, 연락처를 최상단에 배치하여 신뢰성 확보.

### 3.2 패킹-아이템 중첩 UI
- **계층형 리스트**: 패킹 섹션을 카드 형태로 제공하고, 내부에서 아이템을 리스트/테이블 형태로 관리.
- **자동 계산 엔진**: 
    - L, W, H 입력 시 실시간 CBM 환산 (L * W * H / 1,000,000).
    - Chargeable Weight 산출 로직 준비.

## 4. 검증 및 품질 관리
- **회귀 테스트**: 기존 15개 테스트 케이스를 새로운 계층 구조(JSON nested structure)에 맞게 마이그레이션하여 품질 하락 방지.
- **예외 처리**: HS Code 미입력 시 B2C의 경우 경고 없이 통과, B2B의 경우 경고창 노출.

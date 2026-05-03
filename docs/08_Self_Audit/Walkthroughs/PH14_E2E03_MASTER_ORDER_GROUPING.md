# E2E-03 Walkthrough: Master Order Grouping & Warehouse Inbound

> **Task ID**: PH14-E2E-03
> **Date**: 2026-05-03
> **Auditor**: Aiden

## 1. 개요
E2E-03 시나리오는 다수의 하우스 오더(House Order)를 하나의 마스터 오더(Master Order)로 그룹핑하고, 창고 입고 처리 및 바코드 스캔을 통한 상태 전환 과정을 검증합니다.

## 2. 테스트 환경 및 사전 조건
- **대상 하우스 오더**: `Z-HOU-E2E03-01` 외 다수
- **사용자 역할**: Admin / Operator
- **로케일**: `/ko/`
- **보안 설정**: `zen_orders` UPDATE RLS 정책 적용 완료 (Role-based)

## 3. 검증 단계 및 결과

### Step 1: 오더 목록 확인 및 그룹핑 대상 선택
관리자 화면에서 '입고 대기' 상태의 오더들을 확인하고 마스터 오더 생성을 위해 선택합니다.
- **URL**: `/ko/admin/orders`
- **캡처**: `docs/99_Manual/E2E_03_Result/e2e_03_master_orders_pending_list.png`

### Step 2: 마스터 오더 그룹핑 실행
선택된 오더들을 신규 마스터 오더에 할당합니다.
- **결과**: `master_order_id`가 정상적으로 부여되고, 오더 상태가 `MASTERED`로 전환됨.

### Step 3: 창고 입고 및 바코드 스캔
창고 관리 화면에서 마스터 오더 또는 하우스 오더의 바코드를 스캔하여 입고 처리를 완료합니다.
- **URL**: `/ko/inventory`
- **캡처**: `docs/99_Manual/E2E_03_Result/e2e_03_after_click.png`
- **검증**: 오더 상태가 `WAREHOUSED`로 변경되고 트래킹 이벤트 자동 생성.

### Step 4: 출고(Outbound) 바코드 스캔 처리 [NEW]
창고 관리 화면에서 출고 모드로 전환 후 바코드를 스캔하여 운송 단계로 전이시킵니다.
- **URL**: `/ko/inventory`
- **결과**: 오더 상태가 `IN_TRANSIT`으로 변경됨 확인.
- **캡처**: `docs/99_Manual/E2E_03_Result/e2e_03_04_outbound_success.png`

## 4. 증적 자료 (Artifacts)

| 단계 | 설명 | 이미지 링크 |
|:---:|:---|:---|
| 1 | 마스터 오더 목록 (전) | [e2e_03_master_orders_list_before.png](../../99_Manual/E2E_03_Result/e2e_03_master_orders_list_before.png) |
| 2 | 입고 대기 오더 선택 | [e2e_03_master_orders_pending_list.png](../../99_Manual/E2E_03_Result/e2e_03_master_orders_pending_list.png) |
| 3 | 입고 처리 후 상태 | [e2e_03_after_click.png](../../99_Manual/E2E_03_Result/e2e_03_after_click.png) |
| 4 | 출고 스캔 성공 (DoD) | [e2e_03_04_outbound_success.png](../../99_Manual/E2E_03_Result/e2e_03_04_outbound_success.png) |

## 5. 자가 검증 결과
- **RLS 보안 강화**: ✅ (SAR-007 조치 완료, `authenticated` 전역 권한 제거 후 Role 기반 엄격 적용)
- **회귀 테스트**: ✅ (REGRESSION_TEST_MAP v14.3 기준 163/163 PASS)
- **데이터 정합성**: ✅ (마스터-하우스 간의 1:N 관계 및 상태 동기화 확인)

---
**보고자**: Riley (Gemini)

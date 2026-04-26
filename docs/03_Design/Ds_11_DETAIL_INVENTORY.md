# Ds-11 API 상세 명세 — INVENTORY (재고 관리)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

---

## 10. 인벤토리 관리 (Inventory Management)

### 10.1 getInventoryList (Action)

- **설명**: 조직별 SKU 기반 재고 현황 목록 조회
- **권한**: User
- **파라미터**:
  - `page`: (number, default: 1)
  - `pageSize`: (number)
  - `search`: (string, optional) SKU 코드 또는 품목명 검색
  - `lowStockOnly`: (boolean, optional) 안전 재고 미달 품목만 필터링
- **응답**: `{ items: Array<Inventory>, totalCount: number }`

### 10.2 getInventoryHistory (Action)

- **설명**: 특정 재고 품목의 상세 변동 이력(원장) 조회
- **권한**: User
- **파라미터**: `inventoryId` (uuid)
- **응답**: `Array<InventoryHistory>`

### 10.3 adjustInventory (Action)

- **설명**: 관리자에 의한 수동 재고 조정 및 사유 기록
- **권한**: Admin
- **파라미터**:
  - `inventoryId`: (uuid)
  - `adjustmentQty`: (number) 증감분 (+/-)
  - `reason`: (string) 조정 사유
- **응답**: `{ success: true, finalQty: number }`

### 10.4 syncInventoryFromOrder (Internal)

- **설명**: 오더 상태 변경 트리거에 의한 재고 자동 처리
- **권한**: System
- **프로세스**:
  - `REGISTERED`: `reserved_qty` 증가
  - `RELEASED`: `on_hand_qty` 차감 및 `reserved_qty` 차감
  - `CANCELLED`: `reserved_qty` 차감
  - `UPDATED`: 수정 전후 차이만큼 `reserved_qty` 가감
- **응답**: `void`

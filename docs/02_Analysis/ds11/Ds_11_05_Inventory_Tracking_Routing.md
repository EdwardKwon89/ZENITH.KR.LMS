## 5. 인벤토리 관리 (Inventory Management)
조직별 SKU 기반 재고 현황 및 변동 이력을 관리합니다.
- **Path**: `src/app/actions/inventory.ts`

### getInventoryList(filters)
- **설명**: 조직별 재고 현황 목록 조회 (Pagination, 검색, 저재고 필터 지원)
- **Input**: `{ page?, pageSize?, search?, lowStockOnly? }`
- **Output**: `Promise<{ items: Inventory[], totalCount: number }>`

### getInventoryStats()
- **설명**: [NEW] 대시보드용 재고 통계 요약 (전체 SKU, 저재고 품목 수, 품절 품목 수 등)
- **Output**: `Promise<{ totalSku: number, lowStockCount: number, outOfStockCount: number }>`

### getInventoryHistory(inventoryId)
- **설명**: 특정 품목의 상세 입출고/조정 이력 조회
- **Output**: `Promise<InventoryHistory[]>`

### upsertInventoryItem(payload)
- **설명**: [NEW] SKU 기반 재고 품목 생성 또는 정보(최소 재고 수량 등) 수정
- **Input**: `Partial<Inventory> & { sku_code: string }`

### adjustInventory(payload)
- **설명**: 관리자에 의한 수동 재고 수량 조정 (조정 사유 필수)
- **Input**: `{ inventoryId, adjustmentQty, reason }`
- **Validation**: `adjustmentQty`가 음수일 경우 현재고보다 클 수 없음

### syncInventoryFromOrder(orderId, status, itemDiff?)
- **설명**: [Internal] 오더 상태 변화에 따른 재고 자동 동기화 (예약/출고/취소/수정)

---

## 6. 실시간 트래킹 (Tracking)
화물의 이동 경로 및 상태 변경 이벤트를 관리합니다.
- **Path**: `src/app/actions/tracking.ts`

### getTrackingEvents(orderId)
- **설명**: 특정 오더의 전체 트래킹 히스토리 조회
- **Output**: `Promise<TrackingEvent[]>`

### addTrackingEvent(orderId, payload)
- **설명**: [Admin] 신규 트래킹 이벤트 수동 등록 (또는 Webhook 연동)
- **Input**: `orderId`, `{ event_code, location, description, event_time? }`

### updateTrackingConfig(orderId, providerType, providerName?)
- **설명**: [Admin] 오더의 트래킹 Provider 설정을 변경 (VIRTUAL, MANUAL, API)

### syncExternalTracking()
- **설명**: [Admin/System] API 공급자가 설정된 모든 활성 트래킹 데이터를 일괄 동기화
- **Process**: `TrackingManager.getTrackingData` 호출 및 오더 상태 자동 동기화

### refreshTrackingData(orderId)
- **설명**: 특정 오더의 트래킹 데이터를 강제로 외부 API와 동기화
- **Input**: `orderId`
- **Output**: `Promise<{ success: boolean, count?: number, error?: string }>`

### getTrackingRawLogs(orderId)
- **설명**: [Admin] 문제 발생 시 디버깅을 위한 원본(Raw JSON) 응답 내역 조회
- **Output**: `Promise<RawLog[]>`

### getGlobalTrackingOverview()
- **설명**: 대시보드용 전체 트래킹 현황 요약 조회 (최신 이벤트 포함)
- **Output**: `Promise<TrackingOverview[]>`

---


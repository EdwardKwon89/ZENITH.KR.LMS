# Ds-11 API 상세 명세서 ↔ 코드 불일치 기록 (Server Action 함수 단위)

> **문서 성격**: 현황 기록(스냅샷). 원인·보완은 DEF-145 / IMP-183 참조
> **작성**: Aiden (Claude) | **작성일**: 2026-11-13 | **기준**: `develop` HEAD `45225568a`
> **대상 명세**: `docs/02_Analysis/Ds_11_API_상세_명세서.md` (v2.1 Sync, 마지막 수정 2026-07-15) 및 `docs/03_Design/Ds_10_API_INVENTORY.md` (마지막 수정 2026-04-22)

## 1. 요약

| 항목 | 값 |
|:--|:--|
| 대상 함수 | `src/app/actions/**` 의 `use server` 파일 54개, export 액션 함수 **298개** |
| Ds-11에 이름이 나오는 함수 | **92개 (30%)** |
| Ds-11에 이름이 없는 함수 | **206개 (69%)** — 4장에 전체 목록 |
| Ds-10 인벤토리에 이름이 나오는 함수 | 37개 (12%) |
| 둘 중 하나라도 나오는 함수 | 96개 (32%) |
| 2026-07-16 이후 추가된 파일의 함수 | 20개 중 Ds-11 언급 **0개** |
| 2026-07-15 이후 `src/app/actions` 변경 커밋 / 같은 기간 Ds-11 수정 커밋 | 153건 / 0건 |

## 2. 방법과 한계

- **방법**: `src/app/actions/**/*.ts` 중 `"use server"`를 포함한 파일에서 `export (async) function NAME` 및 `export const NAME = async|withAction` 패턴으로 함수명을 추출하고, Ds-11·Ds-10 본문에 `\bNAME\b`가 한 번이라도 나오는지 대조했다(테스트·`.d.ts` 제외).
- **한계 ①** 이름이 나온다는 것과 시그니처·응답·권한 서술이 정확하다는 것은 다르다. 언급된 함수의 **내용 정확성은 검증하지 않았다**.
- **한계 ②** 문서가 함수명 없이 그룹 서술하거나 이름을 바꿔 적은 경우는 "미언급"으로 잡힌다(과대 집계 가능).
- **한계 ③** 정규식이 다른 export 형태(`export default`, 래퍼 변형)를 놓칠 수 있어 함수 수는 근사치다. RPC(Supabase 함수)·`src/lib`·API 라우트는 대상이 아니다.
- **한계 ④** 파일 경로 재편으로 git의 '최초 추가일'이 신뢰되지 않아, 문서 동기화 선언일(2026-04-27) 대비 **얼마나 벌어졌는지는 분리하지 못했다**.

## 3. 디렉토리별 현황

| 디렉토리 | 함수 수 | Ds-11 언급 | 미언급 |
|:--|:-:|:-:|:-:|
| admin | 81 | 18 | 63 |
| agency | 11 | 3 | 8 |
| finance | 39 | 10 | 29 |
| misc | 41 | 22 | 19 |
| operations | 83 | 22 | 61 |
| ups | 43 | 17 | 26 |

## 4. 2026-07-16 이후 추가된 함수 (전부 Ds-11 미언급)

| 파일 | 함수 |
|:--|:--|
| admin/exchange-rates.ts | `listExchangeRates` |
| admin/exchange-rates.ts | `setManualExchangeRate` |
| admin/exchange-rates.ts | `getExchangeRateSyncStatus` |
| finance/daily-billing.ts | `getShipperDailyBillingSummary` |
| finance/daily-billing.ts | `getShipperDailyOrdersDetails` |
| finance/daily-billing.ts | `finalizeDailyShipperInvoices` |
| finance/order-revenue-cost.ts | `getOrderRevenueCost` |
| finance/order-revenue-cost.ts | `getOrderRevenueCostList` |
| finance/order-revenue-cost.ts | `getSubAgencyProfitSummary` |
| finance/shipper-invoices.ts | `getShipperInvoices` |
| finance/ups-actual-charges.ts | `recordUpsActualCharges` |
| finance/ups-actual-charges.ts | `getUpsActualCharges` |
| finance/ups-actual-charges.ts | `getUpsChargeReconciliation` |
| finance/ups-actual-charges.ts | `searchDeliveredUpsOrders` |
| finance/ups-actual-cost.ts | `getOrderReleasedDate` |
| finance/ups-actual-cost.ts | `getUpsActualCost` |
| finance/ups-actual-cost.ts | `recordUpsActualCost` |
| finance/ups-actual-cost.ts | `previewUpsActualCost` |
| finance/ups-actual-cost.ts | `recordActualCostAndFinalize` |
| operations/bulk-orders.ts | `bulkCreateOrders` |

## 5. Ds-11에 이름이 없는 함수 전체 목록 (206개)

> 우선 검토 권장 영역: 금전·외부 연동·권한과 직접 관련된 `finance/`, `ups/`, `shxk` 연동 액션 (231 §4.9 위험 기준 참조).


### admin/

- `auth.ts` : `changePassword`
- `auth.ts` : `changePasswordWithReauth`
- `auth.ts` : `findCorporateId`
- `auth.ts` : `findPersonalId`
- `auth.ts` : `getUserSession`
- `auth.ts` : `sendPasswordReset`
- `corporate.ts` : `createDepartment`
- `corporate.ts` : `deleteDepartment`
- `corporate.ts` : `getDepartments`
- `corporate.ts` : `getOrganizationInfo`
- `corporate.ts` : `updateDepartment`
- `corporate.ts` : `updateOrganizationInfo`
- `customs-rates.ts` : `createCustomsRate`
- `customs-rates.ts` : `deleteCustomsRate`
- `customs-rates.ts` : `getCustomsRates`
- `customs-rates.ts` : `updateCustomsRate`
- `delivery-rates.ts` : `createDeliveryRate`
- `delivery-rates.ts` : `deleteDeliveryRate`
- `delivery-rates.ts` : `getDeliveryRates`
- `delivery-rates.ts` : `updateDeliveryRate`
- `exchange-rates.ts` : `getExchangeRateSyncStatus` *(7/16 이후 신규)*
- `exchange-rates.ts` : `listExchangeRates` *(7/16 이후 신규)*
- `exchange-rates.ts` : `setManualExchangeRate` *(7/16 이후 신규)*
- `master-data.ts` : `getCommonCodes`
- `master.ts` : `generateMasterOrderNo`
- `master.ts` : `generateOrderNo`
- `master.ts` : `getCodeGroups`
- `master.ts` : `getCommonCodes`
- `master.ts` : `getSystemParams`
- `master.ts` : `updateSystemParam`
- `member.ts` : `changeMemberGrade`
- `member.ts` : `changeMemberStatus`
- `member.ts` : `getGradeMaster`
- `member.ts` : `getGradePromotionRequests`
- `member.ts` : `getMyPendingPromotionRequest`
- `member.ts` : `getMyProfile`
- `member.ts` : `listMembers`
- `member.ts` : `requestGradePromotion`
- `member.ts` : `reviewGradePromotion`
- `member.ts` : `updateMyProfile`
- `member.ts` : `withdrawUser`
- `organization.ts` : `approveOrganization`
- `organization.ts` : `createOrganization`
- `organization.ts` : `getDocumentSignedUrl`
- `organization.ts` : `getOrganizationsAdmin`
- `organization.ts` : `rejectOrganization`
- `organization.ts` : `requestOrganizationSupplement`
- `organization.ts` : `updateOrganization`
- `rate-cards.ts` : `createRateCard`
- `rate-cards.ts` : `deleteRateCard`
- `rate-cards.ts` : `getRateCards`
- `rate-cards.ts` : `updateRateCard`
- `rates.ts` : `createRateCard`
- `rates.ts` : `deleteRateCard`
- `rates.ts` : `getRateCards`
- `rates.ts` : `updateRateCard`
- `rbac.ts` : `updateRolePermissions`
- `surcharges.ts` : `createSurcharge`
- `surcharges.ts` : `deleteSurcharge`
- `surcharges.ts` : `getSurcharges`
- `surcharges.ts` : `updateSurcharge`
- `transport-policies.ts` : `getTransportPolicies`
- `transport-policies.ts` : `updateTransportPolicy`

### agency/

- `shipper-link.ts` : `getAgencyOrgIdByShipper`
- `shippers.ts` : `createAgencyShipper`
- `shippers.ts` : `getAgencyShipperById`
- `shippers.ts` : `getAgencyShippers`
- `shippers.ts` : `updateAgencyShipper`
- `shippers.ts` : `updateAgencyShipperGrade`
- `zone-discounts.ts` : `getShipperZoneDiscounts`
- `zone-discounts.ts` : `upsertShipperZoneDiscounts`

### finance/

- `daily-billing.ts` : `finalizeDailyShipperInvoices` *(7/16 이후 신규)*
- `daily-billing.ts` : `getShipperDailyBillingSummary` *(7/16 이후 신규)*
- `daily-billing.ts` : `getShipperDailyOrdersDetails` *(7/16 이후 신규)*
- `invoice-files.ts` : `generateInvoicePdf`
- `invoice.ts` : `generateInvoiceAction`
- `invoice.ts` : `getInvoicePdfHistory`
- `invoice.ts` : `getTaxInvoiceHistory`
- `invoice.ts` : `issueInvoicePdf`
- `invoice.ts` : `issueTaxInvoice`
- `invoice.ts` : `sendTaxInvoiceEmail`
- `order-revenue-cost.ts` : `getOrderRevenueCost` *(7/16 이후 신규)*
- `order-revenue-cost.ts` : `getOrderRevenueCostList` *(7/16 이후 신규)*
- `order-revenue-cost.ts` : `getSubAgencyProfitSummary` *(7/16 이후 신규)*
- `settlement.ts` : `addManualOrderCost`
- `settlement.ts` : `calculateSettlementAction`
- `settlement.ts` : `createPostFinalizationAdjustment`
- `settlement.ts` : `finalizeInvoice`
- `settlement.ts` : `getWeeklyRevenueChart`
- `settlement.ts` : `rejectInvoice`
- `shipper-invoices.ts` : `getShipperInvoices` *(7/16 이후 신규)*
- `ups-actual-charges.ts` : `getUpsActualCharges` *(7/16 이후 신규)*
- `ups-actual-charges.ts` : `getUpsChargeReconciliation` *(7/16 이후 신규)*
- `ups-actual-charges.ts` : `recordUpsActualCharges` *(7/16 이후 신규)*
- `ups-actual-charges.ts` : `searchDeliveredUpsOrders` *(7/16 이후 신규)*
- `ups-actual-cost.ts` : `getOrderReleasedDate` *(7/16 이후 신규)*
- `ups-actual-cost.ts` : `getUpsActualCost` *(7/16 이후 신규)*
- `ups-actual-cost.ts` : `previewUpsActualCost` *(7/16 이후 신규)*
- `ups-actual-cost.ts` : `recordActualCostAndFinalize` *(7/16 이후 신규)*
- `ups-actual-cost.ts` : `recordUpsActualCost` *(7/16 이후 신규)*

### misc/

- `claims.ts` : `addIncidentFee`
- `claims.ts` : `deleteClaim`
- `claims.ts` : `getClaimDetails`
- `customs.ts` : `createDeclaration`
- `customs.ts` : `getDeclarations`
- `customs.ts` : `submitDeclaration`
- `customs.ts` : `updateDeclarationStatus`
- `dashboard.ts` : `getDashboardStats`
- `notifications.ts` : `getNotifications`
- `notifications.ts` : `markAllNotificationsRead`
- `notifications.ts` : `markNotificationRead`
- `notifications.ts` : `sendInAppNotification`
- `notifications.ts` : `triggerStatusChangeNotification`
- `voc.ts` : `answerVoc`
- `voc.ts` : `createVoc`
- `voc.ts` : `getVocDetail`
- `voc.ts` : `getVocList`
- `voc.ts` : `updateVocStatus`
- `wallet.ts` : `getWalletTransactions`

### operations/

- `address-book.ts` : `createAddressBookEntry`
- `address-book.ts` : `deleteAddressBookEntry`
- `address-book.ts` : `getAddressBookEntries`
- `address-book.ts` : `updateAddressBookEntry`
- `assigned-orders.ts` : `getAssignedOrders`
- `bulk-orders.ts` : `bulkCreateOrders` *(7/16 이후 신규)*
- `order-services.ts` : `createOrderServices`
- `order-services.ts` : `getOrderServices`
- `order-services.ts` : `updateOrderServiceStatus`
- `orders.ts` : `applyPackageMeasurements`
- `orders.ts` : `attachOperatorNames`
- `orders.ts` : `confirmInbound`
- `orders.ts` : `getHeldPreviousStatus`
- `orders.ts` : `getOrderByBarcodeOrNo`
- `orders.ts` : `getOrderEditHistory`
- `orders.ts` : `getPendingHouseOrders`
- `orders.ts` : `getTodayInboundHistory`
- `orders.ts` : `saveInboundMeasurements`
- `orders.ts` : `saveOrderRateSnapshot`
- `orders.ts` : `updateMasterOrderStatus`
- `orders.ts` : `updateOrder`
- `routing.ts` : `getRouteConsistencyStatus`
- `routing.ts` : `getRouteOptions`
- `routing.ts` : `getRouteVisualization`
- `routing.ts` : `selectRoute`
- `service-rates.ts` : `getAvailableServiceRates`
- `service-rates.ts` : `getBaseCurrency`
- `service-rates.ts` : `getUsdKrwRate`
- `tisa.ts` : `getOrderRateSnapshot`
- `tracking.ts` : `checkRealtimeUpsTrackingAction`
- `tracking.ts` : `getUpsTrackingEvents`
- `tracking.ts` : `manuallySetOrderDeliveredAction`
- `ups-labels.ts` : `cancelUpsRegistration`
- `ups-labels.ts` : `downloadAndStoreLabelDoc`
- `ups-labels.ts` : `fetchAndIssueUpsLabel`
- `ups-labels.ts` : `fetchShxkTradeDocument`
- `ups-labels.ts` : `getUpsLabelStatus`
- `ups-labels.ts` : `issueUpsLabel`
- `ups-labels.ts` : `previewShxkPayload`
- `ups-labels.ts` : `registerUpsOrder`
- `ups-labels.ts` : `resolveShxkCode`
- `ups-labels.ts` : `triggerCreateOrderTest`
- `ups-labels.ts` : `voidUpsLabel`
- `warehouse.ts` : `cancelInbound`
- `warehouse.ts` : `cancelPickup`
- `warehouse.ts` : `confirmDeparture`
- `warehouse.ts` : `confirmOutbound`
- `warehouse.ts` : `confirmPickup`
- `warehouse.ts` : `confirmUpsRegistration`
- `warehouse.ts` : `getLatestUpsLabelErrors`
- `warehouse.ts` : `getPackedOrders`
- `warehouse.ts` : `getPickupOrders`
- `warehouse.ts` : `getReleasedOrders`
- `warehouse.ts` : `getTodayDepartureHistory`
- `warehouse.ts` : `getTodayPickupHistory`
- `warehouse.ts` : `getTodayReleasedOrders`
- `warehouse.ts` : `getTodayUpsHistory`
- `warehouse.ts` : `getWarehousedOrders`
- `warehouse.ts` : `undoDeparture`
- `warehouse.ts` : `undoOutbound`
- `warehouse.ts` : `undoUpsRegistration`

### ups/

- `pricing-schedule.ts` : `cancelPricingSchedule`
- `pricing-schedule.ts` : `createPricingSchedule`
- `pricing-schedule.ts` : `getPricingAuditLog`
- `pricing-schedule.ts` : `getScheduledPricingChanges`
- `pricing-schedule.ts` : `updatePricingSchedule`
- `rates-mutation.ts` : `deleteUpsFreightMinimum`
- `rates-mutation.ts` : `deleteUpsWeightTierRate`
- `rates-mutation.ts` : `getAgencyPricingPolicies`
- `rates-mutation.ts` : `updateAgencyVolumetricDivisor`
- `rates-mutation.ts` : `upsertAgencyCostRate`
- `rates-mutation.ts` : `upsertUpsFreightMinimum`
- `rates-mutation.ts` : `upsertUpsWeightTierRate`
- `rates-public.ts` : `getPublicBaseRates`
- `rates-public.ts` : `getPublicFreightMinimums`
- `rates-public.ts` : `getPublicFuelSurcharges`
- `rates-public.ts` : `getPublicOtherCharges`
- `rates-public.ts` : `getPublicSurgeFees`
- `rates-public.ts` : `getPublicWeightTierRates`
- `rates.ts` : `getUpsBaseRates`
- `rates.ts` : `getUpsFreightMinimums`
- `rates.ts` : `getUpsFuelSurcharge`
- `rates.ts` : `getUpsOtherCharges`
- `rates.ts` : `getUpsProducts`
- `rates.ts` : `getUpsSurgeFees`
- `rates.ts` : `getUpsWeightTierRates`
- `rates.ts` : `getUpsZones`

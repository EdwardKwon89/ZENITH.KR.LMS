## 4. 정산 및 재무 (Finance & Settlement)
비용 계산, 청구서 발행 및 결제 상태를 관리합니다.
- **Path**: `src/app/actions/finance.ts`

### generateInvoicesForOrder(orderId)
- **Path**: `src/app/actions/finance/settlement.ts`
- **설명**: 오더 완료(RELEASED) 시 RPC를 호출하여 비용 산출 후 청구서 자동 생성. **TASK-B-381 PR-3(#1459)부터 UPS 오더는 서버에서 거부**합니다(`logger.warn` + `ups_invoice_blocked`) — UPS는 `finalizeUpsSettlement` 경로만 사용합니다. 비UPS 동작 불변.
- **RPC Link**: `calculate_order_costs`
- **오류**: UPS 오더(`ups_invoice_blocked`), 오더 가드 조회 실패(`generic{ORDER_LOOKUP}`)

### updatePaymentStatus(invoiceId, status, paidAmount)
- **설명**: 입금 확인 처리 및 연결된 오더의 빌링 상태 동기화
- **Business Logic**: 결제 완료(PAID) 시 원본 오더의 `billing_status`를 'PAID'로 자동 전환

### getSettlementOverview()
- **설명**: 대시보드 및 정산 리스트용 통계 데이터(미결제 합계, 최근 인보이스 등) 조회
- **Output**: `Promise<SettlementSummary>`

### getRevenueReport(filters)
- **설명**: [NEW] 필터 조건(기간, 운송모드, 화주)에 따른 수입 현황 리스트 및 요약 조회
- **Input**: `{ startDate, endDate, transMode?, shipperId? }`
- **Output**: `Promise<{ items: Invoice[], summary: { totalRevenue, count, avgRevenue } }>`

### getCostReport(filters)
- **설명**: [NEW] 필터 조건(기간, 서비스유형)에 따른 비용 현황 리스트 및 요약 조회
- **Input**: `{ startDate, endDate, serviceType? }`
- **Output**: `Promise<{ items: OrderCost[], summary: { totalCost } }>`

### getTransportCosts() / upsertTransportCost(payload) / deleteTransportCost(id)
- **설명**: [NEW] 운송 모드별/구간별 원가(Cost) 마스터 정보 관리 (Admin 전용)
- **Output**: `Promise<TransportCostMaster[]>`

### 4.1 인보이스·세금계산서 발행 및 이력 (`src/app/actions/finance/invoice.ts` — TASK-1162 / Issue #1354)

#### generateInvoiceAction(orderId)
- **Path**: `src/app/actions/finance/invoice.ts:21-33`
- **설명**: 오더(`orderId`)에 대해 `InvoiceGenerator.generateInvoice()`를 호출하여 인보이스를 생성합니다. **TASK-B-381 PR-3부터 UPS 오더는 공통 진입점(`InvoiceGenerator`)에서 거부**되어 `{ success:false, message:ups_invoice_blocked }`가 반환됩니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:22`, 플랫폼 `ADMIN`·`ZENITH_SUPER_ADMIN` 또는 `/admin` 접근 권한 보유 역할만 허용)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<{ success: boolean; invoice?: Invoice; message?: string }>` (`invoice.ts:29, 32`)
- **오류**: 미인증/권한 불충족 시 `validateAdminAction()`에서 `redirect('/login')` 또는 `Error("Profile not found")` / `Error("Unauthorized access")` throw (`guards.ts:79-113`); 생성 실패 시 `generator.generateInvoice(orderId)`의 `{ success: false, message }` 반환 (`invoice.ts:32`). UPS 오더는 `ups_invoice_blocked`.

#### `InvoiceGenerator.generateInvoice(orderId)` — 내부 공통 진입점 (서버 액션 아님)
- **Path**: `src/lib/finance/settlement/invoice-generator.ts`
- **설명**: `generateInvoicesForOrder`·`generateInvoiceAction`·`rejectInvoice(재발행)`가 모두 이 함수를 호출합니다. **TASK-B-381 PR-3부터 진입부에서 `zen_orders.transport_mode`를 조회해 UPS면 `logger.warn` + `ups_invoice_blocked`로 거부**합니다(조회 실패는 `logger.error` + `generic{ORDER_LOOKUP}` fail-closed).
- **출력**: `{ success:false, message }` — 기존 생성 실패와 동일 계약
- **부수효과**: `result.success`일 때 `revalidatePath(\`/orders/\${orderId}\`)` 및 `revalidatePath('/finance/invoices')` (`invoice.ts:26-28`)

#### issueInvoicePdf(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:35-107`
- **설명**: 인보이스(`invoiceId`) 정보를 기반으로 PDF 버퍼(`generateInvoicePdfBuffer`)를 생성해 Supabase Storage(`invoices` 버킷)에 업로드하고 발행 이력(`zen_invoice_pdf_history`)을 저장합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:36-37`, 플랫폼 관리자급 권한 필수)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<{ success: true; filePath: string }>` (`invoice.ts:106`)
- **오류**: 프로필 부재 시 `Error(await trError('profile_not_found'))` throw (`L37`); 인보이스 미존재/조회 실패 시 `logger.error` 후 `Error(await trError('invoice_not_found'))` throw (`L42-45`); Storage 업로드 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_PDF_UPLOAD' }))` throw (`L83-86`); 이력 저장 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_HISTORY_SAVE' }))` throw (`L100-103`)
- **부수효과**: Supabase Storage `invoices` 버킷에 `${uuid}.pdf` 업로드(`L75-81`), `zen_invoice_pdf_history` 버전(`count + 1`) 행 INSERT(`L88-98`), `revalidatePath('/finance/invoices')` (`L105`)

#### getInvoicePdfHistory(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:109-132`
- **설명**: 인보이스(`invoiceId`)의 PDF 발행 이력 목록을 조회하고 각 파일의 1시간(3,600초) 유효 다운로드 서명 URL(`download_url`)을 생성해 반환합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/invoice.ts:110`, 목표: 인보이스 접근 권한 정렬 대상 — `DEF-150` 참조)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<Array<Record<string, unknown> & { download_url?: string }>>` (`invoice.ts:120-131`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; 이력 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_HISTORY_LOOKUP' }))` throw (`invoice.ts:115-118`)

#### issueTaxInvoice(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:134-224`
- **설명**: 인보이스(`invoiceId`)를 기반으로 부가세율(`VAT_RATE` 파라미터, 기본 `0.1`) 및 환율(`applied_exchange_rate` 또는 당일 USD/KRW 환율)을 적용해 세금계산서(`zen_tax_invoices`, 번호 `TX-YYYYMMDD-NNNN`, 상태 `'ISSUED'`)를 생성합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:135-136`, 플랫폼 관리자급 권한 필수)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<{ success: true; taxInvoiceId: string }>` (`invoice.ts:223`)
- **오류**: 프로필 부재 시 `Error(await trError('profile_not_found'))` throw (`L136`); 인보이스 미존재 시 `logger.error` 후 `Error(await trError('invoice_not_found'))` throw (`L141-145`); 세금계산서 INSERT 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'TAX_INVOICE_CREATE' }))` throw (`L205-209`)
- **부수효과**: `zen_tax_invoices` 행 INSERT(`L184-203`), 비동기 best-effort로 `zen_invoice_history`에 `next_status: 'TAX_INVOICE_ISSUED'` 감사 이력 INSERT(실패 시 `logger.error`, `L212-220`), `revalidatePath('/finance/invoices')` (`L222`)

#### sendTaxInvoiceEmail(taxInvoiceId, recipientEmail)
- **Path**: `src/app/actions/finance/invoice.ts:226-280`
- **설명**: 발행된 세금계산서(`taxInvoiceId`) 안내 이메일을 Resend를 통해 수신자(`recipientEmail`)에게 발송하고 발송 상태(`SENT` 또는 `FAILED`)를 갱신합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:227`, 플랫폼 관리자급 권한 필수)
- **Input**: `taxInvoiceId: string` (세금계산서 UUID), `recipientEmail: string`
- **Output**: `Promise<{ success: true; messageId?: string }>` (`invoice.ts:270`)
- **오류**: 세금계산서 미존재 시 `logger.error` 후 `Error(await trError('invoice_not_found'))` throw (`L232-235`); `RESEND_API_KEY` 미설정(`EMAIL_NOT_CONFIGURED`, `L239-242`) 또는 발송 실패 시 세금계산서 상태를 `'FAILED'`로 업데이트한 뒤 `logger.error` 기록 및 `Error(await trError('generic', { code: 'EMAIL_SEND' }))` throw (`L271-279`)
- **부수효과**: Resend 이메일 발송(`L243-259`), 성공 시 `zen_tax_invoices` 상태 `'SENT'`·`sent_at`·`metadata.resend_id` 업데이트(`L263-267`), 실패 시 상태 `'FAILED'`·`metadata.error` 업데이트(`L272-275`), `revalidatePath('/finance/invoices')` (`L269`)

#### getTaxInvoiceHistory(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:282-294`
- **설명**: 특정 인보이스(`invoiceId`)에 대해 발행된 세금계산서 이력 목록을 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/invoice.ts:283`, 목표: 인보이스 접근 권한 정렬 대상 — `DEF-150` 참조)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<TaxInvoice[]>` (`invoice.ts:293`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_HISTORY_LOOKUP' }))` throw (`invoice.ts:288-291`)

### 4.2 정산 산출·마감·사후조정·거부 (`src/app/actions/finance/settlement.ts` — TASK-1162 / Issue #1354)

#### finalizeInvoice(invoiceId, reason?)
- **Path**: `src/app/actions/finance/settlement.ts:141-211`
- **설명**: 인보이스(`invoiceId`)에 연결된 `zen_order_costs` 합계를 재계산(`computeInvoiceTotal`)하여 정산 마감(`is_finalized: true`, `finalized_at`, `finalized_by`, `finalized_reason`) 처리하고 감사 이력 기록 및 화주 이메일 알림을 발송합니다.
- **권한**: `validateUserAction()` + `assertFinalizePermission()` (`src/app/actions/finance/settlement.ts:79-103, 146-166`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN`은 전체 허용하되 `reason` 입력 필수(`L162-166`), `AGENCY`는 `metadata.source_order_id` 오더의 `shipper_id`가 `resolveAgencyShipperIds`(소속 화주 + 대리점 본인)에 포함될 때만 허용)
- **Input**: `invoiceId: string` (인보이스 UUID), `reason?: string` (관리자 마감 시 필수 사유)
- **Output**: `Promise<{ success: boolean; error?: string }>` (`settlement.ts:144, 206`)
- **오류**: 모든 실패 분기에서 `trError()` 로케일 문자열을 `{ success: false, error }`로 반환 — 프로필 부재(`profile_not_found`, `L147`), 인보이스 미존재(`invoice_not_found`, `L152`), 이미 마감됨(`invoice_already_finalized`, `L156`), 권한 없음/타 소속 화주(`permission_denied` / `own_shipper_only` / `not_found`, `L85-100`), 관리자 사유 누락(`invoice_finalize_reason_required`, `L165`), 비용 조회/마감 DB 실패 또는 예외 시 `logger.error` 후 `generic`(`UNEXPECTED`, `L207-210`) 반환
- **부수효과**: `zen_invoices` 마감 필드 업데이트(`L126`), `zen_invoice_history` 이력 INSERT(`L132-138`), 화주(`role='SHIPPER'`, `status='ACTIVE'`)에게 `sendInvoiceFinalizedEmail` 발송(실패 시 `logger.error` 후 비차단, `L172-201`), `revalidatePath('/finance/invoices')` 및 `revalidatePath('/(dashboard)/settlement')` (`L203-204`)

#### calculateSettlementAction(orderId)
- **Path**: `src/app/actions/finance/settlement.ts:287-345`
- **설명**: 오더(`orderId`)의 정산 비용을 `SettlementEngine.calculateOrderCosts()`로 산출하고 산출된 `zen_order_costs` 목록을 반환합니다 (이미 인보이스에 연결된 비용 행이 있으면 재계산 차단).
- **권한**: `validateUserAction()` + 인라인 역할 검사 (`src/app/actions/finance/settlement.ts:289-311`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용, `AGENCY`는 `resolveAgencyShipperIds` 소속 화주 오더만 허용)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<{ success: boolean; costs?: OrderCost[]; message?: string }>` (`settlement.ts:341, 344`)
- **오류**: 프로필 부재(`profile_not_found`, `L290`), 역할 불충족(`permission_denied`, `L296`), 타 소속 화주 오더(`own_shipper_only`, `L309`), 기존 비용 조회 실패(`generic: COST_LOOKUP`, `L319`), 인보이스 연결로 잠긴 오더(`settlement_recalc_locked`, `L323`) 시 `Error` throw; 엔진 실패 시 `{ success: false, message }` 반환 (`L344`)
- **부수효과**: `SettlementEngine.calculateOrderCosts(orderId)` 실행으로 `zen_order_costs` 생성/갱신(`L327`), 성공 시 `revalidatePath(\`/orders/\${orderId}\`)` (`L340`)

#### getWeeklyRevenueChart()
- **Path**: `src/app/actions/finance/settlement.ts:372-417`
- **설명**: 최근 7일간 결제 완료(`PAID`)된 인보이스 금액을 요일(`Sun`~`Sat`)별로 집계해 주간 매출 차트 데이터를 반환합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/settlement.ts:373-378`, 목표: 조회 권한 역할 정렬 대상 — `DEF-150` 참조)
- **Input**: 없음 (`()`)
- **Output**: `Promise<Array<{ name: string; revenue: number }>>` (`settlement.ts:411-416`)
- **오류**: 프로필 부재 시 `Error(await trError('profile_not_found'))` throw (`L374`); DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'REVENUE_CHART_LOOKUP' }))` throw (`L390-393`)

#### addManualOrderCost(orderId, costName, amount, currency)
- **Path**: `src/app/actions/finance/settlement.ts:478-554`
- **설명**: 인보이스 확정 전 오더(`orderId`)에 수동 매출 비용 항목(`zen_order_costs`, `cost_type: 'OTHER_CHARGE'`, `is_revenue: true`, `quantity: 1`)을 추가합니다.
- **권한**: `validateUserAction()` + 인라인 역할 검사 (`src/app/actions/finance/settlement.ts:485-517`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용, `AGENCY`는 `resolveAgencyShipperIds` 소속 화주 오더만 허용)
- **Input**: `orderId: string`, `costName: string` (비공백 필수), `amount: number` (`> 0` 필수), `currency: string` (필수)
- **Output**: `Promise<{ success: true }>` (`settlement.ts:553`)
- **오류**: 프로필 부재(`profile_not_found`), 입력 검증 실패(`cost_name_required` / `cost_amount_invalid` / `cost_currency_required`, `L488-490`), 권한 불충족(`permission_denied` / `own_shipper_only`, `L497, 515`), 이미 인보이스에 연결된 비용이 존재할 때(`settlement_items_locked`, `L529`), DB insert 실패(`generic: COST_INSERT`, `L547`) 시 `Error` throw
- **부수효과**: `zen_order_costs` 행 INSERT(`L534-543`), `revalidatePath(\`/orders/\${orderId}\`)` 및 `revalidatePath(\`/(dashboard)/orders/\${orderId}\`)` (`L550-551`)

#### 마감 후 조정 — `createPostFinalizationAdjustment`·`createAdjustmentInvoice` (TASK-B-381 PR-4a에서 제거)
- TASK-194-C의 마감 후 조정 인보이스 직접 insert 경로였습니다. **PR-4a에서 함수를 제거**해 옛 후청구 경로를 폐쇄했습니다(현재 `src` 참조 0건).
- UPS는 `finalizeUpsSettlement` 단일 경로만 사용합니다. `generateInvoicesForOrder`·`generateInvoiceAction`·`rejectInvoice`(비UPS 재발행)는 모두 `InvoiceGenerator.generateInvoice`를 호출하며, **UPS 거부는 그 공통 진입점 내부 가드**에서 이뤄집니다.

#### rejectInvoice(invoiceId)
- **Path**: `src/app/actions/finance/settlement.ts:633-697`
- **설명**: 인보이스(`invoiceId`)를 취소(`status: 'CANCELED'`, `is_finalized: false`)하고 연결된 비용(`zen_order_costs.invoice_id`)을 해제한 뒤, 원본 오더가 존재하면 새 인보이스를 자동 재발행하여 기존 인보이스 `metadata.superseded_by`에 기록합니다 (TASK-194-C). **TASK-B-381 PR-3부터 UPS 오더는 취소까지만 수행하고 재발행하지 않습니다**(공통 진입점 거부, `newInvoiceId` 없음).
- **권한**: `validateUserAction()` + `assertFinalizePermission()` (`src/app/actions/finance/settlement.ts:637-652`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용, `AGENCY`는 소속 화주 오더 인보이스만 허용)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<{ success: boolean; newInvoiceId?: string; error?: string }>` (`settlement.ts:635, 692`)
- **오류**: 프로필 부재(`profile_not_found`, `L638`), 인보이스 미존재(`invoice_not_found`, `L644`), 이미 취소됨(`invoice_already_canceled`, `L648`), 권한 불충족(`permErr`, `L652`), 취소 업데이트 실패(`generic: INVOICE_CANCEL`, `L661`), 기타 예외 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: 'UNEXPECTED' }) }` 반환 (`L693-696`)
- **부수효과**: 기존 `zen_invoices` `'CANCELED'` 업데이트 및 `zen_invoice_history` 취소 이력 INSERT(`L656-667`), `zen_order_costs.invoice_id = null` 연결 해제(`L670-671`), 비UPS는 `InvoiceGenerator.generateInvoice(orderId)`로 신규 인보이스 생성·`superseded_by` 기록·신규 이력 INSERT(`L675-688`). UPS는 재발행 0건. `revalidatePath('/finance/invoices')` 및 `revalidatePath(\`/orders/\${orderId}\`)` (`L690-691`)

#### RPC `zen_billing_statement_order_included(p_order_id uuid)` (TASK-B-382 / Issue #1463)
- **Path**: `supabase/migrations/20261124100000_task_b382_billing_inclusion_rpc.sql`
- **설명**: 오더가 청구서 항목에 포함되었는지만 `boolean`으로 반환합니다. 헤더 상태와 무관하게(DRAFT·ISSUED·CLOSED 모두) 항목 존재 여부만 판정하며, 청구서 행·컬럼은 반환하지 않습니다. RLS 정책은 신설하지 않습니다(정책 0개 확정).
- **권한**: `SECURITY DEFINER` + `search_path = public`. `REVOKE ALL FROM PUBLIC, anon` / `GRANT EXECUTE TO authenticated`(세션 클라이언트 전용). 함수 내부에서 `auth.uid()`의 `zen_profiles.role`이 `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN`인지 검사하고, 비허용 역할·프로필 부재는 `false`가 아니라 **예외**로 거부(fail-closed)합니다.
- **Input**: `p_order_id: uuid`
- **Output**: `boolean` (포함 `true` / 미포함 `false`)
- **오류**: `invalid_order_id`, `profile_not_found`, `statement_inclusion_not_allowed: role=%`
- **호출부**: `unmarkOrderCostSettled`(§11B)가 포함 여부 확인에 사용하며, RPC 오류 시 오더정산 되돌리기를 차단합니다.
- **B-381 변경**: `billing_items_amounts`는 최신 run만 사용하며 run이 없으면 `settlement_run_missing`을 반환합니다. 상세는 `Ds_11_11B §11.19`.

---

### 4.3 청구서 관리(월 차수) — `src/app/actions/finance/billing-statements.ts` (TASK-B-360 / Issue #1366)

공통: `validateUserAction()`의 **user-session client**로만 DB·RPC 호출(`service_role`은 #1397 RLS·트리거 우회 — 금지). 발행자 권한은 `issuer_org_id = 내 org`(조건 2), tier는 **서버가 도출**(조건 3, 클라이언트 미전달), 금액은 **DB 원천만**(조건 4 — `billing_items_amounts` 단일 원천). 실패 분기 전 `logger.warn/error`, 사용자 문구는 `Errors` 키 매핑(DB 원문 미노출).

#### listBillableOrders(input)
- **Path**: `src/app/actions/finance/billing-statements.ts:231-330`
- **설명**: 청구 후보 UPS 오더 조회 — `billedTarget`(`ORG{orgId}` | `ADHOC{shipperName,bizNo?}`), `dateBasis`(`DELIVERED`|`RELEASED`), 기간 **필수·역전 거부**. `UPS`+`DELIVERED`+대상 소속+**같은 tier 청구서 미포함**만 후보, `excludedUnsettled`(미정산 제외 건수)와 금액 스냅샷(`billing_items_amounts`)을 함께 반환. ADHOC은 `shipper_id=발행 대리점` + 화주명 **정규화 일치**(부분문자 아님).
- **권한**: `ADMIN`·`ZENITH_SUPER_ADMIN`·`AGENCY`만 (그 외 `permission_denied`)
- **Input**: `{ billedTarget, dateBasis, dateFrom, dateTo }`
- **Output**: `Promise<{ success; orders?: BillableOrderRow[]; total?; totalAmount?; excludedUnsettled?; error? }>`
- **오류**: `generic{DATE_RANGE_INVALID}`(기간 누락·역전), `adhoc_requires_agency`(비대리점의 ADHOC), `adhoc_name_required`, `target_not_allowed`(소속 링크 없음·존재하지 않는 대상), `generic{TARGET_LOOKUP|LINK_LOOKUP|ORDER_LIST_LOOKUP|HISTORY_LOOKUP|INCLUDED_LOOKUP|AMOUNT_LOOKUP}`(조회 실패 — **fail-open 금지, 빈 목록으로 위장하지 않음**), `generic{UNEXPECTED}`
- **부수효과**: 조회만 (DB 변경 없음)

#### listAdhocShipperNames(q?)
- **Path**: `src/app/actions/finance/billing-statements.ts:336-385`
- **설명**: 발행 대리점이 등록한 UPS 오더의 수기 화주명 목록 — 정규화 그룹 집계(`name`/`normalized`/`count`/`billableCount`). 자동완성·유사명 경고용.
- **권한**: 발행 org 유형이 `AGENCY`인 세션만
- **Input**: `q?: string` (부분 검색, 선택)
- **Output**: `Promise<{ success; names?: AdhocShipperNameRow[]; error? }>`
- **오류**: `adhoc_requires_agency`, `generic{ORDER_LIST_LOOKUP|INCLUDED_LOOKUP|UNEXPECTED}`
- **부수효과**: 조회만

#### createBillingStatement(input)
- **Path**: `src/app/actions/finance/billing-statements.ts:419-476`
- **설명**: 통합 생성 RPC `create_billing_statement_with_items` 호출 — tier 도출 → 헤더 생성 → 금액 스냅샷 항목 INSERT → 합계 갱신을 **한 트랜잭션**에서 수행(Q-A). 클라이언트 금액 미사용, `orderIds` 빈 배열 거부.
- **권한**: `ADMIN`·`ZENITH_SUPER_ADMIN`·`AGENCY`
- **Input**: `{ billedTarget, year, month, orderIds[], periodFrom?, periodTo? }`
- **Output**: `Promise<{ success; statementId?; statementNo?; roundNo?; error? }>`
- **오류**: `order_ids_required`, `order_not_eligible`(미정산·타 소속), `order_already_inclusive`(UNIQUE `23505` 매핑), `target_not_allowed`, `adhoc_requires_agency`, `adhoc_name_required`, `profile_not_found`, `permission_denied`, `statement_empty`, `generic{STATEMENT_CREATE|UNEXPECTED}`. `zero_amount_count>0`이면 `logger.warn`(조건 4b — 저장은 허용)
- **부수효과**: `zen_billing_statements`/`zen_billing_statement_items` INSERT, `revalidatePath('/finance/statements'|'/agency/statements')`

#### cancelBillingStatement(id)
- **Path**: `src/app/actions/finance/billing-statements.ts:483-532`
- **설명**: DRAFT 초안 취소(=헤더 행 삭제 → 항목 CASCADE → 오더 다시 후보). 조건부 `DELETE ... WHERE id AND issuer_org_id=내 org AND status='DRAFT'`의 `rowCount`가 authority(선조회는 오류 분류용 — TOCTOU 방어).
- **권한**: 발행 org 구성원만 (`issuer_org_id = 내 org`)
- **Input**: `id: string`
- **Output**: `Promise<{ success: boolean; error?: string }>`
- **오류**: `statement_not_found`(RLS 미노출 = 미존재와 동일), `not_issuer`, `not_draft`, `generic{STATEMENT_CANCEL|UNEXPECTED}`
- **부수효과**: `zen_billing_statements` 행 DELETE(항목 CASCADE), `revalidatePath` 2곳

#### issueBillingStatement(id)
- **Path**: `src/app/actions/finance/billing-statements.ts:539-587`
- **설명**: 발행(확정) DRAFT→ISSUED. 조건부 `UPDATE ... WHERE id AND issuer_org_id AND status='DRAFT'`의 `rowCount`가 authority, **항목 0건은 DB 트리거 `issue_without_items`가 최종 방어**.
- **권한**: 발행 org 구성원만
- **Input**: `id: string`
- **Output**: `Promise<{ success; issuedAt?; error? }>`
- **오류**: `statement_not_found`, `not_issuer`, `not_draft`, `already_issued`, `statement_empty`(트리거 `issue_without_items` 매핑), `generic{UNEXPECTED}`
- **부수효과**: `status='ISSUED'`, `issued_at`, `issued_by` 갱신, `revalidatePath` 2곳

#### confirmStatementPayment(id, { paidAt, amount })
- **Path**: `src/app/actions/finance/billing-statements.ts:594-653`
- **설명**: 입금확인 ISSUED→CLOSED — **전액만**(Q7). `amount !== total_amount`이면 **저장하지 않고** 오류(DB CHECK `zen_billing_statements_paid_check`가 이중 방어). 조건부 `UPDATE ... WHERE status='ISSUED'`의 `rowCount`가 authority. `paidAt` 미지정 시 기본값은 **KST 오늘**(`getKstToday()`) — UTC `slice`는 00:00~09:00 KST에 전날을 만든다(PR #1410 후속 권고). `dateFrom/dateTo`는 `YYYY-MM-DD` 형식을 검증하지 않으면 `kstRangeBounds`가 RangeError로 `UNEXPECTED`를 냈으나, 형식 검증으로 `DATE_RANGE_INVALID`를 반환한다.
- **권한**: 발행 org 구성원만
- **Input**: `id: string`, `{ paidAt?: string; amount: number }`
- **Output**: `Promise<{ success: boolean; error?: string }>`
- **오류**: `statement_not_found`, `not_issuer`, `already_closed`, `not_issued`, **`payment_amount_mismatch`**(금액 불일치 — 저장 안 됨), `generic{UNEXPECTED}`
- **부수효과**: `status='CLOSED'`, `paid_amount`, `paid_date`, `closed_at`, `closed_by` 갱신, `revalidatePath` 2곳

#### getBillingStatements(filter)
- **Path**: `src/app/actions/finance/billing-statements.ts:660-715`
- **설명**: 청구서 목록 — **RLS 3경로**(① 발행 전 상태 ② 청구받은 org의 ISSUED/CLOSED ③ Admin 대리점 발행분 감독)가 범위를 강제하고, 서버는 `scope` 배지(`MINE`/`RECEIVED`/`SUPERVISED`)만 계산.
- **권한**: 역할 무관 — RLS가 범위 결정 (화주도 경로 ②로 조회 가능)
- **Input**: `{ billedOrgId?, year?, month?, status? }`
- **Output**: `Promise<{ success; statements?: StatementListRow[]; total?; error? }>`
- **오류**: `generic{STATEMENT_LOOKUP|UNEXPECTED}`
- **부수효과**: 조회만

#### getBillingStatementDetail(id)
- **Path**: `src/app/actions/finance/billing-statements.ts:722-778`
- **설명**: 청구서 상세(헤더+항목+오더번호). 헤더·항목을 **복수 쿼리**로 조회(`items`→헤더 FK가 단일·복합 2개라 PostgREST embed가 모호 — TASK-B-360 실측).
- **권한**: RLS 3경로 — **보이지 않으면 `statement_not_found`로 미존재와 동일 응답**(존재 여부 비노출)
- **Input**: `id: string`
- **Output**: `Promise<{ success; detail?: StatementDetail; error? }>`
- **오류**: `statement_not_found`(타 생성자·미존재 동일), `generic{STATEMENT_LOOKUP|UNEXPECTED}`
- **부수효과**: 조회만

#### GET /api/finance/statements/[id]/export (청구서 Excel 출력)
- **Path**: `src/app/api/finance/statements/[id]/export/route.ts` (빌더: `src/lib/finance/billing/statement-excel*.ts`)
- **설명**: 청구서 `.xlsx` 다운로드(WBS 4.6) — **Route Handler**(서버 액션은 파일을 반환하지 않는다, An_17 부록 A §2). 시트1 `청구서`(A4 세로 요약) + 시트2 `오더별 상세`(A4 가로, tier별 14/15열 + No — B-402 부가운임 3열 포함) — 양식은 `An_17_부록A_청구서_Excel_출력양식_설계.md` v1.1. 금액·중량은 저장값만 쓰고 **출력 직전 항목 합 = 헤더 `total_amount` 검증**(불일치 시 파일 미생성). 라이브러리 `exceljs@4.4.0`(JSJung 승인 2026-11-21).
- **권한**: 인증된 세션 + **`getBillingStatementDetail`과 동일한 RLS 3경로** — 안 보이면 404(존재 비노출). 미인증 401.
- **Input**: URL param `id` (uuid)
- **Output**: 200 `.xlsx` (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Cache-Control: no-store`, `Content-Disposition` RFC 5987)
- **오류**: 401(미인증), 404(미존재·RLS 차단 — 동일 응답), 500(`HEADER_LOOKUP`/`ITEMS_LOOKUP`/`TOTAL_MISMATCH`/`BUILD_FAILED` — 전부 `logger.error`, 파일 미생성)
- **부수효과**: 조회만 (DB 변경 없음) · 성공 시 `logger.info(statement_id·건수만 — 금액·상호 제외)`

#### normalizeShipperName(name) — 내부 유틸 (서버 액션 아님)
- **Path**: `src/lib/finance/billing/normalize-shipper-name.ts` (TASK-B-368 / DEF-B-162로 **`billing-statements.ts`에서 분리**)
- **설명**: 수기 화주명 정규화 — RPC `billed_key`의 ADHOC 규칙과 동일(공백 압축·양끝 제거·소문자). 후보 매칭(`listBillableOrders` ADHOC 필터)과 자동완성 집계(`listAdhocShipperNames`)에서 공용.
- **Input**: `name: string` / **Output**: `string` (순수 함수, DB 접근 없음)
- **분리 사유**: `'use server'` 파일은 **async 함수만 export** 가능 — 이 함수를 그대로 export하면 클라이언트 컴포넌트가 파일을 import하는 순간 `npm run build`가 실패(DEF-B-162). **규칙·시그니처 무변경**, 호출 코드 3곳은 import로 전환.

#### getOrderAdditionalCharges(orderId)
- **Path**: `src/app/actions/finance/additional-charges.ts` (TASK-B-402 / Issue #1451 — **신규**)
- **설명**: 부가운임 표시용 가드 조회 — 최신 `version`의 `zen_ups_settlement_run`에서 `run_charges` 항목(`line_no`·`name`·`amount`·`currency`·`tier`)만 반환(**원가 컬럼 미조회·미반환**). 재마감은 새 `version`을 만들므로 항상 최신 run 기준. 정산 전(run 없음)은 `success` + 빈 `items`(정상 케이스, 오류 아님).
- **권한**: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN`은 전체 tier, `SHIPPER`는 자기 화주 + `SHIPPER` tier, `AGENCY`는 자기 소속 화주(`agency_org_id` 또는 활성 `zen_agency_shippers` 링크) + `ADMIN_TO_AGENCY` tier — 그 외 `permission_denied`(`logger.warn`). 오더가 RLS로 안 보이면 `order_not_found`(존재 비노출).
- **Input**: `orderId: string`
- **Output**: `Promise<{ success: boolean; items: { lineNo: number; name: string; amount: number; currency: string; tier: string }[]; version?: number; error?: string }>`
- **오류**: `profile_not_found`, `order_not_found`, `permission_denied`, `generic{ORDER_LOOKUP|RUN_LOOKUP|CHARGES_LOOKUP|ADDITIONAL_CHARGES}` — DB·조회 실패는 전부 `logger.error`(오류 객체 전달)
- **부수효과**: 조회만 (DB 변경 없음)

### 4.4 UPS 정산마감 — `src/app/actions/finance/ups-settlement.ts` (TASK-B-381 PR-2 / Issue #1459)

`previewUpsSettlement`·`saveUpsSettlementDraft`·`finalizeUpsSettlement` 3개 액션은 **관리자 3역할 전용**이며, run 저장·tier 금액·부가항목 payload·환율 기준일·오류 코드 상세는 [Ds_11_11B §11.20](./Ds_11_11B_UPS_Agency_Actuals.md)에 기재했습니다. 이 장에서는 재무 정산 관점의 계약만 요약합니다.

- **금액 원천**: `estimateUpsFreightCore`의 대리점·화주 tier 금액(없으면 플랫폼 폴백) + 부가항목(항목별 2자리 반올림). `zen_order_costs`·`UPS_ACTUAL_COST_ADJ`는 생성하지 않습니다.
- **환율**: `getOrderReleasedDate`가 반환한 출고확정일 기준. 유효 환율이 없으면 fallback 없이 `currency_conversion_failed`로 실패합니다.
- **정산마감**: `finalize_ups_settlement_run` RPC 1회로 run+amounts+charges+오더 `SETTLED`를 원자 처리합니다. 같은 입력 재호출은 기존 run을 멱등 반환하고, 다른 입력은 `already_settled`입니다.
- **청구서 연계**: `billing_items_amounts`는 최신 run만 사용하므로, run이 없는 UPS 오더 청구는 `settlement_run_missing`으로 차단됩니다.



### 4.5 일별 청구 일괄 마감 — `src/app/actions/finance/daily-billing.ts` (TASK-B-381 PR-3 / Issue #1459)

#### getShipperDailyBillingSummary(params?) — TASK-B-381 PR-3·PR-4a 변경
- **Path**: `src/app/actions/finance/daily-billing.ts`
- **변경**: 인보이스의 출처 오더가 **UPS이면 집계에서 제외**합니다(§2-7). 출처 오더 조회 실패는 fail-closed(`generic{ORDER_LOOKUP}`).
- **Output**: `{ success, groups, exchangeRate }` (UPS 제외 후 비UPS 기준)

#### getShipperDailyOrdersDetails(invoiceIds) — TASK-B-381 PR-3·PR-4a 변경
- **Path**: `src/app/actions/finance/daily-billing.ts`
- **변경**: 반환 행에서 **UPS 오더를 제외**합니다(§2-7). 인보이스·오더 조회 실패는 fail-closed.
- **Output**: `{ success, orders }` (UPS 제외)

#### finalizeDailyShipperInvoices(invoiceIds, reason?)
- **설명**: 일별/주별/월별 집계 단위로 인보이스를 일괄 마감합니다. **UPS 인보이스는 마감 대상에서 제외**하고 `skippedCount`로 집계합니다(§2-7). UPS는 `finalizeUpsSettlement` 경로만 사용합니다.
- **권한**: `validateUserAction()` + ADMIN·MANAGER·ZENITH_SUPER_ADMIN 또는 AGENCY(기존과 동일)
- **Input**: `invoiceIds: string[]`, `reason?: string`
- **Output**: `{ success, finalizedCount, failedCount, skippedCount, errors? }` (`skippedCount` 신규)
- **오류**: 권한 불충분(`permission_denied`), 인보이스/오더 조회 실패는 **fail-closed**(`generic{INVOICE_LOOKUP|ORDER_LOOKUP}` — 아무것도 마감하지 않음)
- **부수효과**: 비UPS 인보이스만 `finalizeInvoice` 호출, `revalidatePath('/finance/daily-billing')`·`revalidatePath('/admin/ups-actual-charges')`

## 4. 정산 및 재무 (Finance & Settlement)
비용 계산, 청구서 발행 및 결제 상태를 관리합니다.
- **Path**: `src/app/actions/finance.ts`

### generateInvoicesForOrder(orderId)
- **설명**: 오더 완료(RELEASED) 시 RPC를 호출하여 비용 산출 후 청구서 자동 생성
- **RPC Link**: `calculate_order_costs`

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
- **설명**: 오더(`orderId`)에 대해 `InvoiceGenerator.generateInvoice()`를 호출하여 인보이스를 생성합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:22`, 플랫폼 `ADMIN`·`ZENITH_SUPER_ADMIN` 또는 `/admin` 접근 권한 보유 역할만 허용)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<{ success: boolean; invoice?: Invoice; message?: string }>` (`invoice.ts:29, 32`)
- **오류**: 미인증/권한 불충족 시 `validateAdminAction()`에서 `redirect('/login')` 또는 `Error("Profile not found")` / `Error("Unauthorized access")` throw (`guards.ts:79-113`); 생성 실패 시 `generator.generateInvoice(orderId)`의 `{ success: false, message }` 반환 (`invoice.ts:32`)
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
- **권한**: `validateUserAction()` (`src/app/actions/finance/invoice.ts:110`, 로그인 세션만 검증하며 액션 내 별도 역할·소유권 검증 없음 — `DEF-150` 참조)
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
- **권한**: `validateUserAction()` (`src/app/actions/finance/invoice.ts:283`, 로그인 세션만 검증하며 액션 내 별도 역할·소유권 가드 없음 — `DEF-150` 참조)
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
- **권한**: `validateUserAction()` (`src/app/actions/finance/settlement.ts:373-378`: `ZENITH_SUPER_ADMIN`·`ADMIN`은 전체 조회, 그 외 역할은 `shipperId = profile.org_id`로 본인 조직분만 조회 — 단, `MANAGER` 역할이 `isAdmin`에서 누락된 점은 `DEF-150` 참조)
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

#### createPostFinalizationAdjustment(orderId, adjustmentAmount, currency, userId, originalInvoiceId)
- **Path**: `src/app/actions/finance/settlement.ts:558-596`
- **설명**: 이미 정산 마감(`is_finalized = true`)된 인보이스(`originalInvoiceId`)에 대해 사후 조정 차액(`adjustmentAmount !== 0`)이 발생한 경우, 신규 조정 인보이스(`zen_invoices`, `metadata.adjustment_of = origInv.id`)를 발행하고 미연결 `UPS_ACTUAL_ADJUSTMENT` 비용 행을 연결합니다 (TASK-194-C).
- **권한**: `validateAdminAction()` (`src/app/actions/finance/settlement.ts:563`, 플랫폼 관리자급 권한 필수)
- **Input**: `orderId: string`, `adjustmentAmount: number`, `currency: string`, `userId: string`, `originalInvoiceId: string`
- **Output**: `Promise<{ success: boolean; adjustmentAmount?: number; error?: string }>` (`settlement.ts:561, 591`)
- **오류**: 원본 인보이스 미존재(`invoice_not_found`, `L568`), 조정 인보이스 생성 실패(`invoice_create_failed`, `L578`), 미인증/권한 거부 또는 예외 발생 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: 'UNEXPECTED' }) }` 반환 (`L592-595`)
- **부수효과**: `adjustmentAmount !== 0`일 때 신규 `zen_invoices` INSERT(`createAdjustmentInvoice`, 만기 +14일, `L575`), 미연결 `UPS_ACTUAL_ADJUSTMENT` 비용 행의 `invoice_id` 연결 및 총액 재산출 업데이트(`L580-582`), `zen_invoice_history` 이력 INSERT(`L583-586`), `revalidatePath(\`/orders/\${orderId}\`)` 및 `revalidatePath('/finance/invoices')` (`L589-590`)

#### rejectInvoice(invoiceId)
- **Path**: `src/app/actions/finance/settlement.ts:633-697`
- **설명**: 인보이스(`invoiceId`)를 취소(`status: 'CANCELED'`, `is_finalized: false`)하고 연결된 비용(`zen_order_costs.invoice_id`)을 해제한 뒤, 원본 오더가 존재하면 새 인보이스를 자동 재발행하여 기존 인보이스 `metadata.superseded_by`에 기록합니다 (TASK-194-C).
- **권한**: `validateUserAction()` + `assertFinalizePermission()` (`src/app/actions/finance/settlement.ts:637-652`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용, `AGENCY`는 소속 화주 오더 인보이스만 허용)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<{ success: boolean; newInvoiceId?: string; error?: string }>` (`settlement.ts:635, 692`)
- **오류**: 프로필 부재(`profile_not_found`, `L638`), 인보이스 미존재(`invoice_not_found`, `L644`), 이미 취소됨(`invoice_already_canceled`, `L648`), 권한 불충족(`permErr`, `L652`), 취소 업데이트 실패(`generic: INVOICE_CANCEL`, `L661`), 기타 예외 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: 'UNEXPECTED' }) }` 반환 (`L693-696`)
- **부수효과**: 기존 `zen_invoices` `'CANCELED'` 업데이트 및 `zen_invoice_history` 취소 이력 INSERT(`L656-667`), `zen_order_costs.invoice_id = null` 연결 해제(`L670-671`), `InvoiceGenerator.generateInvoice(orderId)`로 신규 인보이스 생성·`superseded_by` 기록·신규 이력 INSERT(`L675-688`), `revalidatePath('/finance/invoices')` 및 `revalidatePath(\`/orders/\${orderId}\`)` (`L690-691`)

---


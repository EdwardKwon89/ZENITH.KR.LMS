> **작성·검증 안내 (2026-11-23 18:56 KST)**: 담당 D_Kai가 일일 한도 초과로 Holding되어 Edward 지시로 **Aiden이 직접 수행**한 검토입니다(Aiden 지시를 받은 읽기 전용 서브 검토가 작성). **Aiden 원본 대조 완료 항목: Major M1·M2·M9**(`83bb486f` 원본 줄 확인; M1의 MANAGER 실동작은 추정). 나머지 발견은 서브 검토 결과를 그대로 옮긴 것으로 Aiden이 재확인하지 않았다(M3~M8·M10 포함). 코드 실행·재현은 하지 않았다. 검토 기준: TeamB_Dev `83bb486f`. Refs #1458.

# TASK-1172 — TeamB_Dev 통합 사전 검토 ③: 서버 액션·lib·API 라우트

| 항목 | 내용 |
|:--|:--|
| 이슈 | #1458 (담당 D_Kai가 일일 한도로 Holding → Edward 지시로 **Aiden이 직접 수행**) |
| 검토 기준 | `origin/TeamB_Dev` **`83bb486f`** 대 `origin/develop`(merge-base `775c8596`) 차이 |
| 검토 방식 | **정적 읽기**. 애플리케이션 코드·테스트는 실행하지 않음(실행한 명령은 §5) |
| 검토 시각 | 2026-11-23 18:3x ~ 18:5x KST |
| 범위 | 서버 액션 5, lib 10, API 라우트 1 = **16개** |

표기: **확인함** = 코드·DB를 직접 읽음 / **추정** = 실행하지 않았거나 외부 사실에 의존 / **미확인** = 읽지 못함. 줄 번호는 `83bb486f` 기준.

---

## 1. 읽은 파일과 범위 (16개)

| # | 파일 | 줄 수(`wc -l`) | 읽은 범위 | 미확인 |
|:-:|:--|:-:|:--|:--|
| 1 | `actions/finance/billing-statements.ts` | 924 | **1~924 전부** | 없음 |
| 2 | `actions/finance/index.ts` | 53 | 1~53 전부 | 없음 |
| 3 | `actions/finance/ups-actual-charges.ts` | 447 | diff 전체 + 1~125, 120~245, 250~300, 396~447 | 300~396 중 diff 밖(변경 없는) 줄 |
| 4 | `actions/finance/ups-actual-cost.ts` | 956 | diff 전체 + 100~140, 199~228, 228~460, 462~502, 546~705, 738~910 | 1~100 중 diff 밖 타입 정의 일부 |
| 5 | `actions/operations/orders.ts` | 1400 | diff 전체 + 1051~1100, 1095~1260 | diff 밖 기존 코드(약 1,300줄, 변경 없음) |
| 6 | `lib/finance/billing/normalize-shipper-name.ts` | 19 | 전부 | 없음 |
| 7 | `lib/finance/billing/statement-excel-data.ts` | 354 | 1~354 전부 | 없음 |
| 8 | `lib/finance/billing/statement-excel.ts` | 536 | 1~536 전부 | 없음 |
| 9 | `lib/orders/order-released-date.ts` | 24 | 전부 | 없음 |
| 10 | `lib/orders/rate-snapshot-refresh.ts` | 214 | 1~214 전부 | 없음 |
| 11 | `lib/orders/settled-cargo-guard.ts` | 30 | 전부 | 없음 |
| 12 | `lib/shxk/order.ts` | 128 | 전부 | 없음 |
| 13 | `lib/shxk/tracking.ts` | 132 | 전부 | 없음 |
| 14 | `lib/ups/actual-cost.ts` | 110 | 전부 | 없음 |
| 15 | `lib/utils/date-kst.ts` | 36 | 전부 | 없음 |
| 16 | `app/api/finance/statements/[id]/export/route.ts` | 42 | 전부 | 없음 |

참고로 읽은 것: `supabase/migrations/20261122100000_task1168_def157_order_rate_snapshots_safe_view.sql`(안전 뷰), `20261119090000`·`20261120090000`(청구서 DB·RPC)의 금액 원천·정밀도 부분, `20261118090000` 컬럼 COMMENT, `src/lib/shxk/client.ts`는 **미확인**(diff 밖).

---

## 2. 발견 (심각도순)

### Blocker
**없음.** 단, Major의 M1·M2·M9는 통합 전 수정 여부를 Aiden이 판단해야 한다(§4).

### Major

**M1. 레거시 인보이스 확인이 오류·MANAGER 권한에서 fail-open — `markOrderCostSettled`, `getOrdersForCostSettlement`**
- `ups-actual-cost.ts:873-882`
  ```
  const { data: legacyInvoices } = await supabase
    .from('zen_invoices') ... .limit(1);
  if (legacyInvoices && legacyInvoices.length > 0) { ... return legacy_invoiced_order }
  ```
  `error`를 읽지 않아 조회 실패 시 `legacyInvoices`가 undefined → 검사를 통과해 **정산 완료로 진행**한다. **확인함(코드).**
- `ups-actual-cost.ts:784`도 같은 `zen_invoices` 조회지만 목록 쪽(`:787-` 주석 "보조 조회 실패를 무시하면 ... fail-open")은 오류를 처리한다 → **같은 파일 안에서 기준이 다르다.** 확인함.
- 더 중요한 점: 두 함수는 `assertAdmin`이 **MANAGER도 통과**시키고(`:103`), 조회는 사용자 세션 클라이언트다. 운영 `pg_policies` 조회(2026-11-23 18:51 KST)에서 `zen_invoices`의 관리자 정책(`Admins can manage all invoices`)은 **ADMIN·ZENITH_SUPER_ADMIN만** 허용한다. MANAGER 세션은 오류 없이 **0행**을 받아 레거시 인보이스가 있어도 검사를 통과한다. 정책은 **확인함**, MANAGER 실동작은 실행하지 않아 **추정**.
- 영향(추정): 레거시 인보이스가 있는 오더를 MANAGER가 정산 완료 처리하고, 목록에서도 `legacyInvoiced=false`로 보인다.

**M2. 오더정산 목록이 500건 이후를 조용히 누락 — `getOrdersForCostSettlement`**
- `ups-actual-cost.ts:764-771`: `.eq('transport_mode','UPS').eq('status','DELIVERED').limit(500)` — **ORDER BY 없음**, 기간(`from`~`to`) 필터는 쿼리 뒤 메모리에서 적용(`:809-812`).
  ```
  const day = deliveredAt.slice(0, 10);
  if (day < filter.from || day > filter.to) continue;
  ```
  전체 기간 배송완료 UPS 오더가 500건을 넘으면 어떤 500건이 오는지 정해지지 않고, 기간 안의 오더가 빠질 수 있다. 같은 Team B 코드의 `billing-statements.ts:54·208`은 상한 도달 시 `truncated` 신호를 주는데 여기에는 신호가 없다. **확인함(코드)**, 발현 시점은 오더 수 증가에 따르므로 **추정**.
- `:784`의 `filter('metadata->>source_order_id','in', (…500개 id…))`는 URL 길이 위험도 있다(M10과 같은 이유, 추정).

**M3. 원가 컬럼 의미가 입력 경로마다 다름 — 마이그레이션 COMMENT와 모순**
- `20261118090000_task_b365_cost_settlement_columns.sql:63`: `base_freight_hkd` COMMENT = "기본운임 **원금액** (통화는 base_freight_currency)", `:64-65` 유류·급증도 "원금액".
- 경로 A `recordActualCostAndFinalize`(`ups-actual-cost.ts:626-632`): `base_freight_hkd: baseFreightKrw, // 환율 적용된 KRW 값 (스키마 변경은 후속 PR)`, `fuel_surcharge_hkd: computed.fuel.krw`, `base_freight_currency: baseFreightCurrency`(예: USD). → **KRW(+7% 포함) 값을 넣고 통화 컬럼에는 USD를 적는다.**
- 경로 B `recordUpsActualCost`(`:266-270` 부근, 원금액 `toNum(input.baseFreightHkd)`)는 COMMENT와 일치한다.
- 같은 컬럼이 경로에 따라 원금액/KRW 환산액이 된다. 운영 `zen_ups_actual_cost`는 0건이라 지금은 데이터 영향이 없고, 데이터가 쌓이기 전에 해소해야 한다. **확인함(코드·SQL).**

**M4. 기타부가운임 자식 행 삭제 결과를 확인하지 않음 — DEF-B-159 수정이 불완전**
- `ups-actual-cost.ts:650-653`
  ```
  await supabase.from('zen_ups_actual_other_charges').delete().eq('order_id', orderId);
  ```
  `error`를 읽지 않는다. 삭제가 실패해도 `:655-`에서 새 행을 삽입해 자식 행이 중복되고 부모 합계(`other_charges_hkd`)와 어긋날 수 있다. 삭제→삽입도 한 트랜잭션이 아니다. **확인함(코드)**, 실패 시 영향은 **추정**.

**M5. 환율 기준일 조회 오류를 무시하고 UTC 날짜를 씀 — `getOrderReleasedDate`**
- `order-released-date.ts:12-19`: `const { data } = await supabase ...` — `error` 무시. `:21-23`: 조회 실패 시 `fallbackCreatedAt` 또는 **오늘(UTC)** 로 조용히 대체하고 `String(ts).slice(0, 10)`로 **UTC 날짜**를 쓴다.
- 이 값이 세 곳의 환율 기준일이다(`ups-actual-cost.ts:280`, `:504`, `:594` 부근). 즉 원가 계산의 환율이 오류 시 다른 날짜로 정해져도 알 수 없다. 또 청구 기간·기준일은 KST로 정했는데(`date-kst.ts:10-11`, JSJung 2026-11-21 결정) 환율 기준일은 UTC라 00:00~09:00 KST 출고는 전날 환율일 수 있다(이 부분은 **의도 여부 미확인**).
- 이 함수는 이번에 `'use server'` 파일 밖으로 옮겨진 것이므로 **로직 변경은 없다**(DEF-150 §1.2 처리됨, 확인함).

**M6. 실비 등록의 마감 인보이스 조회 오류 무시, 혼합 통화 합산 — `recordUpsActualCharges`**
- `ups-actual-charges.ts:67-73`: `const { data: existingInvoices } = await db ...` — `error` 무시. 실패하면 `finalizedInvoices`가 빈 배열이 되어 **"마감 후 조정" 분기를 건너뛰고** 일반 갱신 경로로 간다. fail-open. (이 줄은 이번 diff에서 `supabase`→`db`로만 바뀐 기존 로직.) 확인함.
- `:85-88`: `additionalSum += c.amount`(통화 무시), `:170`: `const defaultCurrency = charges[0]?.currency || 'USD'` → **서로 다른 통화의 금액을 숫자로 합산하고 첫 항목의 통화로 표기**한다. 입력 화면이 단일 통화로 제한하는지는 **미확인**. 확인함(코드), 영향 추정.

**M7. 입고 실측의 이전 스냅샷 조회 — 오류 무시 + 안전 뷰 가시성 때문에 운임 변경 메일이 `0 → 신규`로 나갈 수 있음**
- `orders.ts:1060-1067`: `const { data: existingSnapshot } = await supabase.from('zen_order_rate_snapshots_safe')...` — `error` 무시. `:1198`: `oldFreight = previousSnapshot?.metadata?.platform?.totalSellingPrice || 0;`, `:1202-1213`: `oldFreight !== newFreight`이면 `sendFreightChangeEmail({ email: profile.email || '', ... })`.
- 안전 뷰(`20261122100000_task1168...sql`)의 가시 조건은 ADMIN·ZENITH_SUPER_ADMIN·MANAGER, 오더의 화주 조직 구성원, 배정 대리점 소속뿐이다(확인함). **OPERATOR는 어디에도 해당하지 않아** 뷰에서 0행 → `previousSnapshot=null` → `oldFreight=0` → 새 운임과 달라 메일이 발송된다(실행하지 않아 **추정**).
- 메일의 `email` 인자가 **실측 저장자 본인의 이메일**(`profile.email`)이다(확인함). 수신자가 의도인지는 **미확인**(#1453 C에서 답변 요청된 사항과 동일).

**M8. SHXK 추적 이벤트 저장 — 중복 방지 조회 실패 시 중복 삽입, 삽입 실패 시에도 폴링 종료**
- `tracking.ts:67-73`: 기존 이벤트 조회 `error`를 **로그만 남기고 계속 진행**한다. `existing`이 null이 되어 `existingKeys`가 비고(`:75-77`), 모든 이벤트가 중복 삽입 대상이 된다. 마이그레이션에서 `zen_ups_tracking_events`에 **UNIQUE 제약은 없다**(`20260626000000_ups_008...sql`에서 인덱스 4개만, grep 확인함; 다른 파일의 UNIQUE는 **미확인**).
- `:101-106`: 삽입 실패는 로그만 남기고 `:122-130`에서 `DL`이면 `is_active=false`로 폴링을 끈다. 삽입이 실패한 채 폴링이 종료되면 이벤트가 영구 누락된다(추정).
- 이번 변경(B-357)의 목적은 로깅 추가라 로그는 충분하다. 다만 **로깅만으로는 데이터 정합이 지켜지지 않는 구조**다. 확인함(코드), 영향 추정.

**M9. 신규 함수가 ZEN_A4 "함수 50줄 이하" 위반**
- 이번 통합에서 **새로 추가된** 함수 중 초과: `getOrdersForCostSettlement` `ups-actual-cost.ts:753-835` = **83줄**, `markOrderCostSettled` `:838-907` = **70줄**. (TypeScript 파서로 실측, §5.) 확인함.
- 규칙은 "엄격 준수 — 초과 시 차단"이다. `billing-statements.ts`는 50줄 초과 함수가 0개로, 같은 팀의 다른 PR(B-360)은 분리를 지켰다.

**M10. `.in()` URL 길이 한계(추정)**
- `billing-statements.ts:475` `.in('order_id', orders.map(...))` — 대상이 최대 `ADHOC_NAME_LIMIT=1000`건(`:210`)이므로 UUID 1000개(약 37KB). `:319`·`:323`도 최대 500개. `statement-excel-data.ts:219`·`:244`는 최대 10,000개(`MAX_ROWS`).
- 실제 한도는 Supabase 게이트웨이 설정에 달려 있어 **확인하지 않았다(추정)**. 실패 시 오류로 처리되어(`INCLUDED_LOOKUP` 등) 조용히 잘리지는 않는다. Team B의 IMP 제안 #1418이 Excel 쪽만 언급한다.

### Minor

| # | 위치 | 내용 | 구분 |
|:-:|:--|:--|:--|
| m1 | `billing-statements.ts:805` | 청구서 목록 `.limit(500)`에 `truncated` 신호가 없다. 같은 파일 `:54·:208`의 "조용한 누락 방지" 원칙과 불일치 | 확인함 |
| m2 | `billing-statements.ts:150-151` | JSDoc 두 개가 연달아 붙어 첫 주석이 `dateRangeError`가 아니라 `ISO_DATE_RE`에 붙는다 | 확인함 |
| m3 | `billing-statements.ts:706` | 주석에 깨진 문자(U+FFFD: `조�건부`)가 있다(`grep` 확인) | 확인함 |
| m4 | `billing-statements.ts:392`, `:766` | 표시용 합계는 부동소수 합산, 입금액 비교는 `amount !== total`(부동소수). 같은 PR의 테스트·Excel 쪽은 정수 센트 규칙을 쓴다. DB CHECK가 최종 방어 | 확인함 |
| m5 | `billing-statements.ts:259` | `!link`(대리점-화주 미연결)로 거부하는 경로에 `logger`가 없다. 권한 거부 시도가 기록되지 않는다(`:230-252`의 검증 실패는 허용 범위) | 확인함 |
| m6 | `billing-statements.ts:454`, `ups-actual-cost.ts:771`, `ups-actual-charges.ts:407` | `ilike`에 사용자 입력을 그대로 넣어 `%`·`_`가 와일드카드로 동작한다(SQL 주입은 아님) | 확인함 |
| m7 | `statement-excel.ts:302` | 입금액을 `toLocaleString('ko-KR')`로 표기해 `126,000.5`처럼 소수 자리가 가변이다(다른 금액은 `#,##0.00`) | 확인함 |
| m8 | `statement-excel.ts:195` | `toLocaleDateString('en-CA', {timeZone})`를 직접 사용. 같은 목적의 `kstDateString`이 있는데 중복 구현. `date-kst.ts:6·14`도 ICU 로케일 지원에 의존(추정, 현 Node는 full-ICU) | 확인함 |
| m9 | `route.ts:20-23`, `statement-excel-data.ts:131-139` | 인증 실패 401에 로그 없음. `id`가 UUID 형식이 아니면 PostgREST 오류 → `HEADER_LOOKUP` 500(404가 아님)이 될 수 있다 | 401 확인함 / 500 **추정** |
| m10 | `rate-snapshot-refresh.ts:102-107`, `:132-137`, `:175-180` | DB 조회 오류를 `logger.warn`으로 기록한다. GOV 관측성 규정은 시스템·인프라 실패에 `logger.error` | 확인함 |
| m11 | `rate-snapshot-refresh.ts:160-162`, `orders.ts` 입고 재계산 | 치수는 첫 패키지만 사용(이미 열린 #952/DEF-132). | 확인함(기존) |
| m12 | `orders.ts:1155-1165` vs `rate-snapshot-refresh.ts:166` | 입고 실측 재계산은 `destStateProvince`를 전달하지 않는다(수정 경로는 전달). 이 값은 중국 남부 구분(`pricing-engine.ts:76-97`, DEF-B-044)에 쓰인다. **이 호출부 줄은 이번 diff 밖(기존 코드)** 이다. 중국 남부 도착 오더에서 경로별 요율이 달라질 수 있다(추정) | 확인함(부재)/영향 추정 |
| m13 | `ups-actual-cost.ts:695-696` | 확정 결과가 `appliedExchangeRate: exchangeRate`(HKD 환율)와 HKD 필드 합계(`hkdTotal`)를 반환한다. 미리보기(`:536`부근)는 기본운임 통화 환율(`appliedRate`)로 바꿨는데 확정은 그대로라 USD 기본운임에서 화면 표시값이 어긋날 수 있다 | 확인함 |
| m14 | `ups-actual-cost.ts:809` | 배송완료일 필터가 `slice(0,10)`(UTC)로, 청구서 쪽 KST 기준과 다르다 | 확인함 |
| m15 | `ups-actual-cost.ts:910-` `unmarkOrderCostSettled` | 청구서 항목 존재 확인 후 조건부 UPDATE까지가 한 트랜잭션이 아니다. 그 사이 청구서가 생성되면 SETTLED가 풀린 오더가 청구서에 남을 수 있다. DB 제약은 없다(b365 SQL에 없음) | 확인함(구조)/발생 추정 |
| m16 | `ups-actual-charges.ts:75-109` | 삭제 후 삽입이 비원자적이다(삽입 실패 시 이전 실비 행 손실). 오류 응답은 정상 | 확인함 |
| m17 | `ups-actual-charges.ts:404-411`, `:433` | 추적번호 조회 실패는 로그 후 부분 결과를 반환, 추가 오더 조회 `error`는 무시. `let`을 `const`로 | 확인함 |
| m18 | `lib/ups/actual-cost.ts:83` | `currency` 누락을 조용히 `KRW`로 처리(HKD 금액이 KRW 1:1로 계산될 수 있음) | 확인함 |
| m19 | `settled-cargo-guard.ts:24-26` | 패키지를 **인덱스 순서**로만 비교해 순서만 바뀌어도 "변경"으로 판정한다 | 확인함 |
| m20 | `tracking.ts:87` | `d.track_occur_date.split(' ')` — 값이 없으면 TypeError로 함수 전체가 던져진다 | 확인함 |

### Info
- **파일 크기(wc -l):** `orders.ts` 1,400줄은 소스코드 Advisory 구간(1,000~1,500), `ups-actual-cost.ts` 956줄은 구간 직전. Hard Limit(1,500) 초과 파일은 **없음**.
- **기존 50줄 초과 함수(이번 신규 아님, 규칙 대비 기록):** `recordUpsActualCharges` 247, `getUpsChargeReconciliation` 67, `searchDeliveredUpsOrders` 80, `recomputeRevenue` 60, `recordUpsActualCost` 259, `previewUpsActualCost` 81, `recordActualCostAndFinalize` 159, `refreshUpsRateSnapshot` 145, `storeTrackingEvents` 76, orders.ts의 `saveOrderRateSnapshot` 76·`createOrder` 93·`updateOrder` 305·`getOrders` 61·`updateOrderStatus` 84·`getOrderByBarcodeOrNo` 84·`applyPackageMeasurements` 219.
- `isBeforeCutover`(`ups-actual-cost.ts:737-740`)는 항상 `false`인 stub(TODO #1369)이다.
- 엑셀의 `asText`(`statement-excel.ts:181-184`) 주석은 "수식 주입 방지"라고 하나 실제 동작은 문자열 변환이다. xlsx 문자열 셀은 수식으로 평가되지 않으므로 의도한 효과는 낸다고 본다(ExcelJS 동작은 코드로 확인하지 않음, **추정**).
- `getOrderReleasedDate`를 `'use server'` 파일에서 `lib/orders/`로 옮겨 인증 없는 export를 제거한 것은 DEF-150 §1.2 이행으로 **확인함**.

---

## 3. 잘된 점 (확인함)
- `billing-statements.ts` 전 구간: 모든 실패 반환 앞에 `logger`, `catch`에서 에러 객체를 `logger.error(…, err)`로 전달, 보조 조회 오류를 fail-open으로 삼키지 않음(`:325-333`), 조건부 UPDATE 행 수 검사(`:645`, `:691`, `:741`), 중복 id 제거(`:559-568`), 기간 KST 개구 구간(`:316`, `date-kst.ts:25-36`).
- Excel: 페이징 조회와 상한(500/10,000) 초과 시 500 처리(`statement-excel-data.ts:99-123`), 합계 불일치 시 파일 미생성(`:323-329`), 정수 센트 비교(`:277-299`), 파일명·헤더 주입 방어(`statement-excel.ts:475-499`), 404 존재 비노출·`no-store`(`route.ts`).
- `rate-snapshot-refresh.ts`: 소유 검증 후에만 admin client 사용(`:89-95`, `:196`), `is_manual` 스냅샷 보호(`:182-187`), 갱신 생략 경로마다 사유를 포함한 로그.
- SHXK 로깅(B-357): 실패 분기 로그와 개인정보·라벨 본문을 싣지 않는 로그 필드 구성 확인(`order.ts:54-122`, `tracking.ts:44-50`).
- `normalize-shipper-name.ts`·`date-kst.ts`·`lib/ups/actual-cost.ts`: 순수 함수, 문서화된 규칙과 코드가 일치.

---

## 4. 종합 의견
1. **Blocker는 없다.** 청구서 서버 액션(`billing-statements.ts`)과 Excel 경로의 품질은 높다.
2. **통합 전 수정 여부를 판단할 항목: M1(MANAGER·오류 시 fail-open), M2(목록 조용한 누락), M9(신규 함수 50줄 초과).** 세 건 모두 이번 통합에서 새로 들어오는 함수 `markOrderCostSettled`·`getOrdersForCostSettlement`에 있다. M1은 #1451 규칙 1(MANAGER 정산마감)·MANAGER 정책 문제와 직접 연결되므로 #1451 설계 의견과 함께 처리하는 편이 낫다.
3. **데이터가 쌓이기 전에 정할 항목: M3(원가 컬럼 의미).** 운영 실비 테이블은 0건이다.
4. **후속(통합 후 가능): M4~M8, M10, Minor 전체.** M7은 #1453(C)과 겹치므로 설계 의견에 편입을 권한다.
5. 이 검토는 정적 읽기이며 실행·재현은 하지 않았다. M1의 MANAGER 동작, M7의 메일 내용, M8의 중복 삽입은 로컬 재현이 필요하다.

---

## 5. 실행한 명령과 실행하지 못한 항목

| 항목 | 상태 |
|:--|:--|
| `git diff --name-only origin/develop...83bb486f -- <경로>`, `git show 83bb486f:<경로>` | 실행함 |
| 함수 길이 실측: TypeScript 컴파일러 API(`node scratchpad/fnlen_1172.js`)로 함수·메서드·화살표 함수 노드의 시작~끝 줄 계산 | 실행함(§2 M9·Info 수치) |
| `npm run check:ds11` 상당(`node scripts/check-ds11-sync.mjs`, 격리 워크트리 `83bb486f`, 종료 후 제거) | 실행함: `액션 함수 308개 \| Ds-11 언급 183개 \| 미반영 125개 (허용 목록 125개)` → **"OK — 허용 목록 밖의 신규 미반영 없음."** (이 점검은 함수명 언급 여부만 본다) |
| 운영 DB 읽기 전용 조회(`pg_policies`): `zen_invoices`·`zen_order_costs`·`zen_ups_actual_*`, 2026-11-23 17:58·18:05·18:51 KST | 실행함 |
| 애플리케이션 코드·테스트 실행, 빌드, 로컬 재현 | **실행하지 않음** |
| `src/lib/shxk/client.ts` 등 diff 밖 파일, `ups-actual-charges.ts` 300~396의 변경 없는 줄 | **미확인** |
| 입력 화면의 통화 제한(M6), 환율 기준일 UTC 사용 의도(M5), 수신자 의도(M7) | **미확인** |

Team B 파일 변경 0건(읽기만 수행, 저장소 메인 체크아웃의 브랜치·파일 변경 없음).

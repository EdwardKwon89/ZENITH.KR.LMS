# TASK-B-277: Issue #1052 — 오더 등록 항목 vs SHXK UPS API 필수 항목 대조 및 유효성 검증 추가

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1052](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1052) |
| **배경** | JSJung 요청 — 오더 등록 항목과 SHXK UPS API 필수항목을 체크해 유효성 검증 로직 추가. 오늘 `ZEN-2026-000008` 실제 createorder 테스트에서 `recipient_zipcode` 누락으로 실패("收件人邮编不能为空")한 것을 계기로 요청 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 현황 분석 (Jaison, 코드+스펙 대조 완료)

### SHXK `createorder` 공식 필수 필드 스펙
`docs/80_RawData/Phase8_UPS_API_리서치_결과.md:99-176`(Dave, TASK-B-023, 실측 API 문서 기반)에 전체 필드표 존재. 필수(**Y**)/조건부(조건) 필드:

| 필드 | 필수 | 현재 매핑 소스 |
|:-----|:---:|:-----|
| `shipper.shipper_name` | Y | `order.shipper_contact_name` |
| `shipper.shipper_countrycode` | Y | `order.shipper_country_code`(기본 KR) |
| `shipper.shipper_street` | Y | 조직 프로필 주소(`resolveShipperStreet`) |
| `shipper.shipper_telephone`/`mobile` | 조건(1개 이상) | `order.shipper_contact_phone` |
| `consignee.consignee_name` | Y | `order.recipient_name` |
| `consignee.consignee_countrycode` | Y | `order.recipient_country_code` |
| `consignee.consignee_street` | Y | `order.recipient_address` |
| `consignee.consignee_postcode` | 조건 | `order.recipient_zipcode` |
| `consignee.consignee_telephone`/`mobile` | 조건(1개 이상) | `order.recipient_phone` |
| `consignee.consignee_province/city/district` | 조건(국가별) | `order.recipient_state_province`/`city` |
| `consignee.consignee_tariff`(PCCC/세금번호) | 조건 | `order.recipient_pccc` |
| `invoice[].invoice_enname` | Y | `item.item_name` |
| `invoice[].invoice_quantity` | Y | `item.quantity` |
| `invoice[].invoice_unitcharge` | Y | `item.unit_price` |

### 현재 `src/lib/validation/order.ts` 검증 상태 (필드별 대조)

**이미 충족(작업 불필요)**:
- `recipient_name` — 필수 ✅
- `recipient_address` — 필수 ✅
- `recipient_phone` — 필수 ✅
- `item_name` — 필수 + 영문/숫자/일반기호 전용 정규식(DEF-105 조치 완료) ✅
- `recipient_state_province` — CN일 때만 조건부 필수(DEF-B-044/TASK-B-272 조치 완료) ✅

**갭 발견(이번 Task 대상)**:
- `recipient_country_code` — 현재 `.optional()`, SHXK 스펙상 **Y(필수)**인데 검증 없음
- `recipient_zipcode` — 현재 `.optional()`, SHXK 스펙상 "조건"이나 **오늘 실제 실패로 확인**(`ZEN-2026-000008`, 중국행, `收件人邮编不能为空`) — 실무상 사실상 상시 필수로 판단
- `shipper_contact_phone` — 현재 `.optional()`, SHXK는 shipper 전화/휴대폰 중 1개 필수인데 우리 스키마엔 전화 필드 하나뿐이라 사실상 이것도 필수여야 함

**참고(이번 Task 범위 밖, 검토만 권장)**:
- `recipient_pccc`(세금번호/PCCC) — 조건부 요구. 한국 개인통관 관련 법규 판단이 필요해 이번엔 강제하지 않음 — JSJung/법무 확인 필요 시 별도 Task
- `consignee_province/city`가 중국 외 다른 국가에도 조건부로 필요한지(예: 미국 State) — 국가별 개별 조사 필요, 이번 범위 아님(DEF-B-044는 중국만 확정 처리)
- `shipper.shipper_street`는 오더가 아니라 **조직 프로필 주소**에서 옴(TASK-B-271로 corporate 주소 입력이 정비됨) — 주문 폼 레벨 검증 대상이 아니라 "발주 조직이 주소를 등록했는지" 별도 확인 필요 → 아래 "2. 방어적 사전 점검" 참조

## 수정 방향 (설계 확정 — 착수 승인)

**2단계 방어(defense-in-depth) 구조로 설계**:

### 1. 오더 등록 폼 레벨 검증 (`src/lib/validation/order.ts`)
`orderRegistrationSchema`의 `superRefine`에 `transport_mode === 'UPS'`일 때만 적용되는 조건부 필수 검증 추가(기존 CN 검증과 동일 패턴):
```ts
if (data.transport_mode === 'UPS') {
  if (!data.recipient_country_code || data.recipient_country_code.trim() === '') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'UPS 배송은 수하인 국가 선택이 필수입니다', path: ['recipient_country_code'] });
  }
  if (!data.recipient_zipcode || data.recipient_zipcode.trim() === '') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'UPS 배송은 수하인 우편번호가 필수입니다(SHXK API 요구사항)', path: ['recipient_zipcode'] });
  }
  if (!data.shipper_contact_phone || data.shipper_contact_phone.trim() === '') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'UPS 배송은 화주 연락처가 필수입니다(SHXK API 요구사항)', path: ['shipper_contact_phone'] });
  }
}
```
- 기존 CN 전용 검증(`recipient_state_province`)은 그대로 유지, 위 블록과 병렬로 추가.
- UI에서도 해당 필드에 `*` 표시 등 필수 안내 추가 검토(`OrderRegistrationForm.tsx`, 강제 아님).

### 2. SHXK 호출 직전 방어적 사전 점검 (신규, `src/lib/ups/` 또는 `src/lib/shxk/`)
폼 검증을 우회할 수 있는 경로(벌크 오더 임포트 등)까지 방어하기 위해, **실제 `buildCreateOrderPayload()` 결과물을 SHXK 호출 직전에 한 번 더 검증**하는 함수 신규 작성:
```ts
// 예: src/lib/shxk/validate-payload.ts
export function validateShxkPayload(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const shipper = payload.shipper as Record<string, unknown>;
  const consignee = payload.consignee as Record<string, unknown>;
  const invoice = payload.invoice as Record<string, unknown>[];

  if (!shipper?.shipper_name) errors.push('발송인 성명 누락');
  if (!shipper?.shipper_countrycode) errors.push('발송인 국가코드 누락');
  if (!shipper?.shipper_street) errors.push('발송인 주소 누락');
  if (!shipper?.shipper_telephone) errors.push('발송인 연락처 누락');

  if (!consignee?.consignee_name) errors.push('수취인 성명 누락');
  if (!consignee?.consignee_countrycode) errors.push('수취인 국가코드 누락');
  if (!consignee?.consignee_street) errors.push('수취인 주소 누락');
  if (!consignee?.consignee_postcode) errors.push('수취인 우편번호 누락');
  if (!consignee?.consignee_telephone) errors.push('수취인 연락처 누락');

  if (!invoice || invoice.length === 0) errors.push('통관 신고 품목 누락');
  invoice?.forEach((item, i) => {
    if (!item.invoice_enname) errors.push(`품목 ${i+1}: 영문 품명 누락`);
    if (!item.invoice_quantity) errors.push(`품목 ${i+1}: 수량 누락`);
    if (!item.invoice_unitcharge) errors.push(`품목 ${i+1}: 단가 누락`);
  });

  return errors;
}
```
`registerUpsOrder()`(또는 `confirmUpsRegistration` 흐름 중 실제 `createorder` 호출 직전 지점 — 구현자가 정확한 호출부 파악 후 적용)에서 이 검증을 먼저 돌려, 에러가 있으면 **SHXK 호출 자체를 하지 않고** 명확한 한글 에러 메시지로 즉시 실패시킴(현재처럼 SHXK 서버까지 갔다가 중문 에러 메시지로 실패하는 것보다 훨씬 빠르고 명확).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-277-shxk-required-validation` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/dave` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-277 확인
- [ ] `order.ts`의 `orderRegistrationSchema`에 UPS 전용 조건부 필수 검증 3건 추가(recipient_country_code/recipient_zipcode/shipper_contact_phone)
- [ ] `validateShxkPayload()`(또는 동등 함수) 신규 작성 + 실제 `createorder()` 호출부에 배선(호출 직전 검증, 실패 시 API 호출 스킵)
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - UPS 오더 + `recipient_country_code`/`recipient_zipcode`/`shipper_contact_phone` 각각 누락 시 폼 검증 실패 확인(3건 개별)
  - 비UPS 오더(AIR/SEA 등)는 위 3개 필드가 없어도 정상 제출 가능 확인(회귀 방지 — UPS 전용 조건임을 확실히)
  - `validateShxkPayload()` 단위 테스트 — 정상 payload는 에러 0건, 각 필수 필드 누락 시 해당 에러 메시지 반환 확인
  - `registerUpsOrder()`(또는 실제 호출부) 통합 테스트 — 필수 필드 누락 payload 전달 시 `callShxk`/`createorder`가 **호출되지 않는지** 확인(mock 호출 횟수 0건 검증)
  - **되돌리기 검증 필수** — 각 검증 로직 제거 시 누락된 필드로도 통과되는 회귀가 재현되는지 확인
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 오더 등록 화면에서 UPS 배송 + 우편번호 미입력 상태로 제출 시도 → 명확한 에러로 차단되는지 확인. 정상 입력 시 제출 성공 확인. 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] feat: TASK-B-277 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1052 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1052`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-272/273(UPS pricing 영역)은 절차 정확히 준수 완료 — 동일 수준 기대. 이번 Task는 검증 로직 2단계(폼 레벨 + payload 레벨)를 모두 구현해야 함 — 하나만 하고 완료 보고하지 말 것. 회귀 테스트에서 "필수 필드 누락 시 SHXK가 호출조차 안 되는지"까지 확인하는 게 핵심(단순 에러 메시지 존재 확인보다 API 미호출 검증이 더 강력한 증거).

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

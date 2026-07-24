# TASK-206 — W4: 청구서 발행 시 이메일 알람 훅 추가

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-206 |
| **GitHub Issue** | [#748](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/748) (SNTL 회의록 [#718](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/718) W4) |
| **생성일** | 2026-07-23 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ✅ |

---

## [배경]

SNTL 회의록 W4: 청구서(인보이스) 발행 시 화주에게 이메일 알람 발송. 기존 인프라(Resend) 재사용 원칙.

## [Team A 배정 결정 근거] (Edward 지시로 Team B 재사용 가능성 조사 완료, 2026-07-23)

**조사 결과 — Team B의 관련 이메일 로직 존재 확인**:
- Team B(Dave, TASK-B-057/Issue #180)가 `src/lib/notifications/email.ts`에 `sendShipperWelcomeEmail()`을 이미 추가한 이력 있음(화주 계정 발급 시 임시비밀번호 안내 메일).
- 즉 Team B도 이 공용 Resend 래퍼 모듈에 새 이메일 타입을 추가해본 경험이 있음.

**그럼에도 Team A 배정이 타당한 이유**:
1. 실제 후크 지점(`finalizeInvoice()` — `src/app/actions/finance/settlement.ts`, `finalizeDailyShipperInvoices()` — `src/app/actions/finance/daily-billing.ts`, TASK-204)이 **전부 Team A 소유 파일**임. Team B의 이메일 경험은 완전히 다른 도메인(화주 계정 발급, `src/app/actions/agency/shippers.ts`)이라 이 후크 지점과는 무관.
2. **재사용할 정확한 패턴이 이미 Team A 코드에 존재** — `sendTaxInvoiceEmail(taxInvoiceId, recipientEmail)`(`src/app/actions/finance/invoice.ts:217`)가 세금계산서 발행 시 Resend로 이메일 발송 + `resend_id`를 메타데이터에 기록하는, 이번 요구사항과 거의 동일한 기존 구현체임.
3. 따라서 Team B에게 넘기면 도메인이 다른 파일(finance/settlement.ts, daily-billing.ts)을 처음부터 파악해야 하는 반면, Team A는 바로 옆에 있는 자기 패턴(`sendTaxInvoiceEmail`)을 그대로 재사용하면 됨 — **Team A가 수행하는 것이 명백히 더 수월함**. (Team B에 별도 의견 전달 불필요로 판단)

## [요구사항]

- `finalizeInvoice()`/`finalizeDailyShipperInvoices()` 완료 시점에 화주 이메일로 청구서 발행 알림 발송
- `sendTaxInvoiceEmail()`(`invoice.ts:217`) 패턴 재사용 — Resend 래퍼(`src/lib/notifications/email.ts`) 신규 함수로 추가(예: `sendInvoiceIssuedEmail`), 기존 `resend`/`FROM` 인스턴스 재사용(중복 초기화 금지)
- Resend 미설정 시(로컬 등) 기존 패턴대로 `logger.warn` 후 스킵 — 발송 실패가 정산 확정 자체를 막지 않도록 처리(best-effort)
- HTML 인젝션 방지(`escapeHtml`) 기존 규칙 준수(IMP-056 참고)
- 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)

## [발견 이슈]

없음

---

## DoD

- [x] `sendInvoiceFinalizedEmail()` 신규 함수 추가 — 기존 Resend 인스턴스/FROM 재사용
- [x] `finalizeInvoice()` 완료 후크에 연동 (`finalizeDailyShipperInvoices()`는 내부 위임으로 자동 커버)
- [x] best-effort 처리(발송 실패가 정산 확정을 막지 않음) — fire-and-forget + try/catch
- [x] escapeHtml 적용 확인
- [x] 신규 회귀 테스트 추가 (TC-F.10, 2 cases)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)
- [x] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인 (788/788)
- [x] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [x] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

### 구현 내역

1. **`src/lib/notifications/email.ts`**: `sendInvoiceFinalizedEmail()` 신규 함수 추가
   - 기존 `resend`/`FROM` 인스턴스 재사용 (중복 초기화 없음)
   - `escapeHtml` 적용 (HTML 인젝션 방지)
   - Resend 미설정 시 `logger.warn` 후 스킵 (best-effort)
   - Intl.NumberFormat으로 통화 포맷 적용

2. **`src/app/actions/finance/settlement.ts`**: `finalizeInvoice()` 완료 후 이메일 발송 훅 추가(1차 반려 후 await+try/catch 방식으로 수정)
   - `invoice.shipper_id` → `zen_organizations.name` (회사명)
   - `invoice.shipper_id` → `zen_profiles` (`role='SHIPPER'`, `status='ACTIVE'`) (수신자 이메일)
   - `finalizeDailyShipperInvoices()`는 내부에서 `finalizeInvoice()` 호출하므로 자동 커버
   - try/catch 감싸기로 발송 실패가 정산 확정을 차단하지 않음

3. **`tests/unit/finance/invoice-finalized-email.test.ts`**: TC-F.10 신규 단위 테스트 (2 Cases)
   - TC-F.10-1: 정상 파라미터 전달 + Resend 호출 검증
   - TC-F.10-2: HTML escape 검증 (`escapeHtml` 미적용 시 XSS 방어 확인)

### 커밋

| 순서 | 해시 | 메시지 |
|:----:|:-----|:-------|
| 1 | `204ca589` | `[D_Kai] feat: TASK-206 인보이스 발행 시 화주 이메일 알림 훅 추가` |
| 2 | `5656c9c6` | `[D_Kai] test: TASK-206 sendInvoiceFinalizedEmail 단위 테스트 TC-F.10 추가` |

### 검증

- `npm run test:regression`: **788/788 PASS** (기존 786 + TC-F.10 2 케이스)
- `npx next build`: Errors 0 (pre-existing test TS errors only)

### PR

- **PR**: [#752](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/752) `feature/teama-task-206-invoice-finalized-email-notification → develop`
- **Branch**: `feature/teama-task-206-invoice-finalized-email-notification` (clean worktree 기반, R-17 §0 준수)

## [Aiden 검토]

### 1차 검토 (2026-07-23) — 수정 요청 1건

**판정**: ⚠️ 반려(경미) — 나머지는 우수

**양호한 점**: 격리 워크트리 재현 단위테스트 2/2 + 전체 회귀 116/788 PASS, **실제 CI 3항목 전부 SUCCESS**(이번 세션 최초로 CI 정상 트리거 확인), 워크트리 격리 정상 준수, `escapeHtml` 실제 XSS 방어 검증하는 진짜 단위 테스트.

**수정 요청**: `settlement.ts`의 이메일 발송 훅이 `void (async () => {...})()`로 await 없이 실행됨 — 기존 `sendStatusChangeEmail()` 호출부(`notifications.ts`)는 동일 요구사항(발송 실패가 메인 로직을 막지 않음)을 `await`+`try/catch`로 처리하는 것과 불일치. Vercel 서버리스 환경에서 응답 반환 후 프로세스가 종료되면 await 없는 백그라운드 Promise가 완료 전 강제 종료되어 이메일이 조용히 누락될 위험 — 기존 패턴대로 `await`로 변경 요청.

**비차단 참고**: DoD 체크박스 2건("LIVE_REGRESSION_TEST_MAP 등록"·"ACTIVE_TASK.md 반영")이 `[ ]`로 남아있으나 실제로는 해당 커밋에 이미 반영되어 있었음(과소 보고, 문제되는 방향 아님) — 다음 제출 시 체크박스만 정정.

상세: PR#752·Issue#748 코멘트 참고.

### 최종 승인 (2026-07-23, 커밋 `95726293`)

**판정**: ✅ 승인 — fire-and-forget→await+try/catch 수정 diff 직접 확인, 격리 워크트리 재검증(회귀 116/788 PASS, tsc 신규 에러 없음). develop 병합 진행.

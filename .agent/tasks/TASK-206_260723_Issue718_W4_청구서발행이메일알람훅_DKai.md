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
| **상태** | ⬜ |

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

- [ ] `sendInvoiceIssuedEmail()`(또는 유사) 신규 함수 추가 — 기존 Resend 인스턴스/FROM 재사용
- [ ] `finalizeInvoice()`/`finalizeDailyShipperInvoices()` 완료 후크에 연동
- [ ] best-effort 처리(발송 실패가 정산 확정을 막지 않음) 확인
- [ ] escapeHtml 적용 확인
- [ ] 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)
- [ ] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(D_Kai 작성 예정)_

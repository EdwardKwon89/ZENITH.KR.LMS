# TASK-B-239: Issue #937 — 회원가입 시 확인 메일에 로그인 정보(이메일+비밀번호) 발송

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#937](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/937) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

JSJung 확인: 신규 가입 시 확인 메일이 발송되어야 하고, 그 메일에 설정한 비밀번호가 안내되어야 합니다. 현재 자가등록(`signup()`, `src/app/[locale]/(auth)/login/actions.ts:108`) 플로우는 이메일을 전혀 보내지 않습니다. 동일 패턴(계정 생성 시 이메일+비밀번호 발송)이 이미 `createAgencyShipper()`(`src/app/actions/agency/shippers.ts`)의 `sendShipperWelcomeEmail()`에 구현되어 있어, 이번 Task는 이 기존 함수를 자가등록 플로우에도 적용하는 것입니다.

## ⚠️ 추가 발견 (2026-07-28) — Resend 발송 실패가 조용히 삼켜지는 버그 (이번 Task에서 함께 수정)

JSJung이 실제로 `createAgencyShipper()`로 계정을 생성했는데 메일이 오지 않아 Jaison이 재현 조사:

1. **Resend API 자체가 거부(운영 이슈, 이번 Task 범위 밖)**: 현재 Resend 계정이 샌드박스 모드로, `onboarding@resend.dev` 발신 주소는 **Resend 계정 소유자 본인 이메일(`jungjs72@gmail.com`)에게만** 발송 가능하고 다른 수신자는 403으로 거부됨(직접 API 호출로 재현 확인). 도메인 인증은 별도 운영 조치 필요 — 이번 Task에서 손대지 않음.
2. **코드 버그(이번 Task에서 함께 수정)**: `src/lib/notifications/email.ts`의 기존 4개 발송 함수(`sendStatusChangeEmail`/`sendFreightChangeEmail`/`sendShipperWelcomeEmail`/`sendInvoiceFinalizedEmail`) 전부 `resend.emails.send()`의 반환값 `{data, error}`에서 **`error` 필드를 전혀 확인하지 않음** — resend-node SDK는 API 레벨 오류를 예외로 던지지 않고 반환값으로 주는데 이를 체크 안 해서 실제로 거부돼도 "성공"처럼 처리됨.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/lib/notifications/email.ts` — 공통 발송 헬퍼로 통합 + error 체크 추가

기존 4개 함수 전부와 신규 함수가 각자 `if (!resend) {...}` + `await resend.emails.send(...)`를 반복하고 있으므로, 공통 헬퍼로 통합:

```ts
async function sendViaResend(params: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    logger.warn(`[NOTIF] Resend API Key is missing. Skipping email to ${params.to} (${params.subject})`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to: params.to, subject: params.subject, html: params.html });
  if (error) {
    logger.error(`[NOTIF] Resend send failed for ${params.to} (${params.subject}):`, error);
    throw new Error(error.message || 'Resend 이메일 발송 실패');
  }
}
```

**기존 4개 함수**(`sendStatusChangeEmail`/`sendFreightChangeEmail`/`sendShipperWelcomeEmail`/`sendInvoiceFinalizedEmail`) 각각의 `if (!resend) {...}` 블록과 마지막 `await resend.emails.send(...)` 줄을 `await sendViaResend({ to: ..., subject, html });` 한 줄로 교체 — 각 함수의 `subject`/`html` 계산 로직 자체는 변경하지 않습니다.

### 2. 신규 함수 `sendSignupWelcomeEmail()` 추가 (위 헬퍼 사용, `sendShipperWelcomeEmail()`을 본떠 작성)

```ts
export async function sendSignupWelcomeEmail(params: {
  email: string;
  fullName: string;
  password: string;
}): Promise<void> {
  const subject = '[ZENITH LMS] 회원가입이 완료되었습니다 — 로그인 정보 안내';
  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/ko/login`
    : '/ko/login';

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1e293b">회원가입이 완료되었습니다</h2>
      <p style="color:#475569">안녕하세요, ${escapeHtml(params.fullName)}님</p>
      <p style="color:#475569">ZENITH LMS 계정이 생성되었습니다. 아래 정보로 로그인해주세요.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#64748b">로그인 ID</td><td style="padding:8px;font-weight:bold">${escapeHtml(params.email)}</td></tr>
        <tr><td style="padding:8px;color:#64748b">비밀번호</td><td style="padding:8px;font-weight:bold;font-family:monospace">${escapeHtml(params.password)}</td></tr>
        <tr><td style="padding:8px;color:#64748b">로그인 URL</td><td style="padding:8px"><a href="${loginUrl}" style="color:#0ea5e9">${loginUrl}</a></td></tr>
      </table>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin:16px 0">
        <p style="color:#92400e;margin:0;font-size:13px">
          <strong>🔒 보안 안내</strong><br>
          본인이 가입하지 않았다면 즉시 관리자에게 문의해주세요.<br>
          비밀번호는 타인과 공유하지 마세요.
        </p>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">본 메일은 ZENITH LMS에서 자동 발송된 알림입니다.</p>
    </div>
  `;

  await sendViaResend({ to: params.email, subject, html });
}
```

### 3. `signup()`(`src/app/[locale]/(auth)/login/actions.ts:108`)에서 호출

`if (error) { return { error: error.message }; }` 통과 직후(158행 다음), 즉 가입 성공이 확정된 시점에 추가:

```ts
try {
  await sendSignupWelcomeEmail({ email, password, fullName });
} catch (emailError) {
  logger.error('[SIGNUP_ACTION] Welcome email failed (non-fatal):', emailError);
}
```

**주의**: `createAgencyShipper()`의 기존 패턴과 동일하게 **이메일 발송 실패가 가입 자체를 실패시키면 안 됩니다**(non-fatal, best-effort) — 반드시 try/catch로 감싸고 실패해도 `signup()`은 정상 진행(`return { success: true }`)되어야 합니다.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-239-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 239 나와야 정상)
- [ ] 위 스펙대로 `email.ts`/`actions.ts` 수정 (공통 헬퍼 `sendViaResend()` 추가 + 기존 4개 함수 교체 + 신규 함수 + `signup()` 호출)
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지, 본인 toContain 반복 이력 9회 참고 — 이번엔 절대 재발 금지):
  1. **`sendViaResend()`(또는 이를 사용하는 아무 send 함수)** — Resend mock이 `{data: null, error: {message: '...'}}`을 반환하면 실제로 예외(throw)를 던지는지 확인 — 이번에 고치는 핵심 버그의 회귀 테스트, 가장 중요함
  2. `sendSignupWelcomeEmail()` 단위 테스트 — `resend.emails.send()`가 올바른 `to`/`subject`/비밀번호 포함 `html`로 호출되는지(Resend 클라이언트 mock, 실제 호출 인자 검증)
  3. `signup()` 통합 — 가입 성공 시 `sendSignupWelcomeEmail`이 올바른 인자로 호출되는지, 이메일 발송이 실패해도(mock에서 error 반환) `signup()` 자체는 `{success:true}`를 반환하는지(non-fatal 확인 — 이 케이스를 반드시 mock으로 실패시켜 재현할 것)
  4. 기존 4개 함수(`sendStatusChangeEmail` 등)의 기존 테스트가 리팩터링 후에도 그대로 PASS하는지 확인(회귀 없음)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 주의사항**: Resend 계정이 현재 샌드박스 모드라 **`jungjs72@gmail.com`(Resend 계정 소유자 본인 이메일)으로만 실제 발송 테스트가 가능**합니다. 다른 임의의 이메일로 테스트하면 코드가 정확해도 403으로 거부되는 게 정상이니 혼동하지 마세요. 로컬에서 `jungjs72@gmail.com`으로 실제 회원가입을 수행해 이메일이 실제로 도착하는지 확인 → 스크린샷/캡처로 증적 남길 것

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] feat: TASK-B-239 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 937 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #937`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. **toContain 소스 문자열 검사 유형 누적 9회 + vacuous test 2회(다른 메커니즘 각각)** — 이번에도 재발 시 심각한 반복입니다. 반드시 실제 `sendSignupWelcomeEmail`/`signup` 함수 호출 기반으로, mock의 실제 호출 인자(`to`, `html` 내 비밀번호 포함 여부, non-fatal 케이스)를 검증할 것. 이번 Task는 기존 4개 이메일 함수의 리팩터링도 포함하므로, 기존 테스트가 깨지지 않는지 특히 꼼꼼히 확인할 것.

## [작업 결과]

### 변경 내용

#### `src/lib/notifications/email.ts`
- `sendViaResend()` 공통 발송 헬퍼 추가 (error 체크 포함 — Resend API 오류 시 throw)
- 기존 4개 함수(`sendStatusChangeEmail`/`sendFreightChangeEmail`/`sendShipperWelcomeEmail`/`sendInvoiceFinalizedEmail`) 리팩터링
- `sendSignupWelcomeEmail()` 신규 추가 (회원가입 확인 메일, 비밀번호 포함)

#### `src/app/[locale]/(auth)/login/actions.ts`
- `signup()` 가입 성공 시 `sendSignupWelcomeEmail` 호출 (non-fatal, try/catch)

### 테스트 (behavioral)
- `sendViaResend()` error 체크: Resend API 오류 시 예외 throw 검증
- `sendSignupWelcomeEmail()` 발송 인자 검증 (to/subject/html)
- 기존 4개 함수 리팩터링 회귀 검증

### 검증
- **빌드**: ✅ PASS
- **테스트**: `email.test.ts` 8/8 PASS
- **회귀**: 141/141 파일, 951/951 테스트 ALL PASS
- **커밋 해시**: `3131ec6e`

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

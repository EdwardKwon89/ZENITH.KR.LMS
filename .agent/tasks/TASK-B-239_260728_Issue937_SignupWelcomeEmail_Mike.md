# TASK-B-239: Issue #937 — 회원가입 시 확인 메일에 로그인 정보(이메일+비밀번호) 발송

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#937](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/937) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

JSJung 확인: 신규 가입 시 확인 메일이 발송되어야 하고, 그 메일에 설정한 비밀번호가 안내되어야 합니다. 현재 자가등록(`signup()`, `src/app/[locale]/(auth)/login/actions.ts:108`) 플로우는 이메일을 전혀 보내지 않습니다. 동일 패턴(계정 생성 시 이메일+비밀번호 발송)이 이미 `createAgencyShipper()`(`src/app/actions/agency/shippers.ts`)의 `sendShipperWelcomeEmail()`에 구현되어 있어, 이번 Task는 이 기존 함수를 자가등록 플로우에도 적용하는 것입니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/lib/notifications/email.ts`에 신규 함수 `sendSignupWelcomeEmail()` 추가

`sendShipperWelcomeEmail()`(96~139행)를 그대로 본떠 작성(문구만 자가등록에 맞게 조정):

```ts
export async function sendSignupWelcomeEmail(params: {
  email: string;
  fullName: string;
  password: string;
}): Promise<void> {
  if (!resend) {
    logger.warn(`[NOTIF] Resend API Key is missing. Skipping signup welcome email for ${params.email}`);
    return;
  }

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

  await resend.emails.send({ from: FROM, to: params.email, subject, html });
}
```

### 2. `signup()`(`src/app/[locale]/(auth)/login/actions.ts:108`)에서 호출

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
- [ ] 위 스펙대로 `email.ts`/`actions.ts` 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지, 본인 toContain 반복 이력 9회 참고 — 이번엔 절대 재발 금지):
  1. `sendSignupWelcomeEmail()` 단위 테스트 — `resend.emails.send()`가 올바른 `to`/`subject`/비밀번호 포함 `html`로 호출되는지(Resend 클라이언트 mock, 실제 호출 인자 검증)
  2. `signup()` 통합 — 가입 성공 시 `sendSignupWelcomeEmail`이 올바른 인자로 호출되는지, 이메일 발송이 실패해도(mock에서 reject) `signup()` 자체는 `{success:true}`를 반환하는지(non-fatal 확인 — 이 케이스를 반드시 mock으로 실패시켜 재현할 것, 성공 케이스만 테스트하면 non-fatal 여부를 증명 못 함)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] R-10: 로컬에서 실제 회원가입 1건 수행 → `.env.local`에 실제 `RESEND_API_KEY`가 설정되어 있으므로 **실제 이메일이 발송되는지** 확인(Resend 대시보드 또는 실제 수신함 확인) → 스크린샷/캡처로 증적 남길 것

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] feat: TASK-B-239 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 937 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #937`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. **toContain 소스 문자열 검사 유형 누적 9회 + vacuous test 2회(다른 메커니즘 각각)** — 이번에도 재발 시 심각한 반복입니다. 반드시 실제 `sendSignupWelcomeEmail`/`signup` 함수 호출 기반으로, mock의 실제 호출 인자(`to`, `html` 내 비밀번호 포함 여부, non-fatal 케이스)를 검증할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

# DEF-B-143: Resend 이메일 도메인(zenith-lms.com) 미인증 — 알림 이메일 전량 발송 실패

- **발견 경위**: 2026-08-25, Edward 요청으로 원격 Vercel 실사용 이력 확인 중 `get_runtime_errors`(Vercel Runtime Errors, 최근 이력 집계)에서 발견
- **현상**:
  ```
  statusCode: 403
  message: "The zenith-lms.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"
  ```
  - 2026-08-11, 2026-08-19 두 차례 창고 출고(`/warehouse/outbound`) 상태변경 알림 이메일(오더 ZEN-2026-000011, 수신자 james@sntl.co.kr)이 이 사유로 실패
  - `src/lib/notifications/email.ts`를 사용하는 모든 이메일 발송 경로(회원가입 확인메일, 화주 계정 발급, 인보이스 발행 알림, 입고 실측 통보 등)가 동일하게 실패할 가능성
- **영향 범위**:
  - 즉시: 위 발송 대상 알림 이메일 미수신 (기능 자체는 애플리케이션 로직상 정상 동작 — Resend API 호출만 403으로 거부됨)
  - **잠재적으로 더 중요**: GOV_COMMON.md v3.5(2026-08-23)에서 확정한 "핵심 지점(Critical Point) 실시간 알림" 설계가 `logClientError()` CRITICAL 발생 시 이메일 발송을 전제로 함(§`실패 관측성 의무` — Issue #1181~1183/#1185 DoD에 이미 반영됨). 이 도메인 미인증 문제가 해소되지 않으면, 향후 구현될 CRITICAL 알림 이메일도 동일하게 조용히 실패해 "실시간 알림"의 실효성이 없어짐.
- **긴급도**: High (현재 알림 기능 자체가 무효화된 상태 + 신규 설계된 핵심 지점 알림의 전제조건)
- **원인 추정**: Resend 대시보드(https://resend.com/domains)에서 `zenith-lms.com` 도메인의 DNS 인증(SPF/DKIM 등)이 완료되지 않은 상태로 추정. 코드 결함이 아니라 외부 서비스 설정 미비.
- **권장 조치**:
  1. Resend 대시보드에서 `zenith-lms.com` 도메인 인증 상태 확인 — 미인증이면 DNS 레코드(TXT/CNAME) 등록 후 인증 완료
  2. 도메인 인증이 어려운 경우(도메인 소유권 이슈 등) 임시 대안: Resend 기본 발신 도메인(`onboarding@resend.dev` 등 검증된 발신자)으로 전환하거나, 실제 발송 가능한 검증된 도메인으로 `FROM` 주소 변경
  3. 해소 후 `warehouse/outbound` 등 발송 트리거 재현 테스트로 실제 수신 확인
  4. GOV v3.5 핵심 지점 알림 이메일 구현(#1181~1183/#1185) 착수 전, 이 건이 먼저 해소되어 있어야 함 — 순서 의존성 명시 필요
- **관련 파일**: `src/lib/notifications/email.ts`, `src/app/actions/operations/warehouse.ts`(창고 출고 알림 트리거)
- **관련 Task**: TASK-B-323 (Issue 신규 발령)

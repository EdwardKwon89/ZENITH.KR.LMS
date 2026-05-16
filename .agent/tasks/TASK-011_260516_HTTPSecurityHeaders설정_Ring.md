# TASK-011 — HTTP Security Headers 설정 (CSP·HSTS·X-Frame)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-011 |
| IMP-ID | IMP-066 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Ring (Qwen) |
| 우선순위 | P2 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

HTTP Security Headers(CSP, HSTS, X-Frame-Options, X-Content-Type-Options 등)가 미설정되어 있습니다.
XSS, Clickjacking, MIME 스니핑 등 브라우저 기반 공격에 무방비 상태입니다.
`next.config.ts`의 `headers()` 함수를 통해 전역 보안 헤더를 추가해야 합니다.

---

## 목표 헤더 목록

| 헤더 | 값 |
|:-----|:---|
| `Content-Security-Policy` | 도메인 제한 CSP 정책 (Supabase·Vercel 도메인 포함) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | 카메라/마이크/위치 비활성화 |

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-011 → 🔄 동시 반영**
2. `next.config.ts` 현재 설정 확인
3. `headers()` 함수 추가 또는 기존 함수에 보안 헤더 병합
4. CSP 정책 작성 시 현재 사용 중인 외부 도메인(Supabase Storage·Auth·Vercel Analytics 등) 화이트리스트 반영
5. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
6. `rtk npm run build` 로컬 빌드 성공 확인 (헤더 설정 오류 조기 감지)
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. 커밋: `[Ring] fix: IMP-066 HTTP Security Headers 설정 (CSP·HSTS·X-Frame)`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-011 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-066 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] 6개 보안 헤더 전량 설정 완료
- [ ] CSP 정책 사용 중인 외부 도메인 화이트리스트 포함
- [ ] 빌드 성공 확인
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[Ring] fix: IMP-066` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 작업 결과

> **이 섹션은 착수 후 Ring이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 설정 헤더 수 | — |
| CSP 화이트리스트 도메인 | — |
| 회귀 결과 | — |
| 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | — |
| 판정 | — |
| 검토 의견 | — |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |

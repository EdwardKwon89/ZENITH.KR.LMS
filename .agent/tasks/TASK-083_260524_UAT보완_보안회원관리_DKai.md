# TASK-083 — UAT 절차서 보완: 세션보안·SUSPENDED·회원관리 (UAT-01-08·09, UAT-09-11)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-083 |
| IMP-ID | — (UAT 문서 작업) |
| 생성일 | 2026-05-24 |
| 담당 Agent | D_Kai |
| 우선순위 | P4 |
| 전제조건 | TASK-068 ✅ (IMP-071·072 세션 Idle·SUSPENDED) · TASK-073 ✅ (IMP-077 SCR-091 회원관리) |
| 상태 | ⬜ |
| 파급 효과 | UAT_01·UAT_09 기존 문서에 시나리오 추가 — 코드 변경 없음 |

---

## 배경

UAT Sprint(TASK-058~064) 완료 후 갭 분석 후속으로 구현된 IMP-071(세션 Idle Timeout)·IMP-072(SUSPENDED 계정 처리)·IMP-077(SCR-091 회원관리 UI)에 대한 UAT 절차서가 미작성된 채로 UAT_MASTER에 ⬜로 남아 있다. D_Kai는 세 기능 모두 직접 구현한 담당자이므로 절차서 작성에 가장 적합하다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-083 → 🔄 동시 반영**

2. **UAT_01_인증_회원가입.md에 UAT-01-08 추가**: `docs/91_FinalTest/UAT/UAT_01_인증_회원가입.md`
   - 시나리오: **UAT-01-08 세션 Idle Timeout 자동 로그아웃**
   - 화면: 전체 대시보드 (30분 미활동 감지 → `/ko/auth/login` redirect)
   - 역할: ALL
   - 핵심 검증: `zen_last_activity` 쿠키 설정 확인, 30분 미활동 후 자동 로그아웃, 재로그인 후 원래 페이지 복귀 또는 홈 이동
   - IMP-071 참조: `proxy.ts` zen_last_activity 쿠키 갱신, 만료 시 `/auth/login` redirect

3. **UAT_01_인증_회원가입.md에 UAT-01-09 추가**: (동일 파일 계속 작성)
   - 시나리오: **UAT-01-09 SUSPENDED 계정 접근 차단**
   - 화면 URL: `/ko/suspended` (안내 페이지)
   - 역할: ADMIN(정지 처리) · SUSPENDED 계정(접근 시도)
   - 핵심 검증: ADMIN이 회원 정지 처리 → 해당 계정 로그인 시 `/suspended` redirect, ShieldAlert 안내문구·로그아웃 버튼 표시, whitelist(auth·API) 우회 불가
   - IMP-072 참조: `proxy.ts userStatus === 'SUSPENDED'` 감지, `suspended/page.tsx`

4. **UAT_09_어드민_운영.md에 UAT-09-11 추가**: `docs/91_FinalTest/UAT/UAT_09_어드민_운영.md`
   - 시나리오: **UAT-09-11 SCR-091 회원 관리 전용 화면 (등급 변경·정지)**
   - 화면 URL: `/ko/admin/members`
   - 역할: ADMIN
   - 핵심 검증: 회원 목록 조회·검색, 등급(Grade) 변경, 계정 정지(SUSPEND)/복구(ACTIVE), 자기 자신 정지 불가(자기정지방지), i18n 레이블 정상 출력
   - IMP-077 참조: `src/app/[locale]/(dashboard)/admin/members/`, RBAC ADMIN 전용, 자기정지방지 로직

5. **UAT_MASTER.md 갱신**: UAT-01-08·01-09·09-11 행 상태 `⬜` → `✅`, 담당 Agent `D_Kai`로 갱신

6. **코드 커밋**: `[D_Kai] docs: TASK-083 UAT-01-08·09 보안 + UAT-09-11 회원관리 절차서 작성`
   - 포함 파일: `UAT_01_인증_회원가입.md` + `UAT_09_어드민_운영.md` + `UAT_MASTER.md`

7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)

8. **ACTIVE_TASK.md TASK-083 → 🔔 반영**

9. **문서 커밋**: `[D_Kai] docs: TASK-083 완료 보고 — task file 🔔`
   - 포함 파일: 본 파일 + `ACTIVE_TASK.md`

---

## 완료 기준 (DoD)

- [ ] UAT_01_인증_회원가입.md — UAT-01-08 절차표 완성 (30분 Idle·zen_last_activity·자동 로그아웃)
- [ ] UAT_01_인증_회원가입.md — UAT-01-09 절차표 완성 (SUSPENDED 감지·/suspended redirect·ShieldAlert)
- [ ] UAT_09_어드민_운영.md — UAT-09-11 절차표 완성 (등급변경·정지·복구·자기정지방지)
- [ ] UAT_MASTER.md 인덱스 UAT-01-08·01-09·09-11 상태 ✅ + 담당 D_Kai 반영
- [ ] 코드 커밋 완료 (해시: 기재 필수)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] 문서 커밋 완료 (해시: 기재 필수)

---

## 설계 의견 (Agent 작성)

> 단순 문서 작성 Task — 설계 의견 불필요. ⬜ → 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 단순 Task — 직행.

---

## 작업 결과

> 이 섹션은 착수 후 D_Kai가 작성합니다.

---

## Aiden 검토

> Aiden 검토 후 기재.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-24 | Aiden (Claude) | Task 생성 — UAT Sprint 누락 3건(IMP-071·072·077) 보완. D_Kai 직접 구현 기능 담당 배정 |

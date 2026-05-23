# TASK-068 — 세션 Idle Timeout + SUSPENDED 계정 처리

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-068 |
| IMP-ID | IMP-071 · IMP-072 |
| 생성일 | 2026-05-23 |
| 담당 Agent | D_Kai |
| 우선순위 | P0 |
| 전제조건 | 없음 |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | proxy.ts 수정 + 신규 페이지 1개 |

---

## 배경

An-10 갭 분析 재분류 결과 보안 필수 항목 2건이 실 누락으로 분류됨. Aiden 재분류 지시 (2026-05-23). 두 항목 모두 proxy.ts 중심 수정이므로 단일 Task로 묶음.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-068 → 🔄 반영**

2. **IMP-071: 세션 Idle Timeout 구현**
   - `src/lib/proxy.ts`에 idle timeout guard 추가
   - 마지막 활동 시각을 쿠키(`zen_last_activity`)에 기록
   - 요청마다 경과 시간 확인 → 30분 초과 시 로그아웃 후 `/login?reason=timeout` redirect
   - NEXT_PUBLIC 또는 환경변수 `SESSION_IDLE_TIMEOUT_MIN`(기본값 30)으로 시간 설정

3. **IMP-072: SUSPENDED 계정 처리 구현**
   - `src/lib/proxy.ts`에서 JWT claims 또는 DB profile에서 `status === 'SUSPENDED'` 감지
   - SUSPENDED 계정 → `/ko/suspended` redirect (whitelist: `/api/auth/*`, `/(auth)/suspended`)
   - `src/app/[locale]/(auth)/suspended/page.tsx` 신규 생성
     - 안내 문구: "계정이 일시 정지되었습니다. 고객센터 문의: support@zenith.kr"
     - 로그아웃 버튼 포함

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **코드 커밋**: `[D_Kai] feat: IMP-071·072 세션Idle Timeout + SUSPENDED 계정 처리`
   - 포함 파일: proxy.ts, suspended/page.tsx

6. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

7. **ACTIVE_TASK.md TASK-068 → 🔔 반영**

8. **`scratch/IMP_PROGRESS.md` IMP-071·072 행 🔔 갱신**

9. **문서 커밋**: `[D_Kai] docs: TASK-068 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] proxy.ts idle timeout guard 구현 (30분, `zen_last_activity` 쿠키)
- [x] SUSPENDED 상태 감지 및 `/suspended` redirect 구현
- [x] `/suspended` 안내 페이지 신규 생성 (로그아웃 버튼 포함)
- [x] 회귀 테스트 전체 PASS (214/214)
- [x] 코드 커밋 완료 (`bd88eac`)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] IMP_PROGRESS.md IMP-071·072 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Agent 작성)

> 단순 Task — 착수 후 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 단순 Task — 착수 후 🔄 직행.

---

## 작업 결과

### 구현 내역

| IMP | 항목 | 파일 | 설명 |
|:---|:---|:---|:---|
| IMP-071 | 세션 Idle Timeout | `proxy.ts` | `zen_last_activity` 쿠키 — 30분 초과 시 signOut + `/login?reason=timeout` redirect. 환경변수 `SESSION_IDLE_TIMEOUT_MIN`(기본 30) 지원. Auth 페이지 제외 |
| IMP-072 | SUSPENDED 계정 처리 | `proxy.ts` + `suspended/page.tsx` | `userStatus === 'SUSPENDED'` 감지 → `/suspended` redirect. Whitelist: `/suspended`·auth pages·`/`. 페이지: 안내문구 + 로그아웃 버튼 |

### 검증

- 회귀 테스트: **214/214 PASS** ✅

### 커밋

| 구분 | 해시 |
|:---|:---:|
| 코드 커밋 (proxy + page) | `bd88eac` |

---

## Aiden 검토

> 이 섹션은 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | Task 생성 — An-10 갭 분析 재분류, 세션Idle·SUSPENDED 구현 지시 |
| 2026-05-23 | Aiden (Claude) | v2 업데이트 — 작업 지시 상세화 (환경변수 설정, whitelist 경로, 로그아웃 버튼) |

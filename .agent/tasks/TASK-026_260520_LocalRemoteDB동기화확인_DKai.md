# TASK-026 — Local/Remote DB 동기화 확인

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-026 |
| IMP-ID | N/A (운영 Task) |
| 생성일 | 2026-05-20 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P2 |
| 전제조건 | 없음 |
| 상태 | ⬜ 미착수 |

---

## 배경

Phase F 작업(TASK-001~020) 중 다수의 DB 관련 변경이 있었습니다:

- **IMP-019**: `createOrder()` 트랜잭션 도입 (TASK-001)
- **IMP-068**: Signup race condition — `on_auth_user_created` DB Trigger (TASK-013)
- **기타 마이그레이션**: Phase F 기간 중 `supabase/migrations/` 추가 가능성

현재 로컬 마이그레이션 105개, 최신 `20260516120000_harden_role_permissions_select.sql`. 원격 Supabase와의 동기화 상태가 미확인 상태입니다.

> ⚠️ **R-14 적용**: 이 Task는 **조회/확인만** 수행합니다. 원격 Supabase에 마이그레이션을 적용하는 것은 **Aiden 승인 후 별도 진행**입니다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-026 → 🔄 동시 반영**
2. 아래 작업을 순서대로 실행
3. **[완료 보고]** 본 파일 `[작업 결과]` 섹션 작성 후 상태 🔔, ACTIVE_TASK.md 동기화
4. **[문서 커밋]** `[D_Kai] docs: TASK-026 Local/Remote DB 동기화 확인 보고`

---

## 실행 절차

### Step 1 — 로컬 마이그레이션 상태 확인

```bash
rtk supabase migration list
```

- 로컬 Supabase에 적용된 마이그레이션 목록과 미적용 대기 중인 항목을 확인.
- 출력 전체를 `[작업 결과]` 섹션에 기록.

### Step 2 — 로컬 Supabase 정상 동작 확인

```bash
rtk supabase status
```

- 로컬 Supabase 실행 상태(DB URL, API URL 등) 확인.

### Step 3 — 로컬 vs 파일시스템 마이그레이션 비교

```bash
ls supabase/migrations/ | wc -l
```

- 파일시스템 마이그레이션 파일 수와 Step 1 적용 수를 대조.
- 미적용 파일이 있다면 파일명 목록 기재.

### Step 4 — 원격 Supabase 마이그레이션 상태 확인 (읽기 전용)

```bash
rtk supabase migration list --linked
```

> ⚠️ 원격 접속 시 브라우저 인증이 필요할 수 있음. 인증 필요 시 해당 내용 포함하여 보고.

- 원격에 적용된 마이그레이션 목록 확인.
- 로컬 적용 목록과 비교하여 **차이점(로컬에만 있는 것 / 원격에만 있는 것)** 명시.

### Step 5 — IMP-068 DB Trigger 존재 확인

Phase F TASK-013에서 `on_auth_user_created` DB Trigger가 도입됨. 해당 Trigger가 원격에도 존재하는지 확인:

```bash
# 로컬 확인
rtk supabase db diff --use-migra
```

또는 마이그레이션 파일에서 trigger 관련 내용 확인:

```bash
grep -r "on_auth_user_created\|zen_profiles" supabase/migrations/ | head -10
```

---

## 완료 기준 (DoD)

- [ ] `rtk supabase migration list` 출력 기록
- [ ] 로컬 파일시스템 마이그레이션 수 기재
- [ ] 원격 마이그레이션 상태 확인 결과 기록 (접속 불가 시 사유 명시)
- [ ] 로컬 ↔ 원격 차이점 목록 (없으면 "동기화 완료" 명시)
- [ ] IMP-068 Trigger 존재 여부 확인 결과 기록
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `[D_Kai] docs: TASK-026` 커밋 완료

> 마이그레이션 적용(apply)은 이 Task 범위 외 — 차이 발견 시 보고만 하고 Aiden 승인 대기.

---

## [작업 결과]

> **이 섹션은 D_Kai가 작성합니다.**

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Local/Remote DB 동기화 확인 작업 지시 발령. R-14 준수(원격 접속 시 조회만, 적용은 Aiden 승인 후 별도 진행) |

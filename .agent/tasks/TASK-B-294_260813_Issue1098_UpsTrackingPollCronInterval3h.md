# TASK-B-294: Issue #1098 — UPS 트래킹 폴링 크론 주기 1일 1회 → 3시간마다

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1098](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1098) |
| **배경** | JSJung — 현재 `/api/cron/ups-tracking-poll`이 하루 1회(UTC 15:30 / KST 00:30)만 실행돼 트래킹 상태 갱신이 너무 늦음. 3시간마다로 변경 요청 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-13 |
| **우선순위** | P3 |
| **상태** | 🔔 보고 완료 |

## 현재 상태 (분석 완료)

- `vercel.json`의 `ups-tracking-poll` cron: `"schedule": "30 15 * * *"` — 매일 1회(UTC 15:30 = KST 00:30)만 실행.
- `src/app/api/cron/ups-tracking-poll/route.ts` 상단 JSDoc에 "매일 실행" 명시, `GET` 핸들러 응답에도 `schedule: '30 15 * * * (daily at KST 00:30 / UTC 15:30)'` 안내 문자열이 하드코딩돼 있음(둘 다 실제 스케줄과 별개로 정보 제공용 — 로직에 영향 없음).
- 폴링 로직 자체(`pollTracking`/`storeTrackingEvents`, IN_TRANSIT UPS 오더 순회)는 변경 대상 아님 — 실행 빈도만 변경.
- Vercel Pro 플랜 사용 중 확인(`TASK-B-161` 기록 참조 — "Vercel ⚠️ rate-limited (pro plan...)") — Hobby 플랜의 "크론 1일 1회 제한"에 해당하지 않으므로 3시간 간격 크론 자체는 플랜상 제약 없음.

## 수정 방향 (설계 확정 — 착수 승인)

### ① `vercel.json` — cron schedule 변경
```json
{
  "path": "/api/cron/ups-tracking-poll",
  "schedule": "30 */3 * * *"
}
```
`*/3`로 3시간 간격, 분(`30`)은 기존 그대로 유지 — UTC 00:30, 03:30, 06:30, 09:30, 12:30, 15:30(기존 실행 시각 포함), 18:30, 21:30에 실행(하루 8회, KST 09:30/12:30/15:30/18:30/21:30/00:30/03:30/06:30).

### ② `src/app/api/cron/ups-tracking-poll/route.ts` — 안내 문구 동기화
- 상단 JSDoc `UPS 트래킹 폴링 배치 — 매일 실행` → `UPS 트래킹 폴링 배치 — 3시간마다 실행`
- `GET` 핸들러의 `schedule` 필드 문자열을 새 크론식으로 갱신(예: `'30 */3 * * * (3시간마다, UTC 00:30/03:30/... 매 3시간)'`)

과설계 금지 — 폴링 로직·오더 조회 조건·중복 방지 로직 등은 이번 범위 밖. 위 2가지 파일의 스케줄 값/안내 문구만 정확히 변경.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-294-ups-poll-3h` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-294 확인
- [ ] `vercel.json` schedule 변경
- [ ] `route.ts` JSDoc + `GET` 응답 `schedule` 문자열 갱신
- [ ] **회귀 테스트**: 기존 `tests/unit/ups/ups-tracking-poll-cron.test.ts`에 `GET` 핸들러 응답의 `schedule` 필드가 새 크론식(`*/3` 포함)을 반환하는지 검증하는 케이스 1건 추가(실제 라우트 `GET()` 호출 기반 — 그림자/toContain 금지, `import { GET } from '@/app/api/cron/ups-tracking-poll/route'` 후 실제 호출·응답 검증)
- [ ] **독립 되돌리기 검증**: `route.ts`의 `schedule` 문자열만 원복해서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 로컬에서 `GET /api/cron/ups-tracking-poll` 호출해 응답 `schedule` 필드가 새 값으로 나오는지 확인 — 실제 Vercel 배포 후 크론 반영 여부는 배포 담당(Aiden/JSJung) 확인 사항이므로 이 Task 범위에서는 로컬 확인으로 충분

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] chore: TASK-B-294 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1098 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1098`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 미반영 유형·마이그레이션 타임스탬프 충돌 이력 다수(이번 Task는 마이그레이션 없음, 해당 없음). 매우 단순한 설정값 변경 Task이나 R-09 회귀 테스트·독립 되돌리기 검증 절차는 동일하게 생략 없이 수행할 것.

## [작업 결과]

**커밋**: `fec90792` — `[Baker] chore: TASK-B-294 UPS 트래킹 폴링 크론 1일1회→3시간마다 (Issue #1098)`

| 검증 항목 | 결과 |
|:----------|:-----|
| vercel.json | `ups-tracking-poll` cron `"30 15 * * *"` → `"30 */3 * * *"`(매 3시간 :30분, 하루 8회 — 기존 UTC 15:30/KST 00:30 포함) |
| route.ts | JSDoc "매일 실행" → "3시간마다 실행" + GET 응답 `schedule` → `'30 */3 * * * (3시간마다, UTC 00:30/03:30/06:30/09:30/12:30/15:30/18:30/21:30)'` |
| 회귀 테스트 신설 | `tests/unit/ups/ups-tracking-poll-cron.test.ts`에 `TC-ISS1098` 추가 — 실제 `GET()` 호출로 응답 `schedule` 필드가 `*/3` 포함하는지 검증(그림자/toContain-아닌 실제 라우트 호출 기반) |
| 독립 되돌리기 검증 | schedule 문자열만 원복(`30 15 * * * daily`) 시 신규 테스트 **1건 FAIL** 재현 → 복원 후 5/5 PASS |
| 전체 회귀 | `npm run test:regression` — **1289/1289 PASS** |
| 빌드 | `npm run build` — **SUCCESS**(`/api/cron/ups-tracking-poll` 포함) |
| R-10 브라우저 검증 | 로컬 dev 서버 `GET /api/cron/ups-tracking-poll` → 응답 `schedule`이 `30 */3 * * * (3시간마다, …)`로 확인됨. 실제 Vercel 크론 반영은 배포 담당(Aiden/JSJung) 확인 사항(Task 범위 외) |

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

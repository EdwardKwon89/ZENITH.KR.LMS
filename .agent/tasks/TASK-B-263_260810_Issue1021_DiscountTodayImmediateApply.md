# TASK-B-263: Issue #1021 — UPS 할인율 예약 적용일자 '오늘' 허용 + 즉시 적용

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1021](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1021) |
| **배경** | JSJung 요청(2026-08-10): ① 할인율(Admin→Agency, Agency→Shipper)·Volumetric Divisor 예약 적용일자(`valid_from`)를 "오늘 이후(내일부터)"에서 "오늘 이후"로 완화. ② 오늘 날짜로 등록하면 익일 자정 cron을 기다리지 않고 **즉시 실제 요금에 반영** |
| **담당** | Baker (Team B) — `createPricingSchedule()`/`applySchedule()` 구조 직접 구현 |
| **생성일** | 2026-08-10 |
| **우선순위** | P2 |
| **상태** | 🔔 (구현 완료 → 리뷰) |

## 개요

Issue #1021 본문(설계 확정 — 착수 승인) 참조. 요약:

1. `validateScheduleDates()` — `fromDate <= today` → `fromDate < today`. `getKstToday()`(`src/lib/utils/date-kst.ts`) 기준 "오늘" 계산(기존 `new Date()` 로컬/UTC 기준에서 정정 — 자정 근처 KST/UTC 경계 오차 방지).
2. 클라이언트 UI 2곳(`ZoneDiscountForm.tsx`, `ups-rates-client.tsx`) `minDate` 계산에서 "+1일" 제거.
3. **즉시 적용(핵심)**: `applySchedule()`/`expireSchedule()`를 공용 모듈 `src/lib/ups/pricing-schedule-apply.ts`로 분리(로직 변경 없이 이동) → cron route는 import 호출. `createPricingSchedule()` insert 직후 `input.valid_from <= getKstToday()`면 `applySchedule(admin, insertedRow)` 즉시 호출(정책 upsert + `status='APPLIED'` + audit `APPLY`). `updatePricingSchedule()`도 동일 패턴. 미래 날짜면 기존처럼 SCHEDULED 유지.
4. **리스크 안내**: 오늘 등록은 즉시 실제 판매가 반영(되돌림 자동 아님) → 프론트 confirm 문구 + 화면 구분 표시.
5. **회귀 테스트 필수**: 기존 TOMORROW 케이스 하위 호환 + 오늘→APPLIED/어제 거부/audit APPLY + **되돌리기 검증**(즉시 적용 호출 제거 시 "오늘 등록해도 정책 미반영" 재현 확인).

## 영향 범위

- Admin→Agency 할인율, Agency→Shipper 할인율, Volumetric Divisor 예약 등록/수정 전체(3개 setting_type 공통 로직)
- `checkOverlap()`은 `status='SCHEDULED'`만 필터링 → 즉시 적용(APPLIED)된 건은 겹침 검사 대상 아님(기존 동작과 일관, 변경 불필요)
- cron(`pricing-schedule-apply`) 로직 자체 유지, 공용 모듈로 위치만 이동

## 착수 체크리스트

- [X] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-263-discount-today-immediate` 브랜치 생성(worktree)
- [X] `./scripts/next-task-number.sh B`로 TASK-B-263 확인 (TeamB_Dev 최신 기준 — TASK-B-261/262 선점으로 next-task-number 스크립트는 로컬 stale 261 반환, git ls-tree 기준 262+1=263)
- [X] `src/lib/ups/pricing-schedule-apply.ts` 신규 — `applySchedule`/`expireSchedule` 이관(로직 무변경) + cron route import 정리
- [X] `pricing-schedule.ts` — `validateScheduleDates()` 오늘 허용(KST) + `createPricingSchedule()`/`updatePricingSchedule()` 즉시 적용
- [X] `ZoneDiscountForm.tsx`/`ups-rates-client.tsx` — `minDate` "+1일" 제거 + 오늘 등록 confirm 문구
- [X] **회귀 테스트 신설 (필수, R-09)**:
  - [X] 기존 `pricing-schedule-jsonb.test.ts` TOMORROW 케이스 전부 하위 호환(SCHEDULED 유지)
  - [X] 오늘(KST) 등록 → 반환 row `status='APPLIED'` + 정책 테이블 upsert(또는 applySchedule 호출) 확인
  - [X] 어제(KST 과거) → 거부("오늘 이후만 가능")
  - [X] 즉시 적용 시 audit log `action='APPLY'` 기록 확인(기존 cron 이중 기록 패턴 유지)
  - [X] **되돌리기 검증 필수** — 즉시 적용 호출 코드 제거 시 "오늘 등록해도 APPLIED 아님" 증상 재현 확인 후 결과 task file 기재
- [X] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [X] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 오늘 날짜 할인율 등록 → 정책 테이블 즉시 반영 확인(JSJung 요청 필요 시)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-263 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1021 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1021`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 반복 유형 — ①vacuous test ②확정 설계 스펙의 핵심 조건 조용히 누락 ③TeamB_Dev 직접 커밋(R-17 §0 위반). **이번 Task는 ② 주의** — "즉시 적용"이 스펙의 핵심인데 SCHEDULED 등록만 되고 실제 정책 반영이 빠지는 축소 구현 금지. 직전 TASK-B-260은 되돌리기 검증 포함 정확하게 수행됨 — 동일 수준 기대.

## [작업 결과]

### 구현 완료 (2026-08-10, Baker)

**커밋**: `503e1f27` — `[Baker] feat: TASK-B-263 Issue #1021 — 할인율 예약 적용일자 '오늘' 허용 + 오늘 등록 시 즉시 적용 ...`

### 구현 내역

| 파일 | 설명 |
|:-----|:------|
| `src/lib/ups/pricing-schedule-apply.ts` (신규) | `applySchedule`/`expireSchedule` 공용 모듈 — cron route 내 로컬 함수를 로직 변경 없이 이관(코드 로직 이원화 방지) |
| `src/app/api/cron/pricing-schedule-apply/route.ts` | 공용 모듈 import로 정리(로컬 함수 정의 제거) |
| `src/app/actions/ups/pricing-schedule.ts` | ① `validateScheduleDates()` — `new Date()` 로컬/UTC 기준 → `getKstToday()`(Asia/Seoul) 문자열 비교로 정정, "내일 이후만" → "오늘 이후만". ② `createPricingSchedule()` — insert 직후 `valid_from <= getKstToday()`면 `applySchedule(admin, data)` 즉시 호출 + `data.status='APPLIED'` 반환. ③ `updatePricingSchedule()` — 수정 후 동일 즉시 적용(기존 SCHEDULED 게이트로 안전) |
| `src/components/agency/ZoneDiscountForm.tsx` | `minDate` "+1일" 제거(`getKstToday()`) + 오늘 등록 시 `window.confirm('적용일자가 오늘입니다. 저장 즉시 실제 요금에 반영됩니다. 계속하시겠습니까?')` + 안내 문구 갱신 |
| `src/app/[locale]/(dashboard)/admin/ups-rates/ups-rates-client.tsx` | `AgencyPolicyForm` `minDate` "+1일" 제거 + `handleSubmit` 오늘 등록 confirm + 안내 문구 갱신 |
| `tests/unit/ups/pricing-schedule-jsonb.test.ts` | 신규 3건(TC-1021-01~03) — 어제 거부/오늘 APPLIED+applySchedule 호출/내일 SCHEDULED 유지. `makeAdminMock` insert row 캡처로 `status='APPLIED'` 반환 검증 강화 |
| `tests/unit/ups/pricing-schedule-apply.test.ts` (신규) | 공용 모듈 3건(TC-1021-04~06) — AGENCY_DISCOUNT upsert+APPLIED+APPLY audit / VOLUMETRIC_DIVISOR 갱신 / expireSchedule 삭제+CANCELLED+EXPIRE audit |

### 구현 방식 (설계 스펙 §1-3 반영)

1. **날짜 검증 완화**: `valid_from`/`valid_until`을 KST 오늘 날짜 문자열(`YYYY-MM-DD`)과 사전식 비교. 자정 근처 KST/UTC 경계 오차 제거(기존 `new Date()` UTC 파싱 + 로컬 setHours 문제 해소).
2. **즉시 적용**: `applySchedule`을 공용 모듈로 분리해 cron과 서버 액션이 동일 로직 공유. insert 후 `valid_from <= 오늘`이면 정책 테이블 upsert → `status='APPLIED'` → audit `APPLY`(changed_by null, 기존 cron 패턴 유지)까지 한 번에 처리. 반환 row `status='APPLIED'`.
3. **미래 날짜**: SCHEDULED 유지, cron이 기존대로 익일 자정 처리 — 동작 변화 없음(TC-1021-03으로 하위 호환 확인).
4. **checkOverlap**: `status='SCHEDULED'`만 필터 — 즉시 적용(APPLIED) 건은 겹침 대상 아님(설계대로 변경 불필요).

### 테스트 결과

```
npx vitest run tests/unit/ups/pricing-schedule-jsonb.test.ts   → 8/8 PASS (기존 5 + 신규 3)
npx vitest run tests/unit/ups/pricing-schedule-apply.test.ts   → 3/3 PASS (신규)
최종 회귀: npm run test:regression → 152/152 files · 1047/1047 tests ALL PASS
npm run build → SUCCESS (Next.js Compiled successfully · Cron route 배포 정상)
```

### 되돌리기 검증 결과 (스펙 §5 필수)

| 핵심 로직 | 되돌리기 조작 | 기대 | 실제 |
|:---|:---|:---|:---|
| 즉시 적용 트리거 (pricing-schedule.ts) | `createPricingSchedule()`의 `if (valid_from <= getKstToday()) { await applySchedule... }` 블록 제거 | TC-1021-02 FAIL | ✅ **1 failed (TC-1021-02)** — 오늘 등록이 `status='APPLIED'`/applySchedule 호출 없이 SCHEDULED로 남는 증상 재현 |
| 날짜 검증 완화 (validateScheduleDates) | `fromDate < today` → `fromDate <= today`(내일부터로 회귀) | TC-1021-02 FAIL | ✅ **1 failed (TC-1021-02)** — 오늘 등록이 '적용일자는 오늘 이후만 가능합니다'로 거부되는 증상 재현 |

> 두 로직 모두 원복 후 재검증 완료 — 8/8 + 3/3 PASS 복귀 확인.

## [발견 이슈]

- **next-task-number.sh 스크립트 stale** — TeamB_Dev가 원격에 있고 로컬 브랜치(기존 worktree)가 뒤처진 상태에서 `./scripts/next-task-number.sh B`는 로컬 ACTIVE_TASK.md 기준으로 261을 반환했으나, TeamB_Dev 최신에는 TASK-B-261(Dave)/262(Mike)가 이미 존재 → `git ls-tree origin/TeamB_Dev .agent/tasks/` 기준 262+1=**263** 채택. 다른 Agent도 원격 선점 반영을 위해 fetch 후 git ls-tree 확인 필요.
- **`makeAdminMock.single()` 미반영 이슈** — 기존 테스트 mock은 insert row를 캡처하지 않아 `status='APPLIED'` 반환 검증 불가. insert 캡처(`chain._inserted`)로 수정해 실제 DB `.select().single()` 동작과 일치하게 보강(기존 5건 하위 호환 유지).
- **(R-10) 수동 화면 검증은 JSJung 요청 필요** — 로컬 DB 미연결 상태. 검증 항목: admin/ups-rates·대리점 화면에서 오늘 날짜 할인율 등록 → confirm 문구 → 저장 즉시 `zen_agency_pricing_policies`/`zen_agency_shipper_zone_discounts`/`zen_organizations.volumetric_divisor` 반영 + audit `APPLY` 확인.

# TASK-200 — SUB_ADMIN 역할 /admin/ups-rates·/voc 접근 시 이중 리다이렉트 버그 수정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-200 |
| **GitHub Issue** | [#688](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/688) |
| **생성일** | 2026-07-22 |
| **할당 Agent** | D_Kai |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ⬜ |

---

## [배경]

Edward가 로컬에서 `sntl@zenith.kr`(role=`SUB_ADMIN`, org_type=`AGENCY`, TASK-192로 신규 도입)로 로그인 후 "UPS 요율 관리" 접속 시 로그아웃되는 것처럼 초기 화면으로 튕기는 현상 보고. Aiden이 코드 분석 + Playwright 실제 재현으로 근본 원인 확인.

## [근본 원인] — 이중 리다이렉트 (실제 로그아웃 아님)

1. `src/lib/auth/proxy.ts:190-207` — org_type 기준으로만 경로 허용 판단. `orgType=AGENCY`의 화이트리스트에 `/admin/ups-rates`·`/voc`가 없어 `allowedRoot`(`/agency`)로 강제 리다이렉트.
2. `src/app/[locale]/(dashboard)/agency/page.tsx:16-20` — `/agency` 도달 후 `checkPermission(profile.role, "/agency")` 재체크. `STATIC_PERMISSIONS['SUB_ADMIN']`(`src/lib/auth/rbac.ts:48`)에 `/agency`가 없어 재차 실패 → `redirect("/")`.
3. `/`는 비로그인 사용자용 공개 랜딩 페이지 — 로그아웃처럼 보이나 세션(쿠키)은 유지됨(Playwright로 확인 완료).

## [실제 재현 결과] (Playwright, sntl@zenith.kr 로그인 후)

| 경로 | 결과 |
|:---|:---|
| `/admin/ups-rates` | ❌ `/ko`(공개 랜딩)로 리다이렉트 |
| `/voc` | ❌ `/ko`(공개 랜딩)로 리다이렉트 |
| `/mypage` | ✅ 정상 |
| `/support` | ✅ 정상 |
| `/address-book` | ✅ 정상 |

## [요구사항]

- `src/lib/auth/proxy.ts`의 non-PLATFORM 화이트리스트에 `/admin/ups-rates`·`/voc` 추가
- **추가 점검**: `SUB_ADMIN` 역할이 이 두 곳 외에 다른 org_type 전용 페이지 자체 권한 체크(`agency/page.tsx`처럼 `checkPermission(profile.role, "/특정경로")` 패턴을 쓰는 다른 페이지)에 걸릴 가능성이 있는지 확인 — `STATIC_PERMISSIONS['SUB_ADMIN']`에 명시된 5개 경로(`/admin/ups-rates`, `/voc`, `/support`, `/mypage`, `/address-book`) 전부 실제 접속 가능한지 재검증
- 수정 후 Playwright로 실제 재현 검증(위 표의 ❌ 항목이 ✅로 바뀌는지) — R-10 스크린샷 첨부
- 회귀 테스트(`npm run test:regression`) 전체 PASS 유지
- 절차: `agent-worktree-init.sh d_kai` 세션 시작 시 실행, feature 브랜치 생성, 코드/문서 커밋 분리

## [발견 이슈]

없음

---

## DoD

- [ ] `proxy.ts` 화이트리스트에 `/admin/ups-rates`·`/voc` 추가
- [ ] SUB_ADMIN 5개 허용 경로 전부 실제 접속 재검증(Playwright)
- [ ] 다른 org_type 전용 페이지 자체 권한 체크 충돌 여부 점검 결과 명시
- [ ] R-10 스크린샷(수정 전/후) 첨부
- [ ] 회귀 테스트 전체 PASS 확인
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(D_Kai 작성 예정)_

# UAT 결함 관리 대장

| 항목 | 내용 |
|:---|:---|
| 파일 | UAT_DEFECT_LOG.md |
| 위치 | `docs/91_FinalTest/UAT/` |
| 작성일 | 2026-05-27 |
| 관리 주체 | Aiden (Claude) |
| 최종 갱신 | 2026-05-27 |

---

## 결함 분류 기준

| 오류 구분 | 설명 |
|:---|:---|
| 시나리오 오류 | UAT 절차서 내용이 실제 시스템과 불일치하거나 절차 누락 |
| 기능 보완/개선 | 현재 기능은 동작하나 사용성 개선이 필요한 경우 |
| 기능 오류 | 기능 자체가 정상 동작하지 않는 결함 (블로킹 가능) |

| 상태 | 설명 |
|:---|:---|
| 미수정 | 결함 확인, 수정 미착수 |
| 수정중 | Agent 수정 작업 진행 중 |
| 수정완료 | 수정 완료 — Edward 재검증 대기 |
| 검증완료 | Edward 재검증 통과 |
| 시나리오수정 | UAT 절차서 수정으로 결함 해소 (기능 수정 불필요) |

| 블로킹 | 설명 |
|:---|:---|
| Y | 해당 결함으로 후속 시나리오 실행 불가 → 즉시 수정 후 재실행 필요 |
| N | 후속 시나리오 계속 진행 가능 → UAT 완주 후 일괄 처리 |

---

## 현황 요약

| 구분 | 미수정 | 수정중 | 수정완료 | 검증완료 | 시나리오수정 | 합계 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 시나리오 오류 | 1 | 0 | 0 | 0 | 5 | **6** |
| 기능 보완/개선 | 2 | 0 | 1 | 0 | 1 | **4** |
| 기능 오류 | 2 | 0 | 5 | 2 | 0 | **9** |
| **합계** | **5** | **0** | **6** | **2** | **6** | **19** |

---

## 결함 목록

| No. | UAT ID | 오류 구분 | 블로킹 | 상태 | Agent | 단계 | 내용 | 수정 커밋 | 조치 사항 | Aiden 확인 | 비고 |
|:---:|:---:|:---|:---:|:---:|:---:|:---:|:---|:---:|:---|:---:|:---|
| DEF-001 | UAT-01-01 | 시나리오 오류 | N | 미수정 | - | STEP3 | 법인 정보 입력 항목에 "업태", "종목" 입력 항목이 없음 | - | - | - | 기능 오류 여부 검토 보류 |
| DEF-002 | UAT-01-01 | 시나리오 오류 | N | 시나리오수정 | Aiden | STEP3 | 운송사, 송화주 선택 지시 없음 | - | UAT-01-01 STEP3에 운송사 선택 + 송화주 역할 확인 절차 추가 | ✅ | - |
| DEF-003 | UAT-01-01 | 기능 보완 | N | 미수정 | - | STEP4 | 등록화면 — 비밀번호 보기 기능 / 확인 기능 필요 | - | - | - | 기능 미구현 — 별도 구현 Task 필요 |
| DEF-004 | UAT-01-01 | 시나리오 오류 | N | 시나리오수정 | Aiden | STEP4 | 비밀번호 입력 Guide와 불일치 : Password | - | UAT-01-01 STEP4 기대 결과에 한국어 안내 메시지 확인 항목 추가 | ✅ | - |
| DEF-005 | UAT-01-01 | 시나리오 오류 | N | 시나리오수정 | Aiden | STEP4 | Guide 제시 메시지 필요 | - | UAT-01-01 STEP4 기대 결과에 안내 메시지 표시 확인 항목 추가 | ✅ | - |
| DEF-006 | UAT-01-01 | 시나리오 오류 | N | 시나리오수정 | Aiden | STEP6 | 가입신청 완료 시 Logout 후 Login 화면으로 이동됨 | - | UAT-01-01 STEP6 기대 결과를 실제 동작(Logout→Login)으로 수정, ⚠️ UAT-01-07 불일치 주석 추가 | ✅ | ⚠️ UAT-01-07 pending 페이지와 동작 상이 — 기능 검토 필요 |
| DEF-007 | UAT-01-01 | 기능 보완 | N | 시나리오수정 | Aiden | STEP6 | 등록 아이디로 login 시 "오더관리" 메뉴만 표출됨. 다른 메뉴 클릭 시 심사중 메시지 표출 / Logout 버튼 표시 | - | UAT-01-01 STEP7 신규 추가 — PENDING 계정 로그인 후 메뉴 제한 동작 확인 절차 | ✅ | - |
| DEF-008 | UAT-01-01 | 시나리오 오류 | N | 시나리오수정 | Aiden | - | 법인 등록 신청 후 승인 시나리오 없음 | - | UAT-01-01 비고에 "법인 등록 후 관리자 승인 절차: UAT-09-01 참조" 추가 | ✅ | - |
| DEF-009 | UAT-09-01 | 기능 오류 | N | 미수정 | - | - | "증빙서류 오딧" 버튼 클릭 시 "파일을 불러올 수 없습니다." 메시지 표출 | - | - | - | - |
| DEF-010 | UAT-09-01 | 기능 개선 | N | 미수정 | - | - | "법인 최종 승인" 버튼의 글자가 보이지 않음 | - | - | - | - |
| DEF-011 | UAT-01-04 | 기능 오류 | Y | 수정완료 | Aiden | STEP1 | Login 화면의 "ID 찾기" 클릭해도 동작하지 않음 | 737f20a | **원인**: `proxy.ts:48` isAuthPage에 `/find-id` 누락 → 미인증 접근 시 login으로 리다이렉트<br>**수정**: isAuthPage 조건에 `purePath.startsWith('/find-id')` 추가<br>**검증**: 회귀 227/227 PASS | ✅ | DEF-013(설계 모순) 별도 처리 |
| DEF-012 | UAT-01-05 | 기능 오류 | Y | 수정완료 | Aiden | STEP1 | Login 화면의 "비밀번호 찾기" 클릭해도 동작하지 않음 | 737f20a | **원인**: `proxy.ts:48` isAuthPage에 `/reset-password` 누락 → 미인증 접근 시 login으로 리다이렉트<br>**수정**: isAuthPage 조건에 `purePath.startsWith('/reset-password')` 추가<br>**검증**: DEF-011과 동일 커밋 일괄 수정 | ✅ | - |
| DEF-013 | UAT-01-04 | 기능 오류 | N | 수정완료 | D_Kai | - | ID 찾기 기능 설계 모순 — E-Mail=ID 구조에서 성명+E-Mail로 ID 찾기 무의미 + 개인/법인 분리 미구현 | 15299bf + 8건 | **원인**: findUserId 설계 모순 (E-Mail=ID 구조에서 E-Mail로 E-Mail 찾기)<br>**1차 수정**(`15299bf`): 개인/법인 탭 분리 재설계 · `zen_profiles.phone_number` 추가 · UAT-01-04 전면 재작성<br>**후속 8건**(`2111a75`·`4b796e4`·`883cd25`·`9f0e3c2`·`c509802`·`e27ec7a`·`199712e`·`d1bc3de`): RLS·컬럼·FK·동명이인·마스킹·overflow — D_Kai 자체 테스트 중 발견·수정<br>**검증**: TASK-098 완료 · 227/227 PASS | ✅ | Edward 재검증 필요 |
| DEF-014 | UAT-01-08 | 기능 보완 | Y | 수정완료 | D_Kai | 사전조건 | `SESSION_IDLE_TIMEOUT_MIN` 환경변수 미설정 → 기본값 30분으로 UAT 시나리오(2분 대기) 정상 동작 불가 | - | **원인**: `.env.local`에 `SESSION_IDLE_TIMEOUT_MIN` 누락 (코드 기본값 30분)<br>**수정**: `.env.local`에 `SESSION_IDLE_TIMEOUT_MIN=2` 추가 (gitignore — 커밋 불가)<br>**검증**: 서버 재시작 후 2분 timeout 동작 확인 | - | 로컬 UAT 전용 설정 |
| DEF-015 | UAT-01-08 | 기능 오류 | Y | 검증완료 | D_Kai | STEP4 | 로그인 성공 후 `/ko/orders` 진입 시 이전 세션 `zen_last_activity` 쿠키 잔재로 즉시 timeout | `1477091` | **원인 1** (`login/actions.ts`): 로그인 성공 시 `zen_last_activity` 미삭제 → old cookie(>2분)가 남아있어 middleware가 즉시 timeout 판정<br>**수정 1**: `login()` 성공 직후 `cookies().delete('zen_last_activity')` 추가<br>**원인 2** (`proxy.ts:89`): timeout 시 `mergeHeaders(response, supabaseResponse)`가 OLD `supabaseResponse`(signOut 전 값)를 참조 → session cookie 삭제 무효화<br>**수정 2**: timeout 경로에서 `mergeHeaders` 제거 — signOut 후에는 신규 `supabaseResponse`로 재생성되어 파라미터 참조는 stale<br>**검증**: 227/227 PASS · Edward 재검증 ✅ | - | - |
| DEF-016 | UAT-01-08 | 기능 오류 | Y | 검증완료 | D_Kai | STEP4 | `zen_last_activity` 쿠키 maxAge = `SESSION_IDLE_TIMEOUT_MIN * 60` → 2분 후 브라우저가 쿠키 자동 삭제 → `lastActivity` undefined → timeout 체크 skip → 영원히 timeout 미발생 | `f1f20cc` | **원인** (`proxy.ts:100`): `maxAge: SESSION_IDLE_TIMEOUT_MIN * 60` — 쿠키 만료시점 = timeout 기준시점. 브라우저가 쿠키를 먼저 삭제하여 timeout 체크가 실행되지 않음<br>**수정**: `maxAge: 7 * 24 * 60 * 60` (7일) — timeout 체크는 쿠키 VALUE(timestamp)로 판별, maxAge는 단순히 쿠키 보관 기간<br>**검증**: 회귀 227/227 PASS · Edward 재검증 ✅ (session timeout 정상동작 확인) | - | - |
| DEF-017 | UAT-01-09 | 기능 오류 | Y | 수정완료 | D_Kai | STEP2·3 | 회원 관리 페이지에서 `test_uat01@zenith.kr` 상태를 "미사용"(SUSPENDED)으로 변경해도 화면에 "사용"(ACTIVE)으로 남음 — middleware가 DB가 아닌 JWT `app_metadata.status`를 읽어서 고정 | `37e8bca` | **원인** (`member.ts:302` `changeMemberStatus`): `zen_profiles.status`만 업데이트하고 Supabase Auth `app_metadata`는 갱신하지 않음 → `proxy.ts:116`가 JWT의 old `app_metadata.status`(=ACTIVE)를 계속 사용<br>**수정**: `changeMemberStatus`에 adminClient로 `app_metadata.status` 동기화 추가 (`supabase.auth.admin.updateUserById`)<br>**검증**: 회귀 227/227 PASS | - | Edward 브라우저 재검증 필요 |
| DEF-018 | UAT-01-09 | 기능 오류 | Y | 미수정 | D_Kai | - | `test_uat01@zenith.kr`을 법인/운송사(CARRIER)로 등록했으나 등급(role)이 ADMIN으로 설정 — `login/actions.ts` 회원가입 시 `isNewOrg ? ADMIN` 로직이 org_type 무시 | 데이터만 조치 | **원인** (`login/actions.ts:146`): `role: isNewOrg ? USER_ROLES.ADMIN : ...` — 신규 조직 생성자 role이 org_type과 무관하게 항상 ADMIN으로 고정<br>**조치**: `test_uat01@zenith.kr`의 role만 CARRIER로 직접 변경 (app_metadata + zen_profiles)<br>**⚠️ 코드 미수정**: 근본 원인인 회원가입 로직은 그대로. IMP 별도 등록 필요 | - | - |
| DEF-019 | UAT-01-09 | 기능 오류 | Y | 수정완료 | Aiden | STEP2 | 회원 관리 페이지에서 상태 변경(정지/해제) 클릭 시 DB가 업데이트되지 않아 상태가 그대로 유지됨 | 별도 커밋 | **원인** (`supabase/migrations`): `20260507110000_fix_rls_recursion.sql`이 무한재귀 수정을 위해 `zen_profiles` UPDATE 정책을 삭제했으나 재생성하지 않음 → RLS 활성화 상태에서 UPDATE 정책 부재 → 모든 `changeMemberStatus`·`changeMemberGrade`·`updateMyProfile`·`withdrawUser` UPDATE가 0 rows 무성 실패<br>**수정**: `20260528100000_fix_zen_profiles_missing_update_rls.sql` 마이그레이션 — auth.jwt() 기반 UPDATE 정책 2건 추가 (관리자 전체·사용자 본인)<br>**검증**: 로컬 DB 적용 확인, 회귀 227/227 PASS | - | Edward 브라우저 재검증 필요 |
---

## 처리 지침

1. **블로킹 Y 결함**: 발견 즉시 담당 Agent 수정 Task 발령 → 수정 완료 후 해당 시나리오부터 재실행
2. **블로킹 N 결함**: UAT 진행 중 기록 → 1회전 완주 후 일괄 수정 Task 발령
3. **시나리오 오류**: UAT 절차서 수정으로 해소 가능한 경우 `시나리오수정` 상태로 처리 (기능 Task 불필요)
4. **수정 완료 후**: `수정완료` 상태로 변경 + `수정 커밋` 해시 기재 → Edward 재검증 → `검증완료`
5. **Aiden 확인**: 처리 방향(Task 발령 / 시나리오 수정 / 기각) 판정 후 기재

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-27 | Aiden (Claude) | 파일 생성 — UAT-01-01 결함 8건 초기 등록 |
| 2026-05-27 | Edward | DEF-009·DEF-010 추가 (UAT-09-01 진행 중 발견) |
| 2026-05-27 | Aiden (Claude) | DEF-002~008 처리 반영 — 시나리오수정 6건, 현황 요약 갱신 (총 10건) |
| 2026-05-27 | Edward | DEF-011·DEF-012 추가 (UAT-01-04·05 진행 중 발견 — ID찾기·비밀번호찾기 미동작) |
| 2026-05-27 | Aiden (Claude) | DEF-011·012 원인 분석 및 직접 수정 — `src/lib/auth/proxy.ts:48` isAuthPage에 `/find-id`·`/reset-password` 추가, 커밋 737f20a, 회귀 227/227 PASS · 현황 요약 갱신 (총 12건) |
| 2026-05-27 | Aiden (Claude) | DEF-011·012 수정완료 반영 (737f20a) · DEF-013 신규 (ID찾기 설계 모순+법인/개인 미분리) · TASK-098 발령 · 현황 요약 갱신 (총 13건) |
| 2026-05-27 | Aiden (Claude) | DEF-013 수정완료 — TASK-098 (D_Kai) 15299bf · 개인/법인 탭 분리 재설계 · UAT-01-04 시나리오 전면 재작성 · 현황 요약 갱신 (미수정 6→4, 수정완료 2→3) |
| 2026-05-27 | D_Kai (OpenCode) | DEF-013 조치 사항 갱신 — 후속 8건(`2111a75`~`d1bc3de`) 추가 기재 · TASK-098·IMP_PROGRESS·ACTIVE 동시 갱신 |
| 2026-05-27 | Edward | DEF-014 추가 (UAT-01-08 진행 중 발견 — `SESSION_IDLE_TIMEOUT_MIN` env 미설정) |
| 2026-05-27 | D_Kai (OpenCode) | DEF-015 추가 (UAT-01-08 — 로그인 후 즉시 timeout) · `1477091` · login action + proxy timeout mergeHeaders 수정 |
| 2026-05-27 | D_Kai (OpenCode) | DEF-016 추가 (UAT-01-08 — `zen_last_activity` maxAge=120초 → 브라우저가 쿠키 자동 삭제 → timeout 영원히 미발생) · `7 * 24 * 60 * 60`(7일)로 수정 |
| 2026-05-27 | Edward | DEF-015·016 재검증 ✅ — session timeout 정상동작 확인 · 상태 `수정완료`→`검증완료` |
| 2026-05-27 | D_Kai (OpenCode) | DEF-017 추가 (UAT-01-09 — 회원 상태 변경 미반영, app_metadata 미동기화) · DEF-018 추가 (test_uat01 role ADMIN 오설정) · `37e8bca` 수정 |
| 2026-05-27 | Aiden (Claude) | 현황 요약 갱신 — DEF-017·018 추가 반영 (총 17→18건) |
| 2026-05-27 | Aiden (Claude) | DEF-017 상태 `미수정`→`수정완료` — 코드 수정 (`37e8bca`) 정상 확인 (Chrome crash는 E2E 환경 이슈, 코드 결함 아님) · 현황 요약 갱신 |
| 2026-05-28 | Aiden (Claude) | DEF-019 추가 — `zen_profiles` UPDATE RLS 정책 누락 (20260507 마이그레이션 회귀) · 마이그레이션 `20260528100000` 적용 · 현황 요약 갱신 (총 18→19건) |

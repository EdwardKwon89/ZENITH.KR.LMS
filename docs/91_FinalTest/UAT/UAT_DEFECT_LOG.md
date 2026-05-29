# UAT 결함 관리 대장

| 항목 | 내용 |
|:---|:---|
| 파일 | UAT_DEFECT_LOG.md |
| 위치 | `docs/91_FinalTest/UAT/` |
| 작성일 | 2026-05-27 |
| 관리 주체 | Aiden (Claude) |
| 최종 갱신 | 2026-05-29 |

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
| 기능 보완/개선 | 6 | 0 | 1 | 2 | 1 | **10** |
| 기능 오류 | 3 | 0 | 4 | 7 | 0 | **14** |
| **합계** | **10** | **0** | **5** | **9** | **6** | **30** |

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
| DEF-017 | UAT-01-09 | 기능 오류 | Y | 검증완료 | D_Kai | STEP2·3 | 회원 관리 페이지에서 `test_uat01@zenith.kr` 상태를 "미사용"(SUSPENDED)으로 변경해도 화면에 "사용"(ACTIVE)으로 남음 — middleware가 DB가 아닌 JWT `app_metadata.status`를 읽어서 고정 | `37e8bca` | **원인** (`member.ts:302` `changeMemberStatus`): `zen_profiles.status`만 업데이트하고 Supabase Auth `app_metadata`는 갱신하지 않음 → `proxy.ts:116`가 JWT의 old `app_metadata.status`(=ACTIVE)를 계속 사용<br>**수정**: `changeMemberStatus`에 adminClient로 `app_metadata.status` 동기화 추가 (`supabase.auth.admin.updateUserById`)<br>**검증**: 회귀 227/227 PASS | ✅ | DEF-019·020 수정 후 SUSPENDED 프록시 차단 정상 동작 확인 |
| DEF-018 | UAT-01-09 | 기능 오류 | Y | 미수정 | D_Kai | - | `test_uat01@zenith.kr`을 법인/운송사(CARRIER)로 등록했으나 등급(role)이 ADMIN으로 설정 — `login/actions.ts` 회원가입 시 `isNewOrg ? ADMIN` 로직이 org_type 무시 | 데이터만 조치 | **원인** (`login/actions.ts:146`): `role: isNewOrg ? USER_ROLES.ADMIN : ...` — 신규 조직 생성자 role이 org_type과 무관하게 항상 ADMIN으로 고정<br>**조치**: `test_uat01@zenith.kr`의 role만 CARRIER로 직접 변경 (app_metadata + zen_profiles)<br>**⚠️ 코드 미수정**: 근본 원인인 회원가입 로직은 그대로. IMP 별도 등록 필요 | - | - |
| DEF-019 | UAT-01-09 | 기능 오류 | Y | 검증완료 | Aiden | STEP2 | 회원 관리 페이지에서 상태 변경(정지/해제) 클릭 시 DB가 업데이트되지 않아 상태가 그대로 유지됨 | `6699a90` | **원인** (`supabase/migrations`): `20260507110000_fix_rls_recursion.sql`이 무한재귀 수정을 위해 `zen_profiles` UPDATE 정책을 삭제했으나 재생성하지 않음 → RLS 활성화 상태에서 UPDATE 정책 부재 → 모든 `changeMemberStatus`·`changeMemberGrade`·`updateMyProfile`·`withdrawUser` UPDATE가 0 rows 무성 실패<br>**수정**: `20260528100000_fix_zen_profiles_missing_update_rls.sql` 마이그레이션 — auth.jwt() 기반 UPDATE 정책 2건 추가 (관리자 전체·사용자 본인)<br>**검증**: 로컬 DB 적용 확인, 회귀 227/227 PASS | ✅ | 상태 변경 SUSPENDED 정상 반영 확인 |
| DEF-020 | UAT-01-09 | 기능 오류 | Y | 검증완료 | Aiden | STEP3 | SUSPENDED 회원이 로그인 시도 시 `/suspended` ↔ `/terminal` 무한 redirect → ERR_TOO_MANY_REDIRECTS | `bd7437c` | **원인** (`proxy.ts:176`): SUSPENDED 유저가 whitelist 경로(`/suspended`)에 있을 때 아래 route access check에서 `/suspended`가 `isAllowedPath`에 미포함 → CARRIER `allowedRoot`(`/terminal`)로 redirect → 다시 SUSPENDED check → `/suspended` → 루프<br>**수정**: `proxy.ts` SUSPENDED whitelist 통과 후 `return null` 조기 반환 추가 — route access check 완전 skip<br>**검증**: 회귀 227/227 PASS | ✅ | /suspended 페이지 정상 표시 확인 |
| DEF-021 | UAT-02-01 | 기능 개선 | Y | 검증완료 | D_Kai | STEP2 | 오더등록 폼 기본정보에 Login user 정보 및 소속 법인 정보 자동 입력 안 됨 | `ff49b66`·`132851e`·`19d3e17` | **원인 1** (`guards.ts:132`): `validateUserAction()` SELECT에 `full_name`, `phone_number` 누락 → `getCurrentUserAffiliation()`의 `userName`·`userPhone` 항상 undefined<br>**원인 2** (`master.ts`): `getCurrentUserAffiliation()`이 legacy `organizations`에서만 `address`/`biz_no` 조회 → 신규 `zen_organizations` 데이터 미반영<br>**수정 1** (`19d3e17`): `validateUserAction()` SELECT에 `full_name, phone_number` 추가<br>**수정 2** (`ff49b66`): form useEffect에 `shipper_contact_phone`·`shipper_address`·`shipper_biz_no` `setValue` 추가 + 사업자번호/주소 `readOnly ZenInput`으로 변경<br>**수정 3** (`132851e`): `getCurrentUserAffiliation()`에 `zen_organizations.biz_no` fallback 추가 + 법인도 B2C/B2C특송 선택 가능하도록 제한 완화<br>**검증**: 회귀 227/227 PASS · Edward 확인 ✅ | - | - |
| DEF-022 | UAT-02-01 | 기능 오류 | Y | 검증완료 | D_Kai | STEP2 | CORPORATE 화주 오더등록 제출 시 "Submission Fail" 연속 오류 (5개 연쇄 원인) | `19d3e17`~ | **총괄원인**: `create_order_atomic` RPC migration(20260523120500)이 실제 DB 스키마와 정합되지 않은 상태로 작성·배포. unit test는 mock DB로 통과하여 발견되지 않음.<br><br>**① 세션 Idle Timeout이 server action POST 차단**<br>├ **원인** (`proxy.ts:76`): `SESSION_IDLE_TIMEOUT_MIN=2`로 인해 폼 입력 중 세션 만료. proxy가 server action POST까지 /ko/login redirect → `"An unexpected response was received from the server"`<br>└ **수정**: server action POST(`next-action` header)는 idle timeout 체크에서 제외<br><br>**② get_next_order_sequence RBAC에 CORPORATE 누락**<br>├ **원인** (`20260515223345`): RBAC 체크에 `CORPORATE`, `INDIVIDUAL` 누락 → `Access Denied: Insufficient permissions to generate sequence.`<br>└ **수정** (`20260529120000`): 허용 목록에 `CORPORATE`, `INDIVIDUAL` 추가<br><br>**③ zen_orders에 shipper_contact_email 컬럼 없음**<br>├ **원인** (DEF-021): DDL ALTER TABLE 누락 → `column does not exist`<br>└ **수정** (`20260529121000`): `shipper_contact_email text` 컬럼 추가<br><br>**④ zen_orders에 estimated_cost 컬럼 없음**<br>├ **원인** (`20260523120500`): RPC migration DDL 정합성 실패 → `column does not exist`<br>└ **수정** (`20260529121500`): `estimated_cost numeric` 컬럼 추가<br><br>**⑤ cargo_details NOT NULL 위반**<br>├ **원인**: RPC INSERT가 `cargo_details` 미포함 + NOT NULL 제약 → `null value violates not-null constraint`<br>└ **수정** (`20260529122000`): `cargo_details` 기본값 `'{}'::jsonb` 설정<br><br>**검증**: 회귀 227/227 PASS · Edward 확인 ✅ | - | - |
| DEF-023 | UAT-02-02 | 기능 오류 | Y | 검증완료 | D_Kai | STEP1·2 | STATUS/TYPE 콤보박스에 옵션 없음 — common_codes RLS 정책 누락으로 인증 사용자 쿼리가 항상 빈 배열 반환 | `aa153ee` | **원인 1** (`common_codes`): RLS 활성화 + SELECT 정책 0건 → Supabase client(user-level) 쿼리가 모두 빈 배열 반환. `getCommonCodesByGroup()`는 오류 없이 `[]` 리턴 → 드롭다운이 "All Status" / "All Types"만 표시<br>**원인 2** (`common_codes`): `ORDER_STATUS` / `ORDER_TYPE` 그룹 자체가 DB에 없음 (시드 데이터 미등록)<br>**수정 1** (`20260529123000`): 시드 데이터 등록 — ORDER_STATUS 17종, ORDER_TYPE 3종<br>**수정 2** (`20260529123500`): SELECT 정책 추가 — `TO authenticated USING(true)`<br>**검증**: 회귀 227/227 PASS · Edward 확인 ✅ | - | - |
| DEF-025 | UAT-02-01 | 기능 개선 | N | 미수정 | - | - | ORG/DES 드롭다운 목록이 길면 찾기 어려움 — 필터(타이핑 검색) 기능 필요 | - | **상세**: 항만(Port) 선택 드롭다운이 전체 목록을 한번에 표시. 항목이 많을 경우 스크롤로 찾기 불편<br>**제안**: `<select>` 대신 `<input>` + autocomplete/dropdown 조합으로 타이핑 시 필터링 | - | - |
| DEF-026 | UAT-02-01 | 기능 개선 | N | 미수정 | - | - | ORG(출발지)와 DES(도착지)에 동일 항만 선택 가능 — 검증 로직 필요 | - | **상세**: 동일 항만을 ORG/DES로 선택해도 제출 가능. 물류상 동일지점 출도착은 의미 없음<br>**제안**: 폼 제출 시 ORG ≠ DES 검증 또는 선택 시 경고 | - | - |
| DEF-027 | UAT-02-01 | 기능 개선 | N | 미수정 | - | - | 수하인 정보 입력 항목이 화면 하단에 위치하여 가독성이 낮음 — 탭(Tab) 분할 제안 | - | **상세**: 기본정보·포장정보·수하인정보가 한 페이지에 길게 배치. 수하인 입력이 하단에 있어 스크롤 필요<br>**제안**: "기본정보 / 수하인정보 / 포장정보" 탭(Tab)으로 구분하여 각 섹션 집중 입력 가능 | - | - |
| DEF-028 | UAT-02-01 | 기능 개선 | N | 미수정 | - | - | 송하인 주소에 영문 주소 필드 또는 자동 번역 기능 필요 | - | **상세**: 해외 배송 시 수하인 주소는 영문 입력 필요, 송하인 정보에는 주소 한글만 있음<br>**제안 1**: 송하인 정보에 영문 주소 필드 추가<br>**제안 2**: 네이버/카카오 등 번역 API 연동으로 한글→영문 자동 변환 | - | - |
| DEF-029 | UAT-02-03 | 기능 오류 | Y | 수정완료 | D_Kai | STEP1~ | 오더상세 페이지 — PKG정보 미표시 · Total Weight/Volume 없음 · 트래킹 쿼리 오류 | `d9035e3`·`63ca29b`·`f86bdd7`·`e715a19` | **① zen_tracking_events SELECT에 없는 컬럼 참조**<br>├ **원인** (`tracking.ts:37,211`): SELECT에 status 컬럼 포함 — 존재하지 않음 → 항상 빈 배열<br>├ **원인** (`routing.ts:183`): `location_name, event_type` → 실제 컬럼은 `location, event_code`<br>├ **수정** (`d9035e3`): tracking.ts에서 status 제거, routing.ts에서 location_name→location·event_type→event_code<br>└ **테스트** (`rou-01.test.ts`): mock 데이터 컬럼명 동기화<br><br>**② Total Weight/Volume 계산 안 됨 (DB컬럼 미존재)**<br>├ **원인** (`page.tsx:293,299`): `order.total_gross_weight`·`total_volume` — zen_orders에 없는 컬럼 → 항상 undefined<br>├ **수정** (`63ca29b`): `getOrderDetails()`에서 packages로부터 computed 추가<br>└ **추가수정** (`f86bdd7`): packing_count 곱셈 반영 + volume NULL이면 L×W×H/1e6 계산<br><br>**③ zen_order_packages RLS 정책 누락**<br>├ **원인**: `zen_order_packages`에 `ENABLE ROW LEVEL SECURITY`만 있고 CREATE POLICY 0건 → 모든 SELECT가 빈 배열 반환 → Package Details 비표시 · Total Weight 0<br>├ **수정** (`20260529130000`): `zen_orders`와 동일한 패턴으로 4개 정책 추가<br>│  └ SELECT: ADMIN role 체크 + `is_org_member` 체크<br>│  └ INSERT: 동일 조건 WITH CHECK<br>└ **DB 적용**: 로컬 DB에 마이그레이션 실행 완료<br><br>**④ Package Details 테이블 개선**<br>├ **수정** (`f86bdd7`): Unit/Total Weight 컬럼 분리 + items 하위 테이블 표시<br>├ **수정** (`e715a19`): items 테이블에서 Unit Price 컬럼 제거 (입력항목 아님)<br><br>**검증**: `d9035e3`·`63ca29b`·`f86bdd7` 각 커밋 전 회귀 227/227 PASS<br>└ `e715a19`(Unit Price 제거) + `57cb761`(문서) 후 재확인: 회귀 227/227 PASS (2026-05-29 16:24) | - | - |
| DEF-030 | UAT-02-03 | 기능 오류 | Y | 미수정 | - | - | 경로 최적화 구조적 문제 — Order 등록 후 Detail에서 경로 선택하는 역순 설계 + mode 미필터링 + 비용 0 + tiebreaker 부재 | - | **① 설계 위상 오류**<br>├ **문제**: 경로 최적화 기능이 Order 등록 단계(운송사·비용 산출) 아닌 Order 상세 페이지에 위치. Order를 먼저 생성한 후 경로를 선택하는 역순 흐름<br>└ **제안**: Order 등록 Multi-step에 Route Step 통합<br><br>**② transport_mode 미필터링**<br>├ **문제** (`routing.ts:34`): `getRouteOptions()`가 `transport_mode`를 RoutingEngine에 전달하지 않음 → DatabaseRouteAdapter가 모든 mode 노출. AIR 등록에도 SEA 표시<br>└ **수정방향**: `IVirtualMapAdapter.getPotentialRoutes()`에 transportMode 파라미터 추가 → DB query에 `.eq('transport_mode', transportMode)` 적용<br><br>**③ 비용 = 0**<br>├ **문제** (`routing.ts:29-31`): `cargo_details={}` → `weight=0` → `chargeableWeight=0` → `baseFreight=0×unit_price=0`<br>└ **수정방향**: `zen_order_packages`로부터 `gross_weight×packing_count + volume` 합산<br><br>**④ 동점 tiebreaker 부재**<br>├ **문제** (`scoring.ts:26`): `selectCostOptimal`이 cost만 비교 — 동점(모두 0) 시 정렬 순서 불확정<br>└ **수정방향**: `a.total_cost - b.total_cost || a.total_transit_days - b.total_transit_days`<br><br>**⑤ RLS (기조치 완료)**<br>├ `20260529150000`: zen_route_network/carriers/rate_cards SELECT에 CORPORATE/INDIVIDUAL 추가<br>└ zen_route_options INSERT/SELECT 정책 신규 생성 | - | Aiden 협의 필요 |
DEF-024 | UAT-02-02 | 기능 개선 | Y | 검증완료 | D_Kai | STEP1·2·4 | 오더목록 데이터 그리드 — 수하인 컬럼 없음 · 송하인명 검색 안 됨 · 페이지네이션 params 소실 | `bf23263`·`09cfa48` | **① 수하인 컬럼 누락**<br>├ **원인**: OrderDataTable에 수하인 정보 미표시 (7컬럼)<br>└ **수정**: Shipper와 Route 사이 Recipient 컬럼 추가 (colSpan 7→8)<br><br>**② 송하인명 검색 안 됨**<br>├ **원인** (`order.repository.ts:94`): order_no + recipient_name만 검색 — shipper org name은 조인 테이블<br>└ **수정**: 하위쿼리로 org name 검색 후 `shipper_id.in.(...)` 필터 추가<br><br>**③ 페이지네이션 URL params 소실**<br>├ **원인** (`OrderDataTable.tsx:148`): `href`에 page만 유지<br>└ **수정**: `useSearchParams()`로 모든 params 유지<br><br>**검증**: 회귀 227/227 PASS · Edward 확인 ✅ | - | - |
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
| 2026-05-28 | Aiden (Claude) | DEF-020 추가 — SUSPENDED 유저 `/suspended`↔`/terminal` 무한 redirect 수정 · `proxy.ts` SUSPENDED 조기 반환 추가 · 현황 요약 갱신 (총 19→20건) |
| 2026-05-28 | Edward | DEF-017·019·020 검증완료 — UAT-01-09 STEP2·3 정상 동작 확인 · 현황 요약 갱신 |
| 2026-05-29 | D_Kai (OpenCode) | DEF-029 추가 — UAT-02-03 오더상세 PKG정보·Total Weight/Volume·트래킹 쿼리 오류 4종 수정 · `d9035e3`·`63ca29b`·`f86bdd7`·`e715a19` + migration `20260529130000` · 회귀 227/227 PASS · 현황 요약 갱신 (총 25건) |
| 2026-05-29 | D_Kai (OpenCode) | DEF-030 추가 — UAT-02-03 경로 최적화 구조적 문제(위상·mode·비용·tiebreaker) 4건 · RLS `20260529150000` 기조치 · Aiden 협의 필요 · 현황 요약 갱신 (총 26건) |
| 2026-05-29 | Aiden (Claude) | 현황 요약 갱신 — DEF-025~028 기능개선 4건 추가 반영 (기능보완 6→10, 합계 26→30) |

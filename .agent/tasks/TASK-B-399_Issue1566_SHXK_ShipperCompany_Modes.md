# TASK-B-399 (Issue #1566) — UPS 오더 발송인 입력 방식별 `shipper_company` 처리 [설계 의견]

| 항목 | 내용 |
|:--|:--|
| **Issue / Task** | [#1566](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1566) / `TASK-B-399` |
| **Worker / 검증** | Baker(조사·설계 의견) / Jaison(검증) / Aiden(`[설계 확정]` 승인) |
| **우선순위 / 단계** | p1 / **1단계 — 조사·설계 의견만**(구현·마이그레이션 금지) |
| **상태** | `status:draft` (설계 확정 전 → 2단계 `status:ready` 전환은 Aiden 승인 후) |
| **채번 근거** | `git fetch origin` 후 원격 브랜치 `git ls-remote --heads origin \| grep -i task-b399` = 0건, Issue 제목 조회 = #1566 본건 1건. `./scripts/next-task-number.sh B`는 자기 Issue 제목까지 세어 `TASK-B-400`을 반환(#1564 스크립트 결함) → **B-399 확정**. 착수 워크트리는 전용(`git rev-parse --show-toplevel` 확인). |
| **브랜치** | `feature/teamb-task-b399-iss1566-shipper-company-modes` (base `origin/TeamB_Dev`) |
| **검토 반영** | Jaison 보완 1~6 + 정정, Aiden R-01 필수 1~3·권고 4~9 반영(head `474d697ae` → 새 커밋). 지목된 코드 줄은 모두 직접 열어 대조함. |

## [결정·전제]

- JSJung 결정(2026-11-27): ① **내 정보 사용** = `shipper_company`에 `shipper_name` 값, ② **수기 입력** = 전용 필수 입력 컨트롤 값을 그대로 사용. "빈 입력은 공백 문자 전송" 규칙은 **철회** — NULL·공백 문자 모두 금지.
- 선행 병합: TASK-B-397(PR #1561, merge `0a1c31857`) — `shipper_company`는 현재 **환경변수**에서만 나온다. 본 Task는 그 출처를 결정에 맞게 바꾸는 설계안을 제안한다(임의 제거 없음, 승인 후 시행).
- R-21: 설계 의견에는 실제 값·계정·오더 식별자·요청/응답 원문·절대경로를 기재하지 않는다. R-14: 운영 DB·운영 호출은 범위 밖. 실검증은 로컬 Supabase에서만 수행한다.

## [설계 의견]

### 1. 현행 실측 (파일·줄 근거)

**폼/토글**
- `shipperNameMode: 'auto' | 'manual'` 기본 `auto`, `shipperToggled` 추적 — `src/components/orders/OrderRegistrationForm.tsx:280-283`.
- "내 정보 사용" 클릭 → affiliation 파생 13개 화주 필드 복원, "수기입력" 클릭 → 동일 13개 필드 `''` 초기화 — `OrderRegistrationForm.tsx:289-336`.
- 토글 UI는 `OrderRegistrationForm.tsx:1118-1137`, 화주명 입력 `:1139-1144`, 연락처 `:1149-1174`, 주소 `AddressInput` `:1175-1203`, 사업자번호 `:1205-1211`. **현재 `shipper_company` 입력 컨트롤은 없음**. 토글 라벨·placeholder는 컴포넌트에 하드코딩(로케일 키 없음).
- 수정 모드: `orderId`가 있으면 affiliation 자동완성을 건너뛰고(`OrderRegistrationForm.tsx:453-457`), 저장된 `shipper_name`이 `autoShipperName`과 다르면 `manual`로 시작(초기화 없음) — `:493-505`. 저장값 복원은 `src/lib/orders/edit-defaults.ts:73-94`, 주소는 `:172-209`.
- 모드는 **클라이언트 상태만** 존재하고 서버로 전송되지 않는다(`src/lib/validation/order.ts:45-125`).

**payload 생성 경로 (전수)**
- `buildCreateOrderPayload()` 정의 `src/lib/ups/label-mapping.ts:168-206`; `shipper` 블록 `:116-139`. `src/` 내 호출처는 **2곳뿐** — `src/app/actions/operations/ups-labels.ts:289-293`(실호출 `placeShxkOrder`)과 `:878-882`(미리보기 `previewShxkPayload`).
- 실호출 진입점 4경로: `registerUpsOrder`(`ups-labels.ts:429,455`), `confirmUpsRegistration`(`src/app/actions/operations/warehouse.ts:515` → `registerUpsOrder` 재사용), `triggerCreateOrderTest`(`ups-labels.ts:941` → `placeShxkOrder` 직접 호출), `issueUpsLabel`(`ups-labels.ts:721` → `registerUpsOrder`; 호출 UI `OutboundProcessForm.tsx:167,209`). 모두 `lookupOrderPackages`(`ups-labels.ts:216-223`)가 읽은 **DB 저장 오더 값**으로 payload를 만든다(폼 값 직접 사용 아님).
- `shipper_name` 결정값 = `order.shipper_name` → `shipper_org.name` → `shipperDefaults.name`(기본값) — `label-mapping.ts:119-122`. 즉 오더·조직 이름이 모두 없으면 기본값이 company로 유입되는 경로가 남는다.
- `shipper_company` = `shipperDefaults.company?.trim() || shipperDefaults.name.trim()` — `label-mapping.ts:126-131`; 두 호출처가 `SHXK_SHIPPER_COMPANY`를 주입 — `ups-labels.ts:292,881`. 값 정의·폴백·warn은 `src/lib/shxk/config.ts:19-28`.
- **대량 등록**: `bulkCreateOrders`(`src/app/actions/operations/bulk-orders.ts:192-213`)는 UPS 오더만 받아 `createOrder(payload)`를 호출한다. 이 경로는 모드를 전달하지 않는다 → 설계상 `shipper_company_mode`는 optional·기본 `auto`로 처리하고 엑셀 컬럼은 추가하지 않는다.
- 타 SHXK 서비스·비UPS 코드에서 `shipper_company` 사용 없음(`git grep` 기준). 목업 경로(`src/lib/shxk/client.ts:11-36,149-157`)는 payload를 새로 만들지 않고 전달받은 params만 로깅한다.

**DB/스키마**
- `zen_orders` 화주 컬럼: `shipper_id`(`0001_initial_schema.sql:71`), `shipper_contact_name/phone`(`20260421062506_*.sql:3-4`), `shipper_contact_email`(`20260529121000_*.sql:4`), 주소·국가·도시·우편·biz_no(`20260715000001_*.sql:10-16`), 영문 주소 2종(`20260812010000_*.sql:5-6`), `shipper_name`(`20260813020000_*.sql:7`). **`shipper_company` 컬럼 없음**.
- 생성 RPC 최신 v7 `20261113090100_task_b346_create_order_atomic_v7.sql` — 시그니처는 `p_payload jsonb, p_user_id uuid, p_org_id uuid`로 **jsonb 입력이라 컬럼 추가 시 시그니처 변경 없음**. 화주 필드를 저장하지만 company는 없음(`:81-109`). 기존 오더에 값이 저장될 경로가 없다.
- `src/types/supabase.ts:2819-2940`에 화주 컬럼은 있으나 영문 주소 2종은 누락(기존 스테일). 새 컬럼 반영 필요.
- 과거 결정: `docs/02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md:379` Q11이 "별도 `shipper_company` 컬럼은 추가하지 않음"으로 확정 → 이번 결정으로 **번복**(JSJung 2026-11-27 결정 + B-397 병합 근거 명시).

**검증**
- `orderRegistrationSchema`는 화주명·연락처·주소를 모두 optional(`src/lib/validation/order.ts:52-73`), UPS일 때만 연락처 필수(`:191-224`). `shipper_company` 검사 없음.
- SHXK 사전검증 `src/lib/shxk/validate-payload.ts:91-104`는 payload가 만들어진 **이후** 성명·국가·주소(길이 포함)·연락처를 검사; company 누락·길이 검사 없음. 200자 상한은 **수취인 회사명에만** 있음(`:107-110`).
- 사전검증 실패 시 `ups-labels.ts:296-301`에서 `trError('shxk_validation_failed', { fields })` 반환 + SHXK 호출 스킵.

### 2. 저장 방식 대안 (Baker 제안 — 확정 필요)

| 대안 | 내용 | 장점 | 단점·영향 |
|:--|:--|:--|:--|
| **A (권장)** | `zen_orders.shipper_company TEXT NULL` **1개 컬럼 신설**. 값이 비어 있으면 `auto`, 값이 있으면 `manual`로 모드 추론. `manual` 값은 입력 원문 저장. | DB에 값이 남아 실호출·미리보기·warehouse 재등록이 모두 같은 규칙을 읽음. 모드 컬럼 추가 불필요. 기존 오더(NULL)는 자동 `auto` → `shipper_name` 사용. | 마이그레이션 + `create_order_atomic` v8(또는 신규 RPC) + `src/types/supabase.ts` + `orders.ts` 저장 경로 + Ds-11 동시 변경. **작성은 Team B 구현 PR**(B-381 M1~M3 선례), `[설계 확정]`은 Aiden, **운영 적용은 Edward R-14 승인·211 런북**. |
| **B** | `shipper_company` + `shipper_company_mode`(`'auto'\|'manual'`) **2개 컬럼**. | 모드가 값과 분리돼 "수기 모드이나 아직 값 없음"을 표현 가능. 감사·통계에 명시적. | 스키마·타입·RPC·API 표면 2배. 기존 오더에 mode 기본값 정의 필요. 값 누락 시 auto로 폴백할지 예외할지 추가 결정 필요. |
| **C (기존 유지)** | 환경변수 `SHXK_SHIPPER_COMPANY`만 사용. | 변경 없음. | "내 정보 사용=화주명 / 수기 입력=입력값" 결정과 정면 충돌. **채택 불가** — 근거로만 기록. |

**A안 채택 시 마이그레이션 영향(승인 요청 사항)**: `zen_orders` 컬럼 추가(nullable, 기본값 없음 → 기존 행 자동 `auto`), RLS는 테이블 정책 상속으로 신규 정책 불필요(확인 필요), `create_order_atomic`에 `p_payload->>'shipper_company'` 저장 추가, `updateOrder`(`src/app/actions/operations/orders.ts:303-350`)의 `headerData`에 신규 필드 포함, 생성 타입 갱신. **저장 값은 NULL 한 가지로 단일화** — trim 후 빈 값은 NULL로 저장한다(빈 문자열 저장 없음). 타입 지목 정정: `createOrder`의 실제 입력 타입은 `OrderRegistrationInput`(`orders.ts:117`); `CreateOrderRequest`(`src/types/orders.ts:53`)는 정의만 있고 import처가 없어 갱신 대상이 아니다. 백필은 하지 않는 것이 기본(기존 오더 = `auto`). 백필 필요 여부는 Aiden·Edward 결정 사항.

**적용 순서·하위 호환·롤백(PR1 설계)**: nullable 컬럼 추가이므로 **DB 먼저 → 앱 배포**(B-377의 정책 제거가 앱 먼저인 것과 방향 반대). `create_order_atomic`은 입력이 `p_payload jsonb`라 v8로 `CREATE OR REPLACE`해도 **기존 앱 호출과 시그니처 하위 호환**이다. 롤백은 v8 → v7 복구로 하고, 컬럼은 잔존 허용(데이터 보존)으로 두는 안을 기본으로 한다(최종 Aiden·Edward 확인).

**환경변수 처리 제안(임의 제거 금지 → 최종 Aiden 확정 대기)**: A안 확정 시 `SHXK_SHIPPER_COMPANY`는 payload 경로에서 **사용 중단**을 권장한다. 이유: 두 모드 모두 값 출처가 오더(화주명 또는 입력값)이고, `shipper_name`은 `buildShipperPayload()`가 먼저 결정한 뒤 사전검증이 payload를 검사하는 순서이므로 env 폴백·모듈 로드 `warn`(`config.ts:23-28`)이 불필요해진다. 운영 환경변수는 설정 지시가 없는 상태([Aiden 12:35, #1552](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1552#issuecomment-7209111131))라 제거해도 운영 영향이 없다. PR2에서 사용·`warn`·정의·관련 테스트·Ds-11 서술을 **함께 제거**하는 안으로 정리한다(임의 제거 금지 원칙은 유지).

**trim 대체·쉼표 처리 제안**: `label-mapping.ts:126-131`의 `company?.trim() || name.trim()`은 수기 입력에서 `name`으로 조용히 대체되어 **필수 규칙을 우회**한다. A안에서는 ① auto: `company = shipperDisplayName`(동일 문자열, 값 단언), ② manual: 저장된 입력 원문(필수 검사는 서버 액션에서 trim 후 빈 값이면 차단), ③ manual 값 누락: `name` 대체 없이 서버 액션에서 차단 — 경로별로 분리한다. 저장은 원문, **전송 시 `sanitizeComma` 적용**(`label-mapping.ts:67-70`; 수취인 회사명 `:189`·발송인 주소 `:133-135` 선례와 일관)하는 안을 제 의견으로 둔다. 미적용 시 SHXK 명세 출처 근거가 필요하며, 실호출 manual 시나리오에 쉼표 포함 더미 값을 넣어 미확인을 해소한다.

**길이 근거 정정**: 코드에서 확인되는 200자 상한은 **수취인 회사명뿐**(`validate-payload.ts:107-110`). 발송인 회사명 200자는 "**추정(수취인 기준 유추)**"로 표기하며, 원문 명세 출처를 확인하기 전까지는 확정 근거로 쓰지 않는다.

### 3. UI 설계 (A안 기준)

- **위치**: 기존 화주명 입력(`OrderRegistrationForm.tsx:1139-1144`) 바로 아래, 동일 카드 안에 `shipper_company` 입력 컨트롤을 추가. **수기 입력 모드에서만 렌더링**하고, auto 모드에서는 컨트롤 자체를 숨긴다(비활성화만 하는 기존 화주명 필드와 구분).
- **라벨/로케일**: 신규 키 `Orders.shipper_company`를 4개 로케일에 추가 — ko `발송인 회사명`, en `Shipper company`, zh `发件人公司名称`, ja `発送者会社名`. (현재 `shipper_label`은 ko/en만 있고 zh/ja는 키 누락 — `messages/{ko,en,zh,ja}.json`. 이번 Task에서 신규 키만 4개 모두 채우고, 기존 키 누락은 별도 IMP 제안 대상.)
- **필수 표기**: Jaison·Aiden 승인 완료 — 결정 2("필수 입력 항목")에 따라 컨트롤에 `*` 필수 표시. Issue 본문의 옛 "필수 아님 표기" 문구는 무시한다.
- **모드 전환 시 값 처리**: "수기입력" 클릭 → 컨트롤 표시 + `shipper_company`를 `''`로 초기화(기존 13개 필드 초기화 로직에 포함). "내 정보 사용" 클릭 → 컨트롤 숨김 + `shipper_company` 클리어(**DB에는 NULL 저장**)해 모드 추론이 `auto`로 유지되게 한다. 서버도 auto이면 전달값을 무시하고 NULL로 저장해 **모드·값 일관성을 강제**한다(클라이언트 클리어에만 의존하지 않음).
- **수정 모드 복원 — 영향 범위**: `OrderRegistrationForm.tsx:493-499`는 `saved && saved !== autoShipperName`이면 manual로 시작하므로, affiliation 미로드·개인 화주·`shippers` 미매칭으로 `autoShipperName`이 빈 값인 오더를 포함해 **저장된 화주명이 있는데 계산값이 빈 오더는 모두 manual로 열리고 company가 NULL**이라 필수 컨트롤이 비어 있다. ① 이 집합은 저장이 막힌다(의도: 필수 입력 원칙에 따라 수기 입력을 강제), ② 저장 전까지 SHXK 등록은 `auto` 규칙(`company = shipper_name`)으로 계속 동작한다. ③ 단, auto 복원 자체가 빈 값이 되는 기존 문제(`restoreAutoShipperInfo`, `:300-322,453-457`)는 **본 Task 밖 IMP 제안**으로 분리하며, 위 ①의 "저장 막힘"과 혼동하지 않는다.
- **길이·문자**: `shxk-limits.ts`에 company 상수(200자, 출처는 위 "추정" 표기)를 정의해 UI `maxLength` + Zod `.max()` + 사전검증의 구조 방어에 적용. 허용 문자 제한은 **미확인**이므로 두지 않고, 쉼표는 전송 시 `sanitizeComma` 적용 안을 결정 요청에 둔다.
- **모드 전달·서버 검증**: 폼 전송 페이로드에 일시적 `shipper_company_mode: 'auto' | 'manual'`을 포함한다(Zod enum 검증, **DB에는 저장하지 않음**, Ds-11 입력 표에 기재 — R-12). "수기 모드인데 값 비었음"은 ① 클라이언트 Zod와 ② 서버 액션이 차단한다. 대량 등록 경로는 optional·기본 `auto`, 엑셀 컬럼 추가 없음.

### 4. payload 규칙표 (모드 × 경로)

| 모드 | `placeShxkOrder` (등록·`triggerCreateOrderTest`) | `previewShxkPayload` (미리보기) | `registerUpsOrder` (`confirmUpsRegistration`·`issueUpsLabel`) | 값 출처 |
|:--|:--|:--|:--|:--|
| 내 정보 사용 (auto) | `shipper_company` = `shipper_name` 결정값 | 동일 | 동일 | `order.shipper_name` → `shipper_org.name` → `shipperDefaults.name` 기본값(`label-mapping.ts:119-122`). **이름이 모두 없으면 기본값 허용** — "auto = 화주명, 이름 없으면 기본값 허용"으로 정의한다. |
| 수기 입력 (manual) | `shipper_company` = 저장된 입력 원문(전송 시 `sanitizeComma` 적용 안) | 동일 | 동일 | `zen_orders.shipper_company`(신규). trim 후 빈 값은 NULL로 저장되며 **서버 액션에서 등록 차단** → SHXK 호출 없음. |
| 기존 오더(값 없음) | auto 규칙 적용 | auto 규칙 적용 | auto 규칙 적용 | 백필 없음. `shipper_name` 결정값을 company로 사용. |

- **검증 층 (Jaison 정정·Aiden 필수 1 반영)**:
  - ① **클라이언트 Zod** — UPS + manual이면 `shipper_company` 필수(trim 후 빈 값 금지), max 200, 오류 `path: ['shipper_company']`.
  - ② **서버 액션** — `createOrder`/`updateOrder`가 동일 스키마 `parse`(`orders.ts:121,290`) + auto이면 company를 무시하고 NULL 저장(모드·값 일관성 강제). **필수 검사는 모드를 아는 ①②에만 둔다.**
  - ③ **SHXK 사전검증** — `validateShxkPayload()`는 **payload 구조 방어선**(company 공백·길이 등)만 담당한다. `placeShxkOrder`·`previewShxkPayload`는 DB 오더를 읽는 시점에 모드가 없어 "manual인데 비었음"과 auto를 구분할 수 없으므로, **③이 수기 누락을 차단한다는 서술은 성립하지 않는다**(설계 `:59`·`:79`의 모드 인자 제안은 제거). 오류 문구는 필드 키 중심으로 둔다.
- **#1562(TASK-B-398) 정합 (Jaison 판단)**: 사전검증의 `shipper_company` **구조 방어(길이·공백)만 본 Task PR2가 이관**해 구현하고, #1562는 나머지 필수 필드와 거절 문구 매핑을 맡는다. 오류 키 이름·모드 인자 설계는 본 Task 설계 확정 후 #1562가 따른다. #1562는 해당 항목에 착수하지 않는다.

### 5. 위험·미확인 (반드시 명시)

- **실호출 미확인**: #1552 보류분은 본 Task로 흡수했으나 **지금은 실행하지 않는다**. FXUPS가 ① auto의 `shipper_name` 결정값, ② manual의 사용자 입력값을 받아들이는지는 **미확인**(실측 전까지 확정 불가).
- **SHXK 제약 미확인**: company 길이·허용 문자·쉼표 처리 규칙은 원문 명세에 확인되는 상한(수취인 기준 200자) 외 상세가 없다. 200자는 "추정(수취인 기준 유추)"로 표기하고, 문자 제한은 두지 않는다. 쉼표는 결정 요청(선례에 따른 `sanitizeComma` 적용안)으로 올린다.
- **수정 모드 영향(위 §3 참조)**: `autoShipperName`이 빈 값인 오더 전체가 manual로 열려 company NULL 필수 컨트롤이 비어 있다. 저장 막힘은 의도된 동작이고 저장 전 SHXK 등록은 auto 규칙으로 지속된다. 별개의 **기존 결함**(`restoreAutoShipperInfo` 빈 복원, `Checking...` 배지)은 본 Task 밖 IMP 제안 대상([IMP 제안 #1570](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1570))으로 분리한다.
- **문구 충돌(해결)**: Jaison·Aiden 승인으로 `*` 필수 표기를 확정, 옛 "필수 아님 표기"는 무시한다.
- **타입 스테일**: `src/types/supabase.ts`에 영문 주소 컬럼이 누락된 기존 문제가 있어 신규 컬럼 재생성 시 함께 해소될 수 있음 — 생성 범위는 Aiden 확인 사항. `CreateOrderRequest`는 미사용 타입이라 갱신 대상에서 제외(위 §2).

### 6. R-11/R-12·회귀·증적 계획

- **R-11/R-12**: `docs/02_Analysis/ds11/Ds_11_03_Orders_Warehouse.md:27-36`의 company 출처를 "환경변수" → "모드별(화주명/입력값)"으로 갱신하고, 신규 `shipper_company` 입력·`shipper_company_mode` 전달(optional·기본 `auto`, DB 미저장)을 오더 등록 API 입력 표에 추가한다. `create_order_atomic` v8은 같은 PR에서 명세 기재, env 제거 서술도 함께 반영한다. 외부 SHXK 명세 자체는 변경 없음.
- **회귀 테스트 계획**: `tests/unit/shxk/`·`tests/unit/ups/`에 **값 단언**으로 모드×경로 매트릭스(2모드 × 4경로 + 대량 등록 + 기존 오더)를 추가. 문자열 포함(`toContain`) 검사는 쓰지 않는다. 폼 테스트는 토글 전환 시 값 초기화·필수 오류·수정 모드 복원을 값으로 단언한다. **구현 전 코드에서 신규 테스트가 실패함을 확인**해 보고한다. 회귀 항목 파일은 `docs/08_Self_Audit/Checklists/regression-items/TASK-B-399_*.md` 1개 추가, `check:lrtm`/`check:ds11` OK 확인.
- **R-10 증적**: 구현 후 로컬/개발 UI에서 ① auto 모드(컨트롤 숨김), ② manual 모드(필수 컨트롤 표시·빈 값 제출 차단), ③ 수정 모드 복원을 실제 조작해 캡처한다. **증적 파일은 저장소 밖**에 두고 보고에는 보유 여부만 적는다(R-21). 운영 `/admin/error-logs` 열람은 R-14 범위 밖이므로 미실행 사유를 보고한다.
- **실호출 1회 제안 (Jaison 조건부 승인·Aiden 동의)**: 구현 후 **로컬 Supabase(R-14)**에서 **manual 시나리오**를 먼저 검증한다 — 더미 화주·수하인으로 "모두 더미" 체크 기록 → 필수 컨트롤에 **쉼표 포함 더미 값** 입력 → `createorder` 1회 → 즉시 `removeorder` → 4줄 보고. auto 시나리오의 실호출은 별도 승인. 거절 시 같은 호출을 반복하지 않고 오류 종류만 보고하며 우회 구현을 하지 않는다.

### 7. 예상 PR 분할·공수

| PR | 범위 | 선행 조건 | 공수(추정) |
|:--|:--|:--|:--|
| PR1 | `zen_orders.shipper_company` 컬럼 + `create_order_atomic` v8 + 타입/저장 경로 + Ds-11 + DB 먼저 적용·롤백 절차 | Aiden `[설계 확정]` + Team B 구현 PR에서 마이그레이션 작성 / 운영 적용은 별도 Edward R-14 승인·211 런북 | 2~3h |
| PR2 | 폼 컨트롤·4로케일·Zod/서버 강제·사전검증 구조 방어(#1562 이관분 포함)·payload 규칙·env 의존 정리 + 단위 테스트 | PR1 병합 | 4~6h |
| PR3 | 회귀 항목·R-10 증적·로컬 1회 실검증 보고 | PR2 병합 + Jaison 실호출 승인 | 1~2h(+CI) |

- 설계 의견 작성 공수: 1~2h; 검토 반영 +1h. **설계 확정 전에는 코드·마이그레이션을 작성하지 않는다.**

## [결정 요청 — Aiden `[설계 확정]` / Jaison]

| # | 항목 | Jaison / Aiden 의견 | 최종 |
|:--|:--|:--|:--|
| 1 | 저장 방식 A안(단일 `shipper_company` 컬럼 + 값 유무 모드 추론, auto면 서버가 NULL 강제) | 지지 / 방향 동의 | Aiden 확정 대기 |
| 2 | `SHXK_SHIPPER_COMPANY` payload 경로 완전 제거(PR2에서 사용·warn·정의·테스트·Ds-11 함께) | 지지(운영 설정 지시 없음) / 동의 | Aiden 확정 대기 |
| 3 | `*` 필수 표기(옛 "필수 아님" 문구 무시) | 승인 / 동의 | **승인됨** |
| 4 | 일시적 `shipper_company_mode`(Zod enum·Ds-11 입력표·DB 미저장·대량 등록 optional 기본 auto·서버 NULL 강제) | 조건부 승인 / 동의(1·권고 5 함께 반영) | Aiden 확정 대기 |
| 5 | 실호출 1회 — 로컬 Supabase·더미 값(쉼표 포함)·manual 우선, 1회·즉시 `removeorder`·4줄 보고 | 조건부 승인 / 동의 | 구현 후 실행 |
| 6 | 기존 수정 모드 결함 IMP 분리(`type:imp`, 번호 Aiden 부여) + §3의 "저장 막힘"과 구분 | 승인 / 동의 | **승인됨** ([#1570](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1570), 번호는 Aiden 부여 예정) |
| 7 | **쉼표 처리**: 전송 시 `sanitizeComma` 적용·저장은 원문(안 ①) / 미적용 근거 제시(안 ②). 실호출 더미 값에 쉼표 포함 | 안 ① 지지 / Aiden "결정 요청에 추가" 지시 | Aiden 확정 대기 |

## [1단계 DoD]

- [x] 현행 실측(토글·DB·payload 4경로·대량 등록·타 서비스) 파일·줄 근거 기재
- [x] 저장 대안 3개(A 권장/B/C 기각) + 마이그레이션 경로·적용 순서·하위 호환·롤백 기재
- [x] UI 설계(위치·4로케일·필수 표기·모드 전환·서버 강제·수정 모드 영향 범위·길이/쉼표) 기재
- [x] 모드×경로 규칙표 + 검증 층 정정(필수 ①②, 구조 방어 ③) + #1562 이관 범위 기재
- [x] 위험·미확인(실호출/200자 추정/쉼표/수정 모드 범위) 명시
- [x] R-11/R-12·회귀·R-10·로컬 실호출 1회 계획, PR 분할·공수 기재
- [x] Jaison 보완 1~6 + 정정, Aiden R-01 필수 1~3·권고 4~9 반영(지목 코드 줄 직접 대조, 미확인 없음)
- [x] R-21 스캔(값·계정·식별자·원문·절대경로 0건)
- [ ] Aiden `[설계 확정]` → `status:ready` 전환 및 2단계 착수(본 Task 범위 밖)

> 본 문서는 **설계 의견**이며 구현·DDL·코드 변경을 포함하지 않는다. 승인 전 질문·결정 요청은 Issue #1566 코멘트로 올린다.

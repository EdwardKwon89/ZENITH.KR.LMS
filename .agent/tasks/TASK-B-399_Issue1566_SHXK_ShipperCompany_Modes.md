# TASK-B-399 (Issue #1566) — UPS 오더 발송인 입력 방식별 `shipper_company` 처리 [설계 의견]

| 항목 | 내용 |
|:--|:--|
| **Issue / Task** | [#1566](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1566) / `TASK-B-399` |
| **Worker / 검증** | Baker(조사·설계 의견) / Jaison(검증) / Aiden(`[설계 확정]` 승인) |
| **우선순위 / 단계** | p1 / **1단계 — 조사·설계 의견만**(구현·마이그레이션 금지) |
| **상태** | `status:draft` (설계 확정 전 → 2단계 `status:ready` 전환은 Aiden 승인 후) |
| **채번 근거** | `git fetch origin` 후 원격 브랜치 `git ls-remote --heads origin \| grep -i task-b399` = 0건, Issue 제목 조회 = #1566 본건 1건. `./scripts/next-task-number.sh B`는 자기 Issue 제목까지 세어 `TASK-B-400`을 반환(#1564 스크립트 결함) → **B-399 확정**. 착수 워크트리는 전용(`git rev-parse --show-toplevel` 확인). |
| **브랜치** | `feature/teamb-task-b399-iss1566-shipper-company-modes` (base `origin/TeamB_Dev`) |

## [결제·전제]

- JSJung 결정(2026-11-27): ① **내 정보 사용** = `shipper_company`에 `shipper_name` 값, ② **수기 입력** = 전용 필수 입력 컨트롤 값을 그대로 사용. "빈 입력은 공백 문자 전송" 규칙은 **철회** — null·공백 문자 모두 금지.
- 선행 병합: TASK-B-397(PR #1561, merge `0a1c31857`) — `shipper_company`는 현재 **환경변수**에서만 나온다. 본 Task는 그 출처를 결정에 맞게 바꾸는 설계안을 제안한다(임의 제거 없음, 승인 후 시행).
- R-21: 설계 의견에는 실제 값·계정·오더 식별자·요청/응답 원문·절대경로를 기재하지 않는다. R-14: 운영 DB·운영 호출은 범위 밖.

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
- 실호출 진입: `registerUpsOrder`(`ups-labels.ts:429,455`)와 `confirmUpsRegistration`(`src/app/actions/operations/warehouse.ts:515` → `registerUpsOrder` 재사용). 모두 DB에 저장된 오더 값으로 payload를 만든다(폼 값 직접 사용 아님).
- `shipper_name` = `order.shipper_name` → `shipper_org.name` → `shipperDefaults.name` — `label-mapping.ts:120-125,130`.
- `shipper_company` = `shipperDefaults.company?.trim() || shipperDefaults.name.trim()` — `label-mapping.ts:126-131`; 두 호출처가 `SHXK_SHIPPER_COMPANY`를 주입 — `ups-labels.ts:292,881`. 값 정의·폴백·warn은 `src/lib/shxk/config.ts:19-28`.
- 타 SHXK 서비스·비UPS 코드에서 `shipper_company` 사용 없음(`git grep` 기준). 목업 경로(`src/lib/shxk/client.ts:11-36,149-157`)는 payload를 새로 만들지 않고 전달받은 params만 로깅한다.

**DB/스키마**
- `zen_orders` 화주 컬럼: `shipper_id`(`0001_initial_schema.sql:71`), `shipper_contact_name/phone`(`20260421062506_*.sql:3-4`), `shipper_contact_email`(`20260529121000_*.sql:4`), 주소·국가·도시·우편·biz_no(`20260715000001_*.sql:10-16`), 영문 주소 2종(`20260812010000_*.sql:5-6`), `shipper_name`(`20260813020000_*.sql:7`). **`shipper_company` 컬럼 없음**.
- 생성 RPC `20261113090100_task_b346_create_order_atomic_v7.sql:81-109`가 화주 필드를 저장하지만 company는 없음. 기존 오더에 값이 저장될 경로가 없다.
- `src/types/supabase.ts:2819-2940`에 화주 컬럼은 있으나 영문 주소 2종은 누락(기존 스테일). 새 컬럼 반영 필요.
- 과거 결정: `docs/02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md:379`에서 company 컬럼 신설 **안 함**을 명시 → 이번 결정으로 번복 필요(근거 명시).

**검증**
- `orderRegistrationSchema`는 화주명·연락처·주소를 모두 optional(`src/lib/validation/order.ts:52-73`), UPS일 때만 연락처 필수(`:191-224`). `shipper_company` 검사 없음.
- SHXK 사전검증 `src/lib/shxk/validate-payload.ts:91-104`는 성명·국가·주소(길이 포함)·연락처만 검사; company 누락·길이 검사 없음(`:97-104`). 수취인 회사명은 200자 상한 검사 있음(`:107-110`).
- 사전검증 실패 시 `ups-labels.ts:296-301`에서 `trError('shxk_validation_failed', { fields })` 반환 + SHXK 호출 스킵.

### 2. 저장 방식 대안 (Baker 제안 — 확정 필요)

| 대안 | 내용 | 장점 | 단점·영향 |
|:--|:--|:--|:--|
| **A (권장)** | `zen_orders.shipper_company TEXT NULL` **1개 컬럼 신설**. 값이 비어 있으면 `auto`, 값이 있으면 `manual`로 모드 추론. `manual` 값은 입력 원문 저장. | DB에 값이 남아 실호출·미리보기·warehouse 재등록이 모두 같은 규칙을 읽음. 모드 컬럼 추가 불필요. 기존 오더(NULL)는 자동 `auto` → `shipper_name` 사용. | 마이그레이션 + `create_order_atomic` v8(또는 신규 RPC) + `src/types/supabase.ts` + `orders.ts` 저장 경로 + Ds-11 동시 변경. **작성·적용은 Aiden·Edward 경로**, Baker는 필요성만 기재. |
| **B** | `shipper_company` + `shipper_company_mode`(`'auto'\|'manual'`) **2개 컬럼**. | 모드가 값과 분리돼 "수기 모드이나 아직 값 없음"을 표현 가능. 감사·통계에 명시적. | 스키마·타입·RPC·API 표면 2배. 기존 오더에 mode 기본값 정의 필요. 값 누락 시 auto로 폴백할지 예외할지 추가 결정 필요. |
| **C (기존 유지)** | 환경변수 `SHXK_SHIPPER_COMPANY`만 사용. | 변경 없음. | "내 정보 사용=화주명 / 수기 입력=입력값" 결정과 정면 충돌. **채택 불가** — 근거로만 기록. |

**A안 채택 시 마이그레이션 영향(승인 요청 사항)**: `zen_orders` 컬럼 추가(nullable, 기본값 없음 → 기존 행 자동 `auto`), RLS는 테이블 정책 상속으로 신규 정책 불필요(확인 필요), `create_order_atomic`에 `p_payload->>'shipper_company'` 저장 추가, `updateOrder`(`src/app/actions/operations/orders.ts:303-350`)의 `headerData`에 신규 필드 포함, 생성 타입·`CreateOrderRequest`(`src/types/orders.ts:53-65`) 갱신. 백필은 하지 않는 것이 기본(기존 오더 = `auto`). 백필 필요 여부는 Aiden·Edward 결정 사항.

**환경변수 처리 제안(임의 제거 금지 → 승인 대기)**: A안 확정 시 `SHXK_SHIPPER_COMPANY`는 payload 경로에서 **사용 중단**을 제안한다. 이유: 두 모드 모두 값 출처가 오더(화주명 또는 입력값)이고, `shipper_name`은 사전검증에서 비어 있지 않음이 보장되므로 env 폴백·모듈 로드 `warn`이 모두 불필요해진다(`config.ts:23-28`). 단, 운영에 이미 설정된 변수가 있어 **제거 시점·잔유지 여부는 Aiden 승인 사항**이며, 승인 전까지는 코드를 건드리지 않는다. 선택적으로 "레거시 오더의 화주명이 비었을 때만" 마지막 폴백으로 남기는 안도 있으나, 사전검증이 먼저 차단해 실효가 없다 — **완전 제거안을 권장**.

**trim 대체 규칙 제안**: `label-mapping.ts:126-131`의 `company?.trim() || name.trim()`은 수기 입력에서 `name`으로 조용히 대체되어 **필수 규칙을 우회**한다. A안에서는 ① auto: `company = shipperDisplayName`(동일 문자열, 값 단언), ② manual: `company = 저장된 입력 원문`(필수 검증은 trim 후 빈 값이면 실패, payload는 원문 그대로), ③ manual 값 누락: `name` 대체 없이 사전검증 실패 — 로직을 경로별로 분리할 것을 제안한다.

### 3. UI 설계 (A안 기준)

- **위치**: 기존 화주명 입력(`OrderRegistrationForm.tsx:1139-1144`) 바로 아래, 동일 카드 안에 `shipper_company` 입력 컨트롤을 추가. **수기 입력 모드에서만 렌더링**하고, auto 모드에서는 컨트롤 자체를 숨긴다(비활성화만 하는 기존 화주명 필드와 구분).
- **라벨/로케일**: 신규 키 `Orders.shipper_company`를 4개 로케일에 추가 — ko `발송인 회사명`, en `Shipper company`, zh `发件人公司名称`, ja `発送者会社名`. (현재 `shipper_label`은 ko/en만 있고 zh/ja는 키 누락 — `messages/{ko,en,zh,ja}.json`. 이번 Task에서 신규 키만 4개 모두 채우고, 기존 키 누락은 별도 IMP로 분리 제안.)
- **필수 표기**: 결정 2에 따라 컨트롤에 `*` 필수 표시. Issue 본문의 "필수 아님 표기" 문구는 결정 2와 충돌하므로 **필수 표기로 해석** — Aiden/Jaison 확인 요청.
- **모드 전환 시 값 처리**: "수기입력" 클릭 → 컨트롤 표시 + `shipper_company`를 `''`로 초기화(기존 13개 필드 초기화 로직에 포함). "내 정보 사용" 클릭 → 컨트롤 숨김 + `shipper_company`를 `''`로 **클리어**(DB에는 null/빈 값 저장)해 모드 추론이 `auto`로 유지되게 한다.
- **수정 모드 복원**: `buildOrderEditDefaults()`가 저장된 `shipper_company`를 기본값으로 채우고, 저장값이 비어 있지 않으면 `manual`로 시작(기존 `shipper_name`만 보던 판정 `:493-499`를 회사명 유무로 보강). auto로 되돌리면 값 클리어.
- **길이·문자**: SHXK 원문 명세의 company 상한 200자를 `shxk-limits.ts` 상수로 정의해 UI `maxLength` + Zod `.max()` + 사전검증에 적용. 허용 문자 제한은 **미확인**이므로 이번 설계에서는 두지 않는다(실호출 결과 보고 후 결정).
- **모드 전달**: 서버가 "수기 모드인데 값 비었음"을 구분할 수 있게 폼 전송 페이로드에 일시적 `shipper_company_mode: 'auto'|'manual'`을 포함할 것을 제안(DB에는 저장하지 않음). 값의 유무만으로 구분하면 수기 빈 입력과 auto가 동일해 필수 검사를 못 한다.

### 4. payload 규칙표 (모드 × 경로)

| 모드 | 등록 `placeShxkOrder` | 미리보기 `previewShxkPayload` | 재등록/warehouse `confirmUpsRegistration` → `registerUpsOrder` | 값 출처 |
|:--|:--|:--|:--|:--|
| 내 정보 사용 (auto) | `shipper_company` = `shipper_name` 결정값 | 동일 | 동일 | `order.shipper_name` → `shipper_org.name` → `SHXK_SHIPPER_NAME` 기본값(`label-mapping.ts:120-125`). 사전검증이 성명 비어 있음을 차단하므로 실제로는 order/org 값. |
| 수기 입력 (manual) | `shipper_company` = 저장된 입력 원문 | 동일 | 동일 | `zen_orders.shipper_company`(신규). trim 후 빈 값이면 등록 자체가 불가 → SHXK 호출 없음. |
| 기존 오더(값 없음) | auto 규칙 적용 | auto 규칙 적용 | auto 규칙 적용 | 백필 없음. `shipper_name` 값을 company로 사용. |

- **검증 층**: ① 클라이언트 Zod — UPS + manual이면 `shipper_company` 필수(trim 후 빈 값 금지), max 200, 오류 `path: ['shipper_company']`. ② 서버 액션 — `createOrder`/`updateOrder`가 동일 스키마 `parse`(`orders.ts:121,290`). ③ SHXK 사전검증 — `validateShxkPayload()`가 company 누락/공백/200자 초과를 검사해 API 호출 전 차단(`ups-labels.ts:296-301`). manual 누락 오류 문구는 "수기 입력 발송인 회사명" 컨트롤을 가리키도록 옵션 인자(모드)를 전달하는 안을 제안 — payload 자체에 앱 전용 키는 넣지 않는다.
- **#1562(TASK-B-398) 정합**: 사전검증에 company 누락·공백 항목을 추가하는 방향은 본 설계와 **동일**하므로 보류하지 않는다. 다만 메시지가 수기 입력 컨트롤을 가리키도록 #1562 구현 시 본 설계의 모드 인자·오류 키를 공유할지 Jaison 확인 필요(본 Task 범위에서는 메시지 설계만 제안, 구현은 #1562 소관).

### 5. 위험·미확인 (반드시 명시)

- **실호출 미확인**: #1552에서 보류된 실호출은 본 Task로 흡수하며 **지금은 실행하지 않는다**. FXUPS가 ① auto의 `shipper_name` 값, ② manual의 사용자 입력값을 받아들이는지는 **미확인**(둘 다 비어 있지 않은 값이라 통과 가능성은 높으나 실측 전까지 확정 불가).
- **SHXK 제약 미확인**: company 길이·허용 문자·쉼표 처리 규칙은 원문 명세에 200자 외 상세가 없다. 실측 전까지 max 200만 적용하고 문자 제한은 두지 않는다.
- **수정 모드 기존 위험**: affiliation이 로드되지 않아 `restoreAutoShipperInfo()`가 대부분 빈 값으로 복원되는 문제(`OrderRegistrationForm.tsx:453-457,300-322`), 배지가 `Checking...`로 남는 문제가 **기존 결함**으로 존재. 신규 company 컨트롤은 이 경로에 의존하지 않고 저장값으로 복원하되, 기존 문제는 본 Task 범위 밖으로 별도 보고/IMP 제안 대상.
- **문구 충돌**: Issue 본문 "필수 아님 표기" vs 결정 2 "필수 입력" — 확인 요청(위 3번).
- **타입 스테일**: `src/types/supabase.ts`에 영문 주소 컬럼이 누락된 기존 문제가 있어, 신규 컬럼만 보고 타입을 재생성하면 기존 누락도 함께 해소될 수 있음 — 생성 범위를 Aiden과 확인.

### 6. R-11/R-12·회귀·증적 계획

- **R-11/R-12**: `docs/02_Analysis/Ds_11_03_Orders_Warehouse.md:27-36`의 company 출처를 "환경변수" → "모드별(화주명/입력값)"으로 갱신하고, 신규 `shipper_company` 입력·`shipper_company_mode` 전달을 오더 등록 API 입력 표에 추가. `create_order_atomic` v8 신규 함수는 같은 PR에서 명세 기재. 외부 SHXK 명세 자체는 변경 없음.
- **회귀 테스트 계획**: `tests/unit/shxk/`·`tests/unit/ups/`에 **값 단언**으로 모드×경로 매트릭스(2모드 × 3경로 + 기존 오더)를 추가. 문자열 포함(`toContain`) 검사는 쓰지 않는다. 폼 테스트는 토글 전환 시 값 초기화·필수 오류·수정 모드 복원을 값으로 단언. **구현 전 코드에서 신규 테스트가 실패함을 확인**해 보고한다. 회귀 항목 파일은 `docs/08_Self_Audit/Checklists/regression-items/TASK-B-399_*.md` 1개 추가, `check:lrtm`/`check:ds11` OK 확인.
- **R-10 증적**: 구현 후 로컬/개발 UI에서 ① auto 모드(컨트롤 숨김), ② manual 모드(필수 컨트롤 표시·빈 값 제출 차단), ③ 수정 모드 복원을 실제 조작해 캡처한다. **증적 파일은 저장소 밖**에 두고 보고에는 보유 여부만 적는다(R-21). 운영 `/admin/error-logs` 열람은 R-14 범위 밖이므로 미실행 사유를 보고한다(확인 필요).
- **실호출 1회 제안**: Jaison 승인 시 **manual 시나리오**(필수 컨트롤에 테스트용 더미 값 입력 → `createorder` 1회 → 즉시 `removeorder`)를 먼저 검증할 것을 제안한다. 신규 컨트롤→저장→payload 전달까지 끝-to-끝을 확인할 수 있고, auto는 mock+값 단언으로 보호된다. 거절 시 같은 호출을 반복하지 않고 오류 종류만 보고하며 우회 구현을 하지 않는다. 시나리오 선택은 Jaison 승인 사항.

### 7. 예상 PR 분할·공수

| PR | 범위 | 선행 조건 | 공수(추정) |
|:--|:--|:--|:--|
| PR1 | `zen_orders.shipper_company` 컬럼 + `create_order_atomic` v8 + 타입/저장 경로 + Ds-11 | Aiden·Edward 마이그레이션 승인, `[설계 확정]` | 2~3h |
| PR2 | 폼 컨트롤·4로케일·Zod/사전검증·payload 규칙·env 의존 정리 + 단위 테스트 | PR1 병합 | 4~6h |
| PR3 | 회귀 항목·R-10 증적·1회 실검증 보고 | PR2 병합 + Jaison 실호출 승인 | 1~2h(+CI) |

- 설계 의견 작성 공수: 1~2h. **설계 확정 전에는 코드·마이그레이션을 작성하지 않는다.**

## [결정 요청 — Aiden `[설계 확정]` / Jaison]

1. **저장 방식 A안**(단일 `shipper_company` 컬럼 + 값 유무로 모드 추론) 채택 여부. 채택 시 마이그레이션 작성·적용은 Aiden·Edward 경로로만 진행합니다.
2. **환경변수 처리**: payload 경로에서 `SHXK_SHIPPER_COMPANY` 사용 중단(권장) / 운영 설정 유지 후 폴백으로 잔유지 중 어느 쪽으로 확정할지.
3. **필수 표기**: Issue 본문의 "필수 아님 표기"와 결정 2의 "필수 입력"이 충돌 → `*` 필수 표기로 진행해도 되는지.
4. **모드 전달**: 폼→서버 액션에 일시적 `shipper_company_mode`를 포함하는 안(DB 미저장) 승인 여부.
5. **실호출 1회 시나리오**: 수기 입력(더미 값) 우선 제안에 대한 Jaison 승인 여부(auto는 mock 검증으로 보호).
6. **기존 수정 모드 결함**(affiliation 미로드로 auto 복원이 빈 값이 되는 문제)을 본 Task 밖 IMP로 분리해도 되는지.

## [1단계 DoD]

- [x] 현행 실측(토글·DB·payload 전 경로·타 서비스) 파일·줄 근거 기재
- [x] 저장 대안 3개(A 권장/B/C 기각) + 마이그레이션 영향·승인 경로 기재
- [x] UI 설계(위치·4로케일·필수 표기·모드 전환·수정 복원·길이/문자) 기재
- [x] 모드×경로 payload 규칙표 + 3개 검증 층 + 기존 오더 처리 기재
- [x] 위험·미확인(실호출/문자 제약/수정모드 기존 결함/문구 충돌) 명시
- [x] R-11/R-12·회귀·R-10·실호출 1회 계획, PR 분할·공수 기재
- [x] R-21 스캔(값·계정·식별자·원문·절대경로 0건)
- [ ] Aiden `[설계 확정]` → `status:ready` 전환 및 2단계 착수(본 Task 범위 밖)

> 본 문서는 **설계 의견**이며 구현·DDL·코드 변경을 포함하지 않는다. 승인 전 질문·결정 요청은 Issue #1566 코멘트로 올린다.

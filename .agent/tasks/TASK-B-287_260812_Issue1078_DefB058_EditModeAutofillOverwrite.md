# TASK-B-287: Issue #1078 / DEF-B-058 (Critical) — 오더 수정 화면에서 신규등록용 자동완성이 저장된 화주정보/패키지 치수 덮어씀

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1078](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1078) |
| **DEF** | [DEF-B-058](../defects/DEF-B-058_오더수정화면_신규등록용_자동완성이_화주정보_패키지치수_덮어씀.md) |
| **배경** | JSJung — "수정하기"로 오더 수정 화면 전환 시 화주정보/패키지 content type이 제대로 안 불러와진다고 보고 → Jaison 원인 확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-12 |
| **우선순위** | **Critical (P1)** |
| **상태** | ✅ 완료 |

## 근본 원인 (확정 완료 — DEF-B-058 참조)

`OrderRegistrationForm.tsx`는 create/edit 겸용 컴포넌트(`orderId` prop으로 구분, `onSubmit()`에 이미 이 분기 존재)인데, 아래 2개 `useEffect`가 이 구분 없이 마운트 시 무조건 실행됨:

1. **화주정보 자동완성(377~406행)**: `getCurrentUserAffiliation()`(현재 로그인 사용자의 소속 조직 정보)으로 `shipper_id`/`shipper_contact_name`/`shipper_contact_email`/`shipper_contact_phone`/`shipper_address`/`shipper_biz_no`/`shipper_country_code`/`shipper_state_province`/`shipper_city`/`shipper_address_detail`/`shipper_zipcode`를 무조건 `setValue()` — 수정 화면에서 `edit/page.tsx`가 정확히 불러온 오더의 원래 저장값을 덮어씀. 로그인 계정 소속이 오더의 실제 화주와 다르면 화주정보가 완전히 뒤바뀜(고객 데이터 오염 위험).
2. **DOC 패키지 치수 초기화(462~471행)**: `content_type === 'DOC'`인 패키지는 치수 값이 하나라도 있으면(edit/page.tsx가 `length: pkg.length ?? 0`으로 채우므로 `undefined`가 아니라 항상 조건 충족) `length/width/height`를 전부 `undefined`로 초기화 — 저장된 DOC 패키지 치수가 수정 화면 로드 즉시 사라짐.

## 수정 방향 (설계 확정 — 착수 승인)

두 `useEffect` 모두 `orderId`(컴포넌트가 이미 prop으로 갖고 있음)로 조기 return 가드:

```ts
useEffect(() => {
  if (orderId) return; // 수정 모드에서는 신규등록용 자동완성 스킵
  async function loadAffiliation() { ... }
  loadAffiliation();
}, [orderId, setValue, shippers]);
```

두 번째 effect도 동일하게 `if (orderId) return;` 가드.

**주의(구현자 판단 필요, 과설계 금지)**: `affiliation` 상태 자체는 967행에서 "본인 소속 화주" 뱃지 표시에도 쓰인다. `setValue(...)` 폼 필드 덮어쓰기 블록만 `orderId` 가드로 막고 `setAffiliation(data)`는 유지할지, 아니면 전체를 스킵할지는 실제 edit 모드에서 이 뱃지가 어떻게 보이는지(로그인 계정 기준 표시 vs 미표시) 확인 후 최소 범위로 결정 — 리팩토링 범위 확대 금지.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-287-edit-mode-autofill-overwrite` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-287 확인
- [ ] 위 "수정 방향" 반영 — 두 useEffect에 `orderId` 가드 추가
- [ ] **회귀 테스트 신설 (필수, R-09)** — 컴포넌트 렌더링 기반(React Testing Library, 그림자 테스트 금지):
  - `orderId` prop 있이 렌더 시(edit 모드) `defaultValues`의 shipper_contact_name 등이 `getCurrentUserAffiliation()` mock 값으로 덮어써지지 않고 defaultValues 그대로 유지되는지 확인
  - `orderId` prop 없이 렌더 시(create 모드) 기존처럼 자동완성이 정상 동작하는지 확인(회귀 방지)
  - DOC content_type 패키지가 edit 모드에서 defaultValues의 length/width/height를 유지하는지 확인
  - DOC content_type으로 **사용자가 실제 변경**했을 때(create 모드) 치수 초기화가 여전히 동작하는지 확인(TASK-B-076 원래 의도 보존)
  - **되돌리기 검증 필수** — 가드 제거 시 edit 모드에서 값이 덮어써지는 회귀 재현
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 UPS 오더(화주정보 원래 값 확인해둔 상태)로 "수정하기" 진입 → 화주정보/DOC 패키지 치수가 원래 저장값 그대로 표시되는지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-287 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1078 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1078`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — 채번 절차 누락 등 다수 유형 누적 이력 있음, JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 착수 전 `./scripts/next-task-number.sh B` 재확인 필수. 직전 TASK-B-286(DEF-B-056)은 절차 준수 우수(fresh reset 재검증·독립 되돌리기 검증까지 정확) — 동일 수준 기대. 이번 Task는 컴포넌트 단위 React Testing Library 테스트 — TASK-B-266 v2(Mike)에서 발생했던 "그림자 컴포넌트" 재구현 패턴 주의, 반드시 실제 `OrderRegistrationForm`을 import해 렌더링할 것.

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `63b2786e` | `[Dave] fix: TASK-B-287 edit 모드에서 신규등록용 자동완성이 저장값 덮어씀 (Issue #1078 / DEF-B-058, Critical)` |

### 수정 내용

`OrderRegistrationForm.tsx`의 신규등록용 자동완성 useEffect 2건에 `orderId`(edit 모드) 조기 return 가드 추가:

1. **화주정보 자동완성(377~406행)**: `if (orderId) return;` — edit 모드에서 `getCurrentUserAffiliation()`이 `shipper_id`/`shipper_contact_*`/`shipper_address`/`shipper_biz_no`/`shipper_country_code`/`shipper_state_province`/`shipper_city`/`shipper_address_detail`/`shipper_zipcode`를 로그인 계정 소속 정보로 덮어쓰지 않음. (로그인 계정이 실제 화주와 다른 경우 고객 데이터 오염 방지)
2. **DOC 패키지 치수 초기화(462~471행)**: `if (orderId) return;` — edit 모드에서 저장된 DOC 패키지 `length/width/height`를 지우지 않음. (TASK-B-076 원래 의도 — "사용자가 방금 DOC로 바꿨을 때" — 는 create 모드에서 유지)

create 모드는 기존 동작 유지(자동완성 + DOC 치수 초기화 정상).

### 회귀 테스트 (4건, RTL — 실제 OrderRegistrationForm 렌더링)

`tests/unit/orders/defb058-edit-mode-autofill-overwrite.test.tsx`

| TC | 내용 |
|:---|:-----|
| TC-287-01 | edit 모드(orderId 있음) — `getCurrentUserAffiliation` 미호출 + `shipper_contact_name`이 defaultValues 유지 |
| TC-287-02 | create 모드(orderId 없음) — 자동완성 정상 동작(`shipper_contact_name` = 로그인 계정명) |
| TC-287-03 | edit 모드 — DOC 패키지 defaultValues 치수(30) 유지 |
| TC-287-04 | create 모드 — content_type을 DOC로 변경 시 치수 초기화 여전히 동작 (TASK-B-076 보존) |

### 되돌리기 검증

두 `orderId` 가드 일시 제거 → **TC-287-01(getCurrentUserAffiliation 호출되어 shipper_contact_name이 'Login User'로 덮어써짐)·TC-287-03(DOC 치수 30→빈 값)이 정확히 FAIL 재현** → 복원 후 4/4 PASS 확인.

### 검증

- `npm run test:regression`: **1224/1224 PASS** (173파일, 신규 +4)
- `npm run build`: SUCCESS
- `npx tsc --noEmit`: 오류 없음

## [Jaison 최종 검토]

`/tmp/review-pr1080` 격리 워크트리에서 재검증 — 신규 테스트 4/4 PASS(실제 `OrderRegistrationForm` 렌더링). **독립 되돌리기 검증**: 두 `if (orderId) return;` 가드를 수동 주석 처리 후 재실행 → TC-287-01(getCurrentUserAffiliation 호출됨, shipper_contact_name이 'Login User'로 덮어써짐)·TC-287-03(DOC 치수 30→빈 값) 정확히 FAIL 재현, 원복 후 4/4 PASS 재확인. 전체 회귀 173/173·1224/1224 PASS, build SUCCESS. 실제 CI(`gh pr checks 1080`) Regression Tests pass 확인. 수정 범위도 설계 그대로 최소(가드 2줄 + dependency array 추가)로 과설계 없음. PR#1080 승인·머지(TeamB_Dev, 커밋 `0e35cb42`), Issue #1078 종결.

## [발견 이슈]

없음

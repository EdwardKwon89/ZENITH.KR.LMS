# TASK-B-296: Issue #1102 — 오더 등록 화면 화주 정보 UI 단순화 (dropdown 제거 + 수기입력 시 전체 필드 초기화)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1102](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1102) |
| **배경** | JSJung — TASK-B-295(화주명 토글) 후속 개선 3건: ①화주 select 드롭다운 불필요 컨트롤 제거 ②수기입력 시 화주 정보 전체 컨트롤 초기화 ③최종 입력값이 그대로 createOrder에 매핑 |
| **담당** | Dave (Team B) — TASK-B-295 직접 구현자, 동일 코드 최신 숙지 |
| **생성일** | 2026-08-13 |
| **우선순위** | P2 |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 현재 상태 (분석 완료)

- `shipper_id` `<select>`([L1012-1024](../../src/components/orders/OrderRegistrationForm.tsx#L1012-L1024))는 신규 등록 시 `loadAffiliation()`이 모든 사용자(개인/법인/대리점 무관)에 대해 무조건 실행되며 `disabled={!!affiliation || lockShipperId}`로 즉시 잠김 — **사실상 항상 비활성화된 죽은 컨트롤**. `shippers` prop도 `getOrganizations()`(전체 조직 목록, 역할별 필터 없음)라 "대리점이 여러 화주 중 선택"하는 별도 흐름이 이 select에 실제로 얹혀있지 않음. 제거해도 기존 오더 소유권 로직(`shipper_id` 값 자체, RLS)에 영향 없음 — TASK-B-295에서 이미 정확히 구현된 부분은 그대로 유지.
- `shipper_biz_no`([L1103-1109](../../src/components/orders/OrderRegistrationForm.tsx#L1103-L1109))는 현재 `readOnly` 고정.
- `AddressInput`([L1084-1102](../../src/components/orders/OrderRegistrationForm.tsx#L1084-L1102))은 현재 `!affiliation?.isIndividual`일 때만 렌더 — 개인 화주는 애초에 주소 입력 자체가 없음.
- TASK-B-295에서 만든 `shipperNameMode`(`'auto' | 'manual'`) 토글은 현재 `shipper_name` 필드 하나만 제어.

## 수정 방향 (설계 확정 — 착수 승인)

### ① `shipper_id` `<select>` 컨트롤 시각적 제거
값 자체(`register('shipper_id')`)는 계속 폼 상태로 등록 — 기존 자동 설정 로직(신규: `loadAffiliation`의 `setValue('shipper_id', ...)`, 수정: `defaultValues`) **그대로 유지, 로직 변경 없음**. UI에서 `<select>`만 제거(숨김 처리 또는 렌더 자체 삭제 — hidden input 불필요, RHF `register()`만으로 폼 상태 추적 충분). "법인 화주/개인 화주/조직명" `ZenBadge`는 컨트롤이 아니라 표시용이므로 유지.

### ② `shipperNameMode` 토글 적용 범위를 화주 정보 전체 필드로 확장
대상 필드: `shipper_name`, `shipper_contact_name`, `shipper_contact_phone`, `shipper_contact_email`, `shipper_address`, `shipper_address_english`, `shipper_address_detail`, `shipper_address_detail_english`, `shipper_country_code`, `shipper_state_province`, `shipper_city`, `shipper_zipcode`, `shipper_biz_no`

- **"수기입력" 클릭 시**: 위 전체 필드를 즉시 빈 문자열로 초기화(`shipper_country_code` 포함 — 기존 'KR' 기본값도 지움) + 전부 활성화(`shipper_biz_no`의 `readOnly` 해제 포함)
- **"내 정보 사용" 재전환 시**: 위 전체 필드를 affiliation 파생값(`loadAffiliation`의 기존 else-branch와 동일한 값들)으로 재채움 + 전부 비활성화
- **수정 모드 초기 판정**(저장된 `shipper_name`이 조직명과 다르면 manual로 시작하는 기존 TASK-B-295 로직)은 그대로 유지 — 단 이 경우는 "사용자가 방금 토글을 누른 것"이 아니라 "기존 저장 데이터 복원"이므로 **필드 초기화 없이 저장값 그대로 표시**. 초기화는 사용자가 토글 버튼을 명시적으로 클릭한 시점에만 적용(자동 판정으로 manual 시작 시에는 미적용 — 기존 데이터 보존 우선).

### ③ `AddressInput` 렌더 조건에서 `!affiliation?.isIndividual` 제거
개인/법인 무관 항상 표시(내 정보 사용 모드에서는 계속 비활성화 표시, 개인 화주의 경우 affiliation에 주소 정보가 없으므로 초기값은 빈 값).

### ④ 서버 액션/스키마 변경 불필요
이미 모든 `shipper_*` 필드가 폼 상태 그대로 `createOrder`/`updateOrder`에 전송되는 구조(TASK-B-295에서 확인됨)라 "최종 입력값이 그대로 매핑"은 ①~③이 정확히 구현되면 자동 충족 — 회귀 테스트로 **명시적 검증만** 수행(별도 매핑 로직 추가 없음).

과설계 금지 — `shipper_id`의 실제 소유권/RLS/RPC 로직은 TASK-B-295에서 이미 정확히 구현됨, 이번엔 UI(select 제거 + 초기화 범위 확장)만 변경. 마이그레이션·스키마 변경 없음.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-296-shipper-info-ui-simplify` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-296 확인
- [ ] `shipper_id` select 제거(①)
- [ ] 토글 적용 범위 확장(②) — 전체 필드 목록 빠짐없이 초기화/복원 로직에 포함, `shipper_biz_no` readOnly 해제
- [ ] `AddressInput` 조건 제거(③)
- [ ] **회귀 테스트 신설 (필수, R-09, 실제 컴포넌트 렌더링 기반 — 그림자/toContain 금지)**:
  - `shipper_id` select 엘리먼트가 화면에 렌더되지 않는지(쿼리 결과 null)
  - "수기입력" 클릭 시 화주 정보 전체 필드(이름/담당자명/전화/이메일/주소/사업자번호 등)가 빈 값으로 초기화되고 모두 활성화되는지
  - "내 정보 사용" 재전환 시 전체 필드가 affiliation 파생값으로 복원되고 모두 비활성화되는지
  - 수정 모드 진입 시(저장값이 조직명과 다름) 필드가 초기화되지 않고 기존 저장값 그대로 유지되는지(자동판정 manual 시작과 사용자 클릭 manual 전환의 차이 검증)
  - 수기입력 후 폼 제출 시 입력한 값이 그대로 `createOrder`/`updateOrder` payload에 매핑되는지(mock 호출 인자 검증)
  - 개인 화주(`isIndividual`)도 주소 입력란이 렌더되는지(회귀 방지 — 기존 법인 전용 조건 제거 확인)
- [ ] **독립 되돌리기 검증**: 초기화/복원 로직을 원복해서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 브라우저에서 실제로: 오더 등록 화면에서 화주 select가 안 보이는지 확인 → "수기입력" 클릭 시 이름/담당자/연락처/주소/사업자번호 전부 빈칸+편집 가능 확인 → 임의 값 입력 후 제출 → 등록된 오더에 입력한 값이 정확히 저장됐는지 확인 → "내 정보 사용"으로 되돌리면 전부 원래 정보로 복원되는지 확인 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] refactor: TASK-B-296 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1102 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1102`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 커밋 누락 유형 누적 이력(13회, 최다) 있음. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 이번 Task는 TASK-B-295에서 본인이 직접 만든 `shipperNameMode` 토글 로직을 확장하는 작업이라 설계 리스크는 낮음 — 초점은 **초기화 범위 누락 없이 전체 필드 포함**(특히 `shipper_biz_no` readOnly 해제, `shipper_country_code` 등 기본값 있는 필드도 빈 값으로 초기화하는지)과 **자동판정 manual vs 사용자 클릭 manual의 초기화 여부 차이**를 정확히 구현하는 것. 회귀 테스트는 실제 컴포넌트 렌더링 기반으로 작성할 것 — 정적 문자열 검사나 로직 재구현 금지.

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `518148a9` | `[Dave] refactor: TASK-B-296 화주 정보 UI 단순화 (Issue #1102)` |

### 수정 내용 (설계 확정 ①~③ 그대로, 과설계 금지 준수)

1. **① `shipper_id` select 렌더 제거** — `register('shipper_id')`는 폼 상태로 유지(오더 소유권·RLS·RPC 로직 무변경), `ZenBadge`(법인/개인/조직명)는 표시용이라 유지
2. **② 토글 적용 범위 화주 정보 전체 필드로 확장** (13개: `shipper_name`/`shipper_contact_name`/`shipper_contact_phone`/`shipper_contact_email`/`shipper_address`/`shipper_address_english`/`shipper_address_detail`/`shipper_address_detail_english`/`shipper_country_code`/`shipper_state_province`/`shipper_city`/`shipper_zipcode`/`shipper_biz_no`):
   - 수기입력 클릭 → 전체 필드 빈 값 초기화 + 활성화 (`shipper_biz_no` `readOnly` 해제 포함)
   - 내 정보 사용 클릭 → affiliation 파생값 전체 복원 + 비활성화
   - 수정 모드 자동판정 manual(저장값이 조직명과 다름)은 **초기화 없이** 저장값 보존 — 사용자 클릭 manual과 자동판정 manual의 차이 구현
3. **③ `AddressInput` 렌더 조건(`!affiliation?.isIndividual`) 제거** — 개인/법인 무관 항상 표시 (auto 모드에선 `readOnly`)
4. **④ 서버 액션/스키마 변경 없음** — 매핑은 기존 구조 그대로, 회귀 테스트로 명시적 검증

### 회귀 테스트 (6건 신설, RTL 실제 컴포넌트 렌더링)

`tests/unit/orders/iss1102-shipper-info-ui-simplify.test.tsx`

| TC | 내용 |
|:---|:-----|
| TC-296-01 | `shipper_id` select 엘리먼트 미렌더 |
| TC-296-02 | 수기입력 클릭 → 전체 필드 빈 값 초기화 + 활성화 (biz_no readOnly 해제) |
| TC-296-03 | 내 정보 사용 재전환 → affiliation 파생값 전체 복원 + 비활성화 |
| TC-296-04 | 수정 모드(저장값 상이) → 자동판정 manual, 필드 초기화 없이 저장값 보존 |
| TC-296-05 | 수기입력 후 제출 → 입력값이 createOrder payload에 그대로 매핑 (UPS 오더 등록 버튼 경로) |
| TC-296-06 | 개인 화주(isIndividual)도 주소 입력란 렌더 (회귀 방지) |

### 독립 되돌리기 검증

`clearShipperInfoFields` 호출 제거(수기입력 클릭 시 초기화 없음) → **TC-296-02 정확히 FAIL** → 복원 후 6/6 PASS 확인.

### 검증

- `npm run test:regression`: **1304/1304 PASS** (188파일, 신규 +6)
- `npm run build`: SUCCESS
- 기존 TASK-B-295 토글 테스트 4건 포함 전체 10건 PASS (회귀 없음)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

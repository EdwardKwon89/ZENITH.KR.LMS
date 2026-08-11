# DEF-B-058 (Critical) — 오더 수정 화면에서 신규등록용 자동완성 useEffect가 저장된 화주정보/패키지 치수를 덮어씀

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-12 |
| **발견 경위** | JSJung — "수정하기"로 오더 수정 화면 전환 시 이전에 저장했던 화주정보를 제대로 가져오지 못하고, 패키지 content type(DOC) 관련해서도 값이 안 불러와진다고 보고 |
| **긴급도** | Critical |
| **영향 범위** | `OrderRegistrationForm.tsx` — TASK-B-284(WAREHOUSED 부분 수정)뿐 아니라 **오더 수정 기능 전체**(REGISTERED 단계 포함, 오더 수정 기능 존재 이래 전체)에 해당. DEF-B-056과 유사하게 "수정 기능 자체가 원래부터 갖고 있던 잠재 결함"이 최근 WAREHOUSED 수정이 실사용 가능해지며 처음 드러남 |

## 근본 원인 (확정 완료)

`OrderRegistrationForm.tsx`는 신규 등록(create)과 수정(edit) 양쪽에 재사용되는 컴포넌트로, `orderId` prop 유무로 두 모드를 구분한다(`onSubmit()`의 `if (orderId) { ... updateOrder ... } else { ... createOrder ... }` 분기가 이미 존재). 그러나 아래 두 `useEffect`는 **이 구분 없이 마운트 시 무조건 실행**된다.

### ① 화주정보 자동완성 (377~406행)

```ts
useEffect(() => {
  async function loadAffiliation() {
    const data = await getCurrentUserAffiliation();
    setAffiliation(data);
    if (data.isIndividual) {
      setValue('shipper_id', data.dummyIndividualId);
      setValue('shipper_contact_name', data.userName);
      // ...
    } else {
      setValue('shipper_id', data.orgId as string);
      setValue('shipper_contact_name', data.userName);
      setValue('shipper_address', matchedShipper?.address || data.orgAddress || '');
      setValue('shipper_biz_no', matchedShipper?.biz_no || data.orgBizNo || '');
      // ... 등 shipper_* 필드 다수
    }
  }
  loadAffiliation();
}, [setValue, shippers]);
```

**현재 로그인한 사용자의 소속 조직 정보**(`getCurrentUserAffiliation()`)로 `shipper_id`/`shipper_contact_*`/`shipper_address`/`shipper_biz_no`/`shipper_country_code`/`shipper_state_province`/`shipper_city`/`shipper_address_detail`/`shipper_zipcode`를 **무조건 덮어쓴다.** 신규 등록 시엔 의도된 동작(로그인한 화주 본인 정보 자동 채움)이지만, **수정 화면에서도 그대로 실행돼 `edit/page.tsx`가 `getOrderDetails()`로 정확히 불러온 오더의 원래 저장값을 로그인 계정 정보로 덮어씀.**

- 로그인 계정의 소속 조직이 오더의 실제 `shipper_id`와 **다른 경우**(ADMIN이 임의 오더 수정, AGENCY가 하위 화주 오더 수정 등) — 화주정보가 완전히 엉뚱한 값으로 뒤바뀜(고객 데이터 오염 위험)
- 소속이 우연히 같은 경우(이번 세션 테스트처럼 화주 본인이 자기 오더를 수정) — 시각적으로는 "우연히 맞아떨어져" 문제가 안 보일 수 있어 발견이 늦어짐

### ② 패키지 DOC 치수 초기화 (462~471행)

```ts
useEffect(() => {
  if (!watchedPackages) return;
  watchedPackages.forEach((pkg, i) => {
    if (pkg.content_type === 'DOC' && (pkg.length !== undefined || pkg.width !== undefined || pkg.height !== undefined)) {
      setValue(`packages.${i}.length`, undefined);
      setValue(`packages.${i}.width`, undefined);
      setValue(`packages.${i}.height`, undefined);
    }
  });
}, [contentTypesKey, setValue]);
```

TASK-B-076 의도는 "사용자가 방금 content_type을 DOC로 바꿨을 때 불필요한 치수 입력을 초기화"였을 것으로 추정되나, `contentTypesKey`는 `watchedPackages`에서 파생되므로 **컴포넌트 마운트 시점(즉 수정 화면 최초 로드) 값으로도 최초 1회 실행된다.** `edit/page.tsx`의 defaultValues가 `length: pkg.length ?? 0`(즉 DB가 NULL이어도 `0`으로 세팅, `undefined`가 아님)으로 채워주므로 `pkg.length !== undefined` 조건은 거의 항상 참이 되어, **오더 저장 당시 DOC 패키지에 정상 입력됐던 치수가 수정 화면을 여는 즉시 지워진다.**

## 재현 절차

1. UPS DOC 패키지(치수 입력됨) 포함 오더를 저장
2. "수정하기"로 해당 오더 편집 화면 진입
3. 화주정보 필드들이 로그인 계정의 조직 정보로 바뀌어 있음(오더 원래 화주와 다르면 즉시 확인 가능) + DOC 패키지의 치수 필드가 비어있음(0 또는 공백) — 저장된 원본 값이 아님

## 수정 방향

두 `useEffect` 모두 `orderId` prop(이미 컴포넌트가 갖고 있음, edit 모드 판별용)으로 가드:

```ts
useEffect(() => {
  if (orderId) return; // 수정 모드에서는 신규등록용 자동완성 스킵 — defaultValues가 이미 정확한 값을 갖고 있음
  async function loadAffiliation() { ... }
  loadAffiliation();
}, [orderId, setValue, shippers]);
```

동일하게 두 번째 effect도 `if (orderId) return;`으로 가드. **단, `affiliation` 상태 자체(화면에 "본인 소속 화주 뱃지" 등을 표시하는 용도, `966행` 등에서 사용)가 edit 모드에서도 필요한지는 구현자가 실제 사용처를 확인해 판단** — 필요하다면 `setAffiliation(data)` 자체는 유지하되 `setValue(...)` 폼 필드 덮어쓰기 블록만 `orderId` 유무로 분리.

과설계 금지 — 두 effect에 조기 return 가드 추가가 핵심, 리팩토링 범위 확대 금지.

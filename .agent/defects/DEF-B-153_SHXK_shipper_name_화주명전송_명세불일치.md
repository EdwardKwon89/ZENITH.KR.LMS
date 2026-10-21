# DEF-B-153: SHXK createorder `shipper_name`에 "화주명"(회사명) 전송 — API 명세 의미 불일치·200자 제한 미검증

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-B-341(Issue #1261) 작업 중 발견 — JSJung 2026-10-21 결정("SHXK `shipper_name`·`shipper_company`를 화면 '화주명'으로 통일")을 구현하면서 SHXK API 명세와 대조 |
| **긴급도** | Low (결함 확정 아님 — SHXK 서버 측 수신 검증 미확인. 다만 라벨 발급 실패로 이어질 수 있는 여지) |
| **발견일** | 2026-10-21 |
| **조치 상태** | 미조치 (TASK-B-341 범위 밖 — 코드 차단 금지 지시에 따라 미검증 상태로 보고) |

## 현상

SHXK `createorder` API 명세(`docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 116~117행)상 `shipper` 블록은 다음과 같다.

| 필드 | 길이 | 명세 의미 |
|:--|:--|:--|
| `shipper.shipper_name` | 200 | **발송인 성명** (필수) |
| `shipper.shipper_company` | 200 | 발송인 회사명 |

TASK-B-341(JSJung 결정) 이후로는 두 필드에 **동일하게 화면 "화주명"**(`zen_orders.shipper_name`)이 들어간다.
즉 `shipper_name`(성명 자리)에 회사명·조직명이 전송된다.

### 미검증 위험 3가지

1. **명세 의미 불일치** — `shipper_name`은 "발송인 성명"이다. 회사명·한글을 성명 자리에 넣는 것은 명세 정의와 어긋난다. SHXK가 성명 형식(영문·인명 규격) 검증이 있으면 `createorder`가 거부될 수 있다. **실서버 수신 동작 미확인.**
2. **200자 제한 미검증** — SHXK 명세상 두 필드 모두 최대 200자다. 우리 코드(`src/lib/shxk/validate-payload.ts`)는 품명(`ITEM_NAME_MAX`)·HS 코드(`HS_CODE_MAX`)·전화번호만 검증하고 `shipper_name`·`shipper_company` 길이는 검증하지 않는다. 화면 "화주명"은 자유 입력(`z.string().optional()`, Issue #1100/TASK-B-295)이라 **200자 초과 값이 그대로 전송**된다 → SHXK 거부 가능.
3. **한글·특수문자** — "화주명"은 한글 입력 가능(`src/components/orders/OrderRegistrationForm.tsx` `register('shipper_name')`). 한글 회사명이 `shipper_name`으로 전송되어 SHXK가 영문만 허용할 경우 실패 가능. (기존 `shipper_company` 경로는 이미 같은 값을 보내왔으나, `shipper_name`은 **필수(Y)** 필드라 거부 시 라벨 발급 전체가 실패한다.)

## 영향 범위

- SHXK createorder 호출 전체(FXUPS 등 SHXK 운송방식 경로 — `placeShxkOrder()` → `src/app/actions/operations/ups-labels.ts:254`).
- 실패 시: `createorder` 거부 → `zen_ups_label_errors`에 에러 기록 → 라벨 미발급(오더 자체는 정상 등록).
- `shipper_name`은 필수 필드라 실패 시 `validateShxkPayload()`는 통과(값이 채워져 있음) → **사전검증에서 걸러지지 않고 실제 API 호출 단계에서 실패**한다.

## 기존 데이터 영향 (참고)

`zen_orders.shipper_name`이 NULL인 기존 오더는 조직명(`shipper_org.name`)으로 폴백된다. 변경 이전에는 `shipper_name` 자리에 담당자명(`shipper_contact_name`)이 전송되던 필드이므로, **기존 오더 재발급 시 값이 달라진다**(담당자명 → 화주명/조직명). 이는 JSJung 결정의 의도된 동작이며 확정 불가 판정 대상은 아니다.

## 권장 조치

1. **머지 후 실주문 1건 라이브 검증**(JSJung): 한글 화주명·영문 화주명 각 1건으로 SHXK createorder 수신 성공 여부 확인. 실패 시 `shipper_name`을 담당자명으로 되돌리는 회귀 옵션 검토.
2. **200자 초과 처리 정책 결정**(별도 Task): 화면 "화주명" 입력 또는 서버 액션에서 200자 truncate/sanitize 할지, SHXK 거부 허용할지 결정 필요. Issue #1261 지시("코드로 막지 말고")에 따라 **이번 Task에서는 차단하지 않았다.**
3. **영문 규격 필요 시**: 한글 화주명 → 영문 변환(화주 등록 시 영문명 별도 보관) 설계는 별도 Task 후보.

## 파일 소유권 확인

`src/lib/ups/label-mapping.ts`, `src/lib/shxk/validate-payload.ts` 모두 Team B 주도 파일 → **Team B 담당**

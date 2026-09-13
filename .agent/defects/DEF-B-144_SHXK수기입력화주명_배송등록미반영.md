# DEF-B-144: 오더 화주명 수기입력(오버라이드) 값이 SHXK(UPS) 실제 배송 등록에는 반영되지 않음

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 "shipper 정보를 직접 입력할 수 있는데 값이 제대로 전달되지 않는 것 같다"고 문의 → Jaison이 코드 추적으로 원인 확정 |
| **긴급도** | Medium (기능 자체는 동작하나 데이터 정합성 결함 — 서류와 실제 UPS 등록 정보 불일치) |
| **발견일** | 2026-09-13 |
| **관련 원 Task** | TASK-B-295 (Issue #1100, 2026-08-13) — 오더 화주명(발송인 표시명) 자유 입력 기능 |

## 현상

오더 등록/수정 화면에서 "수기입력" 모드로 화주명(`shipper_name`)을 자유 텍스트로 입력해도, 실제 SHXK(UPS) `createorder` API로 전송되는 `shipper.shipper_company` 값은 이 입력값이 아니라 **로그인 조직의 등록명**(`zen_organizations.name`)이 그대로 나간다.

- 내부에서 생성하는 서류(CI/PL/UPS Invoice PDF, 화주 정보 카드, Shipping Label PDF)에는 수기입력값이 정상 표시됨
- 그러나 **UPS/SHXK 시스템에 실제 등록되는 화주 정보(carrier system of record)는 여전히 조직명**으로 나감
- 결과: 인쇄된 서류상 화주명과 UPS 시스템에 실제 등록된 화주명이 서로 달라지는 불일치 발생

## 원인

[`src/lib/ups/label-mapping.ts:122`](../../src/lib/ups/label-mapping.ts#L122) `buildCreateOrderPayload()`:

```ts
shipper_company: (order.shipper_org as Record<string, unknown> | undefined)?.name as string || shipperDefaults.name,
```

`order.shipper_name`(TASK-B-295에서 신설된 수기입력 오버라이드 컬럼)을 전혀 읽지 않고, `shipper_org?.name`(FK 조인된 조직 테이블의 라이브 값)만 사용한다.

**배경**: TASK-B-295 설계([task file](../tasks/TASK-B-295_260813_Issue1100_OrderShipperNameOverride.md) §14~16, §54~62)는 오버라이드 적용 대상을 "서류/라벨 생성 지점 4곳"(CI/PL/UPS Invoice PDF·화주 정보 카드·Shipping Label PDF)으로 명시적으로 한정했고, 나머지 30여 곳은 "실소속 조직명 유지가 정상이므로 의도적으로 제외" 대상이었다. 문제는 `buildCreateOrderPayload()`(SHXK 실제 배송 등록 API)가 **그 "4곳"에도, "제외 대상 30여 곳"에도 포함되지 않은 사각지대**였다는 점 — 당시 스코프 분석에서 아예 언급되지 않았다.

## 영향 범위

- `src/lib/ups/label-mapping.ts`의 `buildCreateOrderPayload()`를 호출하는 두 지점 모두 영향:
  - 실제 SHXK 배송 등록: [`src/app/actions/operations/ups-labels.ts:172-189`](../../src/app/actions/operations/ups-labels.ts#L172-L189) (`placeShxkOrder`)
  - 미리보기: [`src/app/actions/operations/ups-labels.ts:664-689`](../../src/app/actions/operations/ups-labels.ts#L664-L689) (`previewShxkPayload`)
- `gitnexus_impact` 확인 결과 `buildCreateOrderPayload` 사용처는 위 2곳뿐 — 수정 범위는 좁음
- `shipper.shipper_name`(담당자명, `order.shipper_contact_name` 매핑)은 이번 결함과 무관 — 정상 동작

## 권장 조치

`buildCreateOrderPayload()`의 `shipper_company` 매핑에 `order.shipper_name` 폴백을 최우선으로 추가:

```ts
shipper_company: (order.shipper_name as string) || (order.shipper_org as Record<string, unknown> | undefined)?.name as string || shipperDefaults.name,
```

TASK-B-295가 4개 문서 빌더에 적용한 것과 동일한 `order.shipper_name || order.shipper?.name` 폴백 패턴을 그대로 적용하면 된다. → **TASK-B-324로 배정**

## 부가 발견 (참고, 별도 결함 아님 — IMP 검토 대상)

`toIso3()` 함수([ups-labels.ts:149](../../src/app/actions/operations/ups-labels.ts#L149))가 정의만 되어 있고 실제 호출부가 없음(dead code로 추정). `consignee_countrycode`는 `resolveCountryCode()`가 `zen_ports.country_code`에서 가져온 값을 포맷 변환 없이 그대로 사용 중. 정상 동작에 지장은 없어 보이나 확인 필요 — 이번 Task 범위 밖이므로 별도 IMP로 기록 권장.

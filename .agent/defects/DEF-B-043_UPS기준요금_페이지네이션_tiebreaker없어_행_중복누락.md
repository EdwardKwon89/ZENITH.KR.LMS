# DEF-B-043 — UPS 기준요금 페이지네이션(`fetchAllRows`)이 정렬 동률 tiebreaker 부재로 행 중복/누락 발생 (PR#1036 후속 회귀)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 "master air"로 Express Expedited 기준요금 조회 중 "12kg 행에서 Zone 5 다음이 표출 안 됨" 보고 → Jaison이 Playwright + 브라우저 콘솔 계측으로 원인 확정 |
| **긴급도** | High — 조회 화면 데이터가 페이지 로드마다 간헐적으로 손상되어 표시(에러 없이 조용히 발생), admin/agency/shipper 3개 화면 전부 영향 |
| **현재 상태** | 미수정 |
| **관련** | **PR#1036(TASK-B-268, DEF-B-041) 후속 회귀** — Jaison이 직접 승인·머지한 PR에서 발생. 당시 psql 직접 쿼리로 페이지 경계 무결성을 검증했으나(중복/누락 0건), 그건 단일 세션 내 순차 쿼리였고 실제 PostgREST의 두 개 **별도 HTTP 요청**에서는 동일 보장이 없었음 — 검증 방법 자체의 한계 |

## 근본 원인 (재현 완료)

`src/lib/ups/paginate-all.ts`의 `fetchAllRows()`가 `.range(from, to)`로 1,000행씩 나눠 여러 번 REST 요청을 보내 병합하는데, 호출부(`rates-public.ts`의 `getPublicBaseRates()`, `rates.ts`의 `getUpsBaseRates()`) 둘 다 **`.order('weight_kg')`만 사용하고 동률(tie-breaker) 컬럼이 없음**.

`zen_ups_base_rates`는 동일 `weight_kg` 값을 가진 행이 매우 많음(같은 중량에 Zone별로 최대 10건). PostgREST의 두 페이지 요청(`.range(0,999)`, `.range(1000,1999)`)은 **서로 다른 HTTP 요청 = 서로 다른 쿼리 실행**이라, `weight_kg`가 같은 행들 사이의 상대 순서가 두 요청 간에 항상 동일하다는 보장이 없음(병렬 워커 스캔 순서 등 Postgres 내부 비결정성). 그 결과:
- 페이지 경계에 걸친 동률 그룹 내에서 **일부 행이 양쪽 페이지에 중복으로 포함**되거나
- **어느 페이지에도 포함되지 않고 완전히 누락**될 수 있음

전체 행 수(1,560)는 우연히 맞아떨어지는 경우가 많아(중복 N건 = 누락 N건) 겉보기엔 정상처럼 보이지만, 실제로는 무작위로 다른 행이 사라지고 다른 행이 중복됨 — **화면 로드마다 결과가 달라질 수 있는 비결정적 버그**.

## 재현 (Playwright + 브라우저 콘솔 계측)

`agency@zenith.kr`(→ 이후 `james@sntl.co.kr`/MASTER AIR) 실 로그인 → `/agency/ups-rates` → Expedited 선택 시:
```
matrixRates.length = 1560 (총 행수는 정확)
uniqueIds = 1544 (16개 ID 중복)
→ Expedited @ 12kg: Z5~Z10 6개 Zone 행이 완전히 누락되어 "—" 표시
   (실제 DB에는 정확히 10개 Zone 전부 존재 — psql로 확인)
knownRow(Z5 @ 12kg, id=646e64ba-...) → matrixRates 안에 아예 없음(undefined)
```
반면 같은 데이터를 raw REST로 직접 반복 호출(curl, 3회)했을 때는 매번 우연히 중복/누락 0건으로 나왔음 — **간헐적으로만 발생하는 비결정적 버그**라 재현 시점에 따라 다른 결과가 나올 수 있음.

## 수정 방향 (제안)

`fetchAllRows`를 사용하는 두 쿼리(`getPublicBaseRates()`, `getUpsBaseRates()`)의 `.order('weight_kg')`에 **고유 컬럼 기반 2차 정렬(tiebreaker)**을 추가해 페이지 경계에서도 항상 동일한 순서를 보장:
```ts
.order('weight_kg')
.order('id')   // 신규 — 동률 시 결정적 순서 보장
```
`id`는 UUID PK라 유일성이 보장되므로 이걸로 충분. 직접 검증 완료 — `order=weight_kg.asc,id.asc`로 반복 3회 테스트 시 매번 중복/누락 0건(기존 `weight_kg`만으로는 우연히 통과하는 경우도 있으나 보장되지 않음).

**영향 범위 확인**: `fetchAllRows` 호출부는 코드베이스 전체에 이 2곳뿐(`rates.ts`, `rates-public.ts`) — 둘 다 동일하게 수정 필요.

## 회귀 테스트 (필수)

- `fetchAllRows` 자체 또는 호출부에 대해, mock에서 **동일 정렬키를 가진 행이 페이지 경계에 걸치는 시나리오**를 만들어(예: weight_kg=12인 행 15개가 999~1013 인덱스에 걸치도록) 두 페이지 호출의 정렬 조건(`.order()` 체인)에 `id` 2차 정렬이 실제로 포함되는지 검증(behavioral, `.order` 호출 인자 캡처)
- **되돌리기 검증 필수** — `id` tiebreaker 제거 시 위 시나리오에서 중복/누락 재현되는지 mock으로 확인
- 가능하면 실 DB(현재 1,560행, weight_kg 동률 다수 존재)에서 REST API를 여러 번 반복 호출해 매번 unique id 개수가 정확히 일치하는지 확인(간헐적 버그 특성상 1회 테스트로는 불충분 — 최소 5회 이상 반복 권장)

## 참고 — 제 책임

PR#1036 리뷰 당시 psql 직접 쿼리(같은 세션 내 순차 실행)로 페이지 경계 무결성을 확인했다고 보고했으나, 이는 실제 프로덕션 경로(PostgREST를 통한 별도 HTTP 요청 2회)와 다른 검증 방법이었음 — 검증 자체가 불충분했던 제 리뷰 실수. 이번 DEF/Task에 이 사실을 명시하고 재발 방지: 향후 페이지네이션 관련 되돌리기 검증은 반드시 실제 REST 엔드포인트를 통한 별도 HTTP 요청으로 재현할 것(psql 세션 내 검증으로 대체 불가).

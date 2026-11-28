# DEF-158 | 운송사 `org_id` NULL — 오더 등록 시 `zen_order_services.provider_id` FK 위반

| 항목 | 내용 |
|:-----|:------|
| **긴급도** | **Medium** (Pilot이 UPS 중심이라 일반 물류 서비스 선택 경로의 실사용 여부는 미확인 — 사용 확인 시 High로 상향) |
| **발견일 / 발견자** | 2026-11-23 / Aiden (운영 릴리즈 261123 테스트 오더 검증 중, Edward 시험 등록으로 재현) |
| **조치 상태** | 미조치 — 등록만. 발령은 Edward 확인 후 |
| **관련** | DEF-159 · 릴리즈 PR #1435 (회귀 아님으로 판단 — 아래 근거) |

## 현상 (확인함, 운영 DB·Vercel 로그 직접 조회)
- 오더 등록 2단계에서 `org_id`가 비어 있는 운송사의 요율을 선택하고 제출하면 서비스 저장(`createOrderServices`)이 `zen_order_services_provider_id_fkey` 위반으로 실패한다.
- 운영 `zen_carriers` 9곳 중 **7곳의 `org_id`가 NULL**이다(실제 운송사 이름 포함). `org_id`가 있는 곳은 2곳(ZENITH Air Cargo, ZENITH Maritime Logistics)이다. 이 중 ZENITH Air Cargo는 Edward 설명상 가상 데이터이고, ZENITH Maritime은 확인하지 못했다.
- 운영 `zen_order_services`는 **전체 0건**이다. 이 경로가 운영에서 한 번도 성공한 기록이 없다.
- 2026-11-23 10:45~10:46, 운영에서 같은 증상이 4회 재현됐다(Korean Air Cargo 선택). 로그: `insert or update on table "zen_order_services" violates foreign key constraint "zen_order_services_provider_id_fkey"`.

## 원인 (확인함: 코드·데이터 / 추정: 의도)
- `src/components/orders/OrderRegistrationForm.tsx:888` — `provider_id: selected.orgId || selected.carrierId`. `orgId`는 `service-rates.ts`에서 `r.carrier?.org_id || ''`로 채워지므로, `org_id`가 NULL이면 운송사 ID가 `provider_id`로 들어간다. FK 대상은 `zen_organizations(id)`라서 운송사 ID는 존재하지 않는다.
- 로그인 역할과는 무관하다. 운송사 레코드의 데이터 문제이며, `zen_carriers` 조회 정책은 admin과 다른 역할이 같은 행을 읽는다(확인함).
- 해당 라인은 2026-06-06 커밋 `742d9eac`(`[Gemini] feat: P6-SPR-05`)에서 도입됐다. 이번 릴리즈(요율 조회 뷰 전환)와 무관하게 이전부터 있던 결함으로 판단한다(추정 — 릴리즈 전 운영에서 같은 경로를 실행해 본 기록은 없다).

## 영향 범위
- 일반 물류(AIR/SEA/EXP) 오더 등록에서 서비스 조합 선택 후 제출하면, 7개 운송사 요율로는 서비스 저장이 항상 실패한다.
- 실패 시 오더는 이미 생성된 상태로 남는다(DEF-159).

## 권장 조치 (설계 결정 필요 — 구현 전 Edward·Aiden 확정)
1. **데이터:** 운송사 ↔ 조직 연결 방침 결정. (a) 실제 운송사에 대응하는 `zen_organizations` 행을 만들어 `org_id`를 채운다, 또는 (b) `provider_id`가 운송사를 직접 가리키도록 스키마·FK 의미를 바꾼다. 운영 DB는 Pilot 실데이터이므로 변경 시 기존 데이터를 보전하고, 원격 쓰기는 Edward 승인 후에만 한다.
2. **코드:** `orgId || carrierId` 폴백을 제거한다. `org_id`가 없는 운송사는 선택 단계에서 사유와 함께 막거나, 서버에서 명확한 오류를 반환한다.
3. **회귀 테스트:** `org_id`가 NULL인 운송사 선택 시 오더가 생성되지 않거나 서비스 저장까지 성공하는 것을 단언한다(자기완결 fixture).

## 소유 팀
최초 작성은 Team A 계열(2026-06, `[Gemini]`)이고, 현재 이 화면 파일의 최근 변경은 대부분 Team B(`[Dave]`·`[Baker]`·`[Mike]`)다. 라우팅은 Edward 확인 후 `[Aiden]` Issue로 요청한다(소유 팀은 `git log` 태그로 확인한 결과).

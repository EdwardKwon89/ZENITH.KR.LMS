# DEF-141: 오더 목록 페이지 전환(1↔2페이지) 5초+ 지연 — Link 프리페치 폭주

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 production `/ko/orders`에서 페이지 전환(1→2, 2→1) 시 5초 이상 소요된다고 지적(2026-10-03). Aiden이 DB 쿼리 실측 + 브라우저 네트워크 실측으로 원인 재현 |
| **긴급도** | High (Pilot 집중 운영 기간 직전 — 오더 목록은 가장 빈번히 사용되는 핵심 화면) |
| **발견일** | 2026-10-03 |

## 조사 과정 (반증 포함)

1. **1차 가설(기각)**: DB 쿼리 자체가 느릴 것으로 예상 → production Supabase REST API에 `admin@zenith.kr` 실세션 토큰으로 `zen_orders` 목록 쿼리(동일 join + `count=exact` + `range`)를 직접 실측.
   - page=1: **0.61초**, page=2: **0.12초** → DB 쿼리는 전혀 느리지 않음. 가설 기각.
2. **2차 조사**: Playwright로 실제 production에서 1→2페이지 전환을 재현하며 `browser_network_requests`로 네트워크 전체를 확인.
   - 페이지 전환 시 **실제 목록 요청 1건 외에, 화면에 보이는 각 오더 행의 "View Details" 링크마다 개별 상세 페이지 RSC 요청이 수십 건 동시에 발사**되는 것을 확인(`GET /ko/orders/<id>?_rsc=...`, UPS 오더는 `/ko/orders/<id>/ups-detail?_rsc=...`). 한 페이지(20행) 렌더링마다 최대 20건, 게다가 동일 세트가 두 번(`_rsc` 해시가 다른 두 묶음) 발사되어 최대 40건까지 관측됨.

## 원인

[`OrderDataTable.tsx`](../../src/components/orders/OrderDataTable.tsx)의 행별 "View Details" `<Link href={.../orders/{id}(/ups-detail)}>`에 `prefetch` 옵션이 명시되어 있지 않음(Next.js 기본값 `prefetch={null}`="auto"). 그리고 `/orders/[orderId]/page.tsx`·`/orders/[orderId]/ups-detail` 경로 모두 **`loading.tsx`가 없음**(확인됨: `find`로 해당 디렉토리에 loading.tsx 부재).

Next.js App Router의 공식 동작: 동적 라우트에 `loading.tsx`가 있으면 prefetch 시 그 경계까지만(가벼운 스켈레톤) 가져오지만, **`loading.tsx`가 없으면 prefetch가 해당 라우트의 "전체 서버 렌더링 데이터"까지 그대로 가져온다**. 오더 상세(`getOrderDetails()`: 오더+관계 조회, 패키지 조회, 품목 조회 — 3회 순차 DB 왕복)와 UPS 상세는 이보다 더 무거운 조회를 수행하는데, 이게 **화면에 보이는 모든 행에 대해 뷰포트 진입 즉시(또는 페이지 렌더링 시) 백그라운드로 일괄 발사**됨.

결과적으로 페이지를 전환할 때마다:
- 실제 필요한 목록 조회 1건(0.1~0.6초, 위 실측으로 확인) +
- 새로 렌더링된 20개 행의 "View Details" prefetch가 각각 3회 이상의 DB 왕복을 동반한 **풀 서버 렌더링을 동시다발로 유발**

이 백그라운드 부하가 Vercel(특히 Hobby 플랜의 동시 실행 제약)과 remote Supabase 커넥션을 실제 목록 전환 요청과 함께 경합하면서, 정작 사용자가 기다리는 "다음 페이지 보여주기" 응답이 뒤로 밀려 체감 5초+ 지연이 발생하는 것으로 판단됨.

## 권장 조치 (DoD)

1. **1차 조치(즉시 적용 가능, 가장 직접적)**: `OrderDataTable.tsx`의 행별 "View Details" `<Link>`에 `prefetch={false}` 추가 — 사용자가 실제로 클릭할 때만 로드(클릭 시 네비게이션 자체는 prefetch 없이도 정상 동작, 체감 지연 거의 없음).
2. **페이지네이션 Link도 동일 검토**: `totalPages`가 많아질 경우 페이지 번호 Link들도 전부 prefetch 대상이 되므로 `prefetch={false}` 적용 여부 함께 판단(현재는 페이지 수가 적어 영향 작음 — 선택적).
3. **(대안/보완)** `orders/[orderId]/loading.tsx`, `orders/[orderId]/ups-detail/loading.tsx` 스켈레톤 추가 — prefetch를 켜둔 채로 가볍게 만드는 방법이나, ①보다 근본 해결은 아님(행 수가 늘어나면 스켈레톤 요청 자체는 여전히 다건 발생).
4. 회귀 테스트: `prefetch={false}` 속성이 실제로 렌더링된 Link에 반영되는지 DOM 검증 + 네트워크 요청 수 비교(가능하면 Playwright로 페이지 전환 시 `/orders/<id>` 계열 요청이 0건임을 확인).
5. R-10: 수정 후 production 재현(동일 Playwright 네트워크 캡처)으로 prefetch 폭주 해소 확인 + 체감 전환 속도 스크린샷/타이밍.

## 참고: DB 쿼리 자체의 부차적 개선 여지(이번 지연의 직접 원인은 아니나 함께 기록)

- `zen_orders(created_at)`에 인덱스 없음 — 현재 데이터량에서는 영향 미미하나 데이터 증가 시 ORDER BY 비용 증가 예상.
- `findSettingByKey("default_page_size")`가 `getOrders()` 호출마다 매번 별도 DB 왕복 — 캐싱 여지 있음(필수 조치는 아님, 별도 IMP로 분리 가능).

## 파일 소유권 확인

`OrderDataTable.tsx` — 최근 TASK-1144/1146을 처리한 Team A(B_Kai) 영역과 동일 → **Team A 담당**

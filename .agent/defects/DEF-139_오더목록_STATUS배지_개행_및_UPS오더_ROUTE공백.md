# DEF-139: 오더 목록 STATUS/BILLING 배지 텍스트 개행 + UPS 오더 ROUTE 컬럼 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 배포된 `/orders` 화면 스크린샷으로 지적(2026-10-03) — "ROUTE 데이터 표시 안 됨", "출고완료/패킹완료 아이콘이 단절되어 보임". Aiden이 production에서 Playwright 실측 재현 |
| **긴급도** | Medium (기능 장애 아님 — 데이터 유실 없음, 시각적 결함 + UX 공백. 단 Pilot 중 고객 노출 화면이라 우선 처리 권장) |
| **발견일** | 2026-10-03 |

## 현상 ① — STATUS/BILLING 배지 텍스트 개행(실제 재현 확인)

`/ko/orders` 목록에서 4글자 상태 라벨("출고완료", "패킹완료", "정산대기" 등)이 배지 안에서 두 줄로 쪼개져("출고완"+"료") 테두리가 끊어진 것처럼 보임. **같은 4글자라도 행마다 다르게 재현됨**(예: "청구완료"는 안 깨지는데 "정산대기"는 깨짐) — 컬럼 폭이 4글자 한글 배지에 딱 턱걸이로 부족해 글자별 실제 렌더링 폭 차이에 따라 개행 여부가 갈리는 것으로 판단됨.

**원인**: [`ZenStatusBadge.tsx`](../../src/components/domain/ZenStatusBadge.tsx)의 `<span>`과 [`OrderDataTable.tsx`](../../src/components/orders/OrderDataTable.tsx)의 BILLING 인라인 배지 `<span>` 모두 `whitespace-nowrap`이 없음(`display:inline`, `white-space:normal` 실측 확인). 테이블 wrapper는 `overflow-x-auto`로 가로 스크롤을 지원하는데도, 배지에 줄바꿈 방지가 없어 **테이블이 넓어지는 대신 배지 내부 텍스트가 개행**되는 쪽으로 렌더링됨.

**계기 추정**: TASK-1144(2026-10-03, 접수일자 컬럼 추가 + Shipper "소속/화주" 병기로 텍스트 길이 증가)가 테이블 전체 폭 배분에 영향을 줘 기존에는 여유 있던 STATUS/BILLING 컬럼이 빠듯해진 것으로 보임 — TASK-1144 자체의 코드는 명세대로 정확했으나(검토 완료), 그 결과로 다른 컬럼에 레이아웃 부작용이 생긴 사례.

## 현상 ② — UPS 오더는 ROUTE(Origin-Dest)가 항상 공백

**실측(production DB 직접 조회)**: ZEN-2026-000020/021/022(전부 `transport_mode: UPS`) 모두 `origin_port_id`/`dest_port_id`가 **NULL**. `OrderDataTable.tsx`가 `order.origin_port?.code`/`order.dest_port?.code`만 참조하므로 UPS 오더는 항상 빈 배지만 보임.

**원인**: UPS(특송/도어투도어) 오더는 해상/항공 화물처럼 "항구" 개념이 없어 애초에 `origin_port_id`/`dest_port_id`를 안 채우는 게 정상 — 버그가 아니라 **데이터 모델상 UPS 오더에 비어있는 필드를 그대로 보여주는 UX 공백**. UPS 오더는 대신 `pickup_country_code`/`recipient_country_code`(실측: 이번 건 `KR`→`TH`) 등 주소 기반 필드를 보유하고 있음.

## 권장 조치 (DoD)

1. **배지 개행 수정**: `ZenStatusBadge.tsx`의 span과 `OrderDataTable.tsx` BILLING 인라인 배지 span에 `whitespace-nowrap` 추가. 테이블은 이미 `overflow-x-auto`이므로 폭 부족 시 배지가 깨지지 않고 테이블 전체가 가로 스크롤되도록.
2. **UPS 오더 ROUTE 폴백**: `origin_port`/`dest_port`가 둘 다 없고 `transport_mode === 'UPS'`인 경우, `pickup_country_code → recipient_country_code`(예: `KR → TH`)로 폴백 표시.
3. 회귀 테스트: 배지 nowrap(실제 컴퓨티드 스타일 검증 또는 스냅샷) + UPS 오더 ROUTE 폴백(behavioral, 실제 DOM) 각각 추가.
4. R-10: 수정 후 production 유사 데이터(긴 Shipper명 + UPS 오더)로 실제 화면 스크린샷 재확인.

## 파일 소유권 확인

`OrderDataTable.tsx`/`ZenStatusBadge.tsx` — 이번 세션 TASK-1144/1145를 처리한 Team A(B_Kai) 영역과 동일 → **Team A 담당**

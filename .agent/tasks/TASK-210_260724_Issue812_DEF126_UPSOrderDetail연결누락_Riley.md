# TASK-210 — DEF-126: 신규 UPS Order Detail 화면 연결 누락 수정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-210 |
| **GitHub Issue** | [#812](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/812) |
| **생성일** | 2026-07-24 |
| **할당 Agent** | Riley |
| **우선순위** | P1 |
| **전제조건** | 없음 |
| **커밋 태그** | `[Gemini]` |
| **상태** | ⬜ |

---

## [배경]

TASK-189(Issue #607)/TASK-209(Issue #794)로 만든 신규 UPS 전용 Order Detail 화면(`/orders/[orderId]/ups-detail`, 7단계 스텝퍼·실시간 확인·Agency 수동 DELIVERED·품목 팝업)이, 오더 목록에서 "View Details"를 클릭하는 정상 흐름으로는 도달 불가능함을 발견(Edward 지적 — Team B가 develop 동기화 후 "신규 화면이 안 보인다"고 확인 요청한 것이 계기).

## [근본 원인]

`src/components/orders/OrderDataTable.tsx:129-134`의 "View Details" 링크가 `transport_mode`와 무관하게 항상 고정 경로:
```tsx
<Link href={`/${safeLocale}/orders/${order.id}`}>View Details</Link>
```
`orders` 배열에는 이미 `transport_mode`가 포함되어 있음(`OrderRepository.findList()`가 `select('*')`) — 단순히 조건 분기를 안 한 것. 범용 상세 페이지(`page.tsx:91`)의 `isUpsOrder` 플래그도 redirect에는 안 쓰이고 페이지 내부 일부 섹션(UPS 인보이스 출력 등) 노출 여부에만 사용됨 — 즉 범용 페이지 자체가 UPS 오더를 부분적으로만 지원하도록 이미 손질되어 있었음.

상세 결함 보고서: `.agent/defects/DEF-126_UPS_OrderDetail_화면연결누락_상세보기링크.md`

## [설계 결정 필요]

| 안 | 설명 | 장단점 |
|:---|:-----|:-------|
| A. `OrderDataTable` 링크 조건 분기 | `order.transport_mode === 'UPS'`일 때만 `/ups-detail`로 링크 | 가장 단순, 목록 단계에서 바로 분기. 단 직접 URL(`/orders/[orderId]`) 접근이나 다른 화면의 기존 링크는 여전히 범용 페이지로 감 |
| B. 범용 상세 페이지에서 redirect | `/orders/[orderId]/page.tsx` 진입 시 UPS 오더면 `/ups-detail`로 서버 redirect | 모든 경로(북마크·타 화면 링크 포함)가 자동 전환되나, 범용 페이지에 이미 있는 UPS 부분 지원 섹션(`isUpsOrder` 분기 렌더링)과 역할이 중복 — 정리 필요 |
| C. A+B 병행 | 목록 링크도 바꾸고 범용 페이지도 안전망으로 redirect | 가장 견고, 범위가 가장 큼(범용 페이지의 기존 UPS 섹션 정리 포함) |

**진행 방식**: 복잡도 있는 설계 결정이므로 R-17 절차대로 [설계 의견] 섹션 작성 → Aiden 확인 → [설계 확정] → 🔄 전환 후 착수. 다만 P1(High) 우선순위이니 설계 의견은 최대한 신속히 작성 요청.

## [작업 범위] (설계 확정 후 확정)

- 채택안에 따라 `OrderDataTable.tsx` 링크 분기 및/또는 `orders/[orderId]/page.tsx` redirect 로직 추가
- B/C안 채택 시: 범용 페이지의 기존 `isUpsOrder` 분기 렌더링 섹션(UPS 인보이스 출력 버튼 등)을 그대로 둘지, ups-detail로 완전히 이관하고 제거할지 결정 필요 — 임의로 삭제하지 말고 설계 의견에 포함할 것
- 비UPS 오더는 기존 `/orders/[orderId]` 흐름 그대로 유지 확인
- `ShipperDailyBillingClient.tsx:482`의 기존 하드코딩 링크와 일관성 확인(중복 로직 정리 가능하면 함께)

## [발견 이슈]

없음

---

## DoD

- [ ] [설계 의견] 작성 (A/B/C 중 제안 + 근거)
- [ ] Aiden [설계 확정] 확인 후 착수
- [ ] UPS 오더 목록에서 "View Details" 클릭 시 `/ups-detail`로 정상 이동 확인(실제 UI 클릭)
- [ ] 비UPS 오더는 기존 `/orders/[orderId]` 흐름 그대로 유지 확인
- [ ] (B/C안 채택 시) 범용 페이지 UPS 부분 지원 섹션 처리 방향 명시 및 반영
- [ ] 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)
- [ ] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [ ] R-10 스크린샷 (UPS 오더 목록→상세보기 클릭→ups-detail 화면 도달 확인, 비UPS 오더 기존 흐름 확인)
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(Riley 작성 예정)_

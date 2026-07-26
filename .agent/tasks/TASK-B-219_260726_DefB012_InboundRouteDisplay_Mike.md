# TASK-B-219: DEF-B-012 — 입고처리 화면 UPS 오더 운송경로 공백 표시 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#874](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/874) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

`/ko/warehouse/inbound`에서 UPS 오더 조회 시 "운송 경로" 필드가 항상 "- → -"로 표시됩니다. `origin_port`/`dest_port`는 항구 기반(AIR/SEA/LAND 전용)이라 UPS 오더는 항상 NULL — `shipper_country_code`/`recipient_country_code`로 폴백하는 로직이 없어서입니다. 상세: `.agent/defects/DEF-B-012_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다. 백엔드 변경은 불필요합니다(`getOrderByBarcodeOrNo()`의 select가 이미 `zen_orders.*`라 국가코드 필드 포함됨).

**참고**: `InboundProcessForm.tsx`는 TASK-B-218(Dave)이 동시에 작업 중인 파일입니다 — import/버튼 추가 영역(파일 상단·하단)과 이번 수정 영역(오더 정보 카드 내 운송경로, 파일 중간)은 서로 다른 위치라 충돌 가능성은 낮지만, 브랜치 생성 시 최신 `TeamB_Dev`를 반드시 pull 받으세요.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

`src/components/warehouse/InboundProcessForm.tsx`에서 `order.origin_port?.code` 문자열로 검색해 위치 확인(TASK-B-218 반영 여부에 따라 정확한 줄번호가 바뀔 수 있음) 후 아래로 교체:

```tsx
// 변경 전
<span className="font-semibold text-slate-900 flex items-center gap-1.5">
  {order.origin_port?.code || "-"}
  <ArrowRight size={12} className="text-slate-400" />
  {order.dest_port?.code || "-"}
</span>

// 변경 후
<span className="font-semibold text-slate-900 flex items-center gap-1.5">
  {order.origin_port?.code || order.shipper_country_code || "-"}
  <ArrowRight size={12} className="text-slate-400" />
  {order.dest_port?.code || order.recipient_country_code || "-"}
</span>
```

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-219-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 219 나와야 정상, TASK-B-218 병합 여부와 무관하게 순번 확인)
- [ ] 위 스펙대로 JSX 교체
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**(렌더링 테스트): UPS 오더(포트 없음, 국가코드만 있음) mock으로 렌더링 후 국가코드가 표시되는지, AIR/SEA 오더(포트 있음) mock으로 기존처럼 포트 코드가 우선 표시되는지(회귀) 각각 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/warehouse/inbound`로 UPS 오더 조회 후 운송경로에 국가코드(KR → US 등) 표시되는지 스크린샷 확인(R-10)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Mike] fix: TASK-B-219 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 874 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-012 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #874`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — `toContain` 소스 문자열 검사 9회 누적(가장 최근 TASK-B-208/PR#855, 결국 실제 렌더링 테스트로 교체). 이번 Task도 반드시 실제 컴포넌트 렌더링 기반 테스트로 작성할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

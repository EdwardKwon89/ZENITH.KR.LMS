# TASK-B-026 — IMP-137: createorder + getnewlabel Server Action (Phase 8)

> **Task-ID**: TASK-B-026
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: JSJung (리더·검토) / Baker (구현)
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#107](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/107)
> **연관 IMP**: IMP-137
> **전제조건**: TASK-B-025 (IMP-136) ✅
> **설계 참조**: [An-13 v2.0](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) §5·§9

---

## 업무 개요

shxkRequest 기반 주문 생성 → 운송장 발급 → 레이블 발급 2-step 흐름 구현 (IMP-137).
Server Action으로 구현 (Vercel 서버 측 격리 — HTTP 평문 전송 보안 옵션 A).

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-B-025 ✅ (shxk client) | 🚫 |

---

## 구현 범위

### 신규 파일

```
src/lib/shxk/order.ts
```

### 2-step 흐름 (An-13 v2.0 §5)

```typescript
// Step 1: createorder
const orderRes = await shxkRequest('createorder', {
  order_status: 'P',
  shipping_method: 'KRUPSEXP',
  platform_id: '',
  buyer_id: '',
  reference_no: referenceNo,
  // ...발송인/수신인/패키지 정보
});
const orderId = orderRes.data.order_id;

// Step 2: gettrackingnumber
const trackRes = await shxkRequest('gettrackingnumber', { order_id: orderId });
const trackingNo = trackRes.data.tracking_number;

// Step 3: getnewlabel
const labelRes = await shxkRequest('getnewlabel', { order_id: orderId });
const labelUrl = labelRes.data.label_url;
```

### Server Action

```
src/app/actions/shxk-order.ts  (또는 기존 warehouse actions에 통합)
```

- `issueUpsLabel(packageId: string)` — createorder → gettrackingnumber → getnewlabel 순서 실행
- 결과를 `zen_ups_labels` 테이블에 저장 (IMP-138 마이그레이션 필요)
- 주의: 응답 필드명 `refrence_no` (오탈자 — shxk 원문 그대로 사용)
- `success: 2` 중복 주문 처리 (zen_ups_labels.reference_no UNIQUE 제약으로 방지)

---

## DoD (Definition of Done)

- [ ] `src/lib/shxk/order.ts` 생성 — createorder/gettrackingnumber/getnewlabel 래퍼
- [ ] `issueUpsLabel()` Server Action 구현 — 2-step 흐름 완성
- [ ] `refrence_no` 오탈자 그대로 파싱 처리
- [ ] `success: 2` 중복 주문 에러 처리
- [ ] ZEN_A4 함수 50줄 이하 준수
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시 기재: (미정)

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Baker 완료 후 기재_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-026 신규 발령 — An-13 v2.0 IMP-137 |

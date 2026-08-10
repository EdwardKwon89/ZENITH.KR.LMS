# TASK-B-272 — DEF-B-047 UPS 오더 상세 도착국 표시 US 하드코딩 수정

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-B-272 |
| Issue-ID | #1050 / DEF-B-047 |
| 생성일 | 2026-08-11 |
| 담당 Agent | Mike (MiMo V2.5) |
| 우선순위 | P3 |
| 상태 | ✅ 완료 |

---

## 배경

JSJung — `/orders/[id]/ups-detail` 도착국/Zone 정보 확인 요청(ZEN-2026-000008, 실제 목적지 중국인데 화면엔 US 표시)

---

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:----------|
| `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx` | dest_country_code → recipient_country_code로 변경 |

---

## [작업 결과]

**커밋**: `23ab4677` — `[Mike] fix: DEF-B-047 UPS 오더 상세 도착국 표시 US 하드코딩 수정 (Issue #1050)`

**PR**: #1053 (TeamB_Dev base) — https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1053

**변경 내용**:
- `(order as any).dest_country_code` → `order.recipient_country_code`로 변경
- 존재하지 않는 컬럼 참조 제거

**검증**: TypeScript 타입 체크 통과, 핵심 단위 테스트 44개 전부 통과

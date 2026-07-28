# TASK-B-243: Issue #946 / DEF-B-023 — UPS 상세 무역서류 PDF 번역키 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#946](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/946) |
| **DEF** | [DEF-B-023](../defects/DEF-B-023_ups_detail_documents_missing_translation_keys.md) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

JSJung 요청으로 `/orders/[orderId]/ups-detail` 페이지를 Jaison이 직접 재현·근본원인 확인. 상세 내용은 DEF-B-023 참조.

`src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`(104~136행)의 `docLabels` 객체가 `Documents` 네임스페이스에서 약 28개 키를 요청하지만, `messages/ko.json`(및 `en.json`)의 실제 `Documents` 네임스페이스에는 완전히 다른 키 집합만 있어 페이지 로드 시 MISSING_MESSAGE 에러가 25회 이상 발생하고, 이 페이지가 생성하는 Commercial Invoice/Packing List/UPS Invoice PDF의 라벨이 깨질 것으로 판단됩니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. 필요한 키 목록 확인

`page.tsx:107-136`의 `docLabels` 객체에서 요청하는 키 전체:
```
commercial_invoice, packing_list, exporter, consignee, date, order_no, hs_code,
item_desc, quantity, unit_price, sub_total, total, currency, declaration,
declaration_text, generated_on, transport_mode, express_air, qty, pkgs,
net_weight, gross_weight, total_pkgs, trade_terms, invoice_no, pl_no, remarks, remarks_text
```

### 2. `messages/ko.json`의 `Documents` 네임스페이스(414행 부근)에 위 키 전부 추가

**기존 키(title/description/search_order_no/ci/pl/preview/download/select_order/select_language/error_not_found/error_fetch/waybill/logistics_invoice/customs_declaration_shxk/ups_cancel_registration/createorder_test)는 절대 삭제·변경하지 말 것** — `/documents` 목록 페이지가 그대로 사용 중입니다. 아래는 각 키에 대한 한글 라벨 제안(문맥에 맞게 다듬어도 무방):

| key | 제안 값 |
|:----|:--------|
| commercial_invoice | 상업송장 |
| packing_list | 패킹리스트 |
| exporter | 수출자 |
| consignee | 수하인 |
| date | 일자 |
| order_no | 오더 번호 |
| hs_code | HS Code |
| item_desc | 품목명 |
| quantity | 수량 |
| unit_price | 단가 |
| sub_total | 소계 |
| total | 합계 |
| currency | 통화 |
| declaration | 신고 사항 |
| declaration_text | 본 송장에 기재된 모든 정보는 사실이며 정확함을 선언합니다. |
| generated_on | 생성일 |
| transport_mode | 운송 수단 |
| express_air | 항공 특송 |
| qty | 수량 |
| pkgs | 포장 수 |
| net_weight | 순중량 |
| gross_weight | 총중량 |
| total_pkgs | 총 포장 수 |
| trade_terms | 거래 조건 |
| invoice_no | 송장 번호 |
| pl_no | 패킹리스트 번호 |
| remarks | 비고 |
| remarks_text | 위 물품은 상업적 목적으로만 사용됩니다. |

### 3. `messages/en.json`의 `Documents` 네임스페이스에도 동일 키 영문 라벨로 추가 (예: commercial_invoice: "Commercial Invoice", exporter: "Exporter" 등 — 문맥상 자명하게 번역)

### 4. 건드리지 않는 것 (범위 밖)

- `Documents` 네임스페이스의 기존 키들 — 변경 금지
- `UpsInvoice`/`Orders.ups_invoice.*` 등 다른 네임스페이스 — 무관
- DEF-B-021(통화·필드명 버그) — 별도 Task(TASK-B-242, Mike), 이번 범위 아님

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-243-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 243 나와야 정상)
- [ ] 위 스펙대로 `messages/ko.json`·`messages/en.json`의 `Documents` 네임스페이스에 28개 키 추가(기존 키 보존)
- [ ] 회귀 테스트 추가 — **반드시 실제 페이지 렌더링/실제 메시지 조회 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. 실제 `messages/ko.json`을 로드해 `docLabels`가 참조하는 28개 키 전부가 `Documents` 네임스페이스에 존재하는지 확인
  2. 가능하면 `ups-detail` 페이지를 실제 렌더링(또는 `getTranslations('Documents')` 직접 호출)해 MISSING_MESSAGE 에러가 발생하지 않는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 `/ko/orders/c00ec504-7b84-4977-99d8-78982f54484b/ups-detail` 페이지 접속 후 서버 콘솔에 MISSING_MESSAGE 에러가 사라졌는지 확인 → Commercial Invoice/Packing List/UPS Invoice PDF 3종을 실제로 다운로드해 라벨이 정상 출력되는지 스크린샷/PDF 캡처로 확인

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-243 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 946 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #946`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 기존 `Documents` 네임스페이스 키를 실수로 덮어쓰지 않도록 주의(다른 페이지가 사용 중).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

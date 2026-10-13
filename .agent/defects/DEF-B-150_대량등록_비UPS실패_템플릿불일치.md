# DEF-B-150: 엑셀 대량 등록 — 비UPS 행 전량 실패 + 제공 템플릿이 어떤 모드로도 등록 불가

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-B-334(PR#1244, Issue #1243) 전화번호 정제 작업 중 Baker가 "비UPS 행은 port 미매핑으로 항상 실패"를 발견 → Jaison이 코드 직접 확인하여 제공 템플릿 자체가 어떤 모드로도 등록 불가임을 추가 확인 (2026-10-13) |
| **긴급도** | Medium (관리자·대리점이 엑셀 대량 등록 기능을 실사용할 수 없는 상태. 다만 건별 등록으로 우회 가능하고 조용한 실패가 아니라 명시적 실패로 노출됨) |
| **발견일** | 2026-10-13 |
| **조치 상태** | TASK-B-335(Issue #1245, 방향 A — UPS 전용 명문화)로 해결 |

## 현상

`엑셀 일괄등록`(`BulkOrderUploadModal` → `bulkCreateOrders`)에서 **제공 템플릿(`generateBulkOrderTemplate()`)을 그대로 채워 업로드하면 어떤 transport_mode로도 등록이 성공하지 못한다.**

| # | 결함 | 근거 |
|:-:|:--|:--|
| 1 | 비UPS 행은 `origin_port_id`/`dest_port_id` 필수 검증에서 항상 실패(`bulk-orders.ts`가 port를 매핑하지 않음), `transport_mode` 공란 시 기본값 `'AIR'` | `src/lib/validation/order.ts:110-124`, `src/app/actions/operations/bulk-orders.ts`(수정 전 `|| 'AIR'`) |
| 2 | 템플릿 샘플 행이 `transport_mode='AIR'` — 안내대로 입력하면 실패 | `src/lib/excel/bulk-order-template.ts`(수정 전) |
| 3 | 템플릿에 `shipper_contact_phone` 컬럼이 없음 — 코드는 읽지만 UPS는 스키마상 화주 연락처 필수 | 수정 전 헤더 29개 컬럼 |
| 4 | 템플릿 샘플 패키지 `content_type='GENERAL'` → UPS 오더에 GENERAL 저장(수정 화면 CONTENT 공백) | 수정 전 패키지 시트 |
| 5 | 샘플 아이템 `hs_code=''` — UPS는 HS 필수 | 수정 전 아이템 시트 |
| 6 | 샘플 행에 수하인 국가·우편번호·도시가 비어 있음 — UPS 필수 | 수정 전 오더 시트 |
| 7 | 거부 사유가 Zod 이슈 JSON 문자열로 그대로 노출 | `bulkCreateOrders`의 `err.message` |

## 재현 (실측)

`generateBulkOrderTemplate()` → `XLSX.read` → 3시트 `sheet_to_json` → `bulkCreateOrders`(`createOrder` mock):
- 템플릿 그대로: `success:false`, `createOrder` 0회, error = Zod 이슈 JSON(`Please select a valid origin port` + `dest_port_id`).
- `transport_mode`만 `UPS`로 강제: 여전히 실패 — `recipient_country_code`·`recipient_zipcode`·`recipient_city`·`shipper_contact_phone`·`packages.0.items.0.hs_code` 필수 위반.

## 영향 범위

- 관리자/대리점의 엑셀 대량 등록 기능이 실질적으로 사용 불가(건별 등록으로만 우회 가능).
- 사용자에게 실패는 노출되므로 데이터 유실은 없으나, 기능 신뢰도 저하.

## 권장 조치 (DoD) — TASK-B-335에서 이행

- [x] 대량 등록을 **UPS 오더 전용**으로 명문화(`BULK_SUPPORTED_MODE='UPS'`), 비UPS 행은 사전 거부(행 단위, 배치 계속)
- [x] 템플릿 `shipper_contact_phone` 컬럼 추가 + UPS 검증 통과 샘플(NONDOC·HS·국가/우편번호/도시·화주연락처) — 라운드트립 테스트로 강제
- [x] 패키지 `content_type`을 `normalizeUpsContentType`으로 정규화
- [x] Zod 오류를 `경로: 메시지` 형식으로 포맷(`formatBulkError`)
- [x] 업로드 모달 안내문 추가
- [ ] (미해결·별도) 비UPS 대량 등록이 향후 필요하면 port 컬럼 + 코드→UUID 매핑을 별도 IMP로 구현

## 파일 소유권 확인

`git log --follow -- src/app/actions/operations/bulk-orders.ts src/lib/excel/bulk-order-template.ts` — Team B 주도 → **Team B 담당**

# DEF-129: Agency 정산 조회/집계 기능 전체가 존재하지 않는 컬럼(dest_country_code) 참조로 항상 실패

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | Aiden (고객 시연용 정산 집계 Sample Data 추가 작업 중 발견) |
| **긴급도** | High |
| **우선순위** | P1 |

## 현상

`/agency/settlements`(대리점 정산 조회) 화면이 실제로는 데이터가 있어도 항상 "해당 기간에 정산 내역이 없습니다"로 표시됨. UI에 에러 배너 없이 조용히 빈 결과만 나와 겉보기엔 "데이터 없음"으로 보였음.

## 근본 원인

`src/lib/actions/agency-settlement.ts`의 5개 함수(`getAgencySettlementSummary`, `getAgencyShipperSettlements`, `getAgencyOrderSettlements`, `exportAgencySettlementExcel`, `_calculateOrderSettle`)가 전부 `zen_orders.dest_country_code` 컬럼을 select/참조하는데, **이 컬럼은 스키마에 존재한 적이 없음**(실제 컬럼명은 `recipient_country_code`).

실측 검증:
```
curl .../rest/v1/zen_orders?select=id,dest_country_code
→ {"code":"42703","message":"column zen_orders.dest_country_code does not exist"}
```

`withAction()` 래퍼가 이 에러를 캐치해 `{data: null, error: "..."}`로 조용히 반환하고, 클라이언트가 `data null`을 "0건"으로 렌더링해 사용자에게는 에러가 전혀 노출되지 않음.

## 왜 지금까지 발견 안 됐는가

`tests/integration/p7-agency-settlement.test.ts`(TC-P7-SETTLE-01~04)가 이름은 "Integration Test"이지만 실제로는 `createAdminClient`를 완전히 mock 처리하고 있고, 이 mock 데이터도 동일하게 `dest_country_code`라는 (실존하지 않는) 필드명을 사용하고 있어 — **버그가 있는 프로덕션 코드와 버그를 그대로 반영한 mock이 서로 "일치"해 테스트가 항상 통과**했음. 실제 DB 스키마와 대조 검증이 전혀 없었던 것이 근본 원인.

## 영향 범위

| 함수 | 파일 | 영향 |
|:-----|:-----|:-----|
| `getAgencySettlementSummary` | agency-settlement.ts | 대리점 정산 요약(총 매출/매입/마진) 항상 0 |
| `getAgencyShipperSettlements` | agency-settlement.ts | 화주별 정산 테이블 항상 빈 목록 |
| `getAgencyOrderSettlements` | agency-settlement.ts | 오더별 정산 상세 항상 빈 목록 |
| `exportAgencySettlementExcel` | agency-settlement.ts | 엑셀 다운로드 시 빈 파일 생성 |

즉 **Agency(대행사) 정산 조회 기능 전체가 배포 이후 한 번도 정상 동작한 적이 없었음.**

## 조치 (완료)

`dest_country_code` → `recipient_country_code` 전역 치환(프로덕션 코드 5곳 + 테스트 mock 4곳). 회귀 894/894 전체 PASS, `tests/integration/p7-agency-settlement.test.ts` 15/15 PASS 확인.

## 재발 방지 제안

- mock 기반 "integration test"라는 네이밍이 실제 DB 미검증을 은폐할 수 있음 — 최소 1개 이상의 실제 DB 기반 스모크 테스트(SAR-2026-07-27-001 패턴의 자기완결형 fixture)를 이 모듈에도 추가 권장
- 신규 컬럼 참조 코드 작성 시 `information_schema.columns` 대조 습관화

> **읽기 전용 아카이브 (Part 2: §51 ~ §92)** — `LIVE_REGRESSION_TEST_MAP.md` 구 단일 맵 분할본 (TASK-1150 / Issue #1309). 신규 회귀 항목은 [`../regression-items/`](../regression-items/)에 등록합니다.

### 51. UPS 운임 파이프라인 E2E 검증 — 중량 변경 검증 (Issue #747 / TASK-205 / W3)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-WF-01** | 중량 변경→운임 견적 차이 검증 (computeUpsFreight 직접 호출) | 중량이 운임에 실제 영향을 미치는지(캐시 미사용) 증명 | `tests/e2e/e2e-29-ups-freight-pipeline.spec.ts`  (CI 미실행 — 수동 E2E) |
| **TC-WF-02** | 스냅샷 갱신 후 정산 비용 재생성 검증 | SettlementEngine 로직과 일치하는 비용 생성 확인 | `tests/e2e/e2e-29-ups-freight-pipeline.spec.ts`  (CI 미실행 — 수동 E2E) |
| **TC-WF-03** | 실제 오더 상세 UI 탐색 검증 | page.goto() 브라우저 네비게이션 + DB-UI 일관성 확인 | `tests/e2e/e2e-29-ups-freight-pipeline.spec.ts`  (CI 미실행 — 수동 E2E) |

### 52. Agency→Shipper 역마진 방지 검증 (IMP-155 / Issue #791 / TASK-208)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-DISCOUNT-05** | shipper_rate <= agency_rate — 정상 통과 | 할인율이 Agency 자체 할인율 이하일 때 통과 검증 | `tests/unit/ups/discount-guard.test.ts` |
| **TC-UPS-DISCOUNT-06** | shipper_rate === agency_rate — 정상 통과 | 동일 할인율도 허용(역마진 아님) | `tests/unit/ups/discount-guard.test.ts` |
| **TC-UPS-DISCOUNT-07** | shipper_rate > agency_rate — 역마진 감지 | 초과 시 에러 메시지 반환 및 저장 거부 | `tests/unit/ups/discount-guard.test.ts` |
| **TC-UPS-DISCOUNT-08** | agency 정책 없음 (data=null) — null 반환 | 정책 미등록 Agency의 경우 다른 가드에 위임 | `tests/unit/ups/discount-guard.test.ts` |
| **TC-UPS-DISCOUNT-09** | .eq() 호출 인자 검증 | 올바른 파라미터(agency_org_id, zone_id, is_active)로 조회하는지 확인 | `tests/unit/ups/discount-guard.test.ts` |

### 53. UPS Order Detail order.status 중심 상태 표시 재구성 (Issue #794 / TASK-209)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-STATUS-01** | canChangeStatus (AGENCY → DELIVERED) | Status Machine에서 AGENCY 역할의 DELIVERED 수동 전환 권한 허용 검증 | `tests/unit/ups/ups-order-detail-status.test.ts` |
| **TC-UPS-STATUS-02** | checkRealtimeUpsTrackingAction | SHXK API 폴링 후 DL 상태 감지 시 DELIVERED 상태 자동 전환 검증 | `tests/unit/ups/ups-order-detail-status.test.ts` |
| **TC-UPS-STATUS-03** | checkRealtimeUpsTrackingAction (라벨 누락) | 활성 UPS 라벨이 없을 경우 에러 메시지 반환 검증 | `tests/unit/ups/ups-order-detail-status.test.ts` |
| **TC-UPS-STATUS-04** | manuallySetOrderDeliveredAction (사유 필수) | 수동 전환 사유 누락 시 차단 검증 | `tests/unit/ups/ups-order-detail-status.test.ts` |
| **TC-UPS-STATUS-05** | manuallySetOrderDeliveredAction (Agency 소속 화주) | Agency 사용자가 소속 화주 오더 수동 DELIVERED 전환 성공 검증 | `tests/unit/ups/ups-order-detail-status.test.ts` |
| **TC-UPS-STATUS-06** | manuallySetOrderDeliveredAction (타사 오더 차단) | Agency 사용자가 타인 화주 오더 전환 시도 시 IDOR 차단 검증 | `tests/unit/ups/ups-order-detail-status.test.ts` |
### 54. UPS Order Detail 예상운임 0표시 수정 (DEF-127 / Issue #887 / TASK-211)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-TISA-01** | metadata 포함 스냅샷 — metadata 필드 반환 | metadata가 정상적으로 반환 객체에 포함되는지 검증 | `tests/unit/operations/tisa.test.ts` |
| **TC-TISA-02** | metadata null 스냅샷 — undefined 처리 | JSONB null이 undefined로 정규화되는지 검증 | `tests/unit/operations/tisa.test.ts` |
| **TC-TISA-03** | 스냅샷 없음 — null 반환 | 스냅샷 미존재 시 null 반환 (회귀) | `tests/unit/operations/tisa.test.ts` |
| **TC-TISA-04** | select 쿼리 metadata 컬럼 포함 확인 | 실제 DB 조회 시 metadata 컬럼이 select에 포함되는지 검증 | `tests/unit/operations/tisa.test.ts` |

### 56. 에러로그 필터·검색·우선순위 정렬 (Issue #1186 / TASK-1140)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-ELF-01** | getErrorLogs severity 파라미터 전달 | severity 필터가 eq 조건으로 전달되는지 검증 | `tests/unit/monitoring/error-log-filters.test.ts` |
| **TC-ELF-02** | getErrorLogs resolved 파라미터 전달 | 미해결(resolved=false) 필터 전달 검증 | `tests/unit/monitoring/error-log-filters.test.ts` |
| **TC-ELF-03** | getErrorLogs search 키워드 ilike 전달 | 키워드 검색이 ilike(message)로 전달되며 trim 처리되는지 검증 | `tests/unit/monitoring/error-log-filters.test.ts` |
| **TC-ELF-04** | search 빈 문자열 무시 | 공백뿐인 검색어에 ilike를 적용하지 않는지 검증 | `tests/unit/monitoring/error-log-filters.test.ts` |
| **TC-ELF-05** | 기본 3단 다중 정렬 | resolved asc → severity asc(CRITICAL 우선) → created_at desc 순서 검증 | `tests/unit/monitoring/error-log-filters.test.ts` |
| **TC-ELF-06** | 필터 없음 시 페이징만 적용 | 파라미터 부재 시 eq/ilike 미호출 및 정상 반환 검증 | `tests/unit/monitoring/error-log-filters.test.ts` |

### 57. SHXK createorder 화주명 수기입력 오버라이드 (DEF-B-144 / Issue #1190 / TASK-B-324)
> ⚠️ **TASK-B-345(Issue #1277, JSJung 2026-11-12 결정)로 `shipper_company` 키 자체가 미전송으로 번복됨** — 아래 기대 결과는 `shipper_company` 키 부재 기준(2026-11-12 갱신). 상세는 §76.

| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-SHXK-OVR-01** | 수기입력 화주명(shipper_name)이 `shipper_name`으로 전달되고 `shipper_company` 키는 없음 | `shipper_name` 폴백 우선순위 `shipper_name > shipper_org.name > shipperDefaults.name` 검증 + `shipper_company` 키 부재(`not.toHaveProperty`) | `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` |
| **TC-SHXK-OVR-02** | 레거시 오더(shipper_name 없음) 조직명 폴백 | 기존 동작 회귀 방지 (`shipper_name`만 폴백 — `shipper_company` 키 부재) | `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` |
| **TC-SHXK-OVR-03** | registerUpsOrder 실제 등록 payload 반영 | placeShxkOrder 경로 createorder payload 검증 (mock SHXK 호출) — `shipper_company` 키 부재 | `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` |
| **TC-SHXK-OVR-04** | previewShxkPayload 미리보기 payload 반영 | preview 경로 createorder payload 검증 — `shipper_company` 키 부재 | `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` |

### 58. SHXK createorder 주소 국가·시·구·도 제거 + 상세주소 앞 정렬 (DEF-B-145/146 / Issue #1192/#1194 / TASK-B-325/326)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-SHXK-STREET-01** | resolveShipperStreet 재현 오더 → 49자 성공형 변환 | UPS AddressLine 초과 방지 (시/구/도+국가 제거, 도로명+상세만) | `tests/unit/ups/defb145-street-country-dedup.test.ts` |
| **TC-SHXK-STREET-02** | 결과에 국가·시·구·도 완전 미포함 | AddressLine 초과 근본 원천 차단 | `tests/unit/ups/defb145-street-country-dedup.test.ts` |
| **TC-SHXK-STREET-03** | 시/구/도 세그먼트 제거 확인 (도로명만 보존) | DEF-B-146 방향 전환 — 시/구/도는 별도 필드로 전달 | `tests/unit/ups/defb145-street-country-dedup.test.ts` |
| **TC-SHXK-STREET-04** | shipper_country_code 미셋/명시 관계없이 동일 결과 | 첫 세그먼트 방식은 country_code 무관 | `tests/unit/ups/defb145-street-country-dedup.test.ts` |
| **TC-SHXK-STREET-05** | resolveConsigneeStreet 수하인 도로명+상세주소만 구성 | 수하인 street 동일 축약 | `tests/unit/ups/defb145-street-country-dedup.test.ts` |
| **TC-SHXK-STREET-06** | buildCreateOrderPayload street 반환값 + city/province 별도 전달 확인 | 정보 손실 없음 검증 | `tests/unit/ups/defb145-street-country-dedup.test.ts` |
| **TC-SHXK-STREET-07** | 과거 성공 사례(61자 국가명 포함) → 도로명만 남김 | 성공 패턴 정합성 | `tests/unit/ups/defb145-street-country-dedup.test.ts` |
| **TC-SHXK-STREET-08** | 단일 세그먼트 주소(콤마 없음) → 전체 도로명 취급 | 한글/다국어 세이프 가드 | `tests/unit/ups/defb145-street-country-dedup.test.ts` |

### 59. SHXK street 시/구/도 제거 → AddressLine 70자 이내 축약 (DEF-B-146 / Issue #1194 / TASK-B-326)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-SHXK-OVRFLOW-01** | 88자 입력 → 49자 성공형 변환 (Jaison 실검증값 정확 일치) | DEF-B-146 핵심 회귀 — 실제 API 검증값 기반 | `tests/unit/ups/defb146-street-city-province-overflow.test.ts` |
| **TC-SHXK-OVRFLOW-02** | 결과 길이 ≤ 70자 (AddressLine 1~2줄 상한) | UPS AddressLine 초과 근본 차단 (길이 검증) | `tests/unit/ups/defb146-street-city-province-overflow.test.ts` |
| **TC-SHXK-OVRFLOW-03** | shipper_street 시/구/도·국가 완전 제거 | 새로운 resolveRoadAddress 검증 | `tests/unit/ups/defb146-street-city-province-overflow.test.ts` |
| **TC-SHXK-OVRFLOW-04** | shipper_street/consignee_street + city/province city/province 별도 확인 | 정보 손실 없음 종합 | `tests/unit/ups/defb146-street-city-province-overflow.test.ts` |
| **TC-SHXK-OVRFLOW-05** | 수하인 street(단일 세그먼트 it venture tower) 동일 축약 | ZEN-2026-000015 수하인 실제 데이터 | `tests/unit/ups/defb146-street-city-province-overflow.test.ts` |

### 60. confirmOutbound zen_inventory_history insert 제거 (DEF-B-149 / Issue #1202 / TASK-B-329)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-INVH-01** | 출고확정 시 zen_inventory_history from/insert 호출 0건 | SKU 재고 이력 insert 원천 차단 검증 (from 호출 카운트) | `tests/unit/warehouse/defb149-confirm-outbound-history-removal.test.ts` |
| **TC-INVH-02** | RELEASED 상태 전환 + revalidatePath 보존 | insert 제거가 정상 출고 흐름에 영향 없음 | `tests/unit/warehouse/defb149-confirm-outbound-history-removal.test.ts` |
| **TC-INVH-03** | pkgsWithoutIntlRef 계산 보존 | 출고 패키지 조회 로직 무손상 | `tests/unit/warehouse/defb149-confirm-outbound-history-removal.test.ts` |
| **TC-INVH-04** | WAREHOUSED/PACKED 아닌 오더 거부 유지 | 가드 로직 회귀 방지 | `tests/unit/warehouse/defb149-confirm-outbound-history-removal.test.ts` |
| **TC-INVH-05** | 빈 packages/빈 레코드에서도 성공 | history 의존 제거로 성공 조건 단순화 검증 | `tests/unit/warehouse/defb149-confirm-outbound-history-removal.test.ts` |

### 61. UPS 라벨 Storage 업로드 실패 재시도 + 오류 구분 (DEF-B-148 / Issue #1201 / TASK-B-328)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-STG-01** | 업로드 1회 실패 후 재시도 성공 → signedUrl 반환 + upload 2회 호출 | Storage 일시 장애 자동 복구 검증 | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` |
| **TC-UPS-STG-02** | 업로드 전건 실패 → 재시도 1회 후 throw + uploadError 전체 구조화 로깅 | 근본원인 진단 로그 검증 (DEF-B-148) | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` |
| **TC-UPS-STG-03** | uploadError.message 빈 문자열이어도 에러 메시지에 객체 정보 포함 | `<none>` 오류 메시지 재발 방지 | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` |
| **TC-UPS-STG-04** | getnewlabel 성공 + Storage 실패 → "배송 처리는 완료" 메시지 + markAllPackagesIssued 호출 | 오진단성 메시지 제거 + 패키지 마킹 누락 방지(③) | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` |
| **TC-UPS-STG-05** | getnewlabel 자체 실패 → "라벨 발급 실패 (getnewlabel)" 유지 + 마킹 미수행 | 실패 원인 구분 회귀 방지 | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` |
| **TC-UPS-STG-06** | getnewlabel 성공 + Storage 성공 → signed URL 반환 + 패키지 마킹 | 정상 경로 회귀 방지 | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` |
| **TC-UPS-STG-07** | getnewlabel 실패 시 Storage 업로드 미호출 | 불필요 Storage 호출 차단 교차 검증 | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` |

---

### 62. SHXK 무역서류 처리 완료 메시지 + revalidatePath (DEF-B-147 / Issue #1196 / TASK-B-327)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-TRDOC-01** | WAYBILL 성공 시 완료 토스트 + router.refresh | 처리 완료 안내 부재 해소 검증 | `tests/unit/ups/task-b327-trade-document-toast.test.tsx` |
| **TC-TRDOC-02** | CUSTOMS 성공 시 완료 토스트 + router.refresh | 동일 경로 회귀 방지 | `tests/unit/ups/task-b327-trade-document-toast.test.tsx` |
| **TC-TRDOC-03** | INVOICE 실패 시 에러 토스트, 완료 토스트/refresh 미호출 | 실패 케이스 사용자 안내 검증 | `tests/unit/ups/task-b327-trade-document-toast.test.tsx` |
| **TC-TRDOC-04** | 성공 응답 url 존재 시 "문서 열기" 링크 노출 | raw JSON 팝업 개선(③) 검증 | `tests/unit/ups/task-b327-trade-document-toast.test.tsx` |
| **TC-TRDOC-05** | fetchShxkTradeDocument 성공 시 revalidatePath(orders/[orderId]) 호출 | 서버 액션 리프레시 누락 버그 검증 | `tests/unit/ups/task-b327-fetch-trade-document.test.ts` |
| **TC-TRDOC-06** | getnewlabel 실패 시 success=false + revalidatePath 미호출 | 실패 시 화면 갱신 오호출 방지 | `tests/unit/ups/task-b327-fetch-trade-document.test.ts` |

---

## 📝 가이드라인 (R-09 Enforcement)
1. **추가 의무**: 신규 기능 개발 시 위 카테고리에 맞는 테스트를 반드시 추가하십시오.
2. **실행 의무**: 모든 커밋 전 `npm run test:regression`을 실행하여 위 명세 전원이 초록색인지 확인하십시오.

---

## 55. DatabaseRouteAdapter DB에러/빈결과 구분 로깅 (TASK-1139 / Issue #1184)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-DBE-01** | 직항 경로 조회 DB 에러 — logger.error 기록 | `zen_route_network` 조회 실패 시 에러 로그 기록 + 빈 배열 반환(예외 흡수) 검증 | `tests/unit/logistics/database-route-adapter-dberror.test.ts` |
| **TC-DBE-02** | 직항 경로 정상 빈결과 — 무로그 | `data=[]` 정상 빈 결과는 로깅 없이 조용히 처리(노이즈 방지) 검증 | `tests/unit/logistics/database-route-adapter-dberror.test.ts` |
| **TC-DBE-03** | 요율 조회 DB 에러 — logger.error 기록 | `zen_rate_cards` 조회 실패 시 에러 로그 기록 + cost 0 폴백 유지 검증 | `tests/unit/logistics/database-route-adapter-dberror.test.ts` |
| **TC-DBE-04** | 요율 카드 정상 부재 — 무로그 | `data=null` 정상 부재는 로깅 없이 cost 0 처리 검증 | `tests/unit/logistics/database-route-adapter-dberror.test.ts` |
| **TC-DBE-05** | 정상 흐름 — 에러 로그 없음 | 경로+요율 모두 존재 시 옵션 정상 생성·에러 로그 미발생 검증 | `tests/unit/logistics/database-route-adapter-dberror.test.ts` |

---

## 60. SHXK 인증키 미설정 방어 — assertShxkConfig 연결 (DEF-B-142 / Issue #1165 / TASK-B-318)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-SHXK-CFG-01** | 비-mock + SHXK_APP_KEY/SHXK_APP_TOKEN 미설정 → 즉시 실패 | 키 미설정 시 빈 값 전송 대신 명확한 한글 에러로 즉시 반환 (fetch+감사로그 미발생) | `tests/unit/shxk/client.test.ts` |
| **TC-SHXK-CFG-02** | mock 모드 + 키 미설정 → mock 응답 정상 | 개발/테스트 환경 mock 경로는 키 없이도 동작 유지 (방어와 무관) | `tests/unit/shxk/client.test.ts` |

---

## 63. UPS 오더 품목 총금액 통화별 소계 표시 (Issue #1232 / TASK-B-330)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-ITEMTOT-01** | 단일 통화 품목 (수량×단가) 합산 | 기본 합계 산식 검증 | `tests/unit/orders/item-totals.test.ts` |
| **TC-ITEMTOT-02** | USD + KRW 혼합 시 두 키로 각각 합산(환산 없음) | 통화별 소계(정정윤 차장 요구 ①) 검증 | `tests/unit/orders/item-totals.test.ts` |
| **TC-ITEMTOT-03** | 빈 packages / 빈 items → `{}` | 빈 상태 안전 반환 검증 | `tests/unit/orders/item-totals.test.ts` |
| **TC-ITEMTOT-04** | null·NaN·음수 quantity/unit_price 무시 | 비정상 단가 방어(0 처리) 검증 | `tests/unit/orders/item-totals.test.ts` |
| **TC-ITEMTOT-05** | 소수점(0.1×3) 부동소수 합산 | 정밀도 케이스(toBeCloseTo) 검증 | `tests/unit/orders/item-totals.test.ts` |
| **TC-ITEMTOT-06** | currency 미지정/공백/소문자 정규화 | 이전 `$ USD` 고정 표기 결함 대응 검증 | `tests/unit/orders/item-totals.test.ts` |
| **TC-ITEMTOT-07** | 입력 객체/배열 불변 | 순수 함수 불변성 검증 | `tests/unit/orders/item-totals.test.ts` |

---

## 64. 품목 금액 통화 표기 수정 — 기호 제거·코드 뒤 표기·통화별 소수 (Issue #1234 / TASK-B-331)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-CURFMT-01** | USD → `20.00 USD` (기호 제거, 코드 뒤 표기) | 표기 형식 결함(TASK-B-330 후속) 검증 | `tests/unit/orders/format-currency-amount.test.ts` |
| **TC-CURFMT-02** | CNY → `360.00 CNY` (소수 2자리 유지) | 통화별 소수 자릿수 검증 | `tests/unit/orders/format-currency-amount.test.ts` |
| **TC-CURFMT-03** | KRW → `50,000 KRW` (Intl 기본 0자리) | 0자리 통화(강제 2자리 제거) 검증 | `tests/unit/orders/format-currency-amount.test.ts` |
| **TC-CURFMT-04** | JPY → `1,000 JPY` (Intl 기본 0자리) | 0자리 통화 검증 | `tests/unit/orders/format-currency-amount.test.ts` |
| **TC-CURFMT-05** | `1234567.891` USD → `1,234,567.89 USD` | 반올림·천단위 구분 검증 | `tests/unit/orders/format-currency-amount.test.ts` |
| **TC-CURFMT-06** | EUR → `12.50 EUR` / 0 → `0.00 USD` | 소수 2자리·0 표기 검증 | `tests/unit/orders/format-currency-amount.test.ts` |
| **TC-CURFMT-07** | 잘못된 코드 `5, 'X'` → `5.00 X` | RangeError 폴백 검증 | `tests/unit/orders/format-currency-amount.test.ts` |

## 65. SHXK/UPS 규격 사전검증 — HS코드 필수·품명 35자·전화번호 15자리 (Issue #1239)

폼(zod) 스키마와 SHXK payload 사전검증에 SHXK·UPS 규격을 반영 — 외부 호출 실패 대신 저장/호출 전 명확한 한글 에러로 차단. 상수는 `src/lib/validation/shxk-limits.ts` 단일 정의(`HS_CODE_MAX=30`, `ITEM_NAME_MAX=35`, `PHONE_MAX_DIGITS=15`, `stripNonDigits`). HS·품명 규칙은 UPS 한정, 전화는 전 모드(값 있을 때).

| TC ID | 입력/조건 | 기대 결과 | 테스트 파일 |
|:------|:---------|:----------|:-----------|
| **TC-SHXKFLD-01** | UPS + 품목 HS 빈 값 | 실패, path `packages.0.items.0.hs_code` | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXKFIELD-02** | UPS + HS 있음 | 통과 | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXKFIELD-03** | AIR + HS 빈 값 | 통과 (UPS 한정 확인) | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXFIELD-04** | UPS HS 코드 31자 초과 | 실패 | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXFIELD-05** | UPS 품명 35자 통과 / 36자 실패 (path item_name) | UPS 한도 검증 | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXFIELD-06** | AIR 품명 36자 → 통과 (UPS 한정 확인) | 모드 조건부 검증 | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXFIELD-07** | 전화 `010-1234-5678` 실패 / `01012345678` 통과 / 16자리 실패 | 숫자만 + 15자리 검증 | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXFIELD-08** | `stripNonDigits('010-1234-5678') === '01012345678'` | 헬퍼 검증 | `tests/unit/orders/shxk-field-limits.test.ts` |
| **TC-SHXPAY-01** | 정상 payload → `[]` | 기준 케이스 | `tests/unit/shxk/validate-payload-limits.test.ts` |
| **TC-SHXPAY-02** | invoice `hs_code` 누락 → `품목 1: HS 코드 누락` | 서버 사전검증(기존 저장분 보호) | `tests/unit/shxk/validate-payload-limits.test.ts` |
| **TC-SHXPAY-03** | 품명 36자 → `품목 1: 품명 35자 초과` | 서버 사전검증 | `tests/unit/shxk/validate-payload-limits.test.ts` |
| **TC-SHXPAY-04** | 하이픈 전화 → `…전화번호는 숫자만…` / 16자리 → `…15자리 이하…` | 서버 사전검증 | `tests/unit/shxk/validate-payload-limits.test.ts` |

## 66. 수정 화면 화주명·주소·패키지 CONTENT 저장값 복원 (Issue #1240 / TASK-B-333)

수정(edit) 화면 진입 시 `edit/page.tsx`의 defaultValues가 ①`shipper_name`·`shipper_address_english`·`shipper_address_detail_english`를 누락하고 ②UPS 오더의 `content_type`을 `?? 'GENERAL'`로 넘겨 CONTENT select(옵션 DOC/NONDOC 2개)가 공백으로 렌더링되던 결함(#1238 항목 4·5) 복원. 로직을 `src/lib/orders/edit-defaults.ts`로 추출 — `buildOrderEditDefaults`(누락 필드·전화 정제·content_type 정규화), `resolveShipperAddressDefaults`(수정 모드 저장 주소값), `normalizeUpsContentType`(UPS 한정 정규화). 폼은 UPS 모드에서 GENERAL/기타 잔존값을 NONDOC으로 보정한다.

| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-EDTDF-01** | 저장된 `shipper_name`·`shipper_address_english`·`shipper_address_detail_english` 보존 | 항목 4 복원 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-02** | UPS 패키지 `GENERAL` → `NONDOC` 정규화 | 항목 5 복원 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-03** | UPS `DOC` 유지 | 항목 5 오검출 방지 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-04** | 비UPS `GENERAL` 유지 | 모드 조건부 회귀 방지 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-05** | 레거시 하이픈 전화 `010-1234-5678` → `01012345678` | TASK-B-332 후속 정제 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-06** | 숫자 전화 불변 / null·undefined → `''` | 빈값 처리 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-07** | `normalizeUpsContentType` UPS null/''/'XYZ' → NONDOC, DOC → DOC | 순수함수 단위 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-08** | `normalizeUpsContentType` 비UPS null/undefined → GENERAL | 순수함수 단위 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-09** | 수정 모드 + 토글 없음 → 저장 주소값(영문 포함) | 항목 4 AddressInput 복원 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-10** | 수정 모드 + 토글 후 manual → 빈 값 | 사용자 조작 우선 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-11** | 수정 모드 + 토글 후 auto → affiliation 파생값 | 사용자 조작 우선 | `tests/unit/orders/edit-defaults.test.ts` |
| **TC-EDTDF-12** | 신규 등록 manual → 빈 값 / auto → affiliation | 회귀 방지 | `tests/unit/orders/edit-defaults.test.ts` |

## 67. 대량 등록(bulk-orders) 전화번호 정제 (Issue #1243 / TASK-B-334)

TASK-B-332가 `orderRegistrationSchema`의 전화 규칙(숫자만 `/^\d*$/`·`/^\d+$/` + 최대 15자리)을 전 모드에 적용했는데, 엑셀 대량 등록 경로(`bulk-orders.ts`)가 정제 없이 원본을 스키마에 전달해 하이픈 전화 행이 거부되던 회귀(#1239 후속)를 수정. `mapExcelRowToOrderInput`에서 전화 2필드에 `stripNonDigits` 적용 후 스키마에 위임(15자리 초과·빈 값 판정은 스키마).

| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-BULKPH-01** | 하이픈 전화 UPS 행 `010-1234-5678` → 정제되어 성공, `createOrder`에 `01012345678` 전달 | 실제 입력 경로 보호(회귀) | `tests/unit/operations/bulk-orders.test.ts` |
| **TC-BULKPH-02** | UPS 행 `+`·공백 전화 → 정제되어 성공, `createOrder`에 숫자만 전달 (TASK-B-335에서 AIR 전제 소멸로 수정) | 전 모드 정제 확인 | `tests/unit/operations/bulk-orders.test.ts` |
| **TC-BULKPH-03** | 정제 후 빈 값(`-- () --`) → 스키마 거부(`전화번호는 숫자만`) + `createOrder` 미호출 | 빈 값 위임 | `tests/unit/operations/bulk-orders.test.ts` |
| **TC-BULKPH-04** | 정제 후 16자리 → 스키마 거부(`15자리`) + `createOrder` 미호출 | 15자리 위임 | `tests/unit/operations/bulk-orders.test.ts` |

## 68. 대량 등록 UPS 전용 명문화 + 템플릿 정합 (Issue #1245 / TASK-B-335 / DEF-B-150)

대량 등록이 비UPS 행을 항상 실패시키고(스키마는 비UPS에 port 필수, 템플릿·매핑엔 port 없음), 제공 템플릿 샘플 자체가 어떤 모드로도 등록 불가(AIR 기본 + `shipper_contact_phone` 컬럼 부재 + 빈 HS/국가/우편번호/도시 + `GENERAL` content_type)였던 결함. JSJung 결정(방향 A)에 따라 대량 등록을 UPS 전용으로 명문화하고 템플릿 샘플을 실제 검증 통과값으로 교체, Zod 오류를 사람이 읽을 수 있게 포맷. `src/app/actions/operations/bulk-orders.ts`의 행 루프 선두에서 `BULK_SUPPORTED_MODE='UPS'` 검사(비UPS 행만 실패·배치는 계속), `content_type`은 기존 `normalizeUpsContentType` 재사용, `formatBulkError`로 `경로: 메시지` 노출. `src/lib/excel/bulk-order-template.ts`에 `shipper_contact_phone` 컬럼 추가 + UPS 통과 샘플(상수 `BULK_*_SAMPLE`).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-BULKUPS-01 | 비UPS(AIR) 행 + UPS 행 혼합 배치 | AIR 행만 `success:false`(`대량 등록은 UPS 오더만 지원합니다`), UPS 행 성공·`createOrder` 1회 | `tests/unit/operations/bulk-orders.test.ts` |
| TC-BULKUPS-02 | `transport_mode` 공란 / 소문자·공백(` ups `) | UPS로 대문자 정규화되어 성공, `createOrder.transport_mode='UPS'` | `tests/unit/operations/bulk-orders.test.ts` |
| TC-BULKUPS-03 | 패키지 `content_type` 공란/`GENERAL`/`DOC` | 공란·GENERAL → `NONDOC`, `DOC` 유지 | `tests/unit/operations/bulk-orders.test.ts` |
| TC-BULKUPS-04 | 템플릿 라운드트립(`generateBulkOrderTemplate` → `XLSX.read` → `bulkCreateOrders`) | 샘플 행 `success:true`(템플릿 회귀 시 FAIL) | `tests/unit/operations/bulk-orders.test.ts` |
| TC-BULKUPS-05 | UPS 행 HS 누락 시 오류 문자열 | JSON이 아닌 `packages.0.items.0.hs_code: UPS 배송은 품목 HS 코드가 필수입니다…` | `tests/unit/operations/bulk-orders.test.ts` |

## 69. 미존재·비활성 ups_product_code 등록 전 거부 + 스냅샷 누락 경고 (Issue #1247 / TASK-B-336 / DEF-B-151)

`orderRegistrationSchema.ups_product_code`가 `z.string().optional()`(무검증)이라 오타·구버전 코드(예 `WWE`)로 UPS 오더를 등록해도 저장에 성공하고, `saveOrderRateSnapshot`이 미존재 상품을 만나면 `if (!product) return;`으로 **무음 스킵** → 운임 스냅샷 없는 오더가 생성되던 결함. 신규 헬퍼 `src/lib/orders/ups-product-guard.ts`의 `assertActiveUpsProduct(supabase, code)`가 `zen_ups_products`를 `product_code` + `is_active=true`로 조회(`.maybeSingle()`)해 미존재·비활성이면 오더 생성(RPC) 이전에 거부하고, DB 조회 `error`는 "없음"과 구분해 throw. `createOrder`는 스키마 통과 직후 RPC 이전에, `updateOrder`는 기존 저장값과 다르게 지정될 때만 검증(레거시 오더 수정 차단 방지). `saveOrderRateSnapshot`의 무음 `return` 2곳에 `logger.warn` 추가(동작 불변). 화주 세션(RLS `is_active = true`)에서도 정상 코드가 통과함을 실DB 통합 테스트로 실측.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-336-01 | `assertActiveUpsProduct` — 활성 코드 통과 + 쿼리에 `product_code`·`is_active=true` 조건 포함(인자 캡처) | resolve, `filters.product_code`·`is_active===true` | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-02 | 미존재 코드 `WWE` | `존재하지 않거나 비활성화된 UPS 상품 코드입니다: WWE` throw | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-03 | DB 조회 `error` 반환 | `UPS 상품 코드 검증 중 오류가 발생했습니다: …` — "없음"과 구분된 DB 오류 | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-04 | `createOrder` 미존재 코드 | RPC 차단: throw + `createOrderViaRpc` **0회**·`supabase.rpc` 0회 | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-05 | `createOrder` 실존 활성 코드 | 검증 통과 후 `createOrderViaRpc` 1회 | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-06 | `createOrder` 비UPS(AIR, 코드 무효값) | `from('zen_ups_products')` **0회**, 오더 생성 1회 | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-07 | `updateOrder` 기존 저장값과 동일 코드 | 상품 조회 **0회**(재검증 생략), `updateHeader` 1회 | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-08 | `updateOrder` 기존값과 다른 미존재 코드 | throw + `updateHeader` 0회 | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-09 | `saveOrderRateSnapshot` 상품 미존재 | `logger.warn`(오더 ID·`product_code` 포함), 스냅샷 insert 미발생(동작 불변) | `tests/unit/orders/ups-product-guard.test.ts` |
| TC-336-RLS-01/02 | 실DB·화주 세션(R-14): `WW_SAVER_NONDOC` 통과 / `WWE` 거부 | RLS(`is_active=true`) 하에서 정상 코드까지 거부되지 않음 | `tests/integration/def-b151-ups-product-guard.test.ts` |
| TC-336-BULK | 대량 등록: 한 행이 미존재 코드로 throw | 해당 행만 `success:false`(메시지 그대로 노출), 다른 행 성공(행 격리) | `tests/unit/operations/bulk-orders.test.ts` |

## 70. SHXK 신고단위 7종 정본 목록·YDS/KG 지원·정합 테스트 (Issue #1251 / TASK-B-337)

SHXK `getdeclareunit` 실측(2026-10-13) 7개 신고단위(`PCE, SET, MTR, PCS, EA, YDS, KG`)를 정본 상수 `SHXK_DECLARE_UNITS`(`src/lib/shxk/declare-units.ts`)로 도입하고, **v2 결정(JSJung 2026-10-21)에 따라 코드 그대로 표출·전송**한다. 기존 `SHXK_UNIT_CODE_MAP`(`EA→PCE`, `PCS→PCE`) 변환은 폐기 — 빈 값/목록 외 값만 `PCE` 폴백. 신규 품목 기본값을 `EA`→`PCE`로 변경(`EA`가 중국어 "套"로 나가는 것 방지). 실서버 createorder의 `EA`·`PCS`·`YDS`·`KG` 수락 여부는 병합 후 JSJung 라이브 확인 몫(미확인 위험).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-337-1 | `resolveShxkUnitCode` — 7개 코드 각각 + 소문자 대문자화 + 빈 값/`XYZ` 폴백 | 각 코드 자기 자신 반환(변환 없음), `''`·`XYZ`→`PCE` | `tests/unit/ups/shxk-declare-units.test.ts` |
| TC-337-2 | 정합 불변식: `PACKING_UNIT_OPTIONS` 전 항목 → `resolveShxkUnitCode(v)===v` && `isShxkDeclareUnit(v)` | 옵션/목록/매핑 어긋나면 FAIL (모듈 import, 복사 금지) | `tests/unit/ups/shxk-declare-units.test.ts` |
| TC-337-3 | `PACKING_UNIT_OPTIONS` 집합 == `SHXK_DECLARE_UNITS` code 집합(7개, 순서 무관) | 한쪽만 늘리면 FAIL | `tests/unit/ups/shxk-declare-units.test.ts` |
| TC-337-4 | `buildInvoiceFromItems` — `EA`/`PCS`/`YDS`/`KG` | `unit_code`가 입력과 같은 값으로 나감 | `tests/unit/ups/shxk-declare-units.test.ts` |
| TC-337-5 | `validateShxkPayload` 단위 검사 | 허용 단위(`PCE`) 에러 0 / `XYZ`는 한글 에러 반환 배열 포함 | `tests/unit/ups/shxk-declare-units.test.ts` |
| TC-337-6 | 기본값 `PCE` | `DEFAULT_PACKING_UNIT==='PCE'` + `orderItemSchema.parse` 미지정 시 `'PCE'` | `tests/unit/ups/shxk-declare-units.test.ts` |
| TC-337-MAP | `ups-labels-mapping.test.ts` 갱신 | `EA→EA`, `PCS→PCS`, `ea→EA`, `buildInvoiceFromItems` EA 기대값 `EA` (요구 변경) | `tests/unit/ups/ups-labels-mapping.test.ts` |

## 71. UPS 오더 "UPS 등록 전까지" 전체 수정 + 상세 화면 수정 버튼 (Issue #1254 / TASK-B-339)

고객 요청(JSJung 2026-10-20 Q1·Q2 확정)으로 UPS 오더는 **UPS 등록 전**(창고 `UPS 등록` = WAREHOUSED→PACKED·SHXK createorder 이전)까지 전체 수정 가능해졌다. TASK-B-284(#1070)의 WAREHOUSED+UPS 부분 수정 통제(화주·운송수단·실측 치수 잠금)를 의도적으로 완화하되, 세 가지 안전장치로 보완했다.

- **등록 판정은 상태가 아니라 사실(활성 라벨)**: HELD/RETURNED/CLAIMED는 PACKED·IN_TRANSIT 이후에도 전이 가능하므로 상태만으로는 "등록 전"을 보장하지 못한다(결함 ①). `src/lib/orders/ups-registration.ts`의 `hasActiveUpsLabel`(zen_ups_labels, `is_voided=false`, DB error는 throw) + `src/lib/orders/ups-edit-availability.ts`의 `getUpsEditAvailability`(등록 사실이 상태보다 우선)로 단일 정본화하고, 서버(`updateOrder`)·수정 화면·UPS 상세가 모두 이를 소비한다.
- **안전장치 ①**: 잠금이 풀려도 실측 패키지의 5개 값(치수 3·중량·포장수)이 모두 기존과 같을 때만 `measured_at`을 이월하고, 하나라도 바뀌면 이월하지 않아 "미실측"(창고 재실측 필요)이 된다.
- **안전장치 ②**: `orderPackageSchema.measured_at`을 받아, 폼 로드 시점 값과 DB 현재 `measured_at`이 다르면(창고가 그 사이 실측/재실측) 저장을 거부한다(낙관적 동시성).
- **안전장치 ③**: `src/lib/orders/rate-snapshot-refresh.ts`의 `refreshUpsRateSnapshot`이 UPS 수정 후 운임 스냅샷을 **update-or-insert**(`unique_order_snapshot(order_id)` 유일 인덱스)로 갱신하며, `is_manual=true`는 덮어쓰지 않는다.
- **화면**: UPS 상세 헤더에 `수정` 버튼(가능=Link, 불가=비활성 `aria-disabled`), 수정 화면 리다이렉트·돌아가기 경로는 `src/lib/orders/detail-path.ts`의 `getOrderDetailPath`로 단일화. WAREHOUSED+**비UPS**는 여전히 수정 불가.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-AVL-01~04 | `getUpsEditAvailability` (REGISTERED/SCHEDULED/WAREHOUSED,false) | editable, WAREHOUSED는 message에 `재실측` 포함 | `tests/unit/orders/ups-edit-availability.test.ts` |
| TC-AVL-05~08 | (PACKED/IN_TRANSIT,false) + (HELD/RETURNED/CLAIMED/REGISTERED/WAREHOUSED,true) + 전체 상태 순회 | 상태 불가=STATUS / 활성 라벨=UPS_REGISTERED(상태 무관 최우선) | `tests/unit/orders/ups-edit-availability.test.ts` |
| TC-LBL-01~06 | `hasActiveUpsLabel` — `.eq('order_id')`·`.eq('is_voided',false)` 인자 캡처 | 있음 true / 없음 false / DB error throw | `tests/unit/orders/ups-registration.test.ts` |
| TC-PATH-01~05 | `getOrderDetailPath` | UPS→`/orders/{id}/ups-detail`, AIR/`null`/`undefined`→`/orders/{id}` | `tests/unit/orders/detail-path.test.ts` |
| TC-SNAP-01~07 | `refreshUpsRateSnapshot` — 기존/없음/`is_manual`/계산 불가/추정 throw/인자·국가 대체 | update-or-insert, `is_manual` 보존, 계산 불가 시 warn·불변, throw 전파 | `tests/unit/orders/rate-snapshot-refresh.test.ts` |
| TC-339-①~⑨-d | `updateOrder` — 라벨 차단 / 잠금 해제 반영 / `measured_at` 이월·해제 / 동시성 거부 / 비UPS 라벨 조회 0회 / ⑦-b·⑦-c 수정 후 **운송수단 기준 스냅샷 갱신**(AIR→UPS 갱신·UPS→AIR 미갱신) / ⑨-b~d **null↔0 정규화**(DB null + 폼 0 → 이월, DB null + 폼 5 → 미이월, gross_weight null↔0) | 삭제·삽입 0회 포함 인자 캡처 단언 | `tests/unit/logistics/order-update-b339.test.ts` |
| TC-BTN-①~⑤ | UPS 상세 렌더 — 수정 링크 href / WAREHOUSED title `재실측` / PACKED `aria-disabled` / HELD+라벨 `UPS 등록취소` | 실제 default export 렌더, 부정 단언 전 목록보기 존재 단언 | `tests/unit/orders/ups-detail-edit-button.test.tsx` |
| TC-FRM-①~④ | `getOrderEditScope('WAREHOUSED','UPS')` 실제 함수로 폼 렌더 | 부분 수정 배너 없음 / 운송수단·실측 입력 disabled 아님 | `tests/unit/orders/edit-form-warehoused-unlocked.test.tsx` |
| TC-339-INT-①~⑥ | 실DB(R-14) — 라벨 없음 실측 변경/불변, 활성 라벨 거부, 낙관적 동시성, 화주 세션 RLS 조회, 스냅샷 1행 유지 / INT-②는 **치수 null 패키지 케이스 포함**(null↔0 정규화 후 `measured_at` 보존) | `measured_at` NULL/보존, 거부 시 DB 불변, RLS로 라벨 조회 가능 | `tests/integration/ups-edit-before-registration.test.ts` |
| TC-284-01/02 | 기존 TASK-B-284 통합 — 잠금 해제 반영(미실측 수정 / 실측 값 변경 시 재실측) | TC-284-02는 새 사양으로 갱신(기대값 변경) | `tests/integration/iss1070-ups-warehoused-partial-edit.test.ts` |
| TC-284-T2/T3/T4 | `getOrderEditScope` WAREHOUSED+UPS 잠금 해제 / WAREHOUSED+비UPS 불가 | T3 기대값 갱신, T2·T4 불변 | `tests/unit/logistics/status-machine.test.ts` |




## 72. UPS 수정 화면 화주 "주소" 공백 — 국가코드 빈 값 처리·저장 방지·기존 데이터 정정 (Issue #1256 / TASK-B-340)

UPS 오더 수정 화면에서 화주 주소가 비어 보이는 결함. 원인은 `shipper_country_code`가 `''`(빈 문자열)로 저장된 행으로, 화면은 국가를 `|| 'KR'`로 표시하면서도 한국 주소(roadAddress) 초기화는 `=== 'KR'` 엄격 비교라 주소를 채우지 않았다. 표시(AddressInput)·기본값(edit-defaults)·저장 스키마(order.ts) 3중으로 정정하고, 기존 `''` 데이터는 멱등 마이그레이션으로 보정한다. `recipient_country_code`와 SHXK 전송 로직(`|| defaults.country`)은 변경하지 않는다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-340-A | 실제 `AddressInput` 렌더 — `country_code:''` + 한국 주소 | "주소" 입력에 주소 문자열 표시(국가 select 존재 선행 단언) | `tests/unit/components/address-input-empty-country.test.tsx` |
| TC-340-B | `country_code:'KR'` + 한국 주소 (회귀) | 동일하게 주소 표시 | `tests/unit/components/address-input-empty-country.test.tsx` |
| TC-340-C | `country_code:'US'` + 주소 | 해외 주소 입력에 표시, 한국 검색칸(placeholder `Search`) 없음 | `tests/unit/components/address-input-empty-country.test.tsx` |
| TC-340-DEF | `buildOrderEditDefaults` / `resolveShipperAddressDefaults` | `''`→`KR`, `null`→`KR`, `'JP'`→`'JP'`, `recipient` 불변 | `tests/unit/orders/edit-defaults.test.ts` |
| TC-340-SCH | `orderRegistrationSchema` — `shipper_country_code` | `''`/`'  '`/미지정→`KR`, `'JP'`→`'JP'`, `' KR '`→`'KR'` | `tests/unit/orders/shipper-country-schema.test.ts` |
| TC-340-MIG | 실DB(R-14): 마이그레이션 파일 실제 실행 | `''`+주소 행만 `KR`로 정정, NULL/주소없음/다른 국가 불변, 재실행 `UPDATE 0` | `tests/integration/task-b340-backfill-country.test.ts` |


## 73. SHXK createorder shipper_name·shipper_company = 화면 "화주명" 통일 (Issue #1261 / TASK-B-341)

> ⚠️ **TASK-B-342(Issue #1263, JSJung 2026-10-22 결정)로 `shipper_company` 사양이 기본값 고정으로 변경됨** — 아래 기대 결과는 TASK-B-342 기준(2026-10-22 갱신). 상세는 §74.
> ⚠️ **TASK-B-345(Issue #1277, JSJung 2026-11-12 결정)로 `shipper_company` 키 자체가 미전송으로 재번복됨** — 아래 TC-341-* 기대 결과 중 `shipper_company` 값은 현재 **키 부재**이며, 테스트 파일도 그 기준으로 갱신됨. 상세는 §76.

SHXK `createorder` 페이로드의 `shipper.shipper_name`이 화면 "담당자명"(`zen_orders.shipper_contact_name`)으로 나가면서 `shipper_company`(화주명)와 불일치하던 것을, **JSJung 2026-10-21 결정**에 따라 양쪽 모두 화면 "화주명"(`zen_orders.shipper_name`)으로 통일한다. 폴백 체인은 기존 `shipper_company`와 동일하게 `order.shipper_name` → `order.shipper_org.name` → `shipperDefaults.name`. **담당자명(`order.shipper_contact_name`)은 SHXK payload 어디에도 전송하지 않는다** (동일 결정). DB·화면·`validate-payload.ts` 변경 없음 — `buildCreateOrderPayload()`의 shipper 블록만 변경 (`src/lib/ups/label-mapping.ts`).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-341-1 | 실제 `buildCreateOrderPayload` 호출 — `shipper_name='ABC Trading'` + `shipper_contact_name='Kim'` | `shipper_name='ABC Trading'`, `shipper_company='SNTL Korea Co Ltd'` (기본값, TASK-B-342 갱신) (`toBe`) | `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts` |
| TC-341-2 | `shipper_name` 빈 값 + `shipper_org.name='MASTER AIR'` | `shipper_name='MASTER AIR'`, `shipper_company='SNTL Korea Co Ltd'` (TASK-B-342 갱신) | 동일 |
| TC-341-3 | 화주명·조직명 모두 없음 | 두 필드 모두 `shipperDefaults.name` | 동일 |
| TC-341-4 | `shipper_contact_name` 값이 payload shipper 어디에도 없는지 | 전체 필드 값 스캔 부정 단언(`not.toContain`) | 동일 |
| TC-341-5 | shipper 나머지 필드(`countrycode`/`province`/`city`/`street`/`postcode`/`telephone`) | 변경 전과 동일 | 동일 |
| TC-341-6 | 한국어 화주명 | `shipper_name`에 그대로 실림, `shipper_company`는 기본값 (TASK-B-342 갱신) | 동일 |
| TC-341-7 | 실제 서버 액션 `registerUpsOrder()` → SHXK `createorder` payload | `shipper_name='ABC Trading'`, `shipper_company='SNTL'`(= mock `SHXK_SHIPPER_NAME`) (TASK-B-342 갱신) | 동일 |
| TC-341-8 | `previewShxkPayload('CREATEORDER')` 미리보기 payload | `shipper_name='ABC Trading'`, `shipper_company='SNTL'` (TASK-B-342 갱신) | 동일 |
| TC-341-9 | 레거시 오더(`shipper_name` 없음) → 실제 등록 경로 | `shipper_name='MASTER AIR'`, `shipper_company='SNTL'` (TASK-B-342 갱신) | 동일 |
| TC-341-RST | 되돌리기 검증: `shipper_name`을 담당자명 체인으로 원복 | TC-341-1 FAIL(`expected 'Kim' to be 'ABC Trading'`) — 전체 8건 FAIL / 1 PASS | 동일 |
| TC-341-EXIST | 기존 기대값 갱신 — `ups-labels-mapping.test.ts`(화주명 기본값 폴백), `task-b324-shxk-shipper-name-override.test.ts`(담당자명 미덮어쓰기 → 두 필드 동일 적용) | TASK-B-341 사양으로 갱신 → TASK-B-342에서 `shipper_company` 기본값으로 재갱신 (§74 참조) | `tests/unit/ups/ups-labels-mapping.test.ts`, `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` |


## 74. SHXK createorder shipper_company = 회사 기본값 고정 (Issue #1263 / TASK-B-342)

> 🚫 **현행 사양 아님 — TASK-B-345(Issue #1277, JSJung 2026-11-12 결정)로 번복됨.** `shipper_company`는 이제 회사 기본값으로도 전송하지 않고 **키 자체를 제거**한다. 아래 표는 TASK-B-342 시점의 이력이며, 현행 기대 결과는 §76 참조.

**JSJung 2026-10-22 결정** — TASK-B-341(§73)의 "두 필드 모두 화면 화주명" 결정을 번복한다. `shipper.shipper_company`는 화면 "화주명"이 아니라 **회사 기본값**(환경변수 `SHXK_SHIPPER_NAME`, 기본 `SNTL Korea Co Ltd`)으로 고정한다. `shipper_name`은 화면 "화주명" 그대로 유지(폴백 체인 변경 없음). **담당자명(`order.shipper_contact_name`)은 계속 SHXK payload 어디에도 전송하지 않는다.** 호출처·config·DB·화면·`validate-payload.ts` 변경 없음 — `buildShipperPayload()`의 `shipper_company` 1줄만 변경 (`src/lib/ups/label-mapping.ts`).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-342-1 | 실제 `buildCreateOrderPayload` 호출 — `shipper_name='ABC Trading'` | `shipper_name='ABC Trading'`, `shipper_company='SNTL Korea Co Ltd'`(=`shipperDefaults.name`), 화주명 아님(`not.toBe`) | `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts` |
| TC-342-2 | `shipper_name` 빈 값 + `shipper_org.name='MASTER AIR'` | `shipper_name='MASTER AIR'`, `shipper_company='SNTL Korea Co Ltd'` | 동일 |
| TC-342-3 | 한글 화주명(`'한국무역'`) | `shipper_name='한국무역'`(그대로), `shipper_company='SNTL Korea Co Ltd'` | 동일 |
| TC-342-4 | `shipperDefaults.name='X CORP'` 주입 | `shipper_company='X CORP'` (환경변수 경로 증명) | 동일 |
| TC-342-5 | `shipper_contact_name='Kim'` | payload shipper 어느 필드에도 없음 (`not.toContain`) | 동일 |
| TC-342-6 | shipper 나머지 필드(`countrycode`/`province`/`city`/`street`/`postcode`/`telephone`) | 변경 전과 동일 | 동일 |
| TC-342-7 | 실제 서버 액션 `registerUpsOrder()` → SHXK `createorder` payload | `shipper_company='SNTL'`(= mock `SHXK_SHIPPER_NAME`) | 동일 |
| TC-342-8 | `previewShxkPayload('CREATEORDER')` 미리보기 payload | `shipper_company='SNTL'` | 동일 |
| TC-342-9 | 레거시 오더(`shipper_name` 없음) → 실제 등록 경로 | `shipper_name='MASTER AIR'`, `shipper_company='SNTL'` | 동일 |
| TC-342-RST | 되돌리기 검증: `shipper_company`을 `shipperDisplayName`으로 원복 | TC-342-1 FAIL(`expected 'ABC Trading' to be 'SNTL Korea Co Ltd'`) — 전체 **7건 FAIL / 2 PASS** | 동일 |
| TC-342-EXIST | 기존 기대값 갱신 4개 파일 | `shipper_company` 기대값을 기본값으로 갱신 | `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts`, `tests/unit/ups/ups-labels-mapping.test.ts`, `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts`, `tests/unit/ups/defb054-shipper-company.test.ts` |


## 75. UPS createorder 주소 쉼표 제거 + 입력 차단 + AddressLine 길이 검증 (Issue #1268 / TASK-B-343)

**배경**: UPS createorder 호출 시 수하인/발송인 주소에 쉼표(,)가 있으면 UPS 운송장/인보이스에서 쉼표 앞부분만 출력됨. 또한 UPS(SHXK 경유)는 주소를 AddressLine 줄당 약 35자로 나누며 초과 시 거부.  
**요구사항(JSJung 2026-10-28)**: AddressInput 전체 사용처에서 쉼표 입력 시 즉시 공백 치환(붙여넣기 포함), 전송 계층에서 도로명 추출 후 쉼표 치환, AddressLine 길이 사전검증.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-343-1 | `resolveShipperStreet` - 표시용 출력 유지 (도로명 추출 순서 확인) | 기존 구분자 유지, 도로명 세그먼트만 사용 | `tests/unit/ups/task-b343-address-comma-strip.test.ts` |
| TC-343-2 | `resolveConsigneeStreet` - 표시용 출력 유지 | 기존 구분자 유지 | 동일 |
| TC-343-3 | `buildCreateOrderPayload` - 전송 지점에서 쉼표 제거 | payload shipper_street/consignee_street에 `,` 미포함, city/province도 쉼표 치환 | 동일 |
| TC-343-4 | 기존 저장분(쉼표 포함) 전송 시 정제(벌크 경로) | `buildCreateOrderPayload`/`buildShipperPayload` 경유 시 쉼표 제거 확인 | 동일 |
| TC-343-LEN | AddressLine 길이 검증 | 별도 Task로 분리 (실측 후 Jaison 확정) | - |
| TC-343-UI-01 | AddressInput 해외 주소 입력 시 쉼표→공백 치환 | 입력값 정제 확인 | `tests/unit/components/address-input-comma-strip.test.tsx` |
| TC-343-UI-02 | AddressInput 상세주소 입력 시 쉼표→공백 치환 | 입력값 정제 확인 | 동일 |
| TC-343-UI-03 | 다음우편번호 자동채움 시 `address_english` 원본 유지 | 도로명 추출 순서 보장 확인 | 동일 |


## 76. 프로덕션 배포 가드 스크립트 `scripts/deploy-prod.sh` (IMP-179)

**배경**: `vercel --prod`는 로컬 작업 디렉토리를 업로드한다. 2026-10-29 21커밋 뒤처진 로컬 develop이 그대로 배포되어 TASK-B-343이 약 3분 누락됨. 항상 `origin/main` 격리 worktree에서 배포하도록 가드 스크립트 도입.
**범위 한계**: 네트워크·vercel 없이 검증 가능한 범위만 자동 테스트. 실제 배포 경로(vercel 실행·URL 파싱·V1~V3)는 다음 배포 시 첫 실행으로 확인.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-179-1 | `bash -n` 문법 검사 | exit 0 | `tests/unit/scripts/deploy-prod.test.ts` |
| TC-179-2 | 알 수 없는 옵션 | exit 2, '알 수 없는 옵션' 메시지, 배포 시도 없음 | 동일 |
| TC-179-3 | `--expect` 값 누락 | exit 2 | 동일 |
| TC-179-4 | `vercel --prod` 실행 위치 | 모든 실행 라인이 `cd "$WT"` 서브셸 안 (로컬 체크아웃 직접 배포 회귀 방지) | 동일 |
| TC-179-5 | 배포 소스 고정 | `git worktree add --detach "$WT" origin/main` + `trap cleanup EXIT` | 동일 |

## 77. SHXK createorder shipper_company 미전송 (Issue #1277 / TASK-B-345)

**JSJung 2026-11-12 결정** — TASK-B-342(§74)의 "`shipper_company` = 회사 기본값 고정" 결정을 번복한다. SHXK 명세상 `shipper_company`는 선택 필드(200자)이므로 **키 자체를 payload에서 제거**한다(빈 문자열 전송 아님). `shipper_name`은 화면 "화주명" 그대로 유지(폴백 체인 변경 없음). `shipperDefaults.name`(= `SHXK_SHIPPER_NAME`)은 `shipper_name` 폴백 전용으로만 남는다. 호출처·config·DB·화면·`validate-payload.ts` 변경 없음 — `buildShipperPayload()`의 `shipper_company` 1줄 제거 (`src/lib/ups/label-mapping.ts`).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-345-1 | 실제 `buildCreateOrderPayload` 호출 — `shipper_name='ABC Trading'` | `shipper_name='ABC Trading'`, `payload.shipper`에 `shipper_company` 키 부재(`not.toHaveProperty`) | `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts` (TC-342-1) |
| TC-345-2 | `shipper_name` 빈 값 + `shipper_org.name='MASTER AIR'` | `shipper_name='MASTER AIR'`, `shipper_company` 키 부재 | 동일 (TC-342-2) |
| TC-345-3 | 한글 화주명(`'한국무역'`) | `shipper_name='한국무역'`, `shipper_company` 키 부재 | 동일 (TC-342-3) |
| TC-345-4 | `shipperDefaults.name='X CORP'` 주입 | `shipper_company` 키 부재 + `shipperDefaults.name`이 다른 필드로도 새지 않음 | 동일 (TC-342-4) |
| TC-345-5 | shipper 나머지 필드(`countrycode`/`province`/`city`/`street`/`postcode`/`telephone`) | 변경 전과 동일 | 동일 (TC-342-6) |
| TC-345-6 | 실제 서버 액션 `registerUpsOrder()` → `createorder` payload (mock SHXK 호출) | `shipper_name='ABC Trading'`, `shipper_company` 키 부재 | 동일 (TC-342-7) |
| TC-345-7 | `previewShxkPayload('CREATEORDER')` 미리보기 payload | `shipper_name='ABC Trading'`, `shipper_company` 키 부재 | 동일 (TC-342-8) |
| TC-345-8 | 레거시 오더(`shipper_name` 없음) → 실제 등록 경로 | `shipper_name='MASTER AIR'`, `shipper_company` 키 부재 | 동일 (TC-342-9) |
| TC-345-RST | 되돌리기 검증: `buildShipperPayload()`에 `shipper_company: shipperDefaults.name` 재삽입 | 영향 5개 파일 **30 failed / 37 passed (67)** 후 원복 시 67 passed — `not.toHaveProperty` 단언이 실제로 잡아냄 (§74 TC-342-RST 대체) | 5개 파일 |
| TC-345-EXIST | 기존 기대값 갱신 5개 파일 | `shipper_company` `toBe` 단언 → `not.toHaveProperty` 로 전환 | `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts`, `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts`, `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts`, `tests/unit/ups/defb054-shipper-company.test.ts`, `tests/unit/ups/ups-labels-mapping.test.ts` |

## 78. SHXK consignee_name 테스트용 폴백 제거 (Issue #1278 / TASK-B-346, PR①)

**배경**: `buildCreateOrderPayload()`의 consignee 블록에 `recipient_name || 'E2E Consignee'` 테스트용 폴백이 운영 코드에 남아 있어, 수취인 성명이 비어 있으면 가짜 이름이 SHXK로 전송될 수 있었다.  
**요구사항(JSJung 2026-11-12)**: `consignee_name` ← `recipient_name`(수취인 성명) 고정, 기본값 없음. 빈 값은 `validateShxkPayload()`의 `'수취인 성명 누락'` 사전검증이 SHXK 호출 전에 차단.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-346-1 | `recipient_name=''` 로 `buildCreateOrderPayload()` 호출 | `consignee.consignee_name === ''` (`toBe`, 폴백 없음) | `tests/unit/ups/ups-labels-mapping.test.ts` |
| TC-346-2 | TC-346-1 payload를 `validateShxkPayload()`에 통과 | `errors` 배열 `toEqual(['수취인 성명 누락'])` — 다른 오류 없이 단일 차단 | 동일 |
| TC-346-3 | `recipient_name='John Doe'` 정상값 | `consignee_name='John Doe'` + `validateShxkPayload()` `toEqual([])` | 동일 |
| TC-346-GREP | 폴백 문자열 잔존 점검 | `grep -rn "E2E Consignee" src tests` 0건 | - |
| TC-346-RST | 되돌리기 검증: `consignee_name` 폴백 원복 | TC-346-1/2 FAIL — 전체 **2 failed / 40 passed** (`expected 'E2E Consignee' to be ''`, `expected [] to deeply equal [ '수취인 성명 누락' ]`) | 동일 |

## 79. 전화번호 입력 안내문구 +숫자 외 입력 차단 (Issue #1279 / TASK-B-347)

**2026-11-13, Mike** — 공용 `PhoneInput` 컴포넌트(`src/components/ui/PhoneInput.tsx`)로 전화 입력 통일(정규화 + maxLength + i18n 안내문구), 로케일 키 4개(ko/en/zh/ja) 추가, 갭 지점(주소록·회원정보·픽업 연락처·대행사 화주 담당 전화) 적용, 서버 zod/정규화 보강.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-347-1 | PhoneInput 정규화(키보드·붙여넣기 공통 onChange 경로) + onChange 위임 + maxLength/inputMode | `"010-1234 5678"` → `01012345678`, 문자·특수기호·한글 제거, onChange 호출 시점 value 이미 정제, maxLength=15·inputMode=numeric | `tests/unit/components/phone-input.test.tsx` |
| TC-347-2 | 안내문구 i18n 보간 렌더 (ko 실제 messages) | `Common.phoneHelp`가 `{max}`=15로 보간 표시 / `Common.phoneHelpHyphen` 표시 / `showHelp=false`면 미표시 | 동일 |
| TC-347-3 | allowHyphens 변형 (픽업 연락처 E2E 계약) | `032-111-2222` 하이픈째 보존, 문자·특수기호만 제거, inputMode=numeric 미설정 | 동일 |
| TC-347-4 | i18n 키 4개 로케일 실재 (ko/en/zh/ja) | `Common.phoneHelp`·`Common.phoneHelpHyphen`(둘 다 `{max}` 보유)·`AgencyShippers.form_contact_phone_help` 존재 | 동일 |
| TC-347-5 | 서버 zod `pickup_contact_tel` (PICKUP일 때만 형식 검증) | 하이픈 표기 통과+값 불변 / 문자 포함·숫자 16자리 실패 시 `path=['pickup_contact_tel']` | 동일 |
| TC-347-6 | 서버 zod 주소록 전화 정규화 (`addressBookEntrySchema`) | 레거시 하이픈·문자 혼입값도 저장 시숫자만(정규화, 거부 아님) | 동일 |
| TC-347-7 | `normalizePhoneDigits` 서버측 정규화 헬퍼 | `"010-1234 5678"`→`01012345678`, 16자리→15자리 절단, `(02)1234-5678`→`0212345678` | 동일 |
| TC-347-8 | 주소록 연락처 PhoneInput 적용 | maxLength=15·inputMode=numeric·안내문구 렌더, 입력 정규화, 수정 진입 시 레거시 `010-1111` → `0101111` | `tests/unit/address-book/AddressBookClient.test.tsx` |

**회귀 검증 (2026-11-13)**: `npm run test:regression` **237 test files / 1,714 tests 전부 PASS** (rebase 후 `origin/TeamB_Dev` 최신 포함 재실행 기준).
**되돌리기 검증 (테스트 유효성)**: 구현(`src`+`messages`) `git stash` 시 신규·관련 테스트 **3 files / 5 tests FAIL** → 복구 시 전부 PASS — 테스트가 실제 구현을 검증함을 확인.

## 80. 아이템 Packing Unit 저장 정합성 실DB 검증 (Issue #1281 / TASK-B-349)

**2026-11-13, Mike** — `item_packing_unit`이 등록(RPC) → 저장 → 수정화면 복원 → 수정 저장 → SHXK `unit_code` 전송 전 구간에서 유지되는지 **실DB 왕복 검증**(로컬 Supabase R-14: 서버 액션·RPC 실제 실행 + psql 직접 SELECT, 모의 금지). **src 수정 없는 검증 전용 Task — 불일치 발견되지 않음(의심 지점 (a)~(d) 모두 문제 없음, 판정은 task file).**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-349-01 | 신규 등록 `create_order_atomic`(실RPC) — 아이템3개 상이 단위(PCE/SET/KG) | `zen_order_items.item_packing_unit`이 아이템별로 정확히 일치 (의심지역 (d) jsonb 키 매핑 포함) | `tests/integration/task-b349-item-packing-unit.test.ts` |
| TC-349-02 | 수정 경로 `updateOrder` → `insertItems` | 단위 보존(SET→SET) + 단위 변경(PCE→MTR)이 DB에 반영 | 동일 |
| TC-349-03 | 수정화면 복원 `buildOrderEditDefaults`(실DB 행 입력) | 저장값 그대로 복원(EA/PCS/CTN 보존), 널만 PCE 폴백; 옵션 목록에 EA·PCS 포함·CTN 부재 단언 (의심지역 (b)(c) 근거) | 동일 |
| TC-349-04 | SHXK 전송 `buildInvoiceFromItems`(실DB 행 입력) | `unit_code` = 선택값(PCE/SET/KG), 목록 밖 `CTN`→`PCE` 폴백·목록 내 `EA`→`EA` 현행 동작 고정 | 동일 |
| TC-349-05 | 패키지 `packing_unit`(BOX) ↔ 아이템 단위 | 등록·수정 후 패키지 BOX 유지 + 아이템 단위 불변 — 상호 덮어쓰기 없음 (의심지역 (a)) | 동일 |

**회귀 검증 (2026-11-13)**: `npm run test:regression` **238 test files / 1,719 tests 전부 PASS** (378초).
**되돌리기 검증 (테스트 유효성)**:
- (A) RPC 마이그레이션 `20260816110000_task_b305_create_order_atomic_v6.sql`의 `item_packing_unit` insert 컬럼·값 제거 + `supabase db reset` → **4 failed / 1 passed** (TC-349-01·03·04·05 FAIL) → `git checkout --` 복구 + reset 후 5/5 PASS.
- (B) `src/app/actions/operations/orders.ts:433` itemsToInsert의 `item_packing_unit` 라인 제거 → **2 failed / 3 passed** (TC-349-02·05 FAIL) → `git checkout --` 복구 후 5/5 PASS.
- 각 복구 후 `git diff --stat`에 의도치 않은 변경 0건 확인.

## 81. UPS/SHXK 주소 AddressLine 길이 사전검증 (Issue #1270 / TASK-B-344)

**2026-11-13, Mike** — `shipper_street`·`consignee_street`가 UPS AddressLine 한도를 넘으면 SHXK 호출 **이전에** 한글 오류로 차단. 한도는 Jaison 확정 잠정값(`SHIPPER_STREET_MAX=70` ShipFrom 2줄×35 / `CONSIGNEE_STREET_MAX=105` ShipTo 3줄×35 **가정** — ShipTo 실패 실측 없음). 검사는 **조립·쉼표 치환 후 최종 전송 문자열 `.length`** 기준.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-344-1 | shipper_street 경계 — `validateShxkPayload` 실제 호출 | 70자 `toEqual([])` / 71자 `toEqual(['발송인 주소가 너무 깁니다(현재 71자, 최대 70자) — 상세주소를 줄여 주세요'])` | `tests/unit/shxk/task-b344-address-line-length.test.ts` |
| TC-344-2 | consignee_street 경계 | 105자 통과 / 106자 한글 오류 (`toEqual`) | 동일 |
| TC-344-3 | DEF-B-146 실측 fixture — **실제 `.length` 87/58/49** (문서 표기 88/61 아님) | 87자 shipper 차단(실패 재현) / 58자·49자 통과 / 87자 consignee는 통과(105 잠정값 비차단 고정) | 동일 |
| TC-344-4 | 빈 주소 — 기존 누락 검사와 중복 없음 | `toEqual(['발송인 주소 누락'])` · `toEqual(['수취인 주소 누락'])` 단독 | 동일 |
| TC-344-5 | 통합 `buildCreateOrderPayload` → `validateShxkPayload` (조립 후 길이 판정) | 도로명 세그먼트 추출·쉼표 치환 후 한도 초과 시 발송인→수취인 순서 `toEqual`로 차단 / 한도 이내 `toEqual([])` | 동일 |

**회귀 검증 (2026-11-13)**: `npm run test:regression` **239 test files / 1,734 tests 전부 PASS** (487초, db freshness OK).
**되돌리기 검증 (테스트 유효성)**: `validate-payload.ts`의 `checkStreetLength` 호출 2줄 제거 → **4 failed / 11 passed** (TC-344-1 71자·TC-344-2 106자·TC-344-3 87자·TC-344-5 통합 FAIL) → 복구 후 **15/15 PASS**.
**실패 관측성**: `placeShxkOrder`의 사전검증 실패 분기에 `logger.warn` 1줄 추가(`ups-labels.ts:262`) — 추가 전에는 오류 반환만 존재(로그 없음).
## 82. 서버 액션 오류 로케일 인프라 + 파일럿 (Issue #1292 / TASK-B-350)

**2026-11-13, Dave** — 부모 #1280 설계 확정안(안 ②)의 1단계(PR ①-a). `messages/{ko,en,zh,ja}.json`에 **`Errors` 네임스페이스**(ko 기준 15키, 4개 로케일 동일 세트)를 신설하고, 서버 액션이 `trError()`로 현재 로케일 문장을 반환하도록 인프라를 깔았다. **파일럿 1건**: `payInvoiceFromWallet()`의 `INSUFFICIENT_BALANCE` 코드 문자열 노출 제거(`PaymentModal.tsx` 무수정). UPS/SHXK/창고 액션 일괄 적용(①-b)은 범위 외.

**로케일 해석 실증(2026-11-13, 로컬 dev + Supabase)**: 임시 Server Action POST를 `/ko`·`/en`·`/zh`·`/ja`에서 실행 → 각각 해당 로케일 문구 반환(`npm run dev -p 3100`, Next.js 16.2.4). 상세 원문은 task file §2.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-350-01 | `Errors` 키 집합 4개 로케일 동기화 | ko 기준 15키와 en/zh/ja 키 집합 완전 일치(`toEqual`), 누락·추가 모두 FAIL | `tests/unit/i18n/errors-key-sync.test.ts` |
| TC-350-02 | `Errors` 값 비어 있음 차단 | 4개 로케일 전 키가 truthy string | 동일 |
| TC-350-03 | ICU 플레이스홀더 동기화 | `{code}`·`{fields}` 등 키별 플레이스홀더 이름 집합이 ko와 동일 | 동일 |
| TC-350-04 | 파일럿: 지갑 결제 잔액 부족 | `error`가 `INSUFFICIENT_BALANCE`가 아니라 현재 로케일(ko) 문장 `잔액이 부족합니다.` | `tests/unit/finance/wallet.test.ts` (WAL-04) |
| TC-350-05 | 테스트 중앙 mock이 실제 문구 반환 | `tests/setup.ts`의 `next-intl/server` mock이 `messages/ko.json` 실제 값을 ICU 치환해 반환(키 문자열 반환 금지) | `tests/setup.ts` |
| TC-350-RST-A | 키 동기화 되돌리기 | `en.Errors.insufficient_balance` 삭제 → **2 failed / 5 passed (7)** → 복구 후 7 passed | `tests/unit/i18n/errors-key-sync.test.ts` |
| TC-350-RST-B | 파일럿 되돌리기 | `wallet.ts`를 `error:'INSUFFICIENT_BALANCE'`로 원복 → **1 failed / 3 passed (4)** (`expected 'INSUFFICIENT_BALANCE' to be '잔액이 부족합니다.'`) → 복구 후 4 passed | `tests/unit/finance/wallet.test.ts` |

**회귀 검증 (2026-11-13, rebase 후 재실행)**: `npm run test:regression` **240 test files / 1,741 tests 전부 PASS** (TASK-B-344 §81 병합분 포함).

## 83. SHXK consignee_company — 수하인 회사명 전 구간 반영 (Issue #1278 / TASK-B-346, PR②)

**배경**: PR①에서 `consignee_name` 폴백을 제거한 데 이어, SHXK createorder `consignee.consignee_company`(수취인 회사명, 선택·최대 200자)에 대응하는 입력이 전무했다. JSJung 결정(2026-11-12): 하우스 입력 "회사명" 1개를 `consignee_company`로 전송. 별도 "담당자" 필드는 만들지 않으며(`recipient_name`이 담당자 역할), 레거시 `recipient_contact`는 미사용.
**범위**: DB 컬럼 `zen_orders.recipient_company` + RPC `create_order_atomic` v7 + 앱 레이어(입력 UI·zod·수정 복원·edit-log·SHXK payload) 전 구간. 주소록(`zen_address_book`)에는 회사명 컬럼이 없어 주소록 선택 시 회사명을 비운다(후속 개선 후보).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-346-01 | 신규 등록 — 실DB RPC v7 `recipient_company` 저장 | `createOrder({recipient_company:'Acme Trading Co'})` → 실DB `zen_orders.recipient_company` `toBe('Acme Trading Co')` | `tests/integration/task-b346-recipient-company.test.ts` |
| TC-346-02 | 신규 등록 미입력(키 생략) | 실DB 값 `toBeNull()` (빈 문자열 아님) | 동일 |
| TC-346-03 | 수정 경로(`updateOrder`→`updateHeader`) | `'First Co'`→`'Second Co'` 반영, 빈 값 저장 시 `''` (실DB SELECT) | 동일 |
| TC-346-04 | 수정화면 복원 `buildOrderEditDefaults` | 실DB 행 → `recipient_company` `toBe('Restore Me Ltd')` | 동일 |
| TC-346-05 | SHXK 전송 `buildCreateOrderPayload` | 실DB 값 → `consignee.consignee_company` `toBe('Acme Trading Co')` / 미입력 시 `not.toHaveProperty('consignee_company')` | 동일 |
| TC-346-06 | payload 매핑(단위) — 입력 시 전송 + 사전검증 통과 | `consignee_company` `toBe('Acme Trading Co')`, `validateShxkPayload` `toEqual([])` | `tests/unit/ups/ups-labels-mapping.test.ts` |
| TC-346-07 | payload 매핑(단위) — 미입력/빈 문자열 | `not.toHaveProperty('consignee_company')` (키 자체 생략) | 동일 |
| TC-346-08 | payload 매핑(단위) — 쉼표 치환 | `'Acme, Inc.'` → `'Acme Inc.'` | 동일 |
| TC-346-09 | 사전검증 경계 — `validateShxkPayload` | 미입력 `toEqual([])` / 200자 `toEqual([])` / 201자 `toEqual(['수취인 회사명 200자 초과'])` 단일 오류 | `tests/unit/shxk/validate-payload-limits.test.ts` |
| TC-346-10 | zod 경계 — `orderRegistrationSchema` | 미입력 `success=true` / 200자 `true` / 201자 `false`(path `recipient_company`) | `tests/unit/orders/shxk-field-limits.test.ts` |
| TC-346-11 | 수정화면 복원(단위) — 저장값/null | `'Acme Trading Co'` 보존 / null·undefined → `''` | `tests/unit/orders/edit-defaults.test.ts` |

**회귀 검증 (2026-11-13, `origin/TeamB_Dev` rebase 후 재실행)**: `npm run test:regression` **241 test files / 1,758 tests 전부 PASS** (485초). `npm run build` **EXIT=0**.
**되돌리기 검증 (테스트 유효성)**:
- (A) RPC v7에서 `recipient_company` insert 컬럼·값 2줄 주석 처리 + `npx supabase db reset` → **TC-346-01 FAIL** (`expected null to be 'Acme Trading Co'`) → 복구 후 **5/5 PASS**.
- (B) `orders.ts` `headerData`의 `recipient_company` 제거 → **TC-346-03 FAIL** (`expected 'First Co' to be 'Second Co'`) → 복구 후 PASS.
**명세 동기화**: `docs/02_Analysis/Ds_11_API_상세_명세서.md` `createOrder` 절에 수하인 필드 매핑표 + `recipient_company` 컬럼·RPC v7 기재(R-11/R-12).

## 84. ups-labels 사용자 오류 로케일 전환 + SHXK 4개 로케일 사전 (Issue #1299 / TASK-B-351)

**2026-11-13, Dave** — 부모 #1280(안 ②)의 2단계. `src/app/actions/operations/ups-labels.ts`에서 **사용자에게 반환되는 오류를 전부 현재 로케일 문장**으로 전환했다(`trError()`). SHXK 응답 원문·DB 오류 원문·예외 `err.message`는 사용자 반환값에 넣지 않고 `logger`(및 `zen_ups_label_errors` INSERT)에만 보존한다. `src/lib/shxk/translate.ts` 사전을 `{ko,en,zh,ja}`로 확장(zh=원문)하고, 실제 관측된 오류 문구 2건(`未找到订单信息`, `Invalid ShipFrom AddressLine3`)을 등재했다. `pickShxkLocaleText`의 ja가 en 대신 **ja 번역**을 쓰도록 변경.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-351-01 | SHXK 실측 중문 오류 매칭 → ko 문장 | `registerUpsOrder` 반환 `error === '주문 정보를 찾을 수 없습니다'`, 원문 미포함 | `tests/unit/ups/task-b351-error-locale.test.ts` |
| TC-351-02 | SHXK 미매칭 원문 → 일반문구(코드) | `error === '…(코드: CREATEORDER)'`, 원문(`RAW_SERVER_DETAIL_9f3`) 미포함 | 동일 |
| TC-351-03 | SHXK 사전검증 실패 | `error`가 `SHXK 사전검증에 실패했습니다: …` + `createorder` 미호출 | 동일 |
| TC-351-04 | 예외 `err.message` 원문 은닉 | `error`는 `(코드: UNEXPECTED)`, 내부 토큰 미포함, `logger.error`가 Error 객체로 호출 | 동일 |
| TC-351-05 | DB 오류(`labelsErr.message`) 은닉 | `cancelUpsRegistration` `error`가 `(코드: LABEL_LOOKUP)`, DB 원문 미포함 | 동일 |
| TC-351-06 | `removeorder` 중문 오류 매칭 | `error === '주문 정보를 찾을 수 없습니다'`, 원문 미포함 | 동일 |
| TC-351-07 | `Errors` 4개 로케일 문장 반환 | `trError('shxk_generic',{code})` = ko/en/zh/ja 각각의 실제 문구, `{fields}` 치환 | `tests/unit/i18n/action-error.test.ts` |
| TC-351-08 | 로케일 폴백 | `getLocale()` 예외·미지원 로케일 → `ko` | 동일 |
| TC-351-09 | SHXK 사전 4개 로케일 | `translateShxkMessage` 2개 실측 문구 × 4개 로케일, 미매칭 → `null` | `tests/unit/shxk/translate.test.ts` |
| TC-351-10 | ja 표출 정합 | `pickShxkLocaleText('ja',…)` → 사전 ja(이전 en) | 동일, `tests/unit/tracking/defb060-tracking-list-locale.test.tsx` |
| TC-351-11 | `Errors` 키 동기화(21키) | ko 기준 21키 완전 일치 + ICU 파라미터 일치 | `tests/unit/i18n/errors-key-sync.test.ts` |
| TC-351-RST-A | SHXK 매칭 무력화(원문 반환) | **2 failed / 4 passed** → 복구 후 6 passed | `tests/unit/ups/task-b351-error-locale.test.ts` |
| TC-351-RST-B | `err.message` 반환 원복 | **1 failed / 5 passed** → 복구 후 6 passed | 동일 |

**회귀 검증 (2026-11-13, `origin/TeamB_Dev` rebase 후 재실행)**: `npm run test:regression` **243 test files / 1,776 tests 전부 PASS** (TASK-B-346 PR② §83 병합분 포함).

## 85. ups-actual-cost·charges·tracking 사용자 오류 로케일 전환 (Issue #1325 / TASK-B-352)

**2026-11-16, Dave** — 부모 #1280(안 ②)의 3단계. `src/app/actions/finance/ups-actual-cost.ts`·`ups-actual-charges.ts`·`src/app/actions/operations/tracking.ts`에서 **사용자 반환 오류를 현재 로케일 문장**으로 전환(`trError()`). DB 오류·예외 원문은 반환값에 넣지 않고 `logger.error(…, error객체)`에만 보존했다(#1183 처리). throw 13건은 **반환 전환 8건 / getter 계약 유지 5건**(컴포넌트 수정 금지 범위)으로 판정했고, getter 5건도 메시지는 로케일 문구다. SHXK 원문 패스스루는 3파일에 **없음(해당 없음)**. `Errors` 9키 추가(총 **30키**, 4개 로케일 동일 세트).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-352-01 | 원가 DB upsert 실패 | `error` = generic(ko)+`ACTUAL_COST_SAVE`, DB 원문 미포함, `logger.error(…, error객체)` | `tests/unit/finance/task-b352-error-locale.test.ts` |
| TC-352-02 | 부가요금 delete 실패 | `error` = generic(ko)+`CHARGES_DELETE`, 원문 미포함, logger 인자 검증 | 동일 |
| TC-352-03 | 수동 배송완료 상태 update 실패 | `error` = generic(ko)+`STATUS_UPDATE`, 원문 미포함, logger 인자 검증 | 동일 |
| TC-352-04 | getter 조회 실패(throw) | throw 메시지가 generic(ko)+`ACTUAL_COST_LOOKUP`, 원문 미포함 | 동일 |
| TC-352-05 | 신규 키 4개 로케일 문구 | `not_ups_order`·`ups_actual_charge_status_invalid`·`manual_reason_required` 각 ko/en/zh/ja 실제 문장 | `tests/unit/i18n/task-b352-locale.test.ts` |
| TC-352-06 | 상태/권한/스코프 문구 | `recordUpsActualCost`·`recordUpsActualCharges` 대표 실패가 ko 문장(`toBe`) | PR-4a에서 제거(옛 경로), `ups-actual-charges.test.ts` |
| TC-352-07 | 케이스별 기대값 | `billing_finalize_status_invalid`·`shipper_scope_denied`·`label_not_found` `toBe` | `ups-actual-cost.test.ts`, `ups-order-detail-status.test.ts` |
| TC-352-08 | 하위 조정 실패 원문 은닉 | generic(ko)+`POST_FINALIZATION_ADJUST` | PR-4a에서 제거(옛 경로) |
| TC-352-09 | 트래킹 이벤트 INSERT 실패 | throw 아님 — `{success:false,error:generic(ko)+TRACKING_EVENT_SAVE}` | `tests/unit/operations/tracking-actions.test.ts` |
| TC-352-10 | `Errors` 키 동기화(30키) | ko 기준 30키 완전 일치 + ICU 파라미터 일치 | `tests/unit/i18n/errors-key-sync.test.ts` |
| TC-352-RST-A | DB 원문 은닉 되돌리기 | **1 failed / 3 passed** → 복구 4 passed | `task-b352-error-locale.test.ts` |
| TC-352-RST-B | 관측성 로그 1줄 제거 | **1 failed / 3 passed** → 복구 4 passed | 동일 |

**회귀 검증 (2026-11-16, 재작업 후 재실행)**: `npm run test:regression` **256 test files / 1,851 tests 전부 PASS**. `npm run build` **EXIT=0**.

## 86. SHXK consignee 전체 매핑 감사 + 명세 상한 보완 + 회사명 공백 정규화 (Issue #1278 / TASK-B-346, PR③)

**2026-11-16, Baker** — PR①(성명 폴백 제거)·PR②(회사명 전 구간)에 이어, SHXK createorder `consignee.*` 18개 필드(`docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 130~147행)를 현재 전송·검증 상태와 대조(감사)했다. **명세상 최대길이가 있으나 앱에 검증이 없던 7개 필드**(성명 200·국가코드 2·주/도 300·도시 300·우편번호 100·이메일 100·통관부호 50)를 폼(zod)·사전검증(`validateShxkPayload`)에 추가하고, **공백만 입력된 회사명이 `consignee_company: ''`로 전송되던 결함**을 수정했다. `street`(앱 105 < 명세 300)·`telephone`(앱 15 < 명세 100)은 앱이 명세보다 엄격하므로 의도적 갭 아님으로 판정. 명세에 있으나 **미전송인 8개 필드**(district·doorplate·areacode·mobile·fax·certificatetype·certificatecode·credentials_period)는 신규 컬럼·UI가 필요해 구현하지 않고 결정 요청(IMP-191)으로 보고한다. **UI 변경 없음.**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-346-12 | 성명 상한 사전검증 경계 | 200자 `toEqual([])` / 201자 `toEqual(['수취인 성명 200자 초과'])` | `tests/unit/shxk/validate-payload-limits.test.ts` |
| TC-346-13 | 국가코드 상한 사전검증 경계 | 2자 `toEqual([])` / 3자 `toEqual(['수취인 국가코드 2자 초과'])` | 동일 |
| TC-346-14 | 주/도 상한 사전검증 경계 | 300자 `toEqual([])` / 301자 `toEqual(['수취인 주/도 300자 초과'])` | 동일 |
| TC-346-15 | 도시 상한 사전검증 경계 | 300자 `toEqual([])` / 301자 `toEqual(['수취인 도시 300자 초과'])` | 동일 |
| TC-346-16 | 우편번호 상한 사전검증 경계 | 100자 `toEqual([])` / 101자 `toEqual(['수취인 우편번호 100자 초과'])` | 동일 |
| TC-346-17 | 이메일 상한 사전검증 경계 | 100자 `toEqual([])` / 101자 `toEqual(['수취인 이메일 100자 초과'])` | 동일 |
| TC-346-18 | 통관부호 상한 사전검증 경계 | 50자 `toEqual([])` / 51자 `toEqual(['수취인 통관부호 50자 초과'])` | 동일 |
| TC-346-19 | 성명·주/도·도시·우편번호·통관부호 zod 경계 | N자 `success=true` / N+1자 `success=false`(path 일치) | `tests/unit/orders/shxk-field-limits.test.ts` |
| TC-346-20 | 이메일 zod 경계 | 100자(유효 이메일) `success=true` / 101자 `success=false`(path `recipient_email`) | 동일 |
| TC-346-21 | 공백만 회사명 미전송 | `recipient_company:'  '` → `not.toHaveProperty('consignee_company')` | `tests/unit/ups/ups-labels-mapping.test.ts` |
| TC-346-22 | 회사명 앞뒤 공백 trim | `'  Acme Trading Co  '` → `toBe('Acme Trading Co')` | 동일 |
| TC-346-RST-A | `checkConsigneeMaxLengths` 호출 제거 | **7 failed / 15 passed** → 복구 후 22 passed | `tests/unit/shxk/validate-payload-limits.test.ts` |
| TC-346-RST-B | 회사명 공백 정규화 원복(truthiness 스프레드) | **1 failed / 47 passed** → 복구 후 48 passed | `tests/unit/ups/ups-labels-mapping.test.ts` |

**회귀 검증 (2026-11-16, `origin/TeamB_Dev` rebase 후 재실행)**: `npm run test:regression` **254 test files / 1,862 tests 전부 PASS** (401초). `npm run build` **EXIT=0**.
**명세 동기화**: `docs/02_Analysis/Ds_11_API_상세_명세서.md` `createOrder` 절 수하인 매핑표에 명세 상한·미전송 8개 필드 기재(R-11/R-12). `npm run check:ds11` → `액션 함수 298개 | Ds-11 언급 92개 | 미반영 206개 (허용 목록 206개)` OK.
**결정 요청**: 미전송 8개 필드는 Issue #1278 PR③ 코멘트의 결정 요청 표 + `scratch/post_launch_improvements.md` IMP-191 참조.
## 87. warehouse 오류 메시지 로케일 전환 (Issue #1328 / TASK-B-353, 부모 #1280)

**2026-11-16, Mike** — `warehouse.ts`(throw55 + 반환 리터럴3)와 창고 화면5개(`err.message` 노출23행 · 리터럴 toast4 · 컴포넌트 내부 throw3)의 사용자 노출 오류를 현재 로케일 문장으로 전환. B-351/B-352와 동일 방식(`trError()` + `Errors` 키 재사용, `withAction()` 미사용), **throw→반환 전환 0건**(B-352 `addTrackingEvent` 선례 + `confirmPickup`/`cancelPickup` fire-and-forget 호출자 존재 → 반환 전환 시 성공 토스트 회귀).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-353-1 | (a) 대표 실패3경로의 ko 문장·영문 원문 미포함 | profile 없음 → `toBe('사용자 프로필을 찾을 수 없습니다.')` + `not.toBe('User profile not found')` / 조회 실패 → `toBe('데이터를 불러오지 못했습니다…')` + `not.toBe('Failed to fetch ups label errors')` / 상태 불일치 → `toBe('WAREHOUSED 상태의 오더만 UPS 등록할 수 있습니다.')` | `tests/unit/warehouse/task-b353-error-locale.test.ts` |
| TC-353-2 | (b) 호출자 계약 고정 | throw 유지(`confirmPickup`, 호출자 catch-only·await뒤 성공토스트) → `rejects` 없이 message `toBe('권한이 없습니다.')` + `updateOrderStatus` 미호출 / 기존 반환(`undoDeparture`) → `{success:false, error:'오더를 찾을 수 없습니다.'}` | 동일 |
| TC-353-3 | (c) 4개 로케일(ko/en/zh/ja) 대표 키4종 | `Errors.fetch_failed`·`status_ups_register`·`own_shipper_only`, `WarehouseInbound.measurements_saved` 존재·비어 있지 않음 + ko≠en 문구 차이 | 동일 |
| TC-353-4 | (d) logger 인자 | `toHaveBeenCalledWith('undoDeparture: order not found (order-x)')` · `toHaveBeenCalledWith('confirmUpsRegistration: passthrough failure', 'DB down raw')` | 동일 |

**회귀 검증 (2026-11-16, `origin/TeamB_Dev` rebase 후 재실행)**: `npm run test:regression` **257 test files / 1,891 tests 전부 PASS** (437초) · `npm run build` **EXIT=0**. (rebase 전 자체 실행: 255/1,846 PASS)
**되돌리기 검증 (테스트 유효성)**: `confirmPickup`의 throw를 반환으로 임시 전환(B-352 회귀 시뮬레이션) → **1 failed / 11 passed** (TC-353-2 reject 계약 FAIL: "expected the action to reject but it resolved") → 복구 후 **12/12 PASS**.
**기존 테스트 갱신 (약화 없이, 사유 포함)**:
- `defb047-get-latest-ups-label-errors.test.ts:126` — `toThrow('Failed to fetch ups label errors')` → ko 문구 (영문 리터럴 → 로케일 전환에 따른 정확문자열 갱신).
- `warehouse-actions.test.ts:5`·`departure-actions.test.ts:5` — `next-intl/server`의 **키-통과 스텁**(`getTranslations`가 키를 그대로 반환)을 **실 ko 메시지 반환**으로 교체 (스텁 때문에 `trError`가 키명을 만들던 것 — 문구 자체는 약화 없음).

## 88. settlement·orders + 청구/주문/UPS 화면 오류 로케일 전환 (Issue #1330 / TASK-B-354)

**2026-11-17, Dave** — 부모 #1280(안 ②)의 4단계. `src/app/actions/finance/settlement.ts`·`src/app/actions/operations/orders.ts`의 사용자 도달 오류를 **현재 로케일 문장**으로 전환(`trError()`), 대상 클라이언트 15파일의 `err.message` 직노출을 `console.error` + `Errors.generic`(+코드)로 대체했다. 기존 `Errors` 40키를 우선 재사용하고 **18키 추가(총 58키, 4개 로케일 동일 세트)**. throw는 호출자 판단표에 따라 **전부 유지**(호출자가 catch로만 처리하는 곳에서 반환 전환 금지 — B-352 반려 사례), DB/시스템 실패는 `generic`+`{code}` + `logger.error(…, error객체)`.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-354-01 | `finalizeInvoice` 인보이스 없음 | `{success:false,error:'인보이스를 찾을 수 없습니다.'}` + `logger.warn` | `tests/unit/finance/task-b354-error-locale.test.ts` |
| TC-354-02 | `getOrganizations` DB 오류 | throw가 generic(ko)+`ORGANIZATION_LOOKUP`, DB 원문 미포함, `logger.error(…, error객체)` | 동일 |
| TC-354-03 | `updateOrder` 수정 불가 상태 | **reject**(반환 아님) + 정확 ko 문장(`{status}` 치환) | 동일 |
| TC-354-04 | 신규 키 4개 로케일 | `invoice_not_found`·`order_edit_status_invalid`·`ups_edit_registered_locked` ko/en/zh/ja (en 단언 포함) | `tests/unit/i18n/task-b354-locale.test.ts` |
| TC-354-05 | 정산 권한/스코프 | 권한·화주 스코프 문구 `toBe` | `tests/unit/finance/agency-settlement-permission.test.ts` |
| TC-354-06 | 오더 상태/수정 잠금 | 상태 전이 거부·수정 잠금 문구 | `tests/unit/logistics/order-status.test.ts`, `order-update.test.ts`, `order-update-b339.test.ts` |
| TC-354-07 | 마스터 오더 오류 | 생성/해체/조회 문구 | `tests/unit/master/master-actions.test.ts`, `master-detail.test.ts` |
| TC-354-08 | 바코드 조회 DB 오류 | generic(ko)+`ORDER_BARCODE_LOOKUP` | `tests/unit/logistics/inbound.test.ts` |
| TC-354-09 | 클라이언트 훅 도입 대응 | `next-intl` mock 추가 후 렌더 PASS | `tests/unit/orders/ups-detail-b301.test.tsx`, `ups-detail-edit-button.test.tsx`, `tests/unit/ups/ups-stepper-b304.test.tsx` |
| TC-354-10 | `Errors` 키 동기화(58키) | ko 기준 58키 완전 일치 + ICU 파라미터 일치 | `tests/unit/i18n/errors-key-sync.test.ts` |
| TC-354-RST | DB 원문 은닉 되돌리기 | `getOrganizations` 원문 반환으로 원복 → **1 failed / 2 passed** → 복구 3 passed | `tests/unit/finance/task-b354-error-locale.test.ts` |

**회귀 검증 (2026-11-17)**: `npm run test:regression` **259 test files / 1,904 tests 전부 PASS**. `npm run build` **EXIT=0**.

## 89. 인증·회원·VOC·지원 액션 + 인증/마이페이지/관리 화면 오류 로케일 전환 (Issue #1331 / TASK-B-355, 부모 #1280)

**2026-11-17, Mike** — 서버5종(`admin/auth.ts`·`admin/member.ts`·`misc/voc.ts`·`misc/support.ts`·`misc/monitoring.ts`)의 throw55·raw 반환을 `trError`로 전환(**56건**) + 인증/마이페이지/관리 화면 **24파일**의 `err.message` 노출·한/영 리터럴 제거. B-351/352/353과 동일 방식(`trError`+`Errors` 키, `withAction` 미사용), **throw→반환 전환 0건**(호출자 판단표: 반환/withAction 계약은 기존 구조 유지, message만 교체). `withAction` 래퍼7곳은 wrapper가 raw를 `logger.error`로 보존하면서 `err.message`를 **데이터로 반환**하므로 메시지 교체로 로케일이 도달함을 실측.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-355-1 | (a) 대표 실패2경로 — ko 문장 + 영문/원문 미노출 | createQna(profile 없음) → `rejects.toThrow('사용자 프로필을 찾을 수 없습니다.')` + `not.toBe('User profile not found')` / findPersonalId(DB 예외) → `toHaveProperty('error','서버 내부 오류가 발생했습니다.')` + Supabase 원문(`RAW_SUPABASE_SECRET_XYZ`) 미포함 | `tests/unit/i18n/task-b355-error-locale.test.ts` |
| TC-355-2 | (b) 호출자 계약 3종 | throw 유지(createQna) = reject / 반환(findPersonalId) = `{error: ko}`·`not.toHaveProperty('success')` / withAction(createVoc) = `{data:null, error:'…(코드: VOC_VALIDATION)'}` | 동일 |
| TC-355-3 | (c) 4로케일 키 + **보안 문구 원문1:1** + **EN 단언**(B-353 리뷰 지적 반영) | 키4종 실재 / ko `current_password_incorrect`=`'현재 비밀번호가 올바르지 않습니다.'`·`find_member_not_found` 원문 동일 / en `permission_denied`=`'You do not have permission.'`·`fetch_failed`·`current_password_incorrect` 정확 + ko≠en | 동일 |
| TC-355-4 | (d) logger 인자 — 원문 객체 보존 | `toHaveBeenCalledWith('[AUTH_ACTION] findPersonalId catch:', rawError)` / `'[MEMBER_ACTION] withdrawUser Error:', objectContaining({message:'DB Error'})` + 전달 인자가 `typeof object` | 동일 |

**회귀 검증 (2026-11-17)**: `npm run test:regression` **260 test files / 1,917 tests 전부 PASS** (462초) · `npm run build` **EXIT=0** · `check-db-freshness` OK.
**되돌리기 검증 (테스트 유효성)**: support `createQna`의 profile throw를 영문 원문으로 임시 복원 → **2 failed / 11 passed** (TC-355-1·2 FAIL) → 복구 후 **13/13 PASS**.
**기존 테스트 갱신 (약화 없이, 사유)**:
- `tests/unit/logistics/voc.test.ts:109` — `toContain('UNAUTHORIZED')` → `toBe('권한이 없습니다.')` (원문 영문 → 로케일 전환 + 부분매칭→정확문칭 **강화**).
- `tests/unit/member/profile.test.ts:62` — `'탈퇴 처리 중 오류가 발생했습니다.'` → `'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: WITHDRAW)'` (반환 메시지가 generic+코드로 전환됨에 따른 정확문자열 갱신).
- `tests/unit/i18n/errors-key-sync.test.ts` — baseline 배열 58→80키로 재생성(ko.json 실측 합집합, `Errors` 4로케일 동기화 규칙).

## 90. 로그인/가입 + 잔여 액션 + alert/showToast 화면 오류 로케일 전환 (Issue #1334 / TASK-B-356)

**2026-11-17, Dave** — 부모 #1280 마무리 단계. `login/actions.ts`의 인증 오류(영문·`error.message` 직반환)를 **로케일 문장**으로 수렴(계정 존재 여부 비구분 유지), 잔여 액션 5파일(`daily-billing`·`inventory`·`notifications`·`invoice`·`organization`)의 사용자 도달 원문을 `generic`+코드로 대체, `alert`/`showToast` 화면 11파일 22지점의 `err.message` 직노출을 `console.error` + `Errors.generic`(+코드)로 전환했다. `Errors` **10키 추가(총 90키, 4개 로케일 동일 세트)**. `alert()`는 toast로 바꾸지 않고 문구만 로케일화(지시).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-356-01 | 로그인 `Invalid login credentials` | `error` = `이메일 또는 비밀번호가 올바르지 않습니다.`, 원문 미포함, `logger.error` 원문 기록 | `tests/unit/auth/task-b356-login-locale.test.ts` |
| TC-356-02 | 로그인 en 로케일 | `The email or password is incorrect.` (en 단언) | 동일 |
| TC-356-03 | 이메일 미인증 로그인 | 기존 구분 유지 + 로케일 문구 | 동일 |
| TC-356-04 | 알 수 없는 로그인 오류 | `로그인 중 오류가 발생했습니다…` (원문 미노출) | 동일 |
| TC-356-05 | 회원가입 이미 가입된 이메일 | `이미 가입된 이메일입니다. 로그인해 주세요.` | 동일 |
| TC-356-06 | 회원가입 비밀번호 정책 위반 | `비밀번호가 보안 정책을 충족하지 않습니다.` (원문 미노출) | 동일 |
| TC-356-07 | 재고 조정 검증 | `재고 수량은 0 미만이 될 수 없습니다.` 반환(원문 미포함) | `tests/unit/logistics/inventory.test.ts` |
| TC-356-08 | 문서 오더 조회 실패 | `오더를 찾을 수 없습니다.` / generic(ko)+`ORDER_LOOKUP` | `tests/unit/documents/document-actions.test.ts` |
| TC-356-09 | `alert`/`showToast` 화면 | `next-intl` mock 추가 후 렌더 PASS | `tests/unit/ups/ups-rates-client-pivot.test.tsx` 등 |
| TC-356-10 | `Errors` 키 동기화(90키) | ko 기준 90키 완전 일치 + ICU 파라미터 일치 | `tests/unit/i18n/errors-key-sync.test.ts` |
| TC-356-RST | 로그인 원문 복귀 되돌리기 | `error.message` 직반환으로 원복 → **4 failed / 2 passed** → 복구 6 passed | `tests/unit/auth/task-b356-login-locale.test.ts` |

**회귀 검증 (2026-11-17)**: `npm run test:regression` **261 test files / 1,923 tests 전부 PASS**. `npm run build` **EXIT=0**.

## 91. xlsx 0.20.3 벤더링 + `sheet_to_json` 기본 동작 회귀 (Issue #1339 / TASK-1157, DEF-146 P1)

**2026-11-17, D_Kai** — `xlsx@0.18.5`(프로토타입 오염 <0.19.3, ReDoS <0.20.2)는 npm 레지스트리에 수정판이 없어, SheetJS 공식 CDN 의 **0.20.3 tarball 을 `vendor/xlsx-0.20.3.tgz` 로 커밋**하고 `"xlsx": "file:vendor/xlsx-0.20.3.tgz"` 로 고정했다. `npm audit --omit=dev` 는 `file:` 의존성을 검사하지 못하므로(사각지대) ① tarball SHA-256·lockfile integrity ② 설치 버전 하한 ③ **대량등록 파서가 쓰는 `read` + `sheet_to_json` 기본 옵션 동작**을 테스트로 잠갔다. 0.18.5↔0.20.3 실증 비교(R-06)에서는 날짜·숫자·빈 셀·수식·다중 시트가 **읽기/쓰기/`raw:false` 모두 동일**했고, 차이는 미사용 경로인 `cellDates:true` 의 UTC 해석뿐이었다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-1157-01 | 설치 버전이 취약점 수정판 이상 | `XLSX.version === '0.20.3'` (0.18.5 로 되돌리면 즉시 실패) | `tests/unit/excel/xlsx-vendor.test.ts` |
| TC-1157-02 | 벤더링 무결성 | `package.json` = `file:vendor/xlsx-0.20.3.tgz` · tarball SHA-256 = `.sha256` = `8dc73fc3…99fe8` · lockfile `integrity`(SRI) = tarball SHA-512 | 동일 |
| TC-1157-03 | `read` + `sheet_to_json` 기본 — 날짜/숫자/빈 셀 | 날짜 셀 serial `46037`(**number**, Date/문자열 아님) · 수량 `10`/`0` number · 명시적 빈 셀 `''` · 미존재 셀은 키 생략 | 동일 |
| TC-1157-04 | `raw:false` 포맷 문자열 | 날짜 `1/15/26`·`3/1/26`, 숫자 `'10'`·`'1234.56'` (0.20.1 UTC 변경 영향 없음 고정) | 동일 |
| TC-1157-05 | 다중 시트 보존 | `SheetNames` = `['오더','패키지','아이템']` + 시트별 파싱 값 일치 | 동일 |

**회귀 검증 (2026-11-17)**: `npm run test:regression` **262 test files / 1,928 tests 전부 PASS**. `npm run build` **EXIT=0**. `npm run check:vendor` 통과(SHA-256·버전 하한·Dockerfile `COPY vendor`·README). `npm run check:audit` 신규 0건(baseline `xlsx:high` 제거).

## 92. 유지보수 모드 라우트 이동 + 리다이렉트 루프 방지 (Issue #1337 / TASK-1155, DEF-148)

**2026-11-18, D_Kai** — 점검 페이지가 라우트 그룹 `src/app/[locale]/(maintenance)/page.tsx` 에 있어 실제 경로가 `/[locale]` 이었고, 프록시(`src/lib/auth/proxy.ts`)가 안내하는 `/{locale}/maintenance` 는 **404** 였다. 페이지를 `src/app/[locale]/maintenance/page.tsx` 로 이동하고, 리다이렉트 대상 경로를 `DEFAULT_REDIRECTS.MAINTENANCE` 상수로 고정했다. 아울러 점검 안내 페이지가 소속(`orgType`)·`PENDING`·`SUSPENDED` 가드보다 우선하도록 조기 반환을 추가해 **무한 리다이렉트 루프**를 차단했다(기존에는 `/maintenance` 가 리다이렉트 대상에서만 제외되어, 안내 페이지 도착 후 소속 경로로 되돌려지는 루프가 가능한 구조였다).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-1155-01 | 리다이렉트 대상 상수 ↔ 실제 라우트 파일 | `DEFAULT_REDIRECTS.MAINTENANCE='/maintenance'`, `src/app/[locale]/maintenance/page.tsx` 존재, `(maintenance)` 그룹 부재 | `tests/unit/auth/maintenance-route.test.ts` |
| TC-1155-02 | 점검 모드 ON + 화주 `/ko/orders` | `/ko/maintenance` 로 리다이렉트 | 동일 |
| TC-1155-03 | 점검 모드 ON + 화주 `/ko/maintenance` | 리다이렉트 없음(`null`) — 루프 방지 | 동일 |
| TC-1155-04 | 점검 모드 ON + `PENDING` 화주 `/ko/maintenance` | 리다이렉트 없음 — `/register/pending` 왕복 루프 차단 | 동일 |
| TC-1155-05 | 점검 모드 ON + `SUSPENDED` 사용자 `/ko/maintenance` | 리다이렉트·세션종료 없음 — `/suspended` 왕복 루프 차단 | 동일 |
| TC-1155-06 | 점검 모드 ON + 플랫폼 관리자 `/ko/orders` | 정상 통과(`null`) | 동일 |
| TC-1155-07 | 점검 모드 ON + 화주 루트 `/ko` | 리다이렉트 없음(기존 동작 유지) | 동일 |


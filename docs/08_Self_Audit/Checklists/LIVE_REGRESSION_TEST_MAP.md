# 🗺️ LIVE Regression Test Master Map

> **총 테스트 케이스:** 460 Cases (vitest 개별 테스트 기준, 76 test files)
> **최종 검증일:** 2026-07-06 (GH#204 어드민 UI 요율 탭 추가 · TC-UPS-ADMIN-08~11 등재 · 454/454 PASS)  

제니스 플랫폼의 비즈니스 영속성을 보장하는 회귀 테스트 케이스의 통합 명세서입니다. 모든 신규 개발 및 수정 시 이 맵에 케이스가 추가되어야 하며, 전체 테스트가 통과되어야 합니다.

---

## 🛡️ 테스트 케이스 명세 (Test Specifications)

### 1. 권한 및 보안 (Auth/RBAC)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-S.1** | SUPER_ADMIN 바이패스 | 관리자 권한의 전역 접근성 보장 | `tests/unit/auth/rbac.test.ts` |
| **TC-S.2** | INDIVIDUAL 등급 승급 페이지 접근 | 역할 기반 접근 제어(RBAC)의 정상 허용 경로 검증 | `tests/unit/auth/rbac.test.ts` |
| **TC-S.3** | Default Deny (역할 없음) | 역할 정보 미존재 시 접근 거부 원천 차단 | `tests/unit/auth/rbac.test.ts` |
| **TC-S.4** | allowedPaths 우선 적용 | DB 전달 allowedPaths가 정적 fallback보다 우선되어야 함 | `tests/unit/auth/rbac.test.ts` |
| **TC-RBAC-01** | DB 권한 존재 시 접근 허용 | `zen_role_permissions` DB 설정 기반 동적 허용 | `tests/unit/auth/rbac.test.ts` |
| **TC-RBAC-02** | DB 미등록 경로 — STATIC Fallback 허용 | DB 없을 때 STATIC_PERMISSIONS로 Fallback 동작 | `tests/unit/auth/rbac.test.ts` |
| **TC-RBAC-03** | DB 조회 실패 시 STATIC Fallback 유지 | DB 장애 시에도 서비스 중단 없이 Fallback 보장 | `tests/unit/auth/rbac.test.ts` |
| **TC-P6-DB-01** | CUSTOMS_BROKER /admin/customs-rates 접근 | 통관사 담당자의 신규 요율 관리 페이지 접근 허용 | `tests/unit/auth/rbac.test.ts` |
| **TC-P6-DB-02** | DELIVERY_AGENT /admin/delivery-rates 접근 | 배송사 담당자의 신규 요율 관리 페이지 접근 허용 | `tests/unit/auth/rbac.test.ts` |
| **TC-P6-DB-03** | CUSTOMS_BROKER /orders/assigned 접근 | 통관사 담당자의 담당 오더 목록 접근 허용 | `tests/unit/auth/rbac.test.ts` |
| **TC-P6-DB-04** | CUSTOMS_BROKER /admin/rates 차단 | 통관사는 운송 요율(CARRIER 전용) 접근 불가 | `tests/unit/auth/rbac.test.ts` |
| **TC-P6-DB-05** | DELIVERY_AGENT /tracking 접근 | 배송사 담당자의 트래킹 조회 접근 허용 | `tests/unit/auth/rbac.test.ts` |

### 2. 소속 기반 지능형 제어 (Identity/Affiliation)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-A.1** | 법인 소속 정보 정확성 | 기업 회원의 `org_id` 및 명칭 정확 히 매핑 | `tests/unit/logistics/affiliation.test.ts` |
| **TC-A.2** | 개인 계정 더미 할당 | 개인 사용자의 B2C 경로 자동화 및 더미 ID 부여 | `tests/unit/logistics/affiliation.test.ts` |
| **TC-A.3** | 시스템 더미 ID 무결성 | 시스템 예약 상수의 프로젝트 표준 규격 일치 확인 | `tests/unit/logistics/affiliation.test.ts` |

### 3. 오더 무결성 (Logistics/Order Validation)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-V.1** | 유효 데이터 성공 | 정상적인 오더 페이로드의 처리 보장 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-V.2** | 필수 항목 누락 검증 | 화주 ID, 포트 정보 등 필수값 누락 차단 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-V.3** | 데이터 형식 검증 | 이메일, 전화번호 등 형식적 정합성 확인 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-V.4** | 패키지 최소 제약 | 아이템 없는 오더 생성 금지 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-V.5** | 수취인 필수 정보 | 성명, 주소 등 배송 필수 데이터 확인 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-V.6** | 수량/중량 양수 제약 | 0 이하의 비정상 수치 입력 차단 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-V.7** | VOC 생성 권한 검증 | 오더 소유자(Owner)만 VOC 생성 가능 여부 확인 | `tests/unit/logistics/voc.test.ts` |
| **TC-V.8** | VOC 어드민 알림 발송 | VOC 생성 시 모든 관리자 대상 알림 생성 검증 | `tests/unit/logistics/voc.test.ts` |

### 4. 오더 라이프사이클 및 상태 (Order Status & Actions)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-OR.1** | 오더 기본 생성 | 서버 액션을 통한 오더/아이템 트랜잭션 성공 | `tests/unit/logistics/order-actions.test.ts` |
| **TC-OR.2** | v2 보강 필드 저장 | 송하인 연락처 및 비고란 데이터 적재 확인 | `tests/unit/logistics/order-actions.test.ts` |
| **TC-OR.3** | 상태 변경 권한 (Operator) | 실무자의 유효한 상태 전이 허용 확인 | `tests/unit/logistics/order-status.test.ts` |
| **TC-OR.4** | 상태 변경 제한 (Shipper) | 화주(User)의 상태 변경 권한 통제 확인 | `tests/unit/logistics/order-status.test.ts` |
| **TC-OR.5** | 상태 머신 유효성 | 비정상적인 상태 점프(REGISTERED -> DELIVERED) 차단 | `tests/unit/logistics/order-status.test.ts` |
| **TC-INB.1** | 바코드 기반 오더 조회 | 존재하는 바코드/오더번호 입력 시 상세 내역 조회 보장 | `tests/unit/logistics/inbound.test.ts` |
| **TC-INB.2** | 존재하지 않는 바코드 조회 | 미등록 바코드 조회 시 예외 처리 및 null 반환 검증 | `tests/unit/logistics/inbound.test.ts` |
| **TC-INB.3** | 입고 확정 처리 | 검수 결과(정상/손상)를 포함하여 WAREHOUSED 상태 전이 성공 확인 | `tests/unit/logistics/inbound.test.ts` |
| **TC-INB.4** | 오늘의 입고 이력 조회 | 오늘 KST 기준 입고 완료된 이력 목록을 정상 집계 확인 | `tests/unit/logistics/inbound.test.ts` |

### 5. 마스터 오더 거버넌스 (Master Order)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-M.1** | 마스터 상태 제약 (Immutable) | 마스터에 묶인 오더의 개별 상태 변경 차단 | `tests/unit/master/master_policy.test.ts` |
| **TC-M.2** | 마스터 취소 시 자동 해체 | 마스터 취소/삭제 시 하위 오더 원복(REGISTERED) | `tests/unit/master/master_policy.test.ts` |
| **TC-M.3** | 마스터 수동 해체 (Dissolve) | 선택된 오더를 마스터에서 정상 분리 및 배정 해제 | `tests/unit/master/master_policy.test.ts` |
| **TC-M.4** | 마스터 상세 결합 조회 | 마스터 정보와 소속 하우스 목록 통합 반환 확인 | `tests/unit/master/master-detail.test.ts` |
| **TC-M.5** | 마스터 액션 예외 처리 | 존재하지 않는 ID 또는 DB 실패 시 안정적 대응 | `tests/unit/master/master-detail.test.ts` |
| **TC-M.6** | zen_orders RLS UPDATE | 관리자/운영자의 마스터오더 그룹핑(UPDATE) 권한 보장 | `tests/unit/master/master_policy.test.ts` |

### 6. 정밀 물류 계산 (Logistics Calculation)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-C.1** | Chargeable Weight (Air) | IATA 기준(부피/중량 중 큰 값) 산출 무결성 | `tests/unit/logistics/freight-calculator.test.ts` |
| **TC-C.2** | Revenue Ton (RT, Sea) | 해상 운임용 중량/CBM 비교 RT 산출 검증 | `tests/unit/logistics/freight-calculator.test.ts` |
| **TC-C.3** | 항공 요율 슬랩 매칭 | 중량 구간별(Slab) 정확한 요율 적용 확인 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-C.4** | 요율 유효기간 중첩 감지 | 동일 노선 기간 중복 등록 방지 로직 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-C.5** | 공용 포트 필터링 Logic | 모드(AIR/SEA)에 따른 UI 노드 필터링 정확도 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-C.6** | Composite Pricing 복합 운임 산출 | 기본 슬랩 운임 + 다중 할증료(percent/flat 등) 유효기간 필터링 합산 계산 검증 | `tests/unit/logistics/freight-calculator.test.ts` |

### 7. 마스터 데이터 및 가드 (Common & Guards)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-G.1** | 사용자 인증 가드 | 세션 유무 및 프로필 연결 무결성 | `tests/unit/auth/guards.test.ts` |
| **TC-G.2** | 어드민 보안 가드 | 비권한자의 어드민 액션 접근 원천 차단 | `tests/unit/auth/guards.test.ts` |
| **TC-G.3** | 세션 만료 응답 | 세션 부재 시 리다이렉트 또는 에러 전파 | `tests/unit/auth/guards.test.ts` |
| **TC-MA.1** | 국가/항구 리스트 조회 | 기준 정보 로딩 및 정렬 순서 보장 | `tests/unit/master/master-actions.test.ts` |
| **TC-MA.2** | 공통 코드 CRUD | 마스터 코드 추가/수정/삭제 로직 반영 | `tests/unit/master/master-actions.test.ts` |

### 8. 금융 및 정산 (Finance/Settlement)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-F.1** | 출고 시 자동 인보이스 생성 | 오더 `RELEASED` 시 정산 객체 자동 발행 로직 보장 | `tests/integration/finance.test.ts` |
| **TC-F.2** | 금융 데이터 정밀도 (4자리) | 소수점 4자리 유지 및 통화(USD/KRW) 매칭 무결성 | `tests/integration/finance.test.ts` |
| **TC-F.3** | 결제 상태 역방향 동기화 | 인보이스 `PAID` 시 오더 `Billing Status` 동시 업데이트 | `tests/integration/finance.test.ts` |
| **TC-F.4** | 다중 통화 환전 무결성 | USD/KRW 등 이종 통화 간 환산 산식 정확성 검증 | `tests/integration/finance.test.ts` |
| **TC-F.5** | 결제 승인 보안 가드 | 비관리자(Shipper)의 결제 상태 강제 변경 차단 | `tests/integration/finance.test.ts` |
| **TC-F.6** | 정산 후 데이터 수정 제한 | 인보이스 발행 후 오더 핵심 물류 데이터 수정 불가 정책 | `tests/integration/finance.test.ts` |
| **TC-F.7** | 세금계산서 데이터 발행 | 인보이스 기반 표준 세금계산서 DB 생성 검증 | `tests/integration/fin-03.test.ts` |
| **TC-F.8** | 세금계산서 메일 발송 | Resend 연동 및 SENT/FAILED 상태 전환 확인 | `tests/integration/fin-03.test.ts` |
| **TC-F.9** | 세금계산서 이력 조회 | 화주/어드민별 발행 및 발송 히스토리 조회 검증 | `tests/integration/fin-03.test.ts` |

### 9. UPS 요율 관리 (Phase 7 SPR-03)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-ADMIN-01** | Zone CRUD | Zone 등록 및 수정 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-02** | 기본요금 UPSERT | Zone×제품×중량 기본 요금 등록·수정 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-03** | 유류할증 UPSERT | 주별 유류할증료 등록·수정 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-04** | Other Charge CRUD | 부가요금 등록 및 수정 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-05** | 역할 인증 가드 | 비관리자의 요율 관리 액션 접근 차단 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-08** | 20kg 초과 티어 요율 등록/수정 | `upsertUpsWeightTierRate` 정상 동작 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-09** | 20kg 초과 티어 요율 삭제 | `deleteUpsWeightTierRate` (비활성화) 정상 동작 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-10** | Freight 최소운임 등록/수정 | `upsertUpsFreightMinimum` 정상 동작 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-ADMIN-11** | Freight 최소운임 삭제 | `deleteUpsFreightMinimum` (비활성화) 정상 동작 | `tests/unit/ups/rates-admin-actions.test.ts` |
| **TC-UPS-WH-01** | 창고 출고 — intl_ref_no 있음 | 정상 출고 (pkgsWithoutIntlRef=0) | `tests/unit/warehouse/outbound-ups.test.ts` |
| **TC-UPS-WH-02** | 창고 출고 — intl_ref_no 없음 | pkgsWithoutIntlRef > 0 반환 | `tests/unit/warehouse/outbound-ups.test.ts` |
| **TC-UPS-WH-03** | 창고 출고 — 상태 전이 | WAREHOUSED→RELEASED 전이 유지 | `tests/unit/warehouse/outbound-ups.test.ts` |

### 10. UPS 일마감 (Phase 7 SPR-05 Daily Close)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P7-CLOSE-01** | `getDailyOutboundSummary` — 정상 출고 데이터 집계 | 출고 PKG/중량/Zone 분포 집계 정확성 | `tests/unit/ups/daily-close.test.ts` |
| **TC-P7-CLOSE-02** | `getDailyOutboundSummary` — 출고 데이터 없음 | 데이터 없을 시 0 반환 및 에러 없음 | `tests/unit/ups/daily-close.test.ts` |
| **TC-P7-CLOSE-03** | `getDailyRevenueSummary` — 매출/매입 집계 정확도 | Revenue/Cost/Margin/MarginRate 계산 정확성 | `tests/unit/ups/daily-close.test.ts` |
| **TC-P7-CLOSE-04** | `getDailyCloseHistory` — 기간 조회 및 일자별 그룹핑 | Date range 조회 후 날짜별 Revenue 행 반환 검증 | `tests/unit/ups/daily-close.test.ts` |

---

### 11. 지능형 트래킹 가시성 (Intelligent Tracking)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-TR.1** | 공급자 실시간 전환 | `VIRTUAL` <-> `MANUAL` 전환 시 데이터 가시성 및 정합성 보장 | `tests/integration/tracking.test.ts` |
| **TC-TR.2** | 시뮬레이션 타임스탬프 역산 | 오더 상태 변경 시 과거 시점으로 논리적 이벤트 자동 생성 검증 | `tests/integration/tracking.test.ts` |
| **TC-TR.3** | 수동 이벤트 오버라이드 | 어드민이 직접 입력한 이벤트의 시각적 최우선 순위 반영 확인 | `tests/integration/tracking.test.ts` |
| **TC-TR.4** | 운송 모드별 노드 매핑 | AIR, SEA 등 모드에 따른 타임라인 아이콘/코드 논리적 일치 확인 | `tests/integration/tracking.test.ts` |
| **TC-TR.5** | 화주별 권한 기반 격리 | 타 화주가 다른 화주의 트래킹 정보를 조회할 수 없도록 보안 검증 | `tests/integration/tracking.test.ts` |
| **TC-TR.6** | 수동 이벤트 감사 추적 | 이벤트 소스(Manual vs Auto) 정보 유실 없는 보존 확인 | `tests/integration/tracking.test.ts` |

### 10. QA-02 트래킹 비즈니스 통합 (Tracking Business QA)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-QA.1** | Raw 로그 영속성 | `MockCarrierProvider` 호출 시 `zen_tracking_raw_logs`에 JSON 원본 저장 확인 | `tests/integration/tracking-business-qa.test.ts` |
| **TC-QA.2** | 동기화 무결성 (중복 방지) | 동일 이벤트 2회 동기화 시 `zen_tracking_events` 중복 삽입 차단 확인 | `tests/integration/tracking-business-qa.test.ts` |
| **TC-QA.3** | 트래킹 알림 연동 | 상태 변경 시 화주 대상 인앱/이메일 알림 트리거 검증 | `tests/integration/tracking-business-qa.test.ts` |

### 12. 라우팅 엔진 (Routing Engine)

#### 🟢 즉시 활성 (scoring.test.ts — routing.ts 불필요)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-R.1** | Cost-Optimal 선택 | 후보 중 total_cost 최소값 캐리어 선택 + 불변성 보장 | `tests/unit/routing/scoring.test.ts` |
| **TC-R.2** | Time-Optimal 선택 | 후보 중 total_transit_days 최소값 캐리어 선택 + 불변성 보장 | `tests/unit/routing/scoring.test.ts` |
| **TC-R.3** | Balanced 스코어 산출 | α=0.6·norm_cost + β=0.4·norm_time 가중치 정규화 수식 검증 (단일 후보 경계 포함) | `tests/unit/routing/scoring.test.ts` |

#### 🟢 활성 (ACTIVE)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-R.4a** | getRouteOptions 3종 옵션 반환 | COST/TIME/BALANCED 키가 모두 응답에 포함됨 확인 | `tests/integration/rou-01.test.ts` |
| **TC-R.4b** | COST ≤ TIME (비용) | COST 옵션의 total_cost ≤ TIME 옵션의 total_cost | `tests/integration/rou-01.test.ts` |
| **TC-R.4c** | TIME ≤ COST (소요일) | TIME 옵션의 total_transit_days ≤ COST 옵션의 total_transit_days | `tests/integration/rou-01.test.ts` |
| **TC-R.4d** | UPSERT 정책 (재호출 교체) | insert 대신 upsert 호출 확인 (UNIQUE order_id+option_type 기준 교체) | `tests/integration/rou-01.test.ts` |
| **TC-R.5a** | selectRoute 저장 | optionId로 zen_order_routes 레코드 생성 확인 | `tests/integration/rou-01.test.ts` |
| **TC-R.5b** | appliedRouteId 반환 (BUG-10-A) | `zen_order_routes` 실제 레코드 UUID 반환 확인 (`orderId`와 다른 값) | `tests/integration/rou-01.test.ts` |
| **TC-R.6** | getRouteVisualization 시각화 | 세그먼트 -> 마일스톤 변환 및 Mock 좌표 매핑 확인 | `tests/integration/rou-02.test.ts` |
| **TC-R.7** | getRouteConsistencyStatus 정합성 | Mock 기반 상시 정합(isConsistent: true) 반환 확인 | `tests/integration/rou-02.test.ts` |
| **TC-SCHED-01** | selectRoute 스케줄 자동 매칭 (DEF-043) | 경로 선택 시 `zen_vessel_schedules` 매칭으로 segments에 `schedule_id`/`flight_no`/`etd` 보강 및 non-fatal null 허용 확인 | `tests/integration/rou-03.test.ts` |
| **TC-UAT-E2E.1** | 완전 물류 사이클 통합 | 오더→경로→트래킹→정산→세금계산서 전 단계 서버 액션 연동 확인 | `tests/integration/uat-phase3-e2e.test.ts` |
| **TC-UAT-ROU.3/4** | 라우팅 타임라인 & 배지 UAT | getRouteVisualization 마일스톤 배열 + getRouteConsistencyStatus 정합성 확인 | `tests/integration/uat-phase3-e2e.test.ts` |

### 11. 알림 엔진 (Notification Engine)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-N.1** | 비트리거 상태 미발송 | REGISTERED 등 비대상 상태에서 DB/이메일 호출 없음 보장 | `tests/integration/notifications.test.ts` |
| **TC-N.2** | WAREHOUSED 송하인 알림 생성 | 입고 완료 시 송하인 IN_APP 알림 및 이메일 정상 발송 확인 | `tests/integration/notifications.test.ts` |
| **TC-N.3** | IN_TRANSIT 수하인 이메일 전용 | 운송 중 상태에서 수하인 이메일만 발송, 송하인 IN_APP 미생성 확인 | `tests/integration/notifications.test.ts` |
| **TC-N.4** | 단건 알림 읽음 처리 | markNotificationRead 호출 시 is_read=true 업데이트 확인 | `tests/integration/notifications.test.ts` |
| **TC-N.5** | 전체 알림 읽음 처리 | markAllNotificationsRead 호출 시 미읽음 건수 반환 및 일괄 처리 확인 | `tests/integration/notifications.test.ts` |

### 24. 요율 관리 (Rates)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-RATES-01** | createRateCard 권한 검증 | ADMIN/MANAGER만 등록 가능 여부 확인 | `tests/unit/rates/rates.test.ts` |
| **TC-RATES-02** | getRateCards CARRIER 격리 | CARRIER 로그인 시 자사 요율만 조회 보장 | `tests/unit/rates/rates.test.ts` |
| **TC-RATES-03** | deleteRateCard 권한 검증 | ADMIN만 삭제 가능 여부 확인 | `tests/unit/rates/rates.test.ts` |
| **TC-RATES-04** | TISA 버전 관리 (SUPERSEDED) | 신규 등록 시 기존 ACTIVE 요율의 상태 전환 검증 | `tests/unit/rates/rates.test.ts` |
| **TC-RATES-06** | Surcharges 탭 통합 (/admin/rates) | `/admin/rates` 페이지 내 Surcharges 탭에서 `zen_surcharges` CRUD 정상 동작 확인 (E2E 커버) | `tests/e2e/e2e-18-packing-pricing-ratecards.spec.ts` |
| **TC-RATES-07** | Route Network 자동 생성 (Rate Card 등록 시) | `createRateCard()` 호출 시 `origin_port_id` + `dest_port_id`가 있으면 `zen_route_network` 자동 UPSERT. port 미지정 시 skip. route network 실패해도 Rate Card 등록 유지 (non-fatal). | `tests/unit/rates/rates.test.ts` |
| **TC-P6-CARRIER-01** | CARRIER createRateCard 본인 carrier 허용 | CARRIER는 본인 carrier_id 요율 등록 가능 | `tests/unit/rates/rates.test.ts` |
| **TC-P6-CARRIER-02** | CARRIER createRateCard 타 carrier 차단 | CARRIER는 타 carrier 요율 등록 시 차단 | `tests/unit/rates/rates.test.ts` |
| **TC-P6-CARRIER-03** | CARRIER getRateCards 자사 요율만 조회 | CARRIER는 자사 carrier_id로 필터링된 요율만 조회 | `tests/unit/rates/rates.test.ts` |
| **TC-P6-CARRIER-04** | CARRIER updateRateCard 본인 carrier 허용 | CARRIER는 본인 carrier_id 요율 수정 가능 | `tests/unit/rates/rates.test.ts` |
| **TC-P6-CARRIER-04b** | CARRIER updateRateCard 타 carrier 차단 | CARRIER는 타 carrier 요율 수정 시 차단 | `tests/unit/rates/rates.test.ts` |
| **TC-P6-CUSTOMS-01** | ADMIN createCustomsRate 호출 가능 | ADMIN/MANAGER는 모든 통관사 요율 등록 가능 | `tests/unit/rates/customs-rates.test.ts` |
| **TC-P6-CUSTOMS-02** | CUSTOMS_BROKER 본인 org 요율 등록 | CUSTOMS_BROKER는 소속 조직 요율 등록 허용 | `tests/unit/rates/customs-rates.test.ts` |
| **TC-P6-CUSTOMS-03** | CUSTOMS_BROKER 타인 org 요율 차단 | CUSTOMS_BROKER는 타 조직 요율 등록 차단 | `tests/unit/rates/customs-rates.test.ts` |
| **TC-P6-DELIVERY-01** | ADMIN createDeliveryRate(LOCAL) 호출 가능 | ADMIN/MANAGER는 모든 배송사 LOCAL 요율 등록 가능 | `tests/unit/rates/delivery-rates.test.ts` |
| **TC-P6-DELIVERY-02** | DELIVERY_AGENT 본인 org TOTAL 요율 등록 | DELIVERY_AGENT는 소속 조직 TOTAL 요율 등록 허용 | `tests/unit/rates/delivery-rates.test.ts` |
| **TC-P6-DELIVERY-03** | DELIVERY_AGENT 타인 org 요율 차단 | DELIVERY_AGENT는 타 조직 요율 등록 차단 | `tests/unit/rates/delivery-rates.test.ts` |
| **TC-P6-ORDERS-01** | CARRIER getAssignedOrders 호출 가능 | CARRIER는 할당 오더 조회 가능 | `tests/unit/orders/assigned-orders.test.ts` |
| **TC-P6-ORDERS-02** | CUSTOMS_BROKER getAssignedOrders 호출 가능 | CUSTOMS_BROKER는 할당 오더 조회 가능 | `tests/unit/orders/assigned-orders.test.ts` |
| **TC-P6-ORDERS-03** | DELIVERY_AGENT getAssignedOrders 호출 가능 | DELIVERY_AGENT는 할당 오더 조회 가능 | `tests/unit/orders/assigned-orders.test.ts` |
| **TC-P6-ORDERS-04** | CORPORATE getAssignedOrders 접근 차단 | 화주는 할당 오더 조회 권한 없음 | `tests/unit/orders/assigned-orders.test.ts` |
| **TC-P6-ORDERS-05** | DELIVERY_AGENT category=DELIVERY 필터 조회 | DELIVERY_AGENT는 배송 유형 필터 조회 가능 | `tests/unit/orders/assigned-orders.test.ts` |
| **TC-P6-SVCRATE-01** | 모든 요율 타입 통합 조회 | 운송/통관/배송(LOCAL/TOTAL) 4종 요율 모두 정상 반환 확인 | `tests/unit/rates/service-rates.test.ts` |
| **TC-P6-SVCRATE-02** | 운송 요율 없음 에러 처리 | 선택한 노선에 운송 요율 없을 시 에러 메시지 반환 확인 | `tests/unit/rates/service-rates.test.ts` |
| **TC-P6-SVCRATE-03** | 부분 결과 (운송만 존재) | 통관/배송 요율 없어도 운송 요율만 정상 반환 확인 | `tests/unit/rates/service-rates.test.ts` |

---

## 📊 최신 검증 이력 (Execution History)

| 검증일 | 버전 | 성공/실패 | 총 소요시간 | 결과 리포트 |
| :--- | :--- | :---: | :--- | :--- |
| 2026-06-04 | v18.1 | ✅ PASS | 43.48s | 239/239 — TASK-111 재작업 (v2.3) — `supabase: any`→`SupabaseClient` · TC-RATES-07/07b/07c 신규 3건 · 239/239 PASS. |
| 2026-06-03 | v18.0 | ✅ PASS | 44.10s | 236/236 — IMP-096 요율 관리 페이지 통합 정리 (Surcharges 탭 `/admin/rates` 통합·rate-cards 리다이렉트·transport-costs 경고 배너) + TC-RATES-06 신규 등록 완료. |
| 2026-05-23 | v17.0 | ✅ PASS | 49.49s | 218/218 — IMP-073 입고 처리 전용 화면 신규 개발 및 TC-INB.1~4 신규 등록 완료. |
| 2026-05-11 | v16.1 | ✅ PASS | ~30s | 177/177 — FEAT-RATES 반려 결함(BUG-FR-001/002) 수정 및 TC-RATES-01~04 신규 등록 완료. |
| 2026-04-21 | v1.1 | ✅ PASS | 1.88s | 28/28 Passed |
| 2026-04-22 | v2.1 | ✅ PASS | 2.81s | 58/58 Fully Registered & Verified |
| 2026-04-23 | v2.2 | ✅ PASS | 7.9s | 60/60 QA-02 통합 2건 추가, 데이터 레이스 픽스 |
| 2026-04-24 | v3.0 | ✅ PASS | 36.03s | 80/80 NOTIF-01 알림 엔진 TC-N.1~5 (5건) 신규 등록 |
| 2026-04-24 | v3.1 | ✅ PASS | 44.13s | 93/93 ROU-01 스코어링 TC-R.1~3 (단위) + TC-R.4~5 (통합) 신규 등록 |
| 2026-04-24 | v3.2 | ✅ PASS | 45.11s | 95/95 ROU-01 통합 테스트 3건 추가 및 Mocking 정책 수정 완료 |
| 2026-04-24 | v3.3 | ✅ PASS | 36.30s | 99/99 Phase 3.3 Sprint A (ROU-02) 버그 수정(BUG-08/09/10-A) 및 검증 완료 |
| 2026-04-24 | v3.4 | ✅ PASS | 40.26s | 102/102 Phase 3.3 Sprint B (ROU-04/05) Action 통합 테스트 추가 및 검증 완료 |
| 2026-04-25 | v3.5 | ✅ PASS | 50.42s | 108/108 TC-G.2 mock 패턴 수정(mockResolvedValue→mockReturnValue), inventory 음수 조정 패턴 수정(rejects.toThrow→toEqual), TS 타입 수정 7건(implicit any 3건, OrderStatus, addTrackingEvent 인자, lowStockOnly, checkPermission) |
| 2026-04-26 | v3.6 | ✅ PASS | 26.73s | 109/109 PH4-UAT-01 TRK 모듈 브라우저 UAT 완료 (1건 추가). BUG-FIN-RLS-01(zen_invoices UPDATE RLS 누락), BUG-MW-API-01(/api i18n 리다이렉트), BUG-INV-HIST-01(history INSERT org_id FK 위반) 코드 수정 후 기존 109/109 전원 PASS 확인 |
| 2026-04-26 | v4.0 | ✅ PASS | 26.73s | 109/109 PH4-UX-03/04 (UI/UX 고도화) 완료. 전 페이지 디자인 엔진 업그레이드(Glassmorphism, Hover Elevation, rounded-2xl 표준화) 및 Finance 실데이터 차트 연동 확인. |
### 13. 시스템 파라미터 및 운영 안정성 (OPS/Params)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-OPS-01** | 숫자 파라미터 정상 조회 | DB에 설정된 수치 파라미터의 정확한 로딩 확인 | `tests/unit/params/service.test.ts` |
| **TC-OPS-02** | 파라미터 부재 시 Fallback | DB에 값이 없을 경우 코드 내 기본값(Default) 반환 보장 | `tests/unit/params/service.test.ts` |
| **TC-OPS-03** | NULL 값 안전 처리 | DB 값이 NULL일 경우 예외 없이 기본값으로 대체 확인 | `tests/unit/params/service.test.ts` |
| **TC-OPS-04** | 트래킹 지연 자동 감지 | 마지막 이벤트 48시간 초과 시 자동으로 `DELAYED` 스텝 추가 및 오더 `HELD` 상태 전환 | `tests/unit/logistics/tracking.test.ts` |

### 14. 선불 지갑 연동 (Wallet Integration)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-WAL.1** | 지갑 자동 생성 (Lazy Init) | 신규 화주의 첫 지갑 접근 시 레코드 자동 생성 보장 | `tests/unit/finance/wallet.test.ts` |
| **TC-WAL.2** | 지갑 결제 무결성 | 인보이스 금액만큼 지갑 잔액 차단 및 상태 전이 확인 | `tests/unit/finance/wallet.test.ts` |
| **TC-WAL.3** | 잔액 부족 결제 차단 | 잔액보다 큰 금액 결제 시도 시 트랜잭션 롤백 및 오류 반환 | `tests/unit/finance/wallet.test.ts` |
| **TC-WAL.4** | 중복 결제 방지 가드 | 이미 `PAID` 상태인 인보이스에 대한 재결제 시도 차단 | `tests/unit/finance/wallet.test.ts` |

### 15. 고객지원 포털 (CS)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-CS-01** | createQna — PENDING 상태 반환 | 문의 등록 시 초기 상태 보장 | `tests/unit/support/support-actions.test.ts` |
| **TC-CS-02** | answerQna — 첫 답변 시 IN_PROGRESS 자동 전환 | 답변 등록 시 상태 전이 검증 | `tests/unit/support/support-actions.test.ts` |
| **TC-CS-03** | getFaqList — keyword 검색 필터 동작 | 키워드 필터 정확성 검증 | `tests/unit/support/support-actions.test.ts` |
| **TC-CS-04** | upsertNotice — is_published=true 시 published_at 자동 설정 | 발행일 자동 기록 보장 | `tests/unit/support/support-actions.test.ts` |

### 16. 재무 조회 확장 (Finance+)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-FIN7-01** | getRevenueReport — startDate 필터 시 해당 기간 데이터만 반환 | 기간 필터 정확성 | `tests/unit/finance/report.test.ts` |
| **TC-FIN7-02** | getCostReport — serviceType 필터 시 해당 모드 데이터만 반환 | 모드 필터 정확성 | `tests/unit/finance/report.test.ts` |
| **TC-FIN7-03** | upsertTransportCost — 신규 등록 시 { success: true, data } 반환 | CRUD 무결성 | `tests/unit/finance/report.test.ts` |
| **TC-FIN7-04** | getVesselSchedules — originPortId 필터 동작 검증 | 스케줄 필터 | `tests/unit/finance/report.test.ts` |

### 17. 통계 대시보드 (Statistics)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-STAT-01** | getCostProfitStats('MONTH') — statsByMode AIR/SEA/CIR 3종 반환 | 집계 정확성 | `tests/unit/statistics/stats-actions.test.ts` |
| **TC-STAT-02** | getCostProfitStats 마진율 — revenue > 0 시 margin = (rev-cost)/rev*100 | 마진율 계산 | `tests/unit/statistics/stats-actions.test.ts` |

### 18. 클레임 워크플로우 (Claims)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-CLM-01** | createClaim — status=OPEN 반환 + zen_orders.status CLAIMED 업데이트 확인 | 클레임 생성 및 오더 상태 전이 | `tests/unit/claims/claims-actions.test.ts` |
| **TC-CLM-02** | updateClaimStatus — Admin only, OPEN → INVESTIGATING 상태 전이 검증 | 관리자 전용 상태 관리 | `tests/unit/claims/claims-actions.test.ts` |
| **TC-CLM-03** | addIncidentFee — fee_amount 등록 후 연계 invoice total_amount 차감 반영 | 사고비 정산 연동 | `tests/unit/claims/claims-actions.test.ts` |

### 19. 무역서류 엔진 (Documents)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-DOC-01** | getOrderDocumentData — orderId 기반 shipper/consignee 포함 전체 데이터 반환 | 문서용 데이터 애그리게이션 | `tests/unit/documents/document-actions.test.ts` |
| **TC-UPS-INV-01** | UPS 간이 인보이스 PDF — 필수 필드(shipper, consignee, packages, UPS service, totals) 전체 포함 | UPS 오더 세관 신고용 PDF 생성 데이터 무결성 | `tests/unit/orders/ups-invoice.test.ts` |
| **TC-UPS-INV-02** | UPS 인보이스 RBAC — ADMIN/MANAGER/SHIPPER(본인)/AGENCY 출력 가능, CARRIER/OPERATOR 등 타 역할 차단 | 역할별 PDF 출력 권한 통제 | `tests/unit/orders/ups-invoice.test.ts` |

### 20. 오더 연계 QnA (Order-Linked QnA)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-ORD-QNA-01** | getOrderQnaList — 특정 오더 ID 필터링 검증 | 오더 상세 탭의 데이터 정확성 | `tests/unit/support/order-qna.test.ts` |
| **TC-ORD-QNA-02** | getOrderQnaList — 권한 없는 오더 조회 차단 | 화주 간 데이터 격리 보안 검증 | `tests/unit/support/order-qna.test.ts` |
| **TC-ORD-QNA-03** | getOrderQnaList — Admin 권한 바이패스 | 관리자의 전역 오더 문의 조회 보장 | `tests/unit/support/order-qna.test.ts` |

### 21. 모니터링 및 장애 감지 (Monitoring)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-ERR-01** | 에러 로그 DB 저장 | `logClientError` 호출 시 `zen_error_logs` 테이블 적재 확인 | `tests/unit/monitoring/error-log.test.ts` |
| **TC-ERR-02** | 중대 에러 알림 연동 | `CRITICAL` 등급 에러 발생 시 관리자 인앱 알림 발송 검증 | `tests/unit/monitoring/error-log.test.ts` |
| **TC-ERR-03** | 에러 로그 조회 보안 | 관리자 권한(`validateAdminAction`) 기반 로그 목록 접근 통제 확인 | `tests/unit/monitoring/error-log.test.ts` |
| **TC-ERR-04** | 에러 조치 완료 처리 | `resolveErrorLog`를 통한 해결 상태(`resolved: true`) 업데이트 검증 | `tests/unit/monitoring/error-log.test.ts` |

### 22. 회원 등급 및 승급 (Member Grade)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-GRADE-01** | requestGradePromotion — INSERT 및 알림 | 승급 신청 시 DB 적재 및 Admin 알림 발송 검증 | `tests/unit/member/grade-promotion.test.ts` |
| **TC-GRADE-02** | reviewGradePromotion — APPROVED 처리 | 승인 시 상태 업데이트 및 프로필 등급 갱신 검증 | `tests/unit/member/grade-promotion.test.ts` |
| **TC-GRADE-03** | requestGradePromotion — 중복 신청 차단 | PENDING 상태 신청 존재 시 추가 신청 차단 로직 검증 | `tests/unit/member/grade-promotion.test.ts` |
| **TC-GRADE-04** | getGradeMaster 조회 | 등급 마스터 목록 정상 반환 확인 | `tests/unit/member/grade-promotion.test.ts` |

### 23. 통관 관리 (Customs Clearance)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-CCL-01** | createDeclaration — 초기 상태 PENDING | 신고 생성 시 대기 상태 및 오더 연계 확인 | `tests/unit/customs/customs-declaration.test.ts` |
| **TC-CCL-02** | updateDeclarationStatus — 상태/메모 업데이트 | 관리자의 수동 상태 변경 및 신고번호 입력 검증 | `tests/unit/customs/customs-declaration.test.ts` |
| **TC-CCL-03** | submitDeclaration — 어댑터 연동 및 SUBMITTED 전환 | 외부 어댑터 호출 및 상태 전이 확인 | `tests/unit/customs/customs-declaration.test.ts` |
| **TC-CCL-04** | getDeclarations — 화주별 권한 격리 | 본인 오더와 연계된 신고만 조회 가능 여부 확인 | `tests/unit/customs/customs-declaration.test.ts` |
| **TC-ORDER-RLS-01** | zen_orders RLS UPDATE | 관리자/운영자의 마스터오더 그룹핑(UPDATE) 권한 보장 | `tests/unit/master/master_policy.test.ts` |

### 14. 회원 프로필 (Member/Profile)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-PROFILE-01** | getMyProfile — 프로필 조회 | 인증된 사용자의 프로필 정상 반환 | `tests/unit/member/profile.test.ts` |
| **TC-PROFILE-02** | updateMyProfile — 이름 수정 | `zen_profiles` UPDATE 호출 및 성공 확인 | `tests/unit/member/profile.test.ts` |
| **TC-PROFILE-03** | withdrawUser — Soft Delete 성공 | `is_active=false` 업데이트 + `signOut` 호출 확인 | `tests/unit/member/profile.test.ts` |
| **TC-PROFILE-04** | withdrawUser — DB 오류 처리 | DB 실패 시 에러 메시지 반환 (서비스 미중단) | `tests/unit/member/profile.test.ts` |

### 15. 법인회원 관리 (Corporate Management)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-MEM-01** | updateOrganizationInfo — 법인 정보 수정 | metadata 병합 업데이트 및 성공 반환 확인 | `tests/unit/member/corporate.test.ts` |
| **TC-MEM-02** | createDepartment — 부서 추가 | `zen_departments` INSERT + org_id 연결 확인 | `tests/unit/member/corporate.test.ts` |
| **TC-MEM-03** | deleteDepartment — 부서 삭제 | DELETE 호출 및 id 조건 정합 확인 | `tests/unit/member/corporate.test.ts` |
| **TC-MEM-04** | updateOrganizationInfo — 권한 없는 역할 거부 | USER 역할의 법인 정보 수정 시도 차단 | `tests/unit/member/corporate.test.ts` |

### 25. Phase 6 오더 등록 및 요율 검증 (P6 Order Registration & Service Rates)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P6-ORDERUI-01** | createOrderServices — 활성 및 유효기간 내 요율 등록 | 정상 요율 카드로 오더 서비스 배정 등록 성공 확인 | `tests/integration/p6-orderui.test.ts` |
| **TC-P6-ORDERUI-02** | createOrderServices — 비활성 요율 차단 | 비활성 요율 카드가 포함된 오더 제출 거부 검증 | `tests/integration/p6-orderui.test.ts` |
| **TC-P6-ORDERUI-03** | createOrderServices — 만료 요율 차단 | 유효기간 만료 요율 카드가 포함된 오더 제출 거부 검증 | `tests/integration/p6-orderui.test.ts` |

### 26. Phase 6 통합 테스트 (P6 Integration)
| ID | 테스트 항목 | 목적 | 파일 경로 |
|:---|:---|:---|:---|
| **TC-P6-INTG-01** | DB 스키마 연동 — customs/delivery/order-services/service-rates 테이블 INSERT 패턴 검증 | Phase 6 DB 스키마와 Action 코드의 정합성 확인 | `tests/integration/p6-db-01.test.ts` |
| **TC-P6-INTG-02** | 통관 요율 CRUD Lifecycle — ADMIN create/update/delete + CUSTOMS_BROKER 본인/타인 org 제어 + 대문자 변환 + 디폴트값 | 통관 요율 전 생애주기 및 역할별 접근 제어 통합 검증 | `tests/integration/p6-customs-rates.test.ts` |
| **TC-P6-INTG-03** | 배송 요율 CRUD Lifecycle — LOCAL/TOTAL validation(필드 누락 시 에러) + DELIVERY_AGENT org 제어 + 대문자 변환 + 활성 요율 필터 | 배송 요율 서비스타입별 필수값 검증 및 역할별 접근 제어 통합 검증 | `tests/integration/p6-delivery-rates.test.ts` |
| **TC-P6-INTG-04** | 통합 서비스 요율 조회 Edge Case — last tier fallback, 빈 tiers, null tiers, port 미조회, carrier name null, 부분 결과, zero weight | 요율 조회 엔진의 다양한 엣지 케이스 처리 검증 | `tests/integration/p6-service-rates.test.ts` |
| **TC-P6-INTG-05** | 오더-서비스 배정 CRUD + 역할 격리 — 3종 동시 등록 + 비활성/만료 차단 + ADMIN 전역조회 + provider 필터 + 타 provider 차단 + Unauthorized + order not found | 오더-서비스 배정 전 기능 및 역할별 격리 통합 검증 | `tests/integration/p6-order-services.test.ts` |

### 27. 운송 요금 정책 (Transport Pricing Policy)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-POLICY-01** | AIR 오더 부피중량 > 실중량 시 비용 산정 | 부피중량 기준 tier 적용 요율 산정 검증 | `tests/integration/p6-transport-policy.test.ts` |
| **TC-POLICY-02** | AIR 오더 실중량 > 부피중량 시 비용 산정 | 실중량 기준 tier 적용 요율 산정 검증 | `tests/integration/p6-transport-policy.test.ts` |
| **TC-POLICY-03** | SEA 오더 중량단가 > 용적단가 시 | 중량단가 채택 요율 산정 검증 | `tests/integration/p6-transport-policy.test.ts` |
| **TC-POLICY-04** | SEA 오더 용적단가 > 중량단가 시 | 용적단가 채택 요율 산정 검증 | `tests/integration/p6-transport-policy.test.ts` |
| **TC-POLICY-05** | Admin 정책 VOLUMETRIC->WM 변경 후 오더 산정 | 변경된 방식 즉시 반영 여부 통합 검증 | `tests/integration/p6-transport-policy.test.ts` |
| **TC-POLICY-06** | WM max_charge cap 적용 (상한선 발동) | max_charge 초과 시 total_freight = max_charge + applied_pricing_basis = MAX_CHARGE 검증 | `tests/integration/p6-transport-policy.test.ts` |
| **TC-POLICY-07** | WM 계산 후 snapshot slab 이력 + pricing_basis 저장 | zen_order_rate_snapshots 신규 8개 컬럼 정상 저장 검증 | `tests/integration/p6-transport-policy.test.ts` |

---

## 📊 최신 검증 이력 (Execution History)

| 검증일 | 버전 | 성공/실패 | 총 소요시간 | 결과 리포트 |
| :--- | :--- | :---: | :--- | :--- |
| 2026-06-17 | v1.5.6 | ✅ PASS | 58.03s | TASK-153 IMP-122 Agency 정산 조회 구현 완료. p7-agency-settlement.test.ts 4개 TC 신규 등록 및 374/374 PASS. |
| 2026-06-17 | v1.5.5 | ✅ PASS | 5.80s | TASK-149 IMP-118 오더 직접배송/픽업 UI 구현 완료. delivery-method.test.ts 4개 TC 신규 등록. 전체 회귀 테스트 통과 (4차 재제출). |
| 2026-06-08 | v1.5.3 | ✅ PASS | 51.90s | TASK-122 요율 Slab 구조 개편 완료. `tiers` 배열 → `{ weight_slabs, cbm_slabs }` 객체 변환. `fn_get_best_matching_rate` weight_slabs/cbm_slabs 각각 매칭. 엔진/액션/어댑터 tiers 참조 일괄 수정. 기존 314/314 전량 PASS 유지. |
| 2026-06-08 | v1.5.2 | ✅ PASS | ~45s | TASK-121 운송수단별 요금 산정 정책 설정 완료. TC-POLICY-01~05 (총 5개 케이스) 추가 및 전체 회귀 테스트 314건 통과. |
| 2026-06-07 | v1.5.1 | ✅ PASS | TBD | TASK-120 Phase 6 통합 테스트 5파일 신규 등록. TC-P6-INTG-01~05 (총 28개 케이스) 추가 및 전체 회귀 테스트 통과. |
| 2026-06-06 | v1.5.0 | ✅ PASS | 32.15s | Phase 6 Sprint 5 오더 등록 UI 개선 및 이중 요율 검증 완료. TC-P6-ORDERUI-01~03 신규 등록 및 전체 회귀 테스트 통과. |
| 2026-04-27 | v5.0 | ✅ PASS | 29.10s | 124/124 Phase 4 Sprint 5 (선불 지갑) 완료. 지갑 연동, 충전/결제 액션, 마이페이지 대시보드 구현 및 회귀 테스트 9건(Wallet 관련 9개 TC) 신규 등록. |
| 2026-04-27 | v6.0 | ✅ PASS | 32.15s | 133/133 Phase 4 Sprint 6 (고객지원 포털) 완료. QnA/FAQ/공지사항 기능 구현 및 TC-CS-01~04 신규 등록. |
| 2026-04-28 | v7.0 | ✅ PASS | 34.20s | 140/140 — Phase 4 Sprint 7 재무+통계 완료. TC-FIN7-01~04, TC-STAT-01~02 신규 등록. |
| 2026-04-29 | v8.0 | ✅ PASS | 34.57s | 148/148 — Phase 4 Sprint 8 클레임+문서 완료. TC-CLM-01~03, TC-DOC-01 신규 등록 및 전체 검증 통과. |
| 2026-04-29 | v9.0 | ✅ PASS | 35.45s | 151/151 — Phase 4 Sprint 9 오더 연계 QnA 완료. TC-ORD-QNA-01~03 신규 등록 및 전체 회귀 테스트 통과. |
| 2026-04-29 | v10.0 | ✅ PASS | 38.12s | 155/155 — Phase 4 Sprint 10 Sentry 통합 및 에러 모니터링 완료. TC-ERR-01~04 신규 등록 및 전체 회귀 테스트 통과. |
| 2026-04-29 | v11.0 | ✅ PASS | 31.00s | 159/159 — Phase 4 Sprint 11 개인회원 등급 승급 완료. TC-GRADE-01~04 신규 등록 및 전체 회귀 테스트 통과. |
| 2026-04-29 | v12.0 | ✅ PASS | 33.50s | 163/163 — Phase 5 Sprint 12 통관 모달 및 마이페이지 이력 완료. TC-CCL-01~04 신규 등록 및 전체 회귀 테스트 통과. |
| 2026-05-01 | v14.1 | ✅ PASS | 42.10s | 164/164 — E2E-02 후속 조치 완료. TC-ORDER-FORM-01 신규 등록 및 전체 검증 통과 (useWatch 전환). |
| 2026-05-03 | v14.2 | ✅ PASS | 45.12s | E2E-03 후속 조치 완료 및 E2E-04 재착수 준비 완료. TC-ORDER-RLS-01 추가. |
| 2026-05-04 | v14.3 | ✅ PASS | 37.09s | 163/163 — FB-005 조치 완료. TC-N.2, TC-N.3, QA-02 테스트 목업 및 로직 복구. |
| 2026-05-05 | v14.4 | ✅ PASS | 33.15s | 163/163 — E2E-05 정산 프로세스(인보이스→세금계산서→엑셀) 정상화 및 RLS 수정 완료. |
| 2026-05-05 | v14.5 | ✅ PASS | 45.04s | 161/161 — FB-006 조치 완료. vitest.config.ts `scratch/**` exclude 추가로 scratch 디버그 파일 2건 회귀 suite에서 제거. 실질 커버리지 유지. |
| 2026-05-06 | v14.7 | ✅ PASS | 24.01s | 161/161 — E2E-07 통관 라이프사이클 테스트 완료. UI ID 도입 및 브라우저 다이얼로그 처리 로직 고도화로 안정성 확보. (Playwright E2E는 vitest suite 외부 — 단위 테스트 수 변동 없음, Aiden 검증 정정) |
| 2026-05-06 | v14.8 | ✅ PASS | ~30s | 161/161 — E2E-08 화주 통관 이력 조회 완료. getDeclarations validateUserAction 전환, middleware /mypage 허용, RLS 조직 격리 정책 보강. (Aiden 직접 등록 — Riley R-09 허위 보고 정정) |
| 2026-05-07 | v14.9 | ✅ PASS | ~30s | 163/163 — E2E-09 개인회원 등급 승급 라이프사이클 완료. grade_promotion_request FK zen_profiles 전환, handle_new_user 트리거 보강, INDIVIDUAL 즉시 활성화, grade RLS 정책 추가, rate_price 회귀 복구, Admin 메타데이터 동기화. (Aiden 최종 검증 PASS) |
| 2026-05-07 | v14.11 | ✅ PASS | ~35s | 163/163 — E2E-10 클레임 및 다국어 문서 발행 엔진 완료. FB-011 조치(Step 4 구현 및 실물 스크린샷 교체) 완료. claims.ts 액션 구현, PDF 컴포넌트(CI/PL) 다국어 렌더링 고도화, ClaimRequestModal UI 연계 확인. |
| 2026-05-07 | v14.12 | ✅ PASS | ~34s | 163/163 — E2E-11 오더 QnA 라이프사이클 완료. 로그아웃 버튼 컴포넌트(`LogoutButton`) 구현 및 글로벌 헤더 연동, E2E 테스트 경로(`/ko/support/qna`) 및 셀렉터 현행화, 로그인 리다이렉트(`/ko/orders`) 정합성 확보. |
| 2026-05-08 | v14.13 | ✅ PASS | 29.81s | 163/163 — E2E-12 복합 경로 최적화 및 마일스톤 시각화 완료. BALANCED 경로 선택 로직, RouteConsistencyBadge 서버 사이드 업데이트(page.reload) 및 마일스톤 타임라인 시각화 검증 완료. |
| 2026-05-09 | v15.1 | ✅ PASS | ~30s | 165/165 — AUDIT-S1 인증·마이페이지·메뉴 결함 시정 + AUDIT-S2 RBAC 구조 정비. TC-RBAC-01~03 신규 등록 (DB 기반 동적 권한 + Fallback 검증). |
| 2026-05-11 | v15.2 | ✅ PASS | ~30s | 173/173 — AUDIT-S3 법인회원 관리·탈퇴 기능 구현 완료. TC-PROFILE-01~04, TC-MEM-01~04 신규 등록. Aiden 검증 PASS. |
| 2026-06-09 | v17.2 | ✅ PASS | ~50s | IMP-107 TISA 스냅샷 강화 — slab 이력 + pricing_basis 저장. TC-POLICY-07 신규 등록. |


| 2026-05-11 | v16.0 | ✅ PASS | ~35s | 177/177 — FB-016 FEAT-RATES 반려 결함 수정 완료. BUG-FR-001(Carrier 필터), BUG-FR-002(TISA 버전 관리) 조치 및 TC-RATES-01~04 신규 등록. |


---

## 16. 요율 관리 (Rates Management)

| ID | 테스트 항목 | 파일 | 결과 | 비고 |
|:---|:---|:---|:---:|:---|
| TC-RATES-01 | 요율 등록 권한 가드 (ADMIN/MANAGER 허용) | `rates.test.ts` | ✅ | CARRIER 등 타 역할 차단 검증 |
| TC-RATES-02 | CARRIER 역할 자사 요율 필터링 | `rates.test.ts` | ✅ | org_id 기반 격리 조회 검증 |
| TC-RATES-03 | 요율 삭제 권한 가드 (ADMIN 전용) | `rates.test.ts` | ✅ | MANAGER 권한 삭제 시도 차단 |
| TC-RATES-04 | TISA 버전 관리 (ACTIVE -> SUPERSEDED) | `rates.test.ts` | ✅ | 동일 항로 재등록 시 상태 전이 및 버전 증가 |

### 14. UPS 요율 조회 (Phase 7 SPR-02)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-R-01** | `getUpsZones()` Zone 목록 + 국가 반환 | Zone + 국가 JOIN 조회 정상 동작 | `tests/unit/ups/rates-actions.test.ts` |
| **TC-UPS-R-02** | `getUpsProducts('DOC')` cargoType 필터 | 제품 조회 시 cargo_type 조건부 필터링 | `tests/unit/ups/rates-actions.test.ts` |
| **TC-UPS-R-03** | `getUpsBaseRates({ productId, zoneId })` 복합 필터 | 기본 요금표 productId + zoneId 복합 필터 | `tests/unit/ups/rates-actions.test.ts` |
| **TC-UPS-R-04** | `getUpsFuelSurcharge()` 기준일 기반 최신 조회 | 유류할증료 effective_week 기준 최신 조회 | `tests/unit/ups/rates-actions.test.ts` |
| **TC-UPS-R-05** | `getUpsOtherCharges()` 활성 항목만 반환 | 부가요금 is_active 필터 검증 | `tests/unit/ups/rates-actions.test.ts` |

### 29. Phase 7 오더 직접배송/픽업 선택 (Phase 7 SPR-04)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-ORDER-01** | DIRECT 선택 시 pickup 필드 불필요 저장 | 직접배송 선택 시 픽업지 정보 없이 정상 생성 검증 | `tests/unit/orders/delivery-method.test.ts` |
| **TC-UPS-ORDER-02** | PICKUP 선택 시 필수 필드 존재 시 저장 | 픽업 선택 및 필수 3종 입력 시 정상 생성 검증 | `tests/unit/orders/delivery-method.test.ts` |
| **TC-UPS-ORDER-03** | PICKUP 선택 시 필수 필드 누락 시 차단 | 픽업 선택하고 정보 누락 시 Zod 유효성 검증 차단 확인 | `tests/unit/orders/delivery-method.test.ts` |
| **TC-UPS-ORDER-04** | DIRECT 선택 + pickup 필드 전달 시 | 직접배송 선택 시 픽업 정보가 초기화되어 저장되는지 검증 | `tests/unit/orders/delivery-method.test.ts` |

### 30. Phase 7 대리점 정산 조회 (Phase 7 SPR-06)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P7-SETTLE-01** | Agency 정산 요약 — 하위 화주 2개 오더 합산 정확 | 대리점 정산 요약 정보의 집계 합산 무결성 검증 | `tests/integration/p7-agency-settlement.test.ts` |
| **TC-P7-SETTLE-02** | 화주별 정산 — 화주A vs 화주B 분리 집계 정확 | 대리점 하위 화주별 분리 집계 정확성 검증 | `tests/integration/p7-agency-settlement.test.ts` |
| **TC-P7-SETTLE-03** | Agency 요율 오버라이드 반영 — override 있는 경우 override 금액 사용 | 요율 오버라이드 유무에 따른 정산 금액 반영 확인 | `tests/integration/p7-agency-settlement.test.ts` |
| **TC-P7-SETTLE-04** | RLS — Agency A 사용자가 Agency B 데이터 조회 불가 | 대리점별 하위 화주 데이터 격리 보안 검증 | `tests/integration/p7-agency-settlement.test.ts` |

### 31. Phase 7 주소록 (Phase 7 SPR-05)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P7-ADDR-01** | 주소록 항목 신규 등록 | 주소록 정보 DB 정상 저장 검증 | `tests/unit/operations/address-book.test.ts` |
| **TC-P7-ADDR-02** | 등록된 주소록 목록 조회 및 정렬 | 기본 배송지 우선, 가나다순 정렬 검증 | `tests/unit/operations/address-book.test.ts` |
| **TC-P7-ADDR-03** | 주소록 항목 수정 | 기존 등록된 주소록 정보 수정 반영 확인 | `tests/unit/operations/address-book.test.ts` |
| **TC-P7-ADDR-04** | 주소록 항목 삭제 | 주소록 항목 삭제 시 DB 제거 검증 | `tests/unit/operations/address-book.test.ts` |
| **TC-P7-ADDR-05** | 기본 배송지 설정 및 자동 단일화 | 신규 지정 시 기존 기본배송지 자동 해제 검증 | `tests/unit/operations/address-book.test.ts` |

### 32. Agency 정산 내역 엑셀 다운로드 (IMP-124)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-B-EXCEL-01** | Agency 로그인 → 정산 조회 → 기간 설정 → Excel 다운로드 | `.xlsx` 파일 다운로드, 컬럼 9종 정상 | `tests/integration/p7-agency-settlement.test.ts` |
| **TC-B-EXCEL-02** | 데이터 없는 기간 조회 후 다운로드 | 헤더만 있는 빈 Excel 파일 생성 확인 | `tests/integration/p7-agency-settlement.test.ts` |
| **TC-B-EXCEL-03** | 특정 화주 필터 후 다운로드 | 해당 화주 데이터만 포함 확인 | `tests/integration/p7-agency-settlement.test.ts` |

### 33. Agency 대시보드 정산 요약 위젯 (IMP-125)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-B-DASH-01** | Agency 로그인 → 대시보드 접속 — 정산 요약 위젯 표시 | 이번 달 정산 요약(오더수·매출·원가·마진율) 정상 렌더링 | 대시보드 페이지 |
| **TC-B-DASH-02** | 오더 없는 Agency 로그인 → 대시보드 접속 | 데이터 없을 시 위젯 0 표시 (에러 없음) | 대시보드 페이지 |
| **TC-B-RECON-01** | 미가격 오더 있는 Agency 로그인 → 정산 조회 | 상단에 미가격 오더 알림 뱃지 + 목록 표시 | 정산 페이지 |
| **TC-B-RECON-02** | 모든 오더 가격 책정된 Agency → 정산 조회 | 알림 섹션 미표시 (null 반환) | 정산 페이지 |

### 35. Agency 정산 오더번호 검색 (IMP-126)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-B-SEARCH-01** | 오더번호 ILIKE 검색 — "ZN-2026" 입력 | 일치 오더만 반환 (`ilike` 조건 호출 확인) | `tests/integration/p7-agency-settlement.test.ts` |
| **TC-B-SEARCH-02** | 존재하지 않는 오더번호 검색 | 빈 배열 반환 (에러 없음) | `tests/integration/p7-agency-settlement.test.ts` |
| **TC-B-SEARCH-03** | 오더번호 + 화주 필터 동시 적용 | 두 조건 AND 결합 결과 확인 | `tests/integration/p7-agency-settlement.test.ts` |

### 34. Phase 7 일마감 처리 (Phase 7 SPR-05)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P7-CLOSE-01** | 일일 출고 내역 집계 | RELEASED 상태 오더 패키지 수 및 중량 집계 검증 | `tests/unit/ups/daily-close.test.ts` |
| **TC-P7-CLOSE-02** | 일일 매출/매입/마진 집계 및 마진율 | snapshots 기준 매출, 매입, 마진율 계산 정확도 검증 | `tests/unit/ups/daily-close.test.ts` |
| **TC-P7-CLOSE-03** | 기간별 마감 이력 조회 및 일자별 그룹핑 | 기간 내 일자별 그룹핑 및 정렬 정상 동작 확인 | `tests/unit/ups/daily-close.test.ts` |
| **TC-P7-CLOSE-04** | 출고 데이터가 없는 날의 집계 처리 | 데이터 없는 일자 조회 시 안전한 0 반환 처리 | `tests/unit/ups/daily-close.test.ts` |
| **TC-P7-CLOSE-05** | 일마감 데이터 권한 검증 | ADMIN/MANAGER 외 타 역할 접근 차단 검증 | `tests/unit/ups/daily-close.test.ts` |

### 36. Phase 8 UPS E2E 레이블 발급 전체 흐름 (IMP-140)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P8-UPS-01** | 창고 출고 화면 → UPS 레이블 미발급 상태 확인 | 출고 전 `UPS 미발급` 텍스트 표시 확인 | `tests/e2e/e2e-26-ups-label-flow.spec.ts` |
| **TC-P8-UPS-02** | 출고 확정 → createorder → 운송장번호 발급 | UPS createorder 정상 호출 및 label_data 저장 | `tests/e2e/e2e-26-ups-label-flow.spec.ts` |
| **TC-P8-UPS-03** | getnewlabel → 레이블 PDF URL 생성 | PDF URL 정상 반환 확인 | `tests/e2e/e2e-26-ups-label-flow.spec.ts` |
| **TC-P8-UPS-04** | `zen_ups_labels` DB 레코드 삽입 확인 | 테이블 upsert 정상 동작 | `tests/e2e/e2e-26-ups-label-flow.spec.ts` |
| **TC-P8-UPS-05** | Void 버튼 → confirm → 폐기 완료 | `markLabelVoided` UPDATE 성공 및 UI 반영 | `tests/e2e/e2e-26-ups-label-flow.spec.ts` |
| **TC-P8-UPS-06** | 재발급 버튼 클릭 → 새 운송장 번호 갱신 | `issueUpsLabel` 정상 호출 및 DB `is_voided=false` 레코드 생성 확인 | `tests/e2e/e2e-26-ups-label-flow.spec.ts` |
| **TC-P8-UPS-07** | gettrack polling → tracking_events 저장 | 폴링 첫 호출 후 `zen_ups_tracking_events` 삽입 확인 | `tests/e2e/e2e-26-ups-label-flow.spec.ts` |

### 37. Agency 화주 계정 발급 기반 검증 (Issue #180 TASK-B-056)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-AGPOL-01** | 할인율 정책 없는 대리점 오버라이드 등록 차단 | `zen_agency_pricing_policies` 부재 시 INSERT 에러 발생 확인 | `tests/integration/p71-ups-agency-pricing.test.ts` |
| **TC-UPS-AGPOL-02** | cost_price = 판매가×(1-할인율) 자동계산 | 트리거가 Agency 입력값을 무시하고 재계산하는지 확인 | `tests/integration/p71-ups-agency-pricing.test.ts` |
| **TC-UPS-AGPOL-03** | UPDATE 시에도 cost_price 자동 재계산 유지 | Agency가 임의 값으로 갱신 시도해도 트리거값 유지 확인 | `tests/integration/p71-ups-agency-pricing.test.ts` |
| **TC-UPS-AGPOL-04** | 현지통관/기타 부가수수료 4종 시드 확인 | DUTY_AMOUNT 등 4종, fuel_surcharge_applicable=false 확인 | `tests/integration/p71-ups-agency-pricing.test.ts` |
| **TC-UPS-AGPOL-05** | `fn_get_ups_agency_selling_price` 반환값 검증 | Agency override selling_price 정상 반환 확인 | `tests/integration/p71-ups-agency-pricing.test.ts` |

### 38. Phase 7.1 UPS 요금 계산 엔진 보강 — Platform/Agency/Shipper (IMP-145)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-ENGINE-01** | 청구중량 계산(0.5kg 올림·실중량/부피중량 비교) | 기존 로직 정합성 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-ENGINE-02** | 원가 ×1.07 반영 | SNTL 원자료 원가 할증 규칙 정확성 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-ENGINE-03** | 대형포장물(OVERSIZE) 특수 판정 6종 | 길이+둘레 300~400cm 조건·최소청구중량 40kg 강제 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-ENGINE-04** | Agency 단계 계산(override/폴백 분기) | R3~R5 공식 정확성 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-ENGINE-05** | Shipper 단계 계산(화주 할인 적용) | R6 공식 정확성 확인 | `tests/unit/ups/pricing-engine.test.ts` |

### 39. Phase 7.1 estimateUpsFreight 통합 Action (IMP-145)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-FREIGHT-01** | Platform/Agency/Shipper 3단계 견적 조회(agencyOrgId·shipperOrgId 유무별 분기, Zone/기준요금 미존재 에러) | An-14 §4·§11 API 계약 검증 | `tests/unit/ups/freight-actions.test.ts` |

### 39. Phase 7.1 Agency 부가요금 CRUD (IMP-145)

| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-AG-OC-01** | 부가요금 목록 조회 | `getAgencyOtherCharges` 정상 동작 | `tests/unit/agency/other-charges-actions.test.ts` |
| **TC-AG-OC-02** | 부가요금 등록 | `upsertAgencyOtherCharge` 정상 동작 (unique: agency_org_id + other_charge_id) | `tests/unit/agency/other-charges-actions.test.ts` |
| **TC-AG-OC-03** | 부가요금 비활성화 | `deactivateAgencyOtherCharge` 정상 동작 | `tests/unit/agency/other-charges-actions.test.ts` |

### 40. Phase 7.2 IMP-146 UPS Zone-Box 매핑 정밀화

| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-ZONEMAP-01** | 정확 매치: service+direction 일치 → Zone 반환 | Fallback 없이 정확한 Zone 매핑 검증 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-ZONEMAP-02** | 1단계 Fallback: direction 없음 → `null` 방향 폴백 | direction 미지정 시 자동 폴백 검증 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-ZONEMAP-03** | 2단계 Fallback: service+direction 전부 불일치 → `null` 반환 | 완전 미매핑 국가의 null 반환 + `fallbackApplied` 필드 검증 | `tests/unit/ups/pricing-engine.test.ts` |

### 41. Hotfix DEF-095 — WW_EXPEDITED 상품별 중량 반올림 규칙 (TASK-181)

| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-UPS-EXPEDITED-ROUND-01** | WW_EXPEDITED 20kg 이하 1kg 단위 올림 | 공식 Rate Guide p.2 원문 규칙 준수 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-EXPEDITED-ROUND-02** | WW_EXPEDITED 20kg 초과 1kg 단위 올림 | 경계값 이후에도 규칙 유지 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-EXPEDITED-ROUND-03** | 그 외 상품 20kg 이하 0.5kg 단위 올림 | 기존 규칙 회귀 방지 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-EXPEDITED-ROUND-04** | 그 외 상품 20kg 초과 1kg 단위 올림 | 경계 전환 정확성 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-EXPEDITED-ROUND-05** | `computeUpsFreight` 통합 — WW_EXPEDITED 청구중량 반영 | 실제 계산 흐름에 반올림 함수 정상 연결 확인 | `tests/unit/ups/pricing-engine.test.ts` |
| **TC-UPS-TIER-01** | 20kg 초과 per-kg 요율 적용 | 20kg 초과 화물에 대해 구간별 kg당 단가 × 중량 계산 검증 | `tests/unit/ups/pricing-engine-tier-dwb.test.ts` |
| **TC-UPS-TIER-02** | 20kg 초과 중량 올림 매칭 | 20kg 초과 시 서비스 무관 1.0kg 단위 올림 매칭 검증 | `tests/unit/ups/pricing-engine-tier-dwb.test.ts` |
| **TC-UPS-DWB-01** | DWB 적용 대상 계산 | 다음 상위 중량 구간 최소중량가 적용 시 비용 절감 및 `dwbApplied: true` 확인 | `tests/unit/ups/pricing-engine-tier-dwb.test.ts` |
| **TC-UPS-DWB-02** | DWB 미적용 대상 계산 | 다음 구간 적용 시 비용이 더 크면 기존 중량가 유지 및 `dwbApplied: false` 확인 | `tests/unit/ups/pricing-engine-tier-dwb.test.ts` |
| **TC-UPS-DWB-03** | DWB 20kg 경계 전이 | 20.0kg 이하에서 21.0kg(per-kg 첫 티어 최소값)으로의 DWB 전이 및 단가 변경 검증 | `tests/unit/ups/pricing-engine-tier-dwb.test.ts` |
| **TC-UPS-FREIGHTMIN-01** | Freight 최소운임 상향 적용 | 계산 요금이 Zone/Product 최소운임 미만일 때 최소운임 강제 상향 검증 | `tests/unit/ups/pricing-engine-tier-dwb.test.ts` |
| **TC-UPS-FREIGHTMIN-02** | Freight 최소운임 이상 정상 적용 | 계산 요금이 최소운임 이상일 때 상향 조정 미적용 검증 | `tests/unit/ups/pricing-engine-tier-dwb.test.ts` |

### 42. Agency 화주 계정 발급 기반 검증 (Issue #180 TASK-B-056)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P7-SHIPPER-05a** | `login_email` 미입력 시 스키마 거부 | 필수 필드 누락 검증 | `tests/unit/agency/shipper-actions.test.ts` |
| **TC-P7-SHIPPER-05b** | `login_email` 잘못된 이메일 형식 거부 | 이메일 형식 유효성 검증 | `tests/unit/agency/shipper-actions.test.ts` |
| **TC-P7-SHIPPER-05c** | `login_email` + 주소 6필드 정상 통과 | 국외 화주 등록 전체 필드 통과 확인 | `tests/unit/agency/shipper-actions.test.ts` |

### 43. 화주 등록 폼 UI (Issue #180 TASK-B-061)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-P7-UI-SHIPPER-01** | 화주 등록 폼 초기 로드 시 LoginAccountFields가 RequiredFields 앞에 위치 | 섹션 순서 검증 | `tests/unit/agency/shipper-form-ui.test.tsx` |
| **TC-P7-UI-SHIPPER-02** | 잘못된 이메일 형식 입력 시 유효성 오류 메시지 표시 | 클라이언트 유효성 검사 | `tests/unit/agency/shipper-form-ui.test.tsx` |
| **TC-P7-UI-SHIPPER-03** | 신규 등록 폼 초기 로드 시 grade 기본값 = BRONZE | 기본값 설정 | `tests/unit/agency/shipper-form-ui.test.tsx` |
| **TC-P7-UI-ADDR-01** | 국가 KR/US/JP별 주소 검색 UI 분기 (popup→embed 전환) | 국가별 입력 필드 렌더링 + Kakao Postcode embed 모달 표시 검증 | `tests/unit/agency/address-input.test.tsx` |
| **TC-P7-UI-ADDR-02** | 주소 검색 임베드 모달 내 주소 선택 시 roadAddress/zipcode 자동 반영 | DaumPostcodeEmbed onComplete 콜백 → roadAddress + zonecode 입력 + 모달 닫힘 검증 | `tests/unit/agency/address-input.test.tsx` |

---

## 📝 가이드라인 (R-09 Enforcement)
1. **추가 의무**: 신규 기능 개발 시 위 카테고리에 맞는 테스트를 반드시 추가하십시오.
2. **실행 의무**: 모든 커밋 전 `npm run test:regression`을 실행하여 위 명세 전원이 초록색인지 확인하십시오.


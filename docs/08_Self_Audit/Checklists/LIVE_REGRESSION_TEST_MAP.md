# 🗺️ LIVE Regression Test Master Map

> **상태:** [ACTIVE]  
> **총 테스트 케이스:** 109 Cases (PH4-UAT-01 TRK 검증 1건 추가 포함 전원 활성)  
> **최종 검증일:** 2026-04-26  

제니스 플랫폼의 비즈니스 영속성을 보장하는 회귀 테스트 케이스의 통합 명세서입니다. 모든 신규 개발 및 수정 시 이 맵에 케이스가 추가되어야 하며, 전체 테스트가 통과되어야 합니다.

---

## 🛡️ 테스트 케이스 명세 (Test Specifications)

### 1. 권한 및 보안 (Auth/RBAC)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-S.1** | SUPER_ADMIN 바이패스 | 관리자 권한의 전역 접근성 보장 | `tests/unit/auth/rbac.test.ts` |
| **TC-S.2** | 일반 화주 관리자 메뉴 차단 | 역할 기반 접근 제어(RBAC)의 엄격한 분리 | `tests/unit/auth/rbac.test.ts` |
| **TC-S.3** | 화주 오더 등록/이력 권한 | 실무 역할(Corporate)의 필수 기능 접근성 | `tests/unit/auth/rbac.test.ts` |
| **TC-S.4** | Default Deny (익명 차단) | 인증되지 않은 사용자의 무단 접근 원천 차단 | `tests/unit/auth/rbac.test.ts` |

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

### 4. 오더 라이프사이클 및 상태 (Order Status & Actions)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-OR.1** | 오더 기본 생성 | 서버 액션을 통한 오더/아이템 트랜잭션 성공 | `tests/unit/logistics/order-actions.test.ts` |
| **TC-OR.2** | v2 보강 필드 저장 | 송하인 연락처 및 비고란 데이터 적재 확인 | `tests/unit/logistics/order-actions.test.ts` |
| **TC-OR.3** | 상태 변경 권한 (Operator) | 실무자의 유효한 상태 전이 허용 확인 | `tests/unit/logistics/order-status.test.ts` |
| **TC-OR.4** | 상태 변경 제한 (Shipper) | 화주(User)의 상태 변경 권한 통제 확인 | `tests/unit/logistics/order-status.test.ts` |
| **TC-OR.5** | 상태 머신 유효성 | 비정상적인 상태 점프(REGISTERED -> DELIVERED) 차단 | `tests/unit/logistics/order-status.test.ts` |

### 5. 마스터 오더 거버넌스 (Master Order)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-M.1** | 마스터 상태 제약 (Immutable) | 마스터에 묶인 오더의 개별 상태 변경 차단 | `tests/unit/master/master_policy.test.ts` |
| **TC-M.2** | 마스터 취소 시 자동 해체 | 마스터 취소/삭제 시 하위 오더 원복(REGISTERED) | `tests/unit/master/master_policy.test.ts` |
| **TC-M.3** | 마스터 수동 해체 (Dissolve) | 선택된 오더를 마스터에서 정상 분리 및 배정 해제 | `tests/unit/master/master_policy.test.ts` |
| **TC-M.4** | 마스터 상세 결합 조회 | 마스터 정보와 소속 하우스 목록 통합 반환 확인 | `tests/unit/master/master-detail.test.ts` |
| **TC-M.5** | 마스터 액션 예외 처리 | 존재하지 않는 ID 또는 DB 실패 시 안정적 대응 | `tests/unit/master/master-detail.test.ts` |

### 6. 정밀 물류 계산 (Logistics Calculation)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-C.1** | Chargeable Weight (Air) | IATA 기준(부피/중량 중 큰 값) 산출 무결성 | `tests/unit/logistics/freight-calculator.test.ts` |
| **TC-C.2** | Revenue Ton (RT, Sea) | 해상 운임용 중량/CBM 비교 RT 산출 검증 | `tests/unit/logistics/freight-calculator.test.ts` |
| **TC-C.3** | 항공 요율 슬랩 매칭 | 중량 구간별(Slab) 정확한 요율 적용 확인 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-C.4** | 요율 유효기간 중첩 감지 | 동일 노선 기간 중복 등록 방지 로직 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-C.5** | 공용 포트 필터링 Logic | 모드(AIR/SEA)에 따른 UI 노드 필터링 정확도 | `tests/unit/logistics/rate-engine.test.ts` |

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

---

### 9. 지능형 트래킹 가시성 (Intelligent Tracking)
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

---

## 📊 최신 검증 이력 (Execution History)

| 검증일 | 버전 | 성공/실패 | 총 소요시간 | 결과 리포트 |
| :--- | :--- | :---: | :--- | :--- |
| 2026-04-21 | v1.1 | ✅ PASS | 1.88s | 28/28 Passed |
| 2026-04-22 | v2.1 | ✅ PASS | 2.81s | 58/58 Fully Registered & Verified |
| 2026-04-23 | v2.2 | ✅ PASS | 7.9s | 60/60 QA-02 통합 2건 추가, 데이터 레이스 픽스 |
| 2026-04-24 | v3.0 | ✅ PASS | 36.03s | 80/80 NOTIF-01 알림 엔진 TC-N.1~5 (5건) 신규 등록 |
| 2026-04-24 | v3.1 | ✅ PASS | 44.13s | 93/93 ROU-01 스코어링 TC-R.1~3 (단위) + TC-R.4~5 (통합) 신규 등록 |
| 2026-04-24 | v3.2 | ✅ PASS | 45.11s | 95/95 ROU-01 통합 테스트 3건 추가 및 Mocking 정책 수정 완료 |
| 2026-04-24 | v3.3 | ✅ PASS | 36.30s | 99/99 Phase 3.3 Sprint A (ROU-02) 버그 수정(BUG-08/09/10-A) 및 검증 완료 |
| 2026-04-24 | v3.4 | ✅ PASS | 40.26s | 102/102 Phase 3.3 Sprint B (ROU-04/05) Action 통합 테스트 추가 및 검증 완료 |
| 2026-04-25 | v3.5 | ✅ PASS | 50.42s | 108/108 TC-G.2 mock 패턴 수정(mockResolvedValue→mockReturnValue), inventory 음수 조정 패턴 수정(rejects.toThrow→toEqual), TS 타입 수정 7건(implicit any 3건, OrderStatus, addTrackingEvent 인자, lowStockOnly, checkPermission) |
| 2026-04-26 | v3.6 | ✅ PASS | — | 109/109 PH4-UAT-01 TRK 모듈 브라우저 UAT 완료 (1건 추가). BUG-FIN-RLS-01(zen_invoices UPDATE RLS 누락), BUG-MW-API-01(/api i18n 리다이렉트), BUG-INV-HIST-01(history INSERT org_id FK 위반) 코드 수정 후 기존 109/109 전원 PASS 확인 |

---

## 📝 가이드라인 (R-09 Enforcement)
1. **추가 의무**: 신규 기능 개발 시 위 카테고리에 맞는 테스트를 반드시 추가하십시오.
2. **실행 의무**: 모든 커밋 전 `npm run test:regression`을 실행하여 위 명세 전원이 초록색인지 확인하십시오.

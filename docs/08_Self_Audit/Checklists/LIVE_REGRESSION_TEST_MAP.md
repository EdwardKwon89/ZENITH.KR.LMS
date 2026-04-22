# 🗺️ LIVE Regression Test Master Map

> **상태:** [ACTIVE]  
> **총 테스트 케이스:** 52 Cases  
> **최종 검증일:** 2026-04-22  

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

---

## 📊 최신 검증 이력 (Execution History)

| 검증일 | 버전 | 성공/실패 | 총 소요시간 | 결과 리포트 |
| :--- | :--- | :---: | :--- | :--- |
| 2026-04-21 | v1.1 | ✅ PASS | 1.88s | 28/28 Passed |
| 2026-04-22 | v2.0 | ✅ PASS | - | 49/49 Fully Registered & Verified |

---

## 📝 가이드라인 (R-09 Enforcement)
1. **추가 의무**: 신규 기능 개발 시 위 카테고리에 맞는 테스트를 반드시 추가하십시오.
2. **실행 의무**: 모든 커밋 전 `npm run test:regression`을 실행하여 위 명세 전원이 초록색인지 확인하십시오.

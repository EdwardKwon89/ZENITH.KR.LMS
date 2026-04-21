# 🗺️ LIVE Regression Test Master Map

> **상태:** [ACTIVE]  
> **총 테스트 케이스:** 28 Cases  
> **최종 검증일:** 2026-04-21  

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
| **TC-O.1** | 유효 데이터 성공 | 정상적인 오더 페이로드의 처리 보장 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-O.2** | 필수 항목(shipper_id) 누락 | 화주 정보 없는 오더의 생성 원천 차단 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-O.3** | 부적절 이메일 형식 | 입력 데이터의 형식적 정합성 검증 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-O.4** | 최소 아이템 수(1개) | 빈 주문(Empty Order)의 생성을 방지 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-O.5** | 송하인 담당자 정보 수용 | v2 신규 필드(성명, 연락처) 검증 수용 | `tests/unit/logistics/order-validation.test.ts` |
| **TC-O.6** | 선택 필드 유연성 | 담당자 정보 누락 시에도 검증 통과(Optional) | `tests/unit/logistics/order-validation.test.ts` |

### 4. 오더 라이프사이클 (Logistics/Order Actions)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-OR.1** | 오더 생성 및 필드 매핑 | 수취인/송하인 정보가 DB에 정확히 전달되는지 확인 | `tests/unit/logistics/order-actions.test.ts` |
| **TC-OR.2** | 권한 없는 오더 생성 차단 | 비정상 세션에서의 오더 생성 시도 방지 | `tests/unit/logistics/order-actions.test.ts` |
| **TC-OR.3** | 신규 필드(v2) 저장 확인 | 담당자명/연락처/비고란이 `insert`에 포함되는지 검증 | `tests/unit/logistics/order-actions.test.ts` |

### 5. 인프라 및 가드 (Auth/Guards)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-G.1** | 사용자 인증 가드 | 유효한 세션 존재 여부 및 프로필 연결 확인 | `tests/unit/auth/guards.test.ts` |
| **TC-G.2** | 관리자 전용 가드 | 일반 사용자의 관리자 액션 접근 원천 차단 | `tests/unit/auth/guards.test.ts` |

### 6. 마스터 데이터 (Master Data)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-M.1** | 오더 번호 생성 패턴 | `ZEN-YYYY-NNNNNN` 형식 준수 및 중복 방지 | `tests/unit/master/master-actions.test.ts` |
| **TC-M.2** | 항구/화주 리스트 조회 | 마스터 데이터 로딩 시 권한별 필터링 작동 확인 | `tests/unit/master/master-actions.test.ts` |

### 7. 지능형 운임 엔진 (Logistics/Rate Engine)
| ID | 테스트 항목 | 목적 | 파일 경로 |
| :--- | :--- | :--- | :--- |
| **TC-R.1** | 중량 단계별(Slab) 계산 | 복잡한 중량 구간별 요금 로직의 산술 정확성 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-R.2** | 소수점 중량 올림 처리 | 물류 관행에 따른 중량 반올림/올림 로직 확인 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-R.3** | 노선 정보 부재 시 예외 | 경로 데이터 없는 경우의 우아한 오류 처리 | `tests/unit/logistics/rate-engine.test.ts` |
| **TC-R.4** | 최소 운임(Base Rate) 유지 | 구간 요금이 낮아도 최소 비용을 보장하는 로직 | `tests/unit/logistics/rate-engine.test.ts` |

---

## 📊 최신 검증 이력 (Execution History)

| 검증일 | 버전 | 성공/실패 | 총 소요시간 | 결과 리포트 |
| :--- | :--- | :---: | :--- | :--- |
| 2026-04-21 | v1.1 | ✅ PASS | 1.88s | 28/28 Passed |

---

## 📝 가이드라인 (R-09 Enforcement)
1. **추가 의무**: 신규 기능 개발 시 위 카테고리에 맞는 테스트를 반드시 추가하십시오.
2. **실행 의무**: 모든 커밋 전 `npm run test:regression`을 실행하여 위 명세 전원이 초록색인지 확인하십시오.

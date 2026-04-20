# UAT-1.3: 사용자 인증 및 법인/개인 가입 이원화 테스트 (Revised)

**작성일**: 2026-04-18
**업무 지시**: Edward (CEO)
**총괄**: Antigravity (CEO Agent)

---

## 🏛️ 그룹 A: 법인 회원 시나리오 (Corporate)

### TC-1.1 ~ TC-1.5: 법인 가입 및 승인 프로세스
| ID | 시나리오 명 | 상세 내용 | 검증 방법 | 결과 |
|:---:|:---|:---|:---|:---:|
| **TC-1.1** | 법인 가입 완료 | 정보 입력 및 제출 (status = PENDING) | SQL-01 | |
| **TC-1.2** | 가입 UX 무결성 | 404 없이 Locale(/ko) 유지 확인 | Browser | |
| **TC-1.3** | 승인 대기 접속제한 | PENDING 유저 기능 접근 차단 확인 | Browser | |
| **TC-1.4** | 관리자 승인 집행 | `ZEN-XXXXXX` 발급 및 ACTIVE 전이 | SQL-03 | |
| **TC-1.5** | 승인 후 권한 활성화 | ACTIVE 유저 대시보드 정상 진입 | Browser | |
| **TC-1.6** | **서류 보완 요청** | 관리자 코멘트와 함께 보완 처리 (TC-1.1 상태 연계) | SQL-04 / Browser | |
| **TC-1.7** | **보완 후 재신청** | 보완 페이지에서 수정 제출 시 PENDING 복구 확인 | SQL-05 / Browser | |

---

## 🏛️ 그룹 B: 개인 회원 시나리오 (Personal)

### TC-2.1 ~ TC-2.2: 개인 가입 및 즉시 서비스 이용
| ID | 시나리오 명 | 상세 내용 | 검증 방법 | 결과 |
|:---:|:---|:---|:---|:---:|
| **TC-2.1** | 개인 가입 완료 | 정보 입력 후 제출 (org_id IS NULL) | SQL-02 | |
| **TC-2.2** | 즉시 서비스 활성화 | 별도 승인 없이 `/dashboard` 진입 확인 | Browser | |
| **TC-2.3** | 개인 사용자 가드 | 개인 유저가 `/admin` 접근 시 `/dashboard`로 튕김 확인 | Browser | |

---

## 🏛️ 그룹 C: 플랫폼 운영자 시나리오 (Platform Admin)

### TC-3.1 ~ TC-3.3: 운영 권한 및 관리자 대시보드
| ID | 시나리오 명 | 상세 내용 | 검증 방법 | 결과 |
|:---:|:---|:---|:---|:---:|
| **TC-3.1** | 운영자 로그인 | 플랫폼 관리자 계정으로 로그인 (status = ACTIVE) | SQL-06 | |
| **TC-3.2** | 관리자 센터 진입 | `/admin` 경로로 자동 랜딩 및 UI 정상 노출 확인 | Browser | |
| **TC-3.3** | 승인 권한 실행 | 미승인 법인 리스트 조회 및 승인/보완 버튼 작동 확인 | Browser | |

---

## 🔍 검증용 SQL 쿼리 (Evidence)

- **SQL-01 (Org Pending Check)**:
  `SELECT name, biz_no, status FROM organizations WHERE name LIKE 'Zenith V4%';`
- **SQL-02 (Personal User Check)**:
  `SELECT email, role, org_id FROM profiles WHERE email = 'personal_v1@zenith.kr';`
- **SQL-03 (Approval & ID Check)**:
  `SELECT corporate_id, status FROM organizations WHERE name LIKE 'Zenith V4%';`
- **SQL-04 (Supplement & Comment Check)**:
  `SELECT status, approval_comment FROM organizations WHERE id = 'TARGET_ORG_UUID';`
- **SQL-05 (Auth Meta Sync Check)**:
  `SELECT id, email, raw_app_meta_data->>'status' FROM auth.users WHERE id = 'TARGET_USER_UUID';`
- **SQL-06 (Admin Profile Check)**:
  `SELECT email, role, (raw_app_meta_data->>'org_type') as org_type FROM auth.users WHERE email = 'admin@zenith.kr';`

## 📊 테스트 결과 요약 (Mapping Report)
*수행 결과 매핑 시나리오 ID별로 데이터 입력 예정*

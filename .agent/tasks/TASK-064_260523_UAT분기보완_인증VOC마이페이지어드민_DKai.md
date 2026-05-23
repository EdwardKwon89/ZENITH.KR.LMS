# TASK-064 — UAT 분기 보완: 인증·VOC·마이페이지·어드민

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-064 |
| IMP-ID | — (UAT 문서 보완 · 코드 변경 없음) |
| 생성일 | 2026-05-23 |
| 담당 Agent | D_Kai |
| 우선순위 | P4 |
| 전제조건 | TASK-063 ✅ (UAT_MASTER.md 충돌 방지) |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | UAT 문서 추가·수정 — 기존 코드 변경 없음 |

---

## 배경

Aiden이 register/page.tsx 코드 검토 중 UAT-01-01 개인/법인 분기 누락을 발견하였고, 이를 계기로 전 UAT 영역에 대해 코드-시나리오 정합성을 재점검하였다. 그 결과 D_Kai 담당 영역(UAT_01·07·08·09)에서 아래 High 분기가 누락된 것이 확인되었다.

| 누락 분기 | 영역 | 심각도 |
|:---|:---:|:---:|
| 개인회원 가입 플로우 전체 누락 (승인 없이 즉시 이용) | UAT-01 | High |
| 법인 기존 합류(JOIN) 플로우 누락 | UAT-01 | High |
| UAT-01-01 법인 신규 등록 단계 오류 (DOCS·다단계 wizard 미반영) | UAT-01 | High |
| ADMIN 로그인 시 VOC 접수 버튼 노출 여부 미검증 | UAT-07 | High |
| `/mypage/customs` ADMIN 접근 차단 미검증 | UAT-08 | High |
| 조직 REJECTED 사용자 로그인 차단 검증 부재 | UAT-09 | High |
| ADMIN 자기 자신 역할 변경 제한 검증 부재 | UAT-09 | High |

> ⚠️ **작업 범위 엄수**: UAT 문서(시나리오 추가·수정)만 허용. 코드 수정 절대 금지.
> 코드 레벨 결함이 발견되더라도 시나리오만 작성하고 코드는 건드리지 않는다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-064 → 🔄 동시 반영**
   - 단, 전제조건 TASK-063 ✅ 확인 후 착수할 것

2. **UAT_01_인증_회원가입.md 수정**: `docs/91_FinalTest/UAT/UAT_01_인증_회원가입.md`

   - **UAT-01-01 전면 재작성** (기존 절차 오류 수정):
     - 기존: 단일 폼 입력 방식 (실제 구현과 불일치)
     - 수정: 다단계 wizard 플로우 반영 — 법인 신규 등록(CREATE) 메인 시나리오
     - 플로우: `TYPE(법인 선택) → ORG_JOIN → ORG_CREATE(법인명·사업자번호·유형) → INFO(이름·이메일·비밀번호) → DOCS(사업자등록증 업로드) → /register/pending 이동`
     - 입력 데이터: 법인명, 사업자등록번호, 유형(송하인), 이름, 이메일, 비밀번호, 사업자등록증 파일
     - 합격 기준: /register/pending 이동, DB organizations.status = 'PENDING' 확인

   - **UAT-01-06 신규 추가**: 개인회원 가입
     - 역할: PERSONAL (신규)
     - 플로우: `TYPE(개인 선택) → INFO(이름·이메일·비밀번호) → 즉시 /ko/orders 이동 (승인 불필요)`
     - 합격 기준: 가입 즉시 /ko/orders 페이지 이동 (pending 페이지 거치지 않음), ADMIN 승인 없이 서비스 이용 가능
     - 이 시나리오는 법인회원과 명확히 다른 경로임을 검증

   - **UAT-01-07 신규 추가**: 법인 기존 합류 (JOIN)
     - 역할: CORPORATE (기존 법인 합류)
     - 플로우: `TYPE(법인 선택) → ORG_JOIN(기존 법인 검색·선택) → INFO(이름·이메일·비밀번호) → /register/pending 이동`
     - 사전 조건: 기존 법인 조직(organizations 테이블) 1건 이상 존재
     - 입력 데이터: 기존 법인명 검색어, 조직 선택, 개인 정보
     - 합격 기준: 기존 조직에 연결됨, /register/pending 이동, 법인 신규 등록 없이 합류 처리

3. **UAT_07_VOC_고객지원.md 보완**: `docs/91_FinalTest/UAT/UAT_07_VOC_고객지원.md`
   - **UAT-07-06 신규 추가**: ADMIN 로그인 시 VOC 접수 제한 검증
     - 역할: ADMIN
     - 시나리오: ADMIN 로그인 → `/ko/voc` 접근 → 'VOC 접수하기' 버튼 노출 여부 확인
     - 기대 결과: ADMIN에게는 접수 버튼이 숨겨지거나 비활성화됨 (ADMIN은 처리자 역할)
     - 합격 기준: ADMIN이 VOC 접수 액션을 실행할 수 없음 확인

4. **UAT_08_마이페이지.md 보완**: `docs/91_FinalTest/UAT/UAT_08_마이페이지.md`
   - **UAT-08-06 신규 추가**: ADMIN의 SHIPPER 전용 마이페이지 접근 차단 검증
     - 역할: ADMIN
     - 시나리오: ADMIN 로그인 → `/ko/mypage/customs` 직접 접근 → 접근 차단(403·리다이렉트·오류 메시지) 확인
     - 시나리오B: ADMIN 로그인 → `/ko/mypage/corporate` 직접 접근 → 동일하게 차단 확인
     - 합격 기준: SHIPPER 전용 페이지에 ADMIN 접근 불가 확인

5. **UAT_09_어드민_운영.md 보완**: `docs/91_FinalTest/UAT/UAT_09_어드민_운영.md`
   - **UAT-09-09 신규 추가**: REJECTED 조직 사용자 로그인 차단 검증
     - 역할: ADMIN (거부 처리) / SHIPPER (차단 확인)
     - 사전 조건: PENDING 상태의 조직 1건 존재
     - 시나리오: ADMIN → 조직 거부(REJECTED) 처리 → 해당 조직 사용자 계정으로 로그인 시도 → 로그인 차단 메시지 확인
     - 합격 기준: REJECTED 조직 사용자 로그인 불가, 적절한 안내 메시지 표시

   - **UAT-09-10 신규 추가**: ADMIN 자기 자신 역할 변경 제한 검증
     - 역할: ADMIN (ZENITH_SUPER_ADMIN 레벨)
     - 화면: `/ko/admin/permissions`
     - 시나리오: 권한 관리 페이지 → 로그인한 본인 계정 역할 변경 시도 → 차단(버튼 비활성·오류 메시지) 확인
     - 합격 기준: 자기 자신의 역할을 낮추는 변경 불가 확인

6. **UAT_MASTER.md 갱신**: `docs/91_FinalTest/UAT/UAT_MASTER.md`
   - 인덱스 표에 아래 6개 행 추가 (상태 ✅, 담당 D_Kai):
     - UAT-01-06 | 개인회원 가입 | PERSONAL | UAT_01 | D_Kai | ✅
     - UAT-01-07 | 법인 기존 합류 (JOIN) | CORPORATE | UAT_01 | D_Kai | ✅
     - UAT-07-06 | ADMIN VOC 접수 제한 | ADMIN | UAT_07 | D_Kai | ✅
     - UAT-08-06 | ADMIN 마이페이지 접근 차단 | ADMIN | UAT_08 | D_Kai | ✅
     - UAT-09-09 | REJECTED 사용자 로그인 차단 | ADMIN/SHIPPER | UAT_09 | D_Kai | ✅
     - UAT-09-10 | 자기 자신 역할 변경 제한 | ADMIN | UAT_09 | D_Kai | ✅
   - UAT-01-01 비고 갱신: "재작성 — 다단계 wizard 반영 (법인 신규 등록)"
   - 총 시나리오 수 갱신: 50 → 56 (신규 6개, UAT-01-01 재작성은 +0)
   - ⚠️ 결함 관리 원장 수정 금지 — 실행 전 사전 기재 불가

7. **코드 커밋**: `[D_Kai] docs: TASK-064 UAT 분기 보완 — 인증·VOC·마이페이지·어드민 8건 추가·수정`
   - 포함 파일: `UAT_01_인증_회원가입.md` + `UAT_07_VOC_고객지원.md` + `UAT_08_마이페이지.md` + `UAT_09_어드민_운영.md` + `UAT_MASTER.md`

8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)

9. **ACTIVE_TASK.md TASK-064 → 🔔 반영**

10. **문서 커밋**: `[D_Kai] docs: TASK-064 완료 보고 — task file 🔔`
    - 포함 파일: 본 파일 + ACTIVE_TASK.md

---

## 완료 기준 (DoD)

- [x] UAT-01-01 전면 재작성 (다단계 wizard 법인 신규 등록 플로우, DOCS 단계 포함)
- [x] UAT-01-06 신규 작성 (개인회원 가입, 즉시 /orders 이동 검증)
- [x] UAT-01-07 신규 작성 (법인 기존 합류 JOIN, 조직 검색·선택 포함)
- [x] UAT-07-06 신규 작성 (ADMIN VOC 접수 제한 검증)
- [x] UAT-08-06 신규 작성 (ADMIN customs·corporate 접근 차단, A·B 시나리오 포함)
- [x] UAT-09-09 신규 작성 (REJECTED 사용자 로그인 차단)
- [x] UAT-09-10 신규 작성 (자기 자신 역할 변경 제한)
- [x] UAT_MASTER.md 인덱스 6개 행 추가 + 총계 56개 갱신 (비고 컬럼 없어 미반영)
- [x] 코드 변경 없음 확인
- [x] 코드 커밋 완료 (해시: 95d2d97)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] 문서 커밋 완료 (해시: 56d8a47)

---

## 설계 의견 (Agent 작성)

> 단순 문서 작업 Task — 설계 의견 불필요. 전제조건 TASK-063 ✅ 확인 후 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 단순 Task — 설계 의견 불필요.

---

## 작업 결과

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-23 |
| 완료일 | 2026-05-23 |
| 수정·추가 시나리오 | UAT-01-01 재작성 + UAT-01-06·01-07·07-06·08-06·09-09·09-10 추가 (총 8건) |
| 커밋 해시 | 95d2d97 |
| 문서 커밋 해시 | 56d8a47 |

---

## Aiden 검토

> 이 섹션은 🔔 제출 후 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | Task 생성 — 코드-UAT 정합성 재점검 결과 D_Kai 담당 영역 High 분기 7건 누락 확인, 보완 지시. TASK-063 ✅ 전제조건 설정 (UAT_MASTER 충돌 방지) |
| 2026-05-23 | D_Kai (OpenCode) | TASK-064 구현 완료 — UAT-01-01 재작성 + 6개 시나리오 추가, UAT_MASTER 56개 갱신, 커밋 95d2d97 |

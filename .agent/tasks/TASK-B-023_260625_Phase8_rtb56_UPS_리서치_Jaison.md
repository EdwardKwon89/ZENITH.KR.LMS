# TASK-B-023 — [Phase 8] shxk.rtb56.com API 기반 UPS 연동 리서치 (DEF-079 대응)

> **TASK-ID**: TASK-B-023
> **생성일**: 2026-06-25
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (DEF-079 실 연동 대상 확인)
> **담당 Agent**: JSJung (팀 리더) → Dave (§1 리서치)
> **우선순위**: P1
> **관련 Issue**: [#112](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/112)
> **전제조건**: JSJung credentials 수령 완료, DEF-079 보고서 작성 완료
> **브랜치**: `feature/teamb-task-b-023-rtb56-ups-research`
> **상태**: 🔔

---

## [업무 개요]

DEF-079 확인 결과 실제 UPS 연동 대상이 `shxk.rtb56.com` 제3자 플랫폼으로 확인됨.
TASK-B-022 산출물(UPS 공식 REST API 기준)을 폐기하고 실제 연동 대상 기반으로 재리서치.

---

## [리서치 범위]

### §1. shxk.rtb56.com API 문서 분석 (Dave)

| 항목 | 내용 |
|:----|:------|
| **라이브 문서** | `https://shxk.rtb56.com/usercenter/manager/api_document.aspx` |
| **API 엔드포인트** | `POST http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8` |
| **인증 방식** | appToken + appKey (POST Body 파라미터) |
| **분석 범위** | 12개 serviceMethod 전량 문서화, 실측 검증 |

---

## [산출물]

| 파일 | 내용 |
|:----|:-----|
| `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` | shxk.rtb56.com API 스펙 리서치 결과 (TASK-B-022 문서 대체) |
| 본 Task file `[작업 결과]` 섹션 | 핵심 정보 요약 + An-13 입력 사항 |

> **R-11 준수**: 리서치 결과는 Aiden의 An-13 재설계 입력 자료로 사용됩니다.
> 구현 코드 작성은 An-13 Edward 승인 후 진행합니다.

---

## [DoD 체크리스트]

- [x] shxk.rtb56.com 인증 방식 명세 완료
- [x] 레이블 발급 API 스펙 문서화 (getnewlabel)
- [x] 트래킹 조회 API 스펙 문서화 (gettrackingnumber + gettrack)
- [x] 실제 API 호출 검증 완료
- [x] An-13 재설계 착수 가능 상태 확인

### §2 Baker 문서·PR

- [x] task file 상태 🔄→🔔
- [x] ACTIVE_TASK.md 갱신
- [x] LAST_REGRESSION_RESULT PASS 확인
- [x] PR `Closes #111` (DEF-079) + `Closes #112`

---

## [작업 결과]

### §1 리서치 완료 (Dave, 260625)

**핵심 발견**:
1. **단일 엔드포인트 + serviceMethod 분기 방식** (RESTful 아님)
2. **2단계 주문 프로세스**: createorder(order_status="D") → submitforecast(reference_no)
3. **12개 API 메서드** 전량 문서화 및 실측 검증 완료
4. **인증 유효 확인**: appToken + appKey POST body 방식, credentials 정상 작동
5. **라벨 출력**: PNG/PDF 선택 가능, A4/라벨지 지원

**반려 사항 조치** (Jaison 260625 리뷰):
- ✅ ① Credentials 값 마스킹 처리
- ✅ ② 브랜치 전환: `feature/teamb-task-b-023-rtb56-ups-research`
- ✅ ③ Task file [작업 결과] 작성 — 본 문서

**차단 항목**:
- shipping_method 코드 목록 getbasicdata로 조회 필요
- platform_id shxk 관리자 사전 등록 필요

### §2 Baker 문서·PR 완료 (2026-06-25)

| 항목 | 내용 |
|:-----|:------|
| 상태 | 🔄→🔔 |
| DoD | 전항목 ✅ |
| PR | #113 제출 완료 (Closes #111, #112) |
| LAST_REGRESSION_RESULT | FAIL→PASS 원복 |

---

## [발견 이슈]

| # | 내용 | 영향 | 상태 |
|:-:|:-----|:----:|:----:|
| 1 | HTTP 프로토콜 (HTTPS 아님) | 보안 위험 | 전달 |
| 2 | appToken 만료 정책 미확인 | 갑작스러운 장애 | 전달 |
| 3 | shipping_method 코드 사전등록 필요 | 주문 생성 불가 | getbasicdata 필요 |
| 4 | platform_id 사전등록 필요 | 플랫폼 주문 불가 | shxk 문의 필요 |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:------|
| 2026-06-25 | JSJung (Jaison) | Task 발령 — DEF-079 대응 shxk.rtb56.com API 리서치 |
| 2026-06-25 | Dave (DeepSeek V4) | §1 리서치 완료 — 12개 API 문서화 + 실측 검증 + 문서 대체 |
| 2026-06-25 | Dave (DeepSeek V4) | ① Credentials 마스킹 ② 브랜치 전환 ③ Task file 기재 (Jaison 반려 조치) |
| 2026-06-25 | Baker (Big Pickle) | §2 문서·PR 완료 — DoD 전량 ✅, PR#113 제출 (Closes #111/#112). 🔄→🔔 |
| 2026-06-25 | Baker (Big Pickle) | ❌ 반려 수정 — PR body `Closes #111` 추가, task file PR 번호 정정. |
| 2026-06-25 | Baker (Big Pickle) | ❌ 2차 반려 수정 — LAST_REGRESSION_RESULT FAIL→PASS 원복 (387/387 ALL PASS 실측 확인). `git add -A`로 의도치 않은 변경 포함 재발 — 단일 파일 지정 add로 방지 필요. |

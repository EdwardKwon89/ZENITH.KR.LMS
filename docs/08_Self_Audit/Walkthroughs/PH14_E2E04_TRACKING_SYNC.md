# E2E-04 Walkthrough: Tracking Synchronization & Milestone Update

> **Task ID**: PH14-E2E-04
> **Date**: 2026-05-03
> **Auditor**: Aiden

## 1. 개요
E2E-04 시나리오는 화물 트래킹 정보의 외부 동기화, 마일스톤 갱신, 그리고 그에 따른 화주 알림 발송 과정을 검증합니다.

## 2. 테스트 환경 및 사전 조건
- **테스트 대상 오더**: `Z-HOU-E2E03-01` (UUID `3ff5b116-29cd-4d90-8dd0-0e99c36a2155`)
- **사용자 역할**: Admin (동기화 실행) / User (알림 확인)
- **로케일**: `/ko/`

## 3. 검증 단계 및 결과

### Step 1: 어드민 트래킹 제어 센터 접속
어드민 대시보드에서 트래킹 관리 화면으로 이동합니다.
- **URL**: `/ko/tracking`

### Step 2: 트래킹 동기화 실행
'Sync All API' 버튼을 클릭하여 외부 캐리어 API(Mock)로부터 데이터를 수신합니다.
- **결과**: `zen_tracking_raw_logs`에 데이터가 적재되고, `zen_tracking_events`에 새로운 마일스톤이 생성됨.

### Step 3: 타임라인 및 상태 업데이트 확인
UI 상에서 트래킹 타임라인이 실시간으로 갱신되는지 확인합니다.
- **캡처**: `docs/99_Manual/E2E_04_Result/e2e_04_03_after_sync.png`
- **검증**: 오더 행에 `API` 뱃지가 표시되고, 상세 페이지의 타임라인에 새로운 노드 추가됨.

### Step 4: 화주 알림 생성 확인
시스템이 화주(Shipper)에게 자동으로 인앱 알림을 생성했는지 확인합니다.
- **검증**: `zen_notifications` 테이블에 해당 오더 상태 변경 알림 존재 확인.

## 4. 증적 자료 (Artifacts)

| 단계 | 설명 | 이미지 링크 |
|:---:|:---|:---|
| 1 | 로그인 성공 | [e2e_04_00_login_after.png](../../99_Manual/E2E_04_Result/e2e_04_00_login_after.png) |
| 2 | 동기화 전 목록 | [e2e_04_01_tracking_list_before.png](../../99_Manual/E2E_04_Result/e2e_04_01_tracking_list_before.png) |
| 3 | 검색 결과 확인 | [e2e_04_02_search_result.png](../../99_Manual/E2E_04_Result/e2e_04_02_search_result.png) |
| 4 | 동기화 후 결과 | [e2e_04_03_after_sync.png](../../99_Manual/E2E_04_Result/e2e_04_03_after_sync.png) |
| 5 | 트래킹 타임라인 | [e2e_04_04_tracking_timeline.png](../../99_Manual/E2E_04_Result/e2e_04_04_tracking_timeline.png) |

## 5. 자가 검증 결과
- **RLS 정책 준수**: ✅ (get_my_role() 기반 보안 강화 적용 완료)
- **비즈니스 로직**: ✅ (API 동기화 및 상태 전이 정상)
- **데이터 정합성**: ✅ (Admin Org 및 Order-Config 연결 확인)

---
**보고자**: Riley (Gemini)

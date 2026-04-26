# Task Archive — Phase 3.1 & ENV (완료 이관)

> **이관일:** 2026-04-24 | **이관 사유:** Phase 3.2 전환 시 완료 태스크 거버넌스 이관 의무

---

## ENV — 협업 환경 설정 (전체 완료)

| Task ID | 담당 | Task 명 | 완료 내용 |
|:---|:---|:---|:---|
| ENV-06 | Riley | TASK_BOARD archive 구조 구축 | `.agent/archive/` 생성 + 이관 체계 확립 |
| ENV-07 | Claude | ACTIVE_AGENT.md IDLE 초기화 | Status=IDLE, 업데이트 기록 추가 |
| ENV-08 | Claude | Tag Frontmatter 누락 보완 | 7개 파일 tags frontmatter 추가 |
| ENV-09 | Riley | Phase 3.1 전체 커밋 | SAR_2026-04-23_002 등록, 소급 불가 처리 완료 |
| ENV-10 | Claude | GEMINI.md 커밋 규약 추가 | GEMINI.md v1.12 — 커밋 & 브랜치 규약 섹션 추가 |

---

## Phase 3.1 — Tracking Module (전체 완료)

| Task ID | 담당 | Task 명 | 완료 내용 |
|:---|:---|:---|:---|
| BE-01 | Riley/Backend | API Spec 작성 | Ds-11 syncExternalTracking, getTrackingRawLogs 추가 (소급 승인) |
| BE-02 | Riley/Backend | DB Migration | zen_tracking_raw_logs 테이블 + RLS 적용 |
| BE-03 | Riley/Backend | Tracking Adapters | tracking-adapters.ts (Virtual, MockCarrier) |
| BE-04 | Riley/Backend | Server Actions | syncExternalTracking, getTrackingRawLogs 구현 |
| FE-01 | Aiden/CTO | Tracking UI | /tracking 통합 트래킹 대시보드 구현 |
| QA-01 | Riley/Audit | Technical QA | 백엔드 어댑터 파싱 및 DB 적재 무결성 검증 |
| QA-02 | Riley→Claude | Business QA | Raw JSON 보존 + 데이터 레이스 Fix (`fc20252`, `7fe26e2`) |

---

## Phase 3.1 — 잔여 Sprint B (완료)

| Task ID | 담당 | Task 명 | 완료 내용 |
|:---|:---|:---|:---|
| NOTIF-01 | Claude | 상태 변경 알림 엔진 연동 | Resend + zen_notifications + NotificationBell + /notifications 페이지. 완료: 2026-04-24. R-08: 23F/80T PASS |

---

## Phase 3.1 — 결함 수정

| Task ID | 담당 | Task 명 | 완료 내용 | 심각도 |
|:---|:---|:---|:---|:---|
| BUG-01 | Riley | 테이블명 오류 수정 | tracking.ts:176 `orders` → `zen_orders` | 🔴 High |
| BUG-02 | Riley | RLS 정책 보완 | zen_tracking_raw_logs ZENITH_SUPER_ADMIN 권한 추가 | 🟡 Medium |
| BUG-03 | Riley | 아카이브 중복 제거 | TASK_ARCHIVE.md 삭제, archive/ 구조 통일 | 🟢 Low |

---

## Phase 3.2 Finance Sprint A — 완료분

| Task ID | 담당 | Task 명 | 완료 내용 |
|:---|:---|:---|:---|
| FIN-00 | Riley | Finance API 명세 | Ds-11 v1.10 업데이트 (PDF/Excel) |
| FIN-01 | Riley | PDF 청구서 자동 발행 & 이력 관리 | jsPDF + Supabase Storage + InvoiceHistorySheet |
| BUG-04 | Riley | FIN-01 RLS 정책 보완 | PARTNER→ZENITH_SUPER_ADMIN/MANAGER. migration 20260424150000 |
| FIN-02 | Riley | 정산 데이터 엑셀 Export | xlsx Route Handler + ExportButton. 심사: 2026-04-24 PASS |

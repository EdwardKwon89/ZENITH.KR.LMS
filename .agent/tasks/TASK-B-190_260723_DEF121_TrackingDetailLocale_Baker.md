# TASK-B-190: DEF-121 TrackingDashboard Detail 링크 로케일 프리픽스 누락

## 기본 정보
- **이슈**: Issue #741 (DEF-121)
- **작성일**: 2026-07-23
- **작성자**: Baker
- **상태**: 🔔

## 문제 정의
`/ko/tracking` 화면 오더 목록에서 "Detail" 클릭 시 404 발생.
Link의 href가 `/orders/${track.order_id}`로 로케일 프리픽스 누락.

## 원인
`TrackingDashboard.tsx:258` — next/link 직접 import, `useParams()` 미사용으로 locale 세그먼트 미반영.

## 수정 내용
1. `useParams` import 추가 (`next/navigation`)
2. `const params = useParams()` + `const safeLocale = (params?.locale as string) || 'ko'`
3. href를 `/${safeLocale}/orders/${track.order_id}`로 변경

## 검증
- 테스트: 753/753 PASS
- 빌드: PASS

## PR
- PR#746: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/746

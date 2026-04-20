# [SAR-2026-04-18-001] 회원가입 UI 단계 누락 및 하이드레이션 오류

> **작성일**: 2026-04-18
> **보고자**: Antigravity (Execution Agent)
> **대상 기능**: WBS 1.3 사용자 인증 및 법인 등록 폼

## 1. 문제 개요
WBS 1.3 UAT 시뮬레이션 수행 중, 법인 회원이 '신규 법인 등록' 옵션을 선택했을 때 다음 단계인 `ORG_CREATE` 단계의 UI 렌더링 블록이 코드상에 존재하지 않아 화면에 아무것도 표시되지 않는 '백화 현상' 및 '동작 정지'가 발생함. 또한, 자동화 도구에 의한 DOM 조작으로 인해 Next.js Hydration Mismatch 오류가 발생하여 비정상 종료됨.

## 2. 근본 원인 분석 (Root Cause)
- **로직 설계 미비**: `SignupStep` 타입에 `ORG_CREATE`는 정의했으나, 실제 `switch/if` 렌더링 블록에서 해당 단계에 대한 JSX 코드를 작성하지 않고 다음 단계(`INFO`)로만 넘기려 함.
- **환경적 요인**: 브라우저 자동화 도구(Antigravity Browser)가 스크롤 잠금 등을 위해 `<body>` 태그에 클래스를 주입하였으나, Next.js 레이아웃 서버 렌더링 결과와 일치하지 않아 React 하이드레이션이 실패함.

## 3. 대응 및 해결 내역 (Solutions)
- **UI 보완**: `RegisterPage.tsx`에 `ORG_CREATE` 전용 입력 폼(법인명, 사업자번호, 조직유형)을 추가하여 사용자 경험 단절을 해결함.
- **로직 고도화**: 단순 메타데이터 전달에서 벗어나, Supabase 트리거(`handle_new_user`)가 `is_new_org` 플래그를 감지하여 `organizations` 레코드를 자동 생성하도록 SQL 고도화.
- **하이드레이션 방어**: `layout.tsx`의 `<body>` 태그에 `suppressHydrationWarning` 속성을 추가하여 외부 툴에 의한 속성 변경이 렌더링을 차단하지 않도록 조치함.

## 4. 재발 방지 대책 (Prevention)
- **체크리스트 강화**: multi-step form 개발 시 모든 Step에 대한 렌더링 블록 존재 여부를 Cross-check 하는 항목을 개발 표준에 추가함.
- **UI 자동화 테스트 조기 도입**: 수동 검증 전 브라우저 도구를 통한 단순 하이드레이션 체크를 우선 수행하도록 절차 개선.

## 5. 체크리스트 업데이트 여부
- [x] `docs/00_GUIDE/203_PROJECT_APPLICATION_CHECKLIST.md`에 'Multi-step UI 무결성 체크' 항목 추가 완료.

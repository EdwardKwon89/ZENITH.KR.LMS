# 🕵️ SAR (Self Audit Report) - 2026-04-20_005

**문제명**: `ZenInput` 내 비표준 속성(`error`) DOM 유출 (React Warning)
**발생일**: 2026-04-20
**보고자**: Antigravity (AI Agent)

## 1. 개요 (Overview)
- **증상**: 브라우저 콘솔에 `Received 'false' for a non-boolean attribute 'error'` 경고 및 에러 오버레이 노출.
- **영향**: 사용자 경험(UX) 저하 및 개발 환경에서의 가독성 방해.

## 2. 근본 원인 (Root Cause)
- **프롭 전달 오류**: `ZenInput` 컴포넌트 내부에서 `{...props}` 스프레드 연산자를 사용할 때, 사용자 정의 프롭인 `error`를 분리하지 않고 그대로 `<input>` 태그에 전달함.
- **브라우저 제약**: HTML5 표준 속성이 아닌 값이 DOM 요소에 boolean 형태로 전달될 때 React의 경고 시스템이 작동함.

## 3. 해결 방안 (Solution)
- **구조 분해 적용**: `ZenInput` 정의 단계에서 `error`를 명시적으로 구조 분해(Destructuring)하여 하단 `...props`에서 제외함.
- **에스테틱 강화**: 분리된 `error` 변수를 활용하여 `Rose-500` 테두리와 미세 회전 효과를 부여하는 전용 스타일링 로직 구축.

## 4. 재발 방지 대책 (Prevention)
- **가이드라인 수립**: 공용 UI 컴포넌트(Atom)를 제작하거나 확장할 때, 로직용 프롭(Variant, Error, Loading 등)은 반드시 먼저 추출하여 DOM 오염을 방지함.
- **테스트 강화**: 신규 컴포넌트 적용 시 브라우저 콘솔의 클린 상태 유지 여부를 필수 확인 항목으로 지정함.

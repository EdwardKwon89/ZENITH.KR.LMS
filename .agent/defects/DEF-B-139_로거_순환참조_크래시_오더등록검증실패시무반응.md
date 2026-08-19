# DEF-B-139: logger 순환참조 크래시로 오더등록 검증 실패 시 사용자에게 무반응

**발견일**: 2026-08-17
**발견자**: JSJung (실사용 확인, `/orders/new`) → Jaison 원인 분석
**긴급도**: High

## 현상

`/orders/new`에서 오더 등록 폼을 필수 입력 누락 상태로 제출하면, 사용자에게 "어떤 필드가 문제인지" 안내하는 토스트 메시지가 뜨지 않고 아무 반응이 없는 것처럼 보임.

## 원인

`src/components/orders/OrderRegistrationForm.tsx:889` 의 react-hook-form `onError` 핸들러:

```ts
const onError = (errors: any) => {
  logger.error('Validation Errors:', errors);   // ← 여기서 크래시
  const firstError = Object.values(errors)[0] as any;
  const errorMessage = firstError?.message || 'Check required fields';
  toast.error('Validation Error', { ... });      // ← 도달 못 함
};
```

`errors`(react-hook-form `FieldErrors`)는 필드별로 실제 DOM `<input>` 엘리먼트를 가리키는 `ref`를 포함한다. React 내부 Fiber 구조가 그 DOM 엘리먼트에 순환 참조를 걸어두므로, `logger.error()`가 이 객체를 그대로 넘기면 `src/lib/logger.ts:47`의 `JSON.stringify(entry)`가 방어 로직 없이 그대로 실행되어 다음 예외를 던짐:

```
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'HTMLInputElement'
    |     property '__reactFiber$...' -> object with constructor 'FiberNode'
    --- property 'stateNode' closes the circle
    at JSON.stringify (<anonymous>)
    at emit (src/lib/logger.ts:47:21)
    at Object.error (src/lib/logger.ts:60:30)
    at onError (src/components/orders/OrderRegistrationForm.tsx:890:12)
```

`logger.error()`가 `onError` 함수의 **첫 줄**이라 여기서 예외가 발생하면 함수 실행이 그대로 중단되어, 아래에 있는 `toast.error(...)`(사용자 안내 메시지)가 전혀 실행되지 않는다. 사용자 입장에서는 제출 버튼을 눌러도 아무 피드백이 없는 것으로 보인다.

## 영향 범위

- **직접 영향**: `OrderRegistrationForm.tsx`의 폼 검증 실패 시 사용자 안내 메시지 미표시 (오더 등록/수정 화면 전체 — `/orders/new`, edit 모드 공통 사용 컴포넌트로 추정, 확인 필요)
- **구조적 영향**: `src/lib/logger.ts`의 `emit()`이 어떤 호출부에서든 방어 로직 없이 `JSON.stringify`를 호출하므로, DOM 요소나 순환 참조를 포함한 객체를 로깅하는 다른 코드에서도 동일한 크래시가 재발할 수 있는 구조적 취약점.

## 권장 조치

TASK-B-314로 처리 — 2단계 수정:
1. **근본 방어**: `logger.ts`의 `emit()`에 순환참조에 안전한 stringify 적용(logger 전체를 이런 크래시로부터 보호)
2. **호출부 정리**: `OrderRegistrationForm.tsx`의 `onError`가 DOM ref를 포함한 원본 `errors` 객체 대신 직렬화 가능한 요약(필드명+메시지)만 로깅하도록 수정

# TASK-B-314: logger 순환참조 방어 + 오더등록 검증 실패 시 무반응 수정

- **GitHub Issue**: [#1152](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1152)
- **관련 결함**: [DEF-B-139](.agent/defects/DEF-B-139_로거_순환참조_크래시_오더등록검증실패시무반응.md)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 실사용 피드백)
- **담당**: Mike
- **우선순위**: P1 (사용자 대면 무반응 버그)
- **상태**: ✅ 완료 (PR#1153 머지, 2026-08-17, 병합 커밋 `adae3124`)

## [배경]

JSJung이 `/orders/new`에서 필수 입력 누락 상태로 제출 시 아무 안내 없이 조용히 실패하는 것을 발견. 원인은 `OrderRegistrationForm.tsx`의 `onError` 핸들러가 react-hook-form `errors` 객체(DOM `ref` 포함, React Fiber로 순환 참조)를 `logger.error()`에 그대로 넘겨 `JSON.stringify`가 크래시하고, 그 아래 있던 사용자 안내 토스트가 실행되지 못함.

## [조사 결과]

`src/lib/logger.ts:47`:
```ts
function emit(level: LogLevel, args: unknown[]) {
  const entry = buildEntry(level, args);
  const line = JSON.stringify(entry);   // 방어 로직 없음 — 순환참조 시 예외 던짐
  ...
}
```

`src/components/orders/OrderRegistrationForm.tsx:889-897`:
```ts
const onError = (errors: any) => {
  logger.error('Validation Errors:', errors);   // errors[field].ref가 DOM 엘리먼트 → 순환참조
  const firstError = Object.values(errors)[0] as any;
  const errorMessage = firstError?.message || 'Check required fields';
  toast.error('Validation Error', { ... });      // logger.error 예외로 도달 못함
};
```

## [설계 확정]

### 1. logger.ts — 순환참조 안전 stringify (근본 방어)

```ts
function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    });
  } catch {
    return JSON.stringify({ level: 'error', message: '[logger] failed to serialize log entry' });
  }
}

function emit(level: LogLevel, args: unknown[]) {
  const entry = buildEntry(level, args);
  const line = safeStringify(entry);
  ...
}
```
try/catch까지 이중 방어(순환참조 외의 예상 못한 stringify 실패도 커버) — 어떤 경우에도 `emit()`이 예외를 던지지 않도록 보장.

### 2. OrderRegistrationForm.tsx — 호출부 정리

`onError`에서 원본 `errors` 객체(DOM ref 포함) 대신 직렬화 가능한 요약만 로깅:
```ts
const onError = (errors: any) => {
  const summary = Object.fromEntries(
    Object.entries(errors).map(([field, err]: [string, any]) => [field, err?.message ?? String(err?.type ?? 'invalid')])
  );
  logger.error('Validation Errors:', summary);
  const firstError = Object.values(errors)[0] as any;
  const errorMessage = firstError?.message || 'Check required fields';
  toast.error('Validation Error', { ... });
};
```

## [작업 범위]

1. `src/lib/logger.ts`: `safeStringify()` 추가, `emit()`에 적용
2. `src/components/orders/OrderRegistrationForm.tsx`: `onError`에서 로깅 대상을 필드명+메시지 요약으로 변경

## [회귀 테스트 방향]

- `logger.ts`: 순환참조 객체를 `logger.error()`에 전달해도 예외 없이 처리되는지(`[Circular]` 치환 확인)
- `logger.ts`: DOM 엘리먼트를 포함한 실제와 유사한 객체(순환참조 mock)로도 크래시 없는지
- `OrderRegistrationForm.tsx`: 필수 필드 누락 상태로 제출 시 `toast.error`가 정상 호출되는지(현재는 크래시로 미도달 — 이 테스트가 회귀 방지 핵심)

## [R-10]

`/orders/new`에서 필수 필드 비운 채 제출 → "Validation Error" 토스트가 정상 표출되는지 스크린샷.

## [작업 결과]

(Mike 작성, `.agent/tasks/TASK-B-314_logger_safe_stringify.md`에 별도 생성됐던 내용을 병합·정리 — 중복 파일은 삭제)

1. ✅ `logger.ts`에 `safeStringify()` 추가(WeakSet 순환참조 감지 + try/catch 이중 방어), `emit()`에 적용
2. ✅ `OrderRegistrationForm.tsx`의 `onError`에서 필드명+메시지 요약만 로깅하도록 수정
3. ✅ 1차 반려 후 `logger.test.ts`에 순환참조 테스트 추가

빌드 SUCCESS, 회귀 201 test files / 1409 tests ALL PASS(신규 1건).

- 커밋: `8a6e7eca`(구현) → `d7a2f645`(테스트 추가)
- PR: [#1153](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1153)

## [Jaison 최종 검토]

**PR#1153 반려 (2026-08-17)** — 상세: [PR#1153 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1153#issuecomment-5311556896)

두 수정 모두 정확함(diff 확인 + 원 크래시와 동일한 DOM↔Fiber 순환참조 구조로 직접 재현 검증 — `safeStringify()`가 예외 없이 `[Circular]`로 치환). 회귀 201/201·1408/1408 PASS, 빌드 성공. 다만 `tests/unit/monitoring/logger.test.ts`(console spy 패턴 이미 구축됨)에 순환참조 케이스가 빠져있어 반려 — P1 크래시 방지 수정이라 회귀 테스트 요청.

GitHub Issue 라벨 `status:review` → `status:rework` 갱신 완료.

---

**PR#1153 최종 승인·머지 (2026-08-17)** — 병합 커밋 `adae3124`

요청한 순환참조 테스트가 정확히 추가됨. 격리 워크트리 재검증: 회귀 201/201·1409/1409 ALL PASS(신규 1건), 빌드 성공, CI 3종 PASS. 승인 후 머지, Issue #1152 close 완료.

R-10(`/orders/new` 필수 필드 미입력 제출 시 Validation Error 토스트 정상 표출) 미첨부 — JSJung 라이브 확인 필요.

## [발견 이슈]

없음

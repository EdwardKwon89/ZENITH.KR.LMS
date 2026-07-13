# DEF-084 — `OutboundProcessForm.tsx` 재발급 버튼 onClick `pkgs.find()` scope 오류

> **발견일**: 2026-06-28
> **발견자**: Baker (Team B)
> **연관 Task**: TASK-B-029 (IMP-140), TASK-B-034
> **우선순위**: P2 — E2E 테스트 블로커
> **상태**: ⬜

## 증상

E2E-26-06("재발급 → 새 운송장 번호 갱신 확인") 실행 시 재발급 버튼이 화면에 보이나(`toBeVisible` ✅), 버튼을 click해도 `handleReissue` 서버 액션이 호출되지 않음. console 서버 액션 로그에 `issueUpsLabel` 관련 출력 없음.

## 원인

`OutboundProcessForm.tsx` 재발급 버튼의 `onClick` 핸들러:

```typescript
// 현재 코드 (버그):
onClick={() => handleReissue(pkgs.find(p => p.ups_labels?.some(l => l.is_voided))?.id ?? '')}
```

- `pkgs`는 `fetchData()`에서 갱신되는 `packages` 배열 (`order.order_packages`)
- `fetchData()` 호출 이후 `packages` 배열이 갱신되었으나, **void 처리된 label이 포함된 package가 `pkgs`에 반영되지 않음**
- `pkgs.find(p => p.ups_labels?.some(l => l.is_voided))` → `undefined` 반환 → `handleReissue('')` 호출 → 빈 문자열로 요청 실패

추정: `fetchData()` 응답에 `packages`의 `ups_labels` 관계가 최신 void 상태를 반영하지 못하거나, `pkgs`가 이전 상태를 참조.

## 영향

- 재발급 버튼은 보이지만 click해도 아무 동작 안 함 (사용자 피드백 없음)
- E2E-26-06 정상 테스트 불가
- 서버 액션 미호출이므로 에러 로그도 없음

## 임시 조치

E2E-26-06에서 DB insert bypass로 우회 (Supabase admin client 직접 insert).

## 근본 해결

`pkgs.find()` 대신 현재 package(pkg)를 직접 사용:

```typescript
// 수정 제안:
onClick={() => handleReissue(pkg.id)}
```

단, `pkg`가 핸들러 scope에 접근 가능해야 함. 만약 `pkg`가 렌더링 시점의 현재 package라면 find 로직 불필요.

또는 `fetchData()` 호출 후 packages 상태 동기화 보강:

```typescript
// packages 재조회 시 ups_labels 관계 포함하도록 쿼리 보강
```

## 참조

- `src/components/warehouse/OutboundProcessForm.tsx`: lines 169~184 (handleReissue), 556~569 (재발급 버튼)
- PR #138 (Dave 재발급 버튼 UI)
- Issue #136

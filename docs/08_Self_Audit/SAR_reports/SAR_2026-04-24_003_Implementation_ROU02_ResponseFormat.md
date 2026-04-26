# SAR - ROU-02 getRouteOptions 응답 형식 불일치 (BUG-08-A)

**문서번호:** SAR-2026-04-24-003  
**날짜:** 2026-04-24  
**작성자:** Aiden (AI Agent)  
**심각도:** MAJOR (명세-코드 불일치 — API 소비자가 구조를 예측할 수 없음)

---

## 1. 현상 (What)

`src/app/actions/routing.ts`의 `getRouteOptions` 함수가 명세와 다른 형식으로 응답을 반환하였습니다.

- **API 명세 (`Ds_11_DETAIL_ROUTING.md` 13.1)**:
  ```typescript
  { success: true, options: { COST: RouteOption; TIME: RouteOption; BALANCED: RouteOption } }
  ```
- **실제 구현 (`routing.ts:57`, 수정 전)**:
  ```typescript
  return savedOptions || [];  // 배열 반환, success 필드 없음
  ```

---

## 2. 원인 (Why)

- **직접 원인**: DB에서 조회한 배열(`savedOptions`)을 그대로 반환하고, 명세가 요구하는 `option_type` 키 기반 객체 변환 로직을 누락함.
- **근본 원인**: R-12(명세-코드 동기화) 이행 시 응답 형식의 구조(배열 vs 객체)까지 검토하지 않은 채 구현을 완료 처리함.
- **탐지 경위**: Aiden의 ROU-02 Sprint A 심사(2026-04-24) — 명세 13.1 응답 형식과 `routing.ts` 반환값 비교 중 발견.

---

## 3. 조치 (How)

Aiden이 직접 수정 완료하였습니다. (`src/app/actions/routing.ts:52-56`)

```typescript
// 수정 전
return savedOptions || [];

// 수정 후
const optionsMap: Record<string, any> = {};
(savedOptions || []).forEach((opt: any) => { optionsMap[opt.option_type] = opt; });
return { success: true, options: optionsMap };
```

- 테스트 TC-R.4a 갱신: `result.success === true`, `result.options.COST/TIME/BALANCED` 존재 검증으로 변경
- TC-R.4b/4c: `result.find()` → `result.options.COST/TIME` 직접 접근으로 변경

---

## 4. 검증 (Verification)

- `rou-01.test.ts` TC-R.4a~4d 전원 PASS
- 전체 회귀 테스트 99/99 PASS 확인 (2026-04-24, `rtk npm run test:regression`)

---

## 5. 예방 (Prevention)

- **R-12 체크리스트 강화**: 구현 완료 검증 시 "응답 형식(배열 vs 객체, success 필드 유무)이 명세와 일치하는가" 항목 필수화
- **명세 응답 예시 필수화**: Ds-11 API 명세 작성 시 응답 예시를 실제 JSON 리터럴로 기술하여 구조 오해 방지

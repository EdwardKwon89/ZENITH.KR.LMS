# TASK-B-292: Issue #1089 — UPS 오더 등록/수정 저장 후 ups-detail 페이지로 리다이렉션

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1089](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1089) |
| **배경** | JSJung — UPS 오더 등록 후 리다이렉션되는 페이지를 일반 오더상세가 아니라 ups-detail로 바꿔야 함. Jaison이 현재 위치 확인 후 범위(신규+수정 둘 다) 확정 |
| **담당** | Mike (Team B) — Baker는 현재 착수 불가 |
| **생성일** | 2026-08-12 |
| **우선순위** | P3 |
| **상태** | 🔄 진행중 |

## 수정 방향 (설계 확정 — 착수 승인)

`src/components/orders/OrderRegistrationForm.tsx`의 `onSubmit()` 내 리다이렉션 2곳 수정:

```tsx
// line 737 — 오더 수정(edit) 저장 후. 현재: 전송모드 무관 항상 /orders/${orderId}
setTimeout(() => router.push(
  data.transport_mode === 'UPS' ? `/orders/${orderId}/ups-detail` : `/orders/${orderId}`
), 1000);

// line 757 — UPS 신규 등록(transport_mode === 'UPS' 분기) 성공 후. 현재: 항상 /orders/${r.id}
setTimeout(() => router.push(`/orders/${r.id}/ups-detail`), 1000);
```

`data.transport_mode`는 두 분기 모두에서 이미 사용 가능한 폼 데이터 값 — 별도 조회 불필요. 비UPS 오더의 수정 저장 후 흐름(line 737의 else 경로)은 기존 그대로 유지.

과설계 금지 — 이 2곳 외 다른 리다이렉션 경로(line 798, 비UPS 신규 등록)는 손대지 않음.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-292-ups-redirect-detail` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-292 확인
- [ ] `OrderRegistrationForm.tsx` line 737, 757 수정
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - UPS 신규 등록 성공 시 `router.push`가 `/orders/{id}/ups-detail`로 호출되는지(mock router 검증)
  - UPS 오더 수정 저장 성공 시 동일하게 `/orders/{id}/ups-detail` 호출 검증
  - 비UPS 오더 수정 저장 성공 시 기존대로 `/orders/{id}`(ups-detail 아님) 호출 검증 — 회귀 방지
  - 비UPS 신규 등록(line 798 경로)은 변경 없음을 확인하는 회귀 케이스 1건(그대로 `/orders/{id}`)
- [ ] **독립 되돌리기 검증**: 수정 부분을 되돌려서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 UPS 오더 신규 등록 1건 + 기존 UPS 오더 수정 저장 1건을 브라우저로 직접 수행해 `/ups-detail`로 이동하는지 스크린샷 첨부. 비UPS 오더 수정도 1건 확인해 기존 동작 유지 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] feat: TASK-B-292 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1089 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1089`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — `toContain()`/`readFileSync()` 그림자검증 패턴(9회 누적), 미배정 task file 중복 생성, 가짜 되돌리기 검증(구코드를 테스트에 인라인 하드코딩) 이력 다수. JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 이번 Task는 신규 마이그레이션 없는 순수 프론트엔드 라우팅 수정 — 회귀 테스트는 **실제 `OrderRegistrationForm` 렌더링 + mock router 호출 인자 검증**으로 작성할 것(정적 파일 읽기/문자열 포함 검증 금지). 되돌리기 검증도 **실제 소스 코드를 되돌려서** 재현할 것(테스트 파일 안에 구버전 로직 하드코딩 금지). 반드시 사전 배정된 이 task file을 그대로 사용할 것(중복 생성 금지).
- **Baker 참고**: 현재 사정으로 착수 불가 상태 — 배정 대상 아님.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

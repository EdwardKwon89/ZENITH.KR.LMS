# TASK-146 — SPR-02 Agency 화주 목록/등록 UI 구현

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-146 |
| **생성일** | 2026-06-15 |
| **할당 Agent** | Baker (OpenCode Big Pickle) |
| **지시자** | Jaison (Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P1 |
| **전제조건** | TASK-145 ✅ (Server Actions 구현 완료) |
| **관련 IMP** | IMP-114 |
| **브랜치** | `feature/ups-spr02-devteam-agency-ui` (TASK-145와 동일 브랜치) |
| **커밋 태그** | `[Baker]` |
| **상태** | 🚫 |

---

## [목표]

An-12 §6-1 기준으로 대리점 화주 목록 조회 + 신규 등록 UI를 구현한다.

---

## [작업 범위]

### 1. 화주 목록 페이지

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/page.tsx`

- AGENCY role 접근 제어 (`checkPermission` 또는 미들웨어)
- `getAgencyShippers(agencyOrgId)` 호출 → 테이블 형태로 화주 목록 표시
- 컬럼: 화주명 / 유형(개인·법인) / 등급 / 할인율 / 등록일 / 상태
- 우측 상단: "화주 등록" 버튼 → `/agency/shippers/new` 이동

### 2. 화주 등록 폼

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/page.tsx`

- 입력 필드: 화주명, 유형(INDIVIDUAL/CORPORATE), 등급, 할인율(%)
- 제출 시 `createAgencyShipper()` Server Action 호출
- 성공 시 `/agency/shippers` 리다이렉트
- 실패 시 에러 메시지 표시

### 3. 화주 등급 수정 인라인 액션 (선택)

목록 페이지에서 등급/할인율 인라인 수정 또는 별도 모달 — 복잡도 판단 후 구현.

---

## [주의 사항]

- `src/app/[locale]/(dashboard)/agency/` 는 Team B 소유 신규 디렉토리 (An-12 §7)
- `NaviSidebar.tsx` 수정은 **TASK-147 Gale 담당** — 중복 수정 금지
- `messages/ko.json` 등 i18n 파일에 `agency_shippers_*` 접두사 키만 추가
- 서버 컴포넌트 + 클라이언트 컴포넌트 분리 (Next.js App Router 패턴)
- 함수/컴포넌트 50줄 이하 (ZEN_A4) — 필요 시 하위 컴포넌트로 분리

---

## [R-17 커밋 순서]

```
1. 코드 커밋: [Baker] feat: TASK-146 Agency 화주 목록/등록 UI 구현
2. task file [작업 결과] + 🔔 상태 변경
3. ACTIVE_TASK.md 🔔 반영
4. scratch/IMP_PROGRESS.md IMP-114 행 갱신
5. check-R17-DoD 실행 → 전항목 PASS 확인
6. 문서 커밋: [Baker] docs: TASK-146 완료 보고 — task file 🔔
```

---

## [DoD]

- [ ] `src/app/[locale]/(dashboard)/agency/shippers/page.tsx` — 화주 목록 페이지 구현 완료
- [ ] `src/app/[locale]/(dashboard)/agency/shippers/new/page.tsx` — 등록 폼 구현 완료
- [ ] `getAgencyShippers()` 호출 및 목록 렌더링 확인
- [ ] `createAgencyShipper()` 호출 및 성공/실패 처리 확인
- [ ] AGENCY role 외 접근 차단 확인
- [ ] `npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시: _(작업 후 기재)_
- [ ] DoD 자가 검증 (`check-R17-DoD`) 완료

---

## [작업 결과]

_(Baker 작업 완료 후 기재)_

---

## [발견 이슈]

_(없음)_

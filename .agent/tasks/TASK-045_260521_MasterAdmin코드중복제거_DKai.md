# TASK-045 — Master/Admin 코드 관리 페이지 중복 제거

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-045 |
| IMP-ID | IMP-012 |
| 생성일 | 2026-05-21 |
| 담당 Agent | D_Kai (DeepSeek/OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 — 즉시 착수 가능 |
| 상태 | 🔔 |
| 파급 효과 | 없음 |

---

## 배경

`master/codes/codes-client.tsx`와 `admin/codes/codes-client.tsx` 두 파일의 MD5 해시가 완전 일치 — 동일 UI를 두 경로에 복사 운영 중.
수정 시 양쪽 모두 반영해야 하는 유지보수 부담 및 불일치 위험이 있다.

참조: `scratch/post_launch_improvements.md §IMP-012`
- `src/app/[locale]/(dashboard)/master/codes/codes-client.tsx`
- `src/app/[locale]/(dashboard)/admin/codes/codes-client.tsx`

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-045 → 🔄 동시 반영**
2. `gitnexus_impact({target: "codes-client", direction: "upstream"})` — 호출 경로 확인
3. 공통 컴포넌트 추출:
   - `src/components/codes/CodesClient.tsx` 신규 생성 (공유 로직 통합)
   - `master/codes/codes-client.tsx` → `CodesClient` import + 얇은 wrapper(역할별 차이만 주입)
   - `admin/codes/codes-client.tsx` → 동일 패턴
4. 두 원본 파일의 역할별 차이(있다면) 파악 후 props 또는 context로 처리
5. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
6. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-045.log`
7. **코드 커밋**: `[OpenCode] refactor: IMP-012 master/admin codes-client 공통 컴포넌트 추출`
8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
9. **ACTIVE_TASK.md TASK-045 → 🔔 반영**
10. **`scratch/IMP_PROGRESS.md` IMP-012 행 🔔 갱신**
11. **문서 커밋**: `[OpenCode] docs: TASK-045 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `src/components/codes/CodesClient.tsx` 공통 컴포넌트 신규 생성
- [x] `master/codes/codes-client.tsx` wrapper로 축소 (4줄)
- [x] `admin/codes/codes-client.tsx` wrapper로 축소 (4줄)
- [x] `gitnexus_impact` 결과 기록
- [x] 회귀 테스트 전체 PASS 증적 (211/211)
- [x] `[OpenCode] refactor: IMP-012` 코드 커밋 완료 (`63ce099`)
- [ ] `[OpenCode] docs: TASK-045` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-012 행 갱신

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 제출 후 Aiden이 작성합니다.**

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-21 |
| 완료일 | 2026-05-21 |
| 구현 방식 | 공통 컴포넌트 추출 — `src/components/codes/CodesClient.tsx` 신규 생성, 기존 두 파일 4줄 wrapper로 축소 |
| gitnexus_impact 결과 | 두 codes-client.tsx 파일의 유일한 consumer는 각각 master/codes/page.tsx와 admin/codes/page.tsx. 두 page.tsx도 동일 — 역할별 차이 없음 |
| 회귀 결과 | 44 files passed, 211 tests passed |
| 코드 커밋 해시 | `63ce099` |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 D_Kai 🔔 제출 후 Aiden이 작성합니다.**

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |
| 2026-05-21 | D_Kai (OpenCode) | 구현 완료 — 공통 컴포넌트 추출·wrapper 전환·회귀 211/211·코드 커밋 `63ce099`. 🔔 제출 |

# TASK-142 — Phase 7 SPR-02: Agency 화주 관리 UI

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-142 |
| **생성일** | 2026-06-14 |
| **할당 Agent** | Jaison (Claude, Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P1 |
| **전제조건** | TASK-139 ✅ (Agency DB 스키마 + RBAC 완비) |
| **관련 IMP** | IMP-114 |
| **브랜치** | `feature/ups-spr02-devteam-agency-shipper-ui` |
| **커밋 태그** | `[JSJung]` / `[Jaison]` |
| **상태** | ⬜ |

---

## [목표]

An-12 §4.4 화주 등록 흐름 + §6.1 UI 계획 기반으로 Agency 화주 관리 UI를 구현한다.
대리점 담당자(AGENCY role)가 하위 화주를 등록·조회·등급 관리할 수 있는 화면 일체.

---

## [작업 범위]

### 1. Server Actions (`src/app/actions/agency/`)

An-12 §5.2 기준:

| 파일 | 함수 |
|:----|:----|
| `shippers.ts` | `createAgencyShipper(agencyOrgId, shipperData)` |
| `shippers.ts` | `getAgencyShippers(agencyOrgId): Promise<AgencyShipper[]>` |
| `shippers.ts` | `updateAgencyShipperGrade(id, grade, discountRate)` |

**createAgencyShipper 처리 흐름** (An-12 §4.4):
1. `zen_organizations` INSERT (type='SHIPPER', CORPORATE or INDIVIDUAL)
2. `zen_agency_shippers` 연결 레코드 INSERT
3. `zen_profiles` 계정 생성 (선택 — 초대 이메일 MVP는 수동)

### 2. UI 페이지 (`src/app/[locale]/(dashboard)/agency/`)

An-12 §6.1 기준:

| 경로 | 내용 |
|:----|:----|
| `/agency` | 대리점 대시보드 — 화주 수, 최근 오더 요약 카드 |
| `/agency/shippers` | 화주 목록 테이블 (이름, 유형, 등급, 할인율, 상태) |
| `/agency/shippers/new` | 화주 등록 폼 (법인명/개인명, org_type, 연락처) |

접근 권한: AGENCY role만 접근 가능 (RBAC TASK-139에서 완료)

### 3. NaviSidebar 추가 (`src/components/layout/NaviSidebar.tsx`)

- "대리점 관리" 메뉴 항목 추가 (AGENCY role에만 노출)
- **주의**: 공유 파일 — 브랜치 분기 전 반드시 `git pull origin main`으로 최신화

### 4. 회귀 테스트 신규 케이스 (R-09)

`tests/unit/agency/shipper-actions.test.ts` — TC 5건 이상:
- TC-AGN-01: createAgencyShipper — 정상 화주 등록
- TC-AGN-02: getAgencyShippers — 대리점별 목록 조회
- TC-AGN-03: updateAgencyShipperGrade — 등급/할인율 수정
- TC-AGN-04: AGENCY 미인증 접근 차단
- TC-AGN-05: 중복 화주 등록 방지 (UNIQUE 제약)

---

## [DoD]

- [ ] `src/app/actions/agency/shippers.ts` Server Actions 3종 구현
- [ ] `/agency` 대시보드 페이지 구현 (화주 수 + 최근 오더 요약)
- [ ] `/agency/shippers` 목록 페이지 구현 (테이블 + 등급 표시)
- [ ] `/agency/shippers/new` 화주 등록 폼 구현
- [ ] NaviSidebar AGENCY 메뉴 추가 (주의: 공유 파일 PR 순서 준수)
- [ ] `npx supabase db reset` 정상 완료 확인 (TASK-138+139 migration 전체)
- [ ] `npm run test:regression` 신규 TC 5건 이상 PASS
- [ ] 코드 커밋 해시: (작업 후 기재)
- [ ] DoD 자가 검증 `check-R17-DoD` 실행 완료

---

## [R-17 완료 보고 절차] (Team B 적용)

1. **코드 커밋**: `[Jaison] feat: TASK-142 IMP-114 Agency 화주 관리 UI`
2. **본 파일 `[작업 결과]` 작성** + 상태 🔔 변경
3. **ACTIVE_TASK.md Team B 섹션** 🔄→🔔
4. **IMP_PROGRESS.md** IMP-114 행 🔔 갱신
5. **`check-R17-DoD` 실행** — 전항목 통과 확인
6. **문서 커밋**: `[Jaison] docs: TASK-142 완료 보고 — IMP-114 🔔`
7. **PR 생성**: `feature/ups-spr02-devteam-agency-shipper-ui` → `main` (JSJung 서명)

---

## [설계 확정]

An-12 §4, §5.2, §6.1 스펙 확정 (Edward 승인, 2026-06-14). 추가 설계 결정 불요.

---

## [작업 결과]

_(작업 후 기재)_

---

## [Aiden 검토]

_(🔔 제출 후 Aiden 기재)_

---

## [발견 이슈]

_(없음)_

# TASK-098 — ID 찾기 기능 재설계 (개인/법인 분리)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-098 |
| IMP-ID | IMP-089 |
| 생성일 | 2026-05-27 |
| 담당 Agent | **D_Kai** |
| 우선순위 | P2 |
| 전제조건 | 없음 |
| 상태 | ❌ 반려 |
| 연관 결함 | DEF-013 |

---

## 배경

**설계 기준**: 이 시스템에서 E-Mail이 ID를 대신한다.

**현재 문제**:
1. 기존 `findUserId(fullName, email)` — 이미 알고 있는 E-Mail을 입력해서 E-Mail(=ID)을 찾는 논리 모순
2. UAT-01-04 시나리오: 회사명+사업자번호로 E-Mail 찾기 (법인 담당자 ID 찾기)가 혼재
3. 개인 회원 ID 찾기 / 법인 담당자 ID 찾기 — 두 플로우가 분리되지 않음
4. `zen_profiles`에 `phone_number` 컬럼 없음, 회원가입 폼에 전화번호 입력 필드 없음

**Edward 확정 요구사항**:
1. **개인 회원 ID 찾기**: 이름 입력 → 마스킹된 E-Mail + 마스킹된 전화번호 제공
2. **법인 담당자 ID 찾기**: 법인명 + 사업자번호 입력 → 담당자 마스킹된 E-Mail 제공

---

## 구현 범위

### 1. DB 마이그레이션

**파일**: `supabase/migrations/20260527XXXXXX_add_phone_to_profiles.sql`

```sql
ALTER TABLE zen_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
COMMENT ON COLUMN zen_profiles.phone_number IS '회원 전화번호 — ID 찾기 마스킹 힌트용';
```

### 2. 회원가입 폼 수정

**파일**: `src/app/[locale]/(auth)/register/page.tsx`

- INFO 단계(이름·이메일·비밀번호 입력 폼)에 전화번호 입력 필드 추가
- `ZenInput` placeholder="전화번호 (예: 010-1234-5678)"
- 상태: `const [phoneNumber, setPhoneNumber] = useState('')`

### 3. 회원가입 Action 수정

**파일**: `src/app/[locale]/(auth)/login/actions.ts` (signup 액션) 또는 register 관련 server action

- 회원가입 시 `phone_number`를 `zen_profiles`에 저장
  ```ts
  .update({ full_name, phone_number })   // zen_profiles upsert
  ```
- 개인정보동의 수집항목 텍스트는 이미 "전화번호" 포함됨 — 실제 필드와 일치 확인

### 4. 백엔드 Actions 재설계

**파일**: `src/app/actions/admin/auth.ts`

기존 `findUserId(fullName, email)` 함수 → 아래 두 함수로 교체:

#### 4-1. 개인 ID 찾기
```ts
export async function findPersonalId(fullName: string) {
  // zen_profiles에서 full_name으로 조회
  // 반환: { maskedEmail, maskedPhone } 또는 { error }
  // 마스킹 규칙:
  //   E-Mail: ab***@domain.com (앞 2자 + ***)
  //   전화번호: 010-****-5678 (중간 4자리 마스킹)
}
```

#### 4-2. 법인 담당자 ID 찾기
```ts
export async function findCorporateId(orgName: string, bizRegNo: string) {
  // zen_organizations에서 name + metadata->>'registration_no' 로 조회
  // zen_profiles JOIN → 해당 org_id의 대표 계정(role: ADMIN or 최초 등록자) E-Mail
  // 반환: { maskedEmail } 또는 { error }
}
```

> **주의**: 동일 이름의 개인이 여러 명인 경우 → 전화번호 마스킹 리스트로 복수 반환 고려 (또는 1건만 반환 후 추가 본인 확인 안내)

### 5. 프론트엔드 재설계

**파일**: `src/app/[locale]/(auth)/find-id/page.tsx`

전체 재작성:
- **개인/법인 탭 UI** (또는 라디오 버튼 선택)
- **개인 탭**: fullName 입력 폼 → 결과: 마스킹 E-Mail + 마스킹 전화번호
- **법인 탭**: orgName + bizRegNo 입력 폼 → 결과: 담당자 마스킹 E-Mail

### 6. UAT-01-04 시나리오 재작성

**파일**: `docs/91_FinalTest/UAT/UAT_01_인증_회원가입.md`

`[UAT-01-04] 아이디 찾기` 섹션 전면 재작성:

**[케이스 A] 개인 ID 찾기**
| 순서 | URL | 액션 | 입력 | 기대 결과 |
|:---:|:---|:---|:---|:---|
| 1 | /ko/login | '아이디 찾기' 클릭 | — | /ko/find-id 이동 |
| 2 | /ko/find-id | '개인' 탭 선택 후 이름 입력 → '찾기' | 이름: `홍길동` | 마스킹 E-Mail + 마스킹 전화번호 표시 |
| 3 | /ko/find-id | 존재하지 않는 이름 입력 | 이름: `없는이름` | "일치하는 회원 정보가 없습니다." |
| 4 | /ko/find-id | 빈 필드 제출 | (공란) | 필수 입력 안내 |

**[케이스 B] 법인 담당자 ID 찾기**
| 순서 | URL | 액션 | 입력 | 기대 결과 |
|:---:|:---|:---|:---|:---|
| 1 | /ko/find-id | '법인' 탭 선택 후 입력 → '찾기' | 법인명: `(주)테스트물류` / 사업자번호: `123-45-67890` | 담당자 마스킹 E-Mail 표시 |
| 2 | /ko/find-id | 존재하지 않는 법인 입력 | 법인명: `없는회사` / 사업자번호: `000-00-00000` | "일치하는 법인 정보가 없습니다." |

---

## 현재 코드 현황 (참조)

| 파일 | 현재 상태 |
|:---|:---|
| `src/app/[locale]/(auth)/find-id/page.tsx` | `findUserId(fullName, email)` 호출 — 전면 재작성 필요 |
| `src/app/actions/admin/auth.ts` | `findUserId()` 함수 존재 — 교체 대상 |
| `src/app/actions/auth.ts` | `export * from './admin/auth'` barrel — 함수명 변경 시 함께 갱신 |
| `supabase/migrations/0001_initial_schema.sql` | `zen_profiles`: phone_number 컬럼 없음 |
| `src/app/[locale]/(auth)/register/page.tsx` | INFO 단계 전화번호 입력 필드 없음 |
| `zen_organizations.metadata` | `registration_no` 키로 사업자번호 저장 |

---

## DoD (완료 기준)

- [x] 1. DB 마이그레이션 파일 생성 + `phone_number` 컬럼 추가 확인
- [x] 2. 회원가입 폼에 전화번호 입력 필드 추가 + 저장 확인
- [x] 3. `findPersonalId(fullName)` 구현 — 이름만으로 마스킹 E-Mail + 마스킹 전화번호 반환
- [x] 4. `findCorporateId(orgName, bizRegNo)` 구현 — 담당자 마스킹 E-Mail 반환
- [x] 5. `find-id/page.tsx` 개인/법인 탭 분리 UI 구현
- [x] 6. `findUserId` 함수 제거 또는 internal 전환 (외부 노출 금지)
- [x] 7. UAT-01-04 시나리오 재작성 (케이스 A + 케이스 B)
- [x] 8. 회귀 테스트 전량 PASS (`rtk npm run test:regression`) — 227/227
- [ ] 9. 코드 커밋: `[D_Kai] feat: IMP-089 ID찾기 개인/법인 분리 재설계`
- [ ] 10. 문서 커밋: `[D_Kai] docs: TASK-098 완료 보고 — task file 🔔`

---

## [설계 의견]

> D_Kai: Task 명세대로 구현 (개인/법인 탭 분리). `phone_number`는 회원가입 시 FormData → `user_metadata` + `zen_profiles.update` 동시 저장 패턴 사용 (IMP-088 동의 시각과 동일). `findCorporateId`는 `zen_organizations.registration_no` 컬럼 직접 조회 (metadata 경유 불필요).

---

## [설계 확정]

> Aiden (2026-05-27): D_Kai 설계 의견 승인 — `zen_organizations.registration_no` 직접 조회, `user_metadata` + `zen_profiles.update` 동시 저장 패턴 전항목 승인.

---

## [Aiden 검토] ❌ 반려 (2026-05-27)

**구현 품질**: DoD #1~7 전항목 확인 완료 — 구현 정상. `findUserId` 참조 0건 삭제 확인.

**반려 사유 (R-17 위반 4건)**:
1. **코드 커밋 미수행** — 파일들이 staged 상태에만 존재, 커밋 해시 없음
2. **Task file 헤더 ⬜ 유지** — ACTIVE_TASK.md는 🔔, task file 헤더 불일치
3. **scratch/IMP_PROGRESS.md IMP-089 누락** — 행 자체 없음
4. **DoD #9·#10 미체크** — 커밋 해시 "예정" 기재

**기술 관찰 (비차단)**: `findProfilesByName` `.maybeSingle()` — 동명이인 복수 결과 시 PGRST116 에러. UAT 완주 후 IMP 별도 등록 권고.

**최소 재작업 지시**:
```
1. rtk npm run test:regression → 227/227 재확인
2. git commit (현재 staged 파일 전량):
   [D_Kai] feat: IMP-089 ID찾기 개인/법인 분리 재설계
   대상: find-id/page.tsx, login/actions.ts, register/page.tsx,
         admin/auth.ts, admin/index.ts, admin.repository.ts, migration
3. Task file 업데이트:
   - 헤더: ❌ → 🔔
   - [작업 결과] 코드 커밋 해시 기재
   - DoD #9 [x] 체크
4. scratch/IMP_PROGRESS.md: IMP-089 행 추가 + 🔔 표시
5. DoD 전항목 증거값 실물 확인
6. git commit (문서):
   [D_Kai] docs: TASK-098 완료 보고 — task file 🔔
   대상: task file, ACTIVE_TASK.md, IMP_PROGRESS.md, UAT-01-04.md
```

---

## [작업 결과]

| 항목 | 내용 |
|:---|:---|
| 변경 파일 | 7개 (코드 6 + 문서 1) |
| 코드 커밋 | (재작업 필요) |
| 문서 커밋 | (재작업 필요) |
| 회귀 테스트 | 227/227 PASS (재확인 필요) |
| E2E 영향 | 없음 (find-id page + register phone 필드 추가) |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-27 | Aiden (Claude) | Task 생성 — DEF-013 대응, IMP-089 ID찾기 개인/법인 분리 재설계 |
| 2026-05-27 | D_Kai (OpenCode) | 구현 완료 — DB mig·회원가입 폼·backend 2함수·탭 UI·UAT 재작성 · 227/227 |
| 2026-05-27 | Aiden (Claude) | ❌ 반려 — R-17 위반 4건 (코드 커밋 미수행·task file 헤더 ⬜·IMP_PROGRESS 누락·DoD #9·10 미체크) · 최소 재작업 지시 |

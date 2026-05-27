# TASK-098 — ID 찾기 기능 재설계 (개인/법인 분리)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-098 |
| IMP-ID | IMP-089 |
| 생성일 | 2026-05-27 |
| 담당 Agent | **D_Kai** |
| 우선순위 | P2 |
| 전제조건 | 없음 |
| 상태 | ⬜ 미착수 |
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

- [ ] 1. DB 마이그레이션 파일 생성 + `phone_number` 컬럼 추가 확인
- [ ] 2. 회원가입 폼에 전화번호 입력 필드 추가 + 저장 확인
- [ ] 3. `findPersonalId(fullName)` 구현 — 이름만으로 마스킹 E-Mail + 마스킹 전화번호 반환
- [ ] 4. `findCorporateId(orgName, bizRegNo)` 구현 — 담당자 마스킹 E-Mail 반환
- [ ] 5. `find-id/page.tsx` 개인/법인 탭 분리 UI 구현
- [ ] 6. `findUserId` 함수 제거 또는 internal 전환 (외부 노출 금지)
- [ ] 7. UAT-01-04 시나리오 재작성 (케이스 A + 케이스 B)
- [ ] 8. 회귀 테스트 전량 PASS (`rtk npm run test:regression`)
- [ ] 9. 코드 커밋: `[D_Kai] feat: IMP-089 ID찾기 개인/법인 분리 재설계`
- [ ] 10. 문서 커밋: `[D_Kai] docs: TASK-098 완료 보고 — task file 🔔`

---

## [설계 의견]

> ⬜ D_Kai 작성 대기

---

## [설계 확정]

> Aiden 전속 — D_Kai 설계 의견 제출 후 기재

---

## [작업 결과]

> ⬜ D_Kai 완료 후 기재

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-27 | Aiden (Claude) | Task 생성 — DEF-013 대응, IMP-089 ID찾기 개인/법인 분리 재설계 |

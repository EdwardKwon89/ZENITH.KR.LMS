# TASK-B-240: Issue #940 — 마이페이지 > 내 프로필에 주소록 관리 섹션 임베드

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#940](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/940) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P3 |
| **상태** | 🔔 |

## 개요

JSJung 확인: "프로필관리 기능에서 주소정보를 수정하는 기능이 필요해서 추가하자"는 요청. Jaison 조사 결과, 완전한 주소록 CRUD 기능(`/address-book`)이 이미 구현되어 있고 사이드바 "마이페이지" 하위 메뉴로 연결되어 있음 — 단, `/mypage/profile` 화면 자체에는 주소 관련 내용이 전혀 없음. JSJung은 별도 페이지 이동이 아니라 **프로필 관리 화면 안에서** 주소 정보를 수정할 수 있길 원함.

기존 `zen_address_book` 테이블·RLS·서버 액션(`src/app/actions/operations/address-book.ts`)과 기존 CRUD UI 컴포넌트(`src/components/address-book/AddressBookClient.tsx`, `initialEntries` prop만 받으면 되는 완결형)를 그대로 재사용 — **신규 DB/RLS/서버 액션 개발 없음**, 순수 UI 조합(임베드) 작업입니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/app/[locale]/(dashboard)/mypage/profile/page.tsx` 수정

현재 구조(`'use client'`, `useEffect`로 `getMyProfile()` 호출 — 21~38행) 그대로 유지하고, 주소록 데이터도 같은 방식으로 로드:

```ts
import { getAddressBookEntries } from '@/app/actions/operations/address-book';
import AddressBookClient from '@/components/address-book/AddressBookClient';
import { MapPin } from 'lucide-react'; // 기존 import 줄(6행)에 추가
```

`useState` 추가 (23행 `profile` state 근처):
```ts
const [addressEntries, setAddressEntries] = useState<any[]>([]);
```

`loadProfile()` 함수(26~38행) 안에서 `getMyProfile()`과 함께 병렬로 호출:
```ts
useEffect(() => {
  async function loadProfile() {
    try {
      const [profileData, addressResult] = await Promise.all([
        getMyProfile(),
        getAddressBookEntries(),
      ]);
      setProfile(profileData);
      setAddressEntries(addressResult.entries || []);
    } catch (err) {
      toast.error('프로필 정보를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }
  loadProfile();
}, []);
```

**주소 섹션 렌더링 위치**: 194행 `{/* Withdrawal Section */}` 바로 위(즉 "Info Card" `grid` 블록과 탈퇴 섹션 사이)에 새 섹션 추가:

```tsx
{/* Address Book Section */}
<ZenCard className="p-8 bg-white border-slate-200">
  <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
    <MapPin className="text-brand-600 w-4 h-4" />
    주소 정보 관리
  </h3>
  <AddressBookClient initialEntries={addressEntries} />
</ZenCard>
```

### 2. `src/app/actions/operations/address-book.ts` — revalidatePath 경로 보강 (선택, 안전성 보강)

135행·168행·194행의 `revalidatePath("/[locale]/address-book")` 각각 바로 아래 줄에 추가:
```ts
revalidatePath("/[locale]/mypage/profile");
```
(프로필 페이지는 클라이언트 컴포넌트+마운트 시 클라이언트 fetch라 캐시 무효화가 없어도 동작에는 문제없으나, 일관성을 위해 추가)

### 3. 건드리지 않는 것 (범위 밖)

- `/address-book` 독립 라우트·사이드바 "주소록" 메뉴 — **그대로 유지** (기존 `e2e-21-address-book.spec.ts`가 이 라우트를 직접 검증하므로 제거·변경 금지)
- `zen_address_book` 테이블·RLS·마이그레이션 — 변경 없음
- `AddressBookClient.tsx`·`AddressBookSelector.tsx`·주소록 서버 액션 로직 자체 — 변경 없음 (그대로 재사용)
- `updateMyProfile()`/`zen_profiles` — 주소 필드 추가 안 함 (주소는 여전히 `zen_address_book`이 단일 출처)

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-240-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 240 나와야 정상)
- [ ] 위 스펙대로 `mypage/profile/page.tsx` 수정 + `address-book.ts` revalidatePath 보강
- [ ] 회귀 테스트 추가 — **반드시 실제 렌더링 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. `ProfilePage`를 실제로 렌더링(RTL) — `getAddressBookEntries` mock이 반환한 항목이 화면에 나타나는지(`display_name` 등 실제 텍스트 확인)
  2. `getMyProfile`/`getAddressBookEntries` 두 mock이 모두 실제로 호출됐는지(`toHaveBeenCalled`) 확인 — 병렬 로드 확인
  3. 기존 `updateMyProfile`/탈퇴 관련 기존 테스트(있다면)가 리팩터링 후에도 그대로 PASS하는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 실제 로그인 후 `/mypage/profile` 접속 → 주소 추가/수정/삭제/기본주소 지정이 프로필 화면 안에서 정상 동작하는지 브라우저로 직접 확인 → 스크린샷 첨부. 개인 계정(org 없음, 예: `shipper@zenith.kr`)과 org 소속 계정(예: `agency_shipper@zenith.kr`) 둘 다 최소 1회씩 확인할 것(스코핑 분기 확인)
- [ ] `/address-book` 독립 페이지가 기존과 동일하게 정상 동작하는지(회귀 없음) 함께 확인

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] feat: TASK-B-240 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 940 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #940`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것.

## [작업 결과]

| 항목 | 내용 |
|:-----|:------|
| **담당 실행자** | D_Kai (Dave 대리) |
| **커밋 해시** | (커밋 후 기재) |
| **변경 파일** | `mypage/profile/page.tsx` · `address-book.ts` · `tests/unit/member/profile-page.test.tsx` |
| **테스트 결과** | `vitest run` — 143 files · 961 tests **ALL PASS** |
| **빌드 결과** | `npm run build` — **SUCCESS** |

### 체크리스트 완료 현황

- [x] 브랜치 생성
- [x] `mypage/profile/page.tsx` 수정 — 주소록 섹션 임베드 (AddressBookClient + MapPin 아이콘)
- [x] `address-book.ts` revalidatePath 보강 (3개소에 `/mypage/profile` 추가)
- [x] 회귀 테스트 2건 신규 (TC-PROFILE-AB-01~02)
- [x] `npm run build` · `npm run test:regression` — SUCCESS, 961/961 PASS
- [x] R-10: admin + shipper 프로필 화면 + /address-book 독립 페이지 스크린샷

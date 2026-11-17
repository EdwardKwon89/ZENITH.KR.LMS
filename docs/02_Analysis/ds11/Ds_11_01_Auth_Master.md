## 1. 인증 및 세션 (Authentication)
사용자 인증 및 초기 세션 처리를 담당합니다.
- **Path**: `src/app/[locale]/(auth)/login/actions.ts`

### login(formData)
- **설명**: 이메일/비밀번호 기반 로그인 처리 및 세션 쿠키 설정
- **Input**: `FormData` (email, password)
- **Output**: `Promise<{ success: boolean, error?: string }>`

### signup(formData, locale)
- **설명**: 신규 사용자(화주/파트너) 가입 요청 처리
- **Input**: `FormData`, `locale` (default: 'ko')
- **Output**: `Promise<{ success: boolean, error?: string }>`

---

## 2. 마스터 데이터 (Master Data)
플랫폼의 기초가 되는 지리, 조직, 코드 정보를 관리합니다.
- **Path**: `src/app/actions/master.ts`

### getPorts()
- **설명**: 전 세계 항구/공항(ZEN_PORTS) 리스트 조회
- **Output**: `Promise<Port[]>`

### upsertPort(payload)
- **설명**: 항구 정보 추가 또는 수정 (Admin 전용)
- **Input**: `Partial<Port>`

### getNations()
- **설명**: 국가 코드 및 지역 정보 리스트 조회
- **Output**: `Promise<Nation[]>`

### getOrganizations()
- **설명**: 화주, 파트너사 등 등록된 모든 조직 정보 조회
- **Output**: `Promise<Organization[]>`

### getAirlines()
- **설명**: 등록된 항공사 마스터 정보 조회
- **Output**: `Promise<Airline[]>`

### getCommonCodesByGroup(groupCode)
- **설명**: 특정 그룹에 속한 공통 코드 리스트 조회 (예: 'PACKING_UNIT', 'TRANS_MODE')
- **Input**: `string`

### upsertCommonCode(payload) / deleteCommonCode(id)
- **설명**: 공통 코드 관리 (Admin 전용)

### getCurrentUserAffiliation()
- **설명**: 현재 로그인한 사용자의 소속 조직 및 권한 정보 조회
- **Output**: `Promise<{ org: Organization, profile: Profile }>`

---


# TASK-B-050: DEF-094 Supabase 타입 재생성 + 담당자 정보 저장/조회 검증

> **태스크 ID**: TASK-B-050
> **생성일**: 2026-07-04
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (DeepSeek)
> **우선순위**: P1
> **상태**: ⬜
> **관련 DEF**: DEF-094
> **선행 Task**: ���음
> **후행 Task**: 없음

---

## ⚠��� 착수 전 필독 �� R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-050-def094-supabase-types-dave
```

완료 보고: 코드 커밋 → task file 🔔 기재 → ACTIVE_TASK 반영 → PR 생성

---

## 배경

migration `20260704101500_agency_003_org_contact_columns.sql`으로 `zen_organizations`에 `contact_name`, `contact_email`, `contact_phone` 컬럼이 추가되었으나, Supabase TypeScript 타입 파일이 재생성되지 않았다.  
현재 `src/types/supabase.ts`의 `zen_organizations.Row`에 이 3개 컬럼이 없어 TypeScript 타입 오류가 발생하며, `next build` 시 빌드 실패 가능성이 있다.

---

## 구현 범위

### §1 — Supabase TypeScript 타입 재생성

```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```

재생성 후 확인:
- `zen_organizations.Row`에 `contact_name: string | null`, `contact_email: string | null`, `contact_phone: string | null` 포함 여부 확인
- `zen_organizations.Insert` 및 `Update`에도 동일 필드 포함 여부 확인

### §2 — TypeScript 오류 해소

타입 재생성 후 남은 TypeScript 오류 확인 및 수정:
```bash
rtk npm run build 2>&1 | grep -E "contact|agency/shippers"
```

`_createShipperOrg`, `getAgencyShipperById`, `updateAgencyShipper`의 타입 오류가 없는지 확인.  
오류 발생 시 타입 캐스팅 또는 코드 수정으로 해소.

### §3 — 엔드투엔드 검증

화주 등록 → 상세편집 데이터 표출 플로우 검증:

1. `/agency/shippers/new` 에서 contact 정보(담당자명·이메일·연락처) 포함하여 신규 화주 등록
2. 화주 목록에서 해당 화주의 "상세 편집" 클릭
3. 편집 화면에서 담당자명·이메일·연락처 값이 표출되는지 확인

검증 결과를 [작업 결과] 섹션에 스크린샷 또는 DB 쿼리 결과로 증적 첨부.

---

## 참고 — 로컬 DB 현황 (2026-07-04 기준)

```
zen_organizations 컬럼: contact_name, contact_email, contact_phone — 존재 확인
테스트 화주 "UAT agency shipper" contact 데이터: 모두 NULL (등록 시 미입력)
```

---

## DoD (Definition of Done)

- [ ] `src/types/supabase.ts` 재생성 완료
- [ ] `zen_organizations.Row`에 contact 컬럼 3종 포함 확인
- [ ] `rtk npm run build` TypeScript 오류 없��
- [ ] `npm run test:regression` — ���항목 PASS
- [ ] 엔드투엔드 검증: 신규 화주 contact 정보 등록 → 편집 화면 표출 확인
- [ ] 코드 커밋 해시: (기재 예정)
- [ ] PR 생성: (기재 예정)

---

## [작업 결과]

_(착수 �� 기재)_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-04 | Jaison | TASK-B-050 발�� — DEF-094 Supabase 타입 재생성 + 담당자 정보 검증 |

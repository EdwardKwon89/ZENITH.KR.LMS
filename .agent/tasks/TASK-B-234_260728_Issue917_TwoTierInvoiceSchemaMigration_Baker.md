# TASK-B-234: Issue #917 (1/4) — 2단계 인보이스 스키마 마이그레이션

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#917](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/917) |
| **상위 이슈** | [#916](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/916) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

admin-agency-shipper 2단계 인보이스 체계 도입(#916)의 1단계 — 스키마 기반 작업. 이후 TASK-B-235/236/237이 이 위에서 진행되므로 **가장 먼저, 정확하게** 완료되어야 합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. 마이그레이션

```sql
ALTER TABLE zen_invoices
  ADD COLUMN billed_org_id UUID REFERENCES zen_organizations(id),
  ADD COLUMN invoice_tier TEXT CHECK (invoice_tier IN ('ADMIN_TO_AGENCY','AGENCY_TO_SHIPPER','ADMIN_TO_SHIPPER'));

CREATE INDEX idx_zen_invoices_billed_org ON zen_invoices(billed_org_id);
CREATE INDEX idx_zen_invoices_tier ON zen_invoices(invoice_tier);
```

### 2. 백필

```sql
UPDATE zen_invoices inv
SET billed_org_id = inv.shipper_id,
    invoice_tier = CASE
      WHEN EXISTS (
        SELECT 1 FROM zen_orders o
        WHERE o.id = (inv.metadata->>'source_order_id')::uuid
          AND o.agency_org_id IS NOT NULL
      ) THEN 'AGENCY_TO_SHIPPER'
      ELSE 'ADMIN_TO_SHIPPER'
    END
WHERE billed_org_id IS NULL;
```
`source_order_id`가 metadata에 없는 레거시 인보이스가 있다면 로컬 DB에서 실제로 그런 케이스가 있는지 먼저 확인(`psql`) — 있다면 `ADMIN_TO_SHIPPER`로 기본 처리.

### 3. RLS 추가

`zen_invoices`에 AGENCY용 신규 SELECT 정책 추가 — `billed_org_id = 본인 org_id`인 것도 조회 가능하게. **기존 정책은 절대 건드리지 않고 추가만** 합니다(RLS는 OR 결합).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-234-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 234 나와야 정상)
- [ ] 위 스펙대로 마이그레이션 작성 및 로컬 적용
- [ ] 백필 결과 실측 확인(psql 직접 쿼리로 기존 인보이스들의 `billed_org_id`/`invoice_tier`가 올바르게 채워졌는지)
- [ ] 회귀 테스트 추가 — **반드시 실제 DB 세션 기반 behavioral 테스트**(toContain/readFileSync 금지 — 이런 유형은 RLS를 실제로 검증 못 함):
  - AGENCY JWT로 `billed_org_id=본인`인 인보이스 SELECT 가능 확인
  - AGENCY JWT로 타 org의 `billed_org_id`인 인보이스는 SELECT 불가(0건) 확인
  - **자기완결형 fixture 필수**(`beforeAll`/`afterAll`, 하드코딩된 로컬 전용 UUID 금지)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] R-10 해당사항 없음(스키마 변경) — psql 실측 결과를 커밋 메시지/PR 본문에 상세히 기재하는 것으로 대체

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-234 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 917 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #917`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 직전 TASK-B-233(PR#914)에서 배정 파일(TASK-B-231) 대신 새 번호(233)로 제출한 이력 있음 — **이번엔 반드시 이 파일(TASK-B-234)을 그대로 사용**할 것. 착수 전 `.agent/tasks/` 폴더에 본인 담당으로 이미 존재하는 파일이 있는지 먼저 확인.
- **이 Task는 후속 3개 Task(235/236/237)의 기반**이므로 특히 정확해야 합니다 — RLS 정책 실측 검증을 반드시 실제 세션 기반으로 할 것(toContain 금지).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

# TASK-169 — DEF-086/087 인보이스 PDF — DB 마이그레이션 + Server Action 구현

> **Task-ID**: TASK-169
> **생성일**: 2026-06-30
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-30)
> **담당**: D_Kai (Team A)
> **우선순위**: P2
> **상태**: ⬜
> **GitHub Issue**: [#152](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/152)
> **연관 DEF**: DEF-086, DEF-087
> **연관 Task**: TASK-170 (B_Kai — UI 버튼, 본 Task 완료 후 착수)
> **전제조건**: 없음 (즉시 착수 가능)
> **목표 완료일**: 2026-07-01

---

## 업무 개요

UAT-19 실행 중 Baker가 발견한 DEF-086(`zen_invoice_files` 테이블 미존재)·DEF-087(인보이스 PDF 버튼 미구현)의 백엔드 구현을 담당한다.

**D_Kai 담당 범위**: DB 마이그레이션 + `generateInvoicePdf` Server Action

TASK-170(B_Kai UI 버튼)의 전제조건이므로 **우선 완료 필수**.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| develop 최신 pull 완료 | 착수 시 수행 |
| 로컬 Supabase 기동 확인 | 착수 시 확인 |

---

## 구현 범위

### Git 동기화 (착수 전 필수 — R-17 §0)

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teama-task-169-invoice-pdf-db-sa-dkai
```

---

### §1 — DB 마이그레이션: `zen_invoice_files` 테이블

**파일**: `supabase/migrations/YYYYMMDDHHMMSS_create_zen_invoice_files.sql`

```sql
CREATE TABLE IF NOT EXISTS zen_invoice_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES zen_invoices(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     BIGINT,
  content_type  TEXT NOT NULL DEFAULT 'application/pdf',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE zen_invoice_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON zen_invoice_files
  FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM zen_invoices
      WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );
```

> `zen_invoices` 테이블 스키마 확인 후 FK 컬럼명 조정 필요. `zen_invoices`가 없을 경우 `zen_orders`와의 관계 파악 후 대안 설계.

**로컬 적용**:
```bash
rtk supabase db reset --local
```
또는
```bash
rtk supabase migration up --local
```

---

### §2 — Server Action: `generateInvoicePdf`

**파일**: `src/actions/invoicePdf.ts` (신규)

구현 흐름:
1. `orderId` 또는 `invoiceId` 입력 수신
2. DB에서 인보이스 데이터 조회 (오더 정보, 아이템, 수하인, UPS 라벨 등)
3. PDF 생성 — 아래 중 선택:
   - **옵션 A**: `@react-pdf/renderer` (이미 package.json에 있으면 사용)
   - **옵션 B**: `puppeteer` 또는 `playwright` HTML → PDF
   - **옵션 C**: 외부 API (없으면 옵션 A 우선)
4. Supabase Storage에 업로드 (`invoices/` 버킷)
5. `zen_invoice_files` 테이블에 메타데이터 INSERT
6. `file_url` 반환

```typescript
// src/actions/invoicePdf.ts
'use server'

export async function generateInvoicePdf(orderId: string): Promise<{ fileUrl: string; fileName: string }> {
  // TODO: 구현
}
```

> PDF 생성 라이브러리 선택 전 `package.json` 확인 필수. 미설치 라이브러리 추가 시 `rtk npm install` 실행.

---

### §3 — 빌드 확인

```bash
rtk npm run build
```

---

### §4 — 회귀 테스트

```bash
rtk npm run test:regression
```

---

## DoD (Definition of Done)

- [ ] Git 동기화 + 브랜치 `feature/teama-task-169-invoice-pdf-db-sa-dkai` 생성
- [ ] §1 마이그레이션 파일 작성 + 로컬 Supabase 적용 확인 (`zen_invoice_files` 테이블 존재)
- [ ] §1 RLS 정책 적용 확인 (Supabase Studio 또는 SQL 쿼리)
- [ ] §2 `generateInvoicePdf` Server Action 구현 완료 (빌드 통과 수준)
- [ ] §3 `npm run build` PASS
- [ ] §4 `npm run test:regression` PASS + 결과 기재
- [ ] R-17 커밋 순서 준수 (코드 커밋 → 문서 커밋)
- [ ] 코드 커밋 해시 기재: `______`
- [ ] 문서 커밋 해시 기재: `______`
- [ ] PR 생성 (`Closes #152` 또는 `References #152`)
- [ ] TASK-170 착수 가능 여부 ACTIVE_TASK.md에 명시

---

## [설계 의견]

_D_Kai 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [Aiden 검토]

### 1차 검토 (2026-06-30) — ❌ 반려

**반려 사유**:

| # | 항목 | 위반 | 상세 |
|:-:|:-----|:----:|:-----|
| 1 | 코드 커밋 해시 DoD 미기재 | DoD 미충족 | `[x] 코드 커밋 해시 기재: _(커밋 후 기입)_` — template placeholder 미수정. `9ce0c7a`는 [작업결과]에만 기재됨. DoD 항목 자체에 실제 해시 기재 필요 |
| 2 | 문서 커밋 해시 미기재 | DoD 미충족 | `[x] 문서 커밋 해시 기재: _(커밋 후 기입)_` — `7bdab1b` DoD 항목 및 [작업결과] 모두 미기재 |

**구현 품질**: 우수. §1 마이그레이션(RLS·인덱스 포함)·§2 Server Action·빌드·회귀 모두 정상. 문서 형식 수정만 필요.

**Advisory (비차단)**:
- B_Kai Agent 현황 `🚫 TASK-170 대기` → `⬜ TASK-170 착수 대기`로 갱신 필요 (재작업 시 수정)

**재작업 지시**:
1. DoD `코드 커밋 해시 기재` 항목: `_(커밋 후 기입)_` → `9ce0c7a`
2. DoD `문서 커밋 해시 기재` 항목: `_(커밋 후 기입)_` → `7bdab1b`
3. [작업 결과] 해시 표에 문서 커밋 행 추가: `| \`7bdab1b\` | docs: 🔔 완료 보고 + TASK-170 전제 해제 |`
4. (Advisory) B_Kai Agent 현황 `🚫 TASK-170` → `⬜ TASK-170` 갱신
5. docs commit amend 또는 신규 correction 커밋 후 force push

---

## [작업 결과]

_D_Kai 완료 후 기재_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-30 | Aiden (ZEN_CEO) | **1차 반려** — PR#154 ❌. DoD 해시 2건 미기재: 코드 커밋 DoD항목 placeholder·문서 커밋 `7bdab1b` 미기재. D_Kai 수정 후 force push 지시. |
| 2026-06-30 | Aiden (ZEN_CEO) | TASK-169 신규 발령 — DEF-086/087 백엔드 구현 · D_Kai · Issue #152 · Edward 승인 |

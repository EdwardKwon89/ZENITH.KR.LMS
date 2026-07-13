# Ds-11 API 상세 명세 — SUPPORT (고객지원 포털)

> **프로젝트:** ZENITH_LMS | **버전:** v1.0 | **최종 수정:** 2026-04-26
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)
>
> **WBS 연계:** 4.1.4.1~4.1.4.3 | **Sprint:** Phase 4 Sprint 4

---

## 15. 고객지원 포털 (Customer Support Portal)

### 배경 및 범위

회원의 서비스 이용 문의(QnA), 자주 묻는 질문(FAQ), 공지사항 3가지 채널로 구성되는 고객지원 포털. QnA는 오더 연계 첨부를 지원하며, FAQ·공지사항은 Admin 등록 / User 조회 RBAC 구조를 따른다.

### DB 스키마

```sql
-- 1:1 문의 테이블
CREATE TABLE zen_qna (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES zen_orders(id) ON DELETE SET NULL,
  org_id      uuid NOT NULL REFERENCES zen_organizations(id),
  created_by  uuid NOT NULL REFERENCES profiles(id),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','IN_PROGRESS','ANSWERED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1:1 문의 답변 테이블
CREATE TABLE zen_qna_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qna_id      uuid NOT NULL REFERENCES zen_qna(id) ON DELETE CASCADE,
  answered_by uuid NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FAQ 테이블
CREATE TABLE zen_faq (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN ('ORDER','INVOICE','TRACKING','ROUTING','GENERAL')),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  order_no    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  uuid REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 공지사항 테이블
CREATE TABLE zen_notices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by   uuid NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 정책 요약:
-- zen_qna: User=본인 org SELECT/INSERT; Admin=전체 SELECT+UPDATE(status)
-- zen_qna_answers: Admin=INSERT/SELECT; User=본인 qna의 answers SELECT
-- zen_faq: User=is_active=true SELECT; Admin=전체 CRUD
-- zen_notices: User=is_published=true SELECT; Admin=전체 CRUD
-- Trigger: update_timestamp_column on zen_qna, zen_faq, zen_notices
```

---

### TypeScript 타입 정의

```typescript
type QnaStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED';
type FaqCategory = 'ORDER' | 'INVOICE' | 'TRACKING' | 'ROUTING' | 'GENERAL';

interface QnaItem {
  id: string;
  order_id: string | null;
  order_no: string | null;      // zen_orders 조인
  org_id: string;
  title: string;
  content: string;
  status: QnaStatus;
  answer_count: number;
  created_at: string;
  updated_at: string;
}

interface QnaAnswer {
  id: string;
  qna_id: string;
  answered_by: string;
  answered_by_name: string;     // profiles.name 조인
  content: string;
  created_at: string;
}

interface QnaDetail extends QnaItem {
  answers: QnaAnswer[];
}

interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  order_no: number;
  is_active: boolean;
  created_at: string;
}

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}
```

---

### 15.1 createQna (Action)

- **설명**: 1:1 문의 등록. 오더 연계 선택적 지원
- **권한**: User (SHIPPER/CORPORATE/INDIVIDUAL)
- **파라미터**:
  - `title`: string (최대 200자, 필수)
  - `content`: string (최대 5000자, 필수)
  - `order_id?`: string (uuid, 선택 — 오더 연계 시)
- **프로세스**:
  1. `order_id` 제공 시 소유권 검증 (org_id 일치)
  2. `zen_qna` INSERT (status: `PENDING`)
  3. Admin 대상 IN_APP 알림 생성
- **응답**: `{ success: true, qnaId: string }`

---

### 15.2 getQnaList (Action)

- **설명**: 문의 목록 조회. User=본인 org, Admin=전체
- **권한**: User / Admin
- **파라미터**:
  - `status?`: QnaStatus (필터)
  - `order_id?`: string (특정 오더 연계 문의만)
  - `limit?`: number (default 20)
  - `offset?`: number (default 0)
- **응답**: `{ qnas: QnaItem[], total: number }`

---

### 15.3 getQnaDetail (Action)

- **설명**: 문의 단건 상세 + 답변 이력 조회
- **권한**: User (본인 org) / Admin (전체)
- **파라미터**: `qnaId`: string (uuid)
- **응답**: `QnaDetail`

---

### 15.4 answerQna (Action)

- **설명**: 문의 답변 등록. 최초 답변 시 status `IN_PROGRESS` 자동 전환, 추가 답변 완료 시 `ANSWERED` 전환 + 고객 알림
- **권한**: Admin / ZENITH_SUPER_ADMIN / MANAGER
- **파라미터**:
  - `qnaId`: string (uuid)
  - `content`: string (최대 5000자)
  - `isFinal?`: boolean (true 시 status → `ANSWERED`)
- **프로세스**:
  1. `zen_qna_answers` INSERT
  2. `isFinal=true` 또는 첫 답변 여부에 따라 `zen_qna.status` UPDATE
  3. 문의 등록자에게 IN_APP 알림 생성
- **응답**: `{ success: true, answerId: string }`

---

### 15.5 upsertFaq (Action)

- **설명**: FAQ 등록(신규) 또는 수정(id 제공 시). 카테고리별 정렬 순서 지정 가능
- **권한**: Admin / ZENITH_SUPER_ADMIN
- **파라미터**:
  - `id?`: string (uuid, 수정 시)
  - `category`: FaqCategory
  - `question`: string (최대 500자)
  - `answer`: string (최대 5000자)
  - `order_no?`: number (정렬 순서, default 0)
  - `is_active?`: boolean (default true)
- **응답**: `{ success: true, faqId: string }`

---

### 15.6 getFaqList (Action)

- **설명**: FAQ 목록 조회. User는 `is_active=true`만, Admin은 전체
- **권한**: User / Admin
- **파라미터**:
  - `category?`: FaqCategory (필터)
  - `keyword?`: string (question/answer 텍스트 검색, ILIKE)
- **응답**: `{ faqs: FaqItem[] }` (order_no ASC 정렬)

---

### 15.7 deleteFaq (Action)

- **설명**: FAQ 삭제 (`is_active=false` 소프트 삭제)
- **권한**: Admin / ZENITH_SUPER_ADMIN
- **파라미터**: `faqId`: string (uuid)
- **응답**: `{ success: true }`

---

### 15.8 upsertNotice (Action)

- **설명**: 공지사항 등록(신규) 또는 수정(id 제공 시). `is_published=true` 설정 시 `published_at` 자동 기록
- **권한**: Admin / ZENITH_SUPER_ADMIN
- **파라미터**:
  - `id?`: string (uuid, 수정 시)
  - `title`: string (최대 200자)
  - `content`: string (최대 10000자)
  - `is_published?`: boolean (default false)
- **프로세스**:
  1. UPSERT
  2. `is_published=true` + 기존 `published_at IS NULL` → `published_at = now()` 설정
- **응답**: `{ success: true, noticeId: string }`

---

### 15.9 getNoticeList (Action)

- **설명**: 공지사항 목록 조회. User는 `is_published=true`만, Admin은 전체
- **권한**: User / Admin
- **파라미터**:
  - `limit?`: number (default 20)
  - `offset?`: number (default 0)
- **응답**: `{ notices: NoticeItem[], total: number }` (published_at DESC 정렬)

---

*작성: Aiden (ZEN_CEO) | 2026-04-26 | Sprint 4 사전 명세 (R-11 선행 설계)*

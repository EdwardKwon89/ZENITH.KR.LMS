# Ds-11 API 상세 명세 — VOC (고객 불만 관리)

> **프로젝트:** ZENITH_LMS | **버전:** v1.0 | **최종 수정:** 2026-04-26
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)
>
> **WBS 연계:** 4.1.3.1~4.1.3.3 | **Sprint:** Phase 4 Sprint 3

---

## 14. VOC 관리 (Voice of Customer)

### 배경 및 범위

오더별 고객 불만·문의(VOC)를 접수·처리하는 기능. 오더 상태와 연계되어 `CLAIMED` 전환 옵션을 제공하며, 담당자 알림(기존 `triggerStatusChangeNotification` 채널 재활용)이 자동 발송된다.

### DB 스키마

```sql
-- VOC 접수 테이블
CREATE TABLE zen_voc (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES zen_orders(id) ON DELETE RESTRICT,
  org_id      uuid NOT NULL REFERENCES zen_organizations(id),
  created_by  uuid NOT NULL REFERENCES profiles(id),
  type        TEXT NOT NULL CHECK (type IN ('DELAY','DAMAGE','MISDELIVERY','OTHER')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VOC 답변 이력 테이블
CREATE TABLE zen_voc_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voc_id      uuid NOT NULL REFERENCES zen_voc(id) ON DELETE CASCADE,
  answered_by uuid NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: zen_voc → User는 본인 org_id 행만 SELECT; Admin은 전체
-- RLS: zen_voc → INSERT는 User 이상, UPDATE(status)는 Admin 이상
-- RLS: zen_voc_answers → INSERT/SELECT는 Admin 이상
-- Trigger: update_timestamp_column on zen_voc
```

**유형 코드 정의:**

| type | 한글 |
|:---|:---|
| `DELAY` | 지연 |
| `DAMAGE` | 파손 |
| `MISDELIVERY` | 오배송 |
| `OTHER` | 기타 |

**상태 전이:**

```
OPEN → IN_PROGRESS (Admin 최초 답변 시 자동)
IN_PROGRESS → CLOSED (Admin updateVocStatus 직접 호출)
```

---

### TypeScript 타입 정의

```typescript
type VocType = 'DELAY' | 'DAMAGE' | 'MISDELIVERY' | 'OTHER';
type VocStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

interface VocItem {
  id: string;
  order_id: string;
  order_no: string;           // zen_orders.order_no (join)
  org_id: string;
  type: VocType;
  title: string;
  description: string;
  status: VocStatus;
  answer_count: number;
  created_at: string;
  updated_at: string;
}

interface VocAnswer {
  id: string;
  voc_id: string;
  answered_by: string;
  answered_by_name: string;   // profiles.name (join)
  content: string;
  created_at: string;
}

interface VocDetail extends VocItem {
  answers: VocAnswer[];
}
```

---

### 14.1 createVoc (Action)

- **설명**: 오더에 대한 VOC를 등록하고 Admin에게 IN_APP 알림 발송
- **권한**: User (SHIPPER/CORPORATE/INDIVIDUAL)
- **파라미터**:
  - `order_id`: string (uuid, 필수)
  - `type`: VocType (필수)
  - `title`: string (최대 100자, 필수)
  - `description`: string (최대 2000자, 필수)
- **프로세스**:
  1. `order_id` 소유권 확인 (org_id 일치)
  2. `zen_voc` INSERT (status: `OPEN`)
  3. Admin 대상 IN_APP 알림 생성 (`zen_notifications` INSERT)
- **응답**: `{ success: true, vocId: string }`
- **에러**:
  - `UNAUTHORIZED`: 다른 조직의 오더에 VOC 등록 시도
  - `NOT_FOUND`: 존재하지 않는 order_id

---

### 14.2 getVocList (Action)

- **설명**: VOC 목록 조회. User는 본인 org 소속 오더의 VOC만, Admin은 전체 조회
- **권한**: User / Admin
- **파라미터**:
  - `status?`: VocStatus (필터)
  - `type?`: VocType (필터)
  - `order_id?`: string (특정 오더의 VOC만)
  - `limit?`: number (default 20)
  - `offset?`: number (default 0)
- **응답**: `{ vocs: VocItem[], total: number }`
- **비고**: `order_no`는 `zen_orders` 조인으로 취득. RLS가 User/Admin 범위를 자동 제한

---

### 14.3 getVocDetail (Action)

- **설명**: VOC 단건 상세 + 답변 이력 전체 조회
- **권한**: User (본인 org) / Admin (전체)
- **파라미터**: `vocId`: string (uuid)
- **응답**: `VocDetail`
- **에러**: `NOT_FOUND` / `UNAUTHORIZED`

---

### 14.4 answerVoc (Action)

- **설명**: VOC에 답변 등록. 최초 답변 시 VOC 상태를 `IN_PROGRESS`로 자동 전환 + 고객 IN_APP 알림
- **권한**: Admin / ZENITH_SUPER_ADMIN / MANAGER
- **파라미터**:
  - `vocId`: string (uuid)
  - `content`: string (최대 2000자)
- **프로세스**:
  1. `zen_voc_answers` INSERT
  2. `zen_voc.status` 가 `OPEN`이면 → `IN_PROGRESS` UPDATE
  3. VOC 등록자(`created_by`)에게 IN_APP 알림 생성
- **응답**: `{ success: true, answerId: string }`

---

### 14.5 updateVocStatus (Action)

- **설명**: VOC 처리 상태 직접 변경 (주로 `IN_PROGRESS → CLOSED`)
- **권한**: Admin / ZENITH_SUPER_ADMIN / MANAGER
- **파라미터**:
  - `vocId`: string (uuid)
  - `status`: VocStatus
- **응답**: `{ success: true }`
- **에러**: `INVALID_TRANSITION` — `CLOSED → OPEN` 역방향 전환 불가

---

*작성: Aiden (ZEN_CEO) | 2026-04-26 | Sprint 3 사전 명세 (R-11 선행 설계)*

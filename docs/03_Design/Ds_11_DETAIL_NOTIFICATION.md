# Ds-11 API 상세 명세 — NOTIFICATION (알림 관리)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

---

## 12. 알림 관리 (Notification Management)

### DB 스키마

```sql
CREATE TABLE zen_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES zen_orders(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,        -- 'STATUS_CHANGE' | 'HELD' | 'DELIVERED'
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  channel     TEXT NOT NULL,        -- 'EMAIL' | 'IN_APP'
  is_read     BOOLEAN DEFAULT false,
  sent_at     TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- RLS: 본인 알림만 조회 가능
```

**알림 트리거 대상 상태 전환:**

| OrderStatus | 수신자 | 채널 |
|:---|:---|:---|
| WAREHOUSED | 송하인(shipper) | EMAIL + IN_APP |
| RELEASED | 송하인 | EMAIL + IN_APP |
| IN_TRANSIT | 수하인(recipient_email) | EMAIL + IN_APP |
| DELIVERED | 송하인 + 수하인 | EMAIL + IN_APP |
| HELD | 송하인 + Admin | EMAIL + IN_APP |

### 12.1 triggerStatusChangeNotification (Internal)

- **설명**: `updateOrderStatus` 완료 시 내부 호출 — 알림 생성 및 Resend 이메일 발송
- **권한**: System (외부 직접 호출 불가)
- **파라미터**:
  - `orderId`: (uuid)
  - `newStatus`: (OrderStatus)
  - `previousStatus`: (OrderStatus)
- **프로세스**:
  1. 트리거 대상 상태 여부 확인
  2. `zen_orders`에서 shipper/recipient 정보 조회
  3. `zen_notifications` 테이블에 IN_APP 알림 삽입
  4. Resend API로 이메일 발송 (실패 시 로그만, 상태 변경 롤백 없음)
- **응답**: `void`

### 12.2 getNotifications (Action)

- **설명**: 로그인 사용자의 알림 목록 조회 (미읽음 우선 정렬)
- **권한**: User
- **파라미터**:
  - `limit?`: number (default 20)
  - `offset?`: number (default 0)
- **응답**: `{ notifications: NotificationItem[], unreadCount: number }`

### 12.3 markNotificationRead (Action)

- **설명**: 특정 알림 읽음 처리
- **권한**: User (본인 알림만)
- **파라미터**: `notificationId` (uuid)
- **응답**: `{ success: boolean }`

### 12.4 markAllNotificationsRead (Action)

- **설명**: 전체 미읽음 알림 일괄 읽음 처리
- **권한**: User
- **파라미터**: 없음
- **응답**: `{ success: boolean, updatedCount: number }`

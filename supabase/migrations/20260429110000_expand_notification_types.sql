-- Expand allowed notification types in zen_notifications table
-- Sprint 10: Monitoring, QnA, VOC 알림 타입 추가

DO $$
BEGIN
    -- 1. 기존 제약 조건 삭제 (이름이 불확실하므로 검색하여 삭제)
    DECLARE
        constraint_name TEXT;
    BEGIN
        SELECT conname INTO constraint_name
        FROM pg_constraint
        JOIN pg_class ON pg_class.oid = pg_constraint.conrelid
        WHERE relname = 'zen_notifications' AND conname LIKE '%type_check%';

        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE zen_notifications DROP CONSTRAINT ' || constraint_name;
        END IF;
    END;

    -- 2. 신규 제약 조건 추가
    ALTER TABLE zen_notifications
    ADD CONSTRAINT zen_notifications_type_check
    CHECK (type IN (
        'STATUS_CHANGE', 
        'HELD', 
        'DELIVERED', 
        'SYSTEM', 
        'QNA_CREATED', 
        'QNA_ANSWERED', 
        'VOC_CREATED', 
        'VOC_ANSWERED'
    ));
END $$;

COMMENT ON COLUMN zen_notifications.type IS 'Notification category: STATUS_CHANGE, HELD, DELIVERED, SYSTEM, QNA_CREATED, QNA_ANSWERED, VOC_CREATED, VOC_ANSWERED';

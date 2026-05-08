-- 20260508140000_fix_sql_ambiguity_and_unique_constraints.sql

-- [QA-02-C] 1. fn_get_best_matching_rate 수정 (출력 컬럼명 id -> rate_id 변경으로 모호성 해결)
DROP FUNCTION IF EXISTS public.fn_get_best_matching_rate(uuid, uuid, uuid, character varying, uuid, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_carrier_id uuid, 
    p_origin_port_id uuid, 
    p_dest_port_id uuid, 
    p_service_type character varying, 
    p_customer_id uuid, 
    p_reference_date timestamp with time zone
)
 RETURNS TABLE(rate_id uuid, unit_price numeric, currency character varying, base_date_rule character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_origin_code text;
    v_dest_code text;
BEGIN
    -- [Fix] 테이블명 명시적 한정으로 모호성 제거
    SELECT p.code INTO v_origin_code FROM public.zen_ports p WHERE p.id = p_origin_port_id;
    SELECT p.code INTO v_dest_code FROM public.zen_ports p WHERE p.id = p_dest_port_id;

    RETURN QUERY
    SELECT
        rc.id                               AS rate_id, -- [Fix] rate_id로 별칭 지정
        rc.unit_price                       AS unit_price,
        rc.currency::character varying      AS currency,
        COALESCE(rc.remarks, '')::character varying AS base_date_rule
    FROM
        public.zen_rate_cards rc
    WHERE
        (p_carrier_id IS NULL OR rc.org_id = p_carrier_id)
        AND (v_origin_code IS NULL OR rc.origin_code    = v_origin_code)
        AND (v_dest_code IS NULL OR rc.dest_code      = v_dest_code)
        AND rc.mode           = p_service_type
        AND rc.status         = 'ACTIVE'
        AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id)
        AND (rc.valid_to IS NULL OR p_reference_date <= rc.valid_to)
        AND (rc.valid_from <= p_reference_date)
    ORDER BY
        (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC,
        rc.priority DESC,
        rc.version_no DESC
    LIMIT 1;
END;
$function$;

-- [QA-02-C] 2. fn_trigger_capture_order_rate 수정 (v_rate_record.rate_id 사용)
CREATE OR REPLACE FUNCTION public.fn_trigger_capture_order_rate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rate_record RECORD;
    v_ref_date TIMESTAMP WITH TIME ZONE;
    v_is_manual BOOLEAN;
BEGIN
    -- [Fix] NEW.id를 명확히 사용하여 모호성 방지
    SELECT zors.is_manual INTO v_is_manual 
    FROM public.zen_order_rate_snapshots zors
    WHERE zors.order_id = NEW.id;

    IF v_is_manual IS TRUE THEN
        RETURN NEW;
    END IF;

    IF NEW.confirmed_at IS NOT NULL THEN
        v_ref_date := NEW.confirmed_at;
    ELSIF NEW.received_at IS NOT NULL THEN
        v_ref_date := NEW.received_at;
    ELSE
        v_ref_date := COALESCE(NEW.order_date, NEW.created_at);
    END IF;

    SELECT * INTO v_rate_record 
    FROM public.fn_get_best_matching_rate(
        NEW.carrier_id,
        NEW.origin_port_id,
        NEW.dest_port_id,
        NEW.transport_mode,
        NEW.shipper_id,
        v_ref_date
    );

    -- [Fix] v_rate_record.rate_id 참조 (id -> rate_id)
    IF v_rate_record.rate_id IS NOT NULL THEN
        INSERT INTO public.zen_order_rate_snapshots (
            order_id,
            rate_card_id,
            applied_unit_price,
            applied_currency,
            applied_rule,
            snapshot_at,
            is_manual
        ) VALUES (
            NEW.id,
            v_rate_record.rate_id,
            v_rate_record.unit_price,
            v_rate_record.currency,
            v_rate_record.base_date_rule,
            NOW(),
            FALSE
        )
        ON CONFLICT (order_id) DO UPDATE SET
            rate_card_id = EXCLUDED.rate_card_id,
            applied_unit_price = EXCLUDED.applied_unit_price,
            applied_currency = EXCLUDED.applied_currency,
            applied_rule = EXCLUDED.applied_rule,
            snapshot_at = EXCLUDED.snapshot_at,
            is_manual = FALSE
        WHERE 
            NOT (public.zen_order_rate_snapshots.applied_rule = 'CONFIRM_DATE');
    END IF;

    RETURN NEW;
END;
$function$;

-- [QA-02-C] 3. zen_tracking_configs UNIQUE 제약 조건 복구
-- 중복 데이터 정리 (가장 오래된 것 하나만 남김)
DELETE FROM public.zen_tracking_configs a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (order_id) id
    FROM public.zen_tracking_configs
    ORDER BY order_id, created_at ASC
);

-- UNIQUE 제약 조건 추가 (존재하지 않을 경우에만)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'zen_tracking_configs_order_id_unique'
    ) THEN
        ALTER TABLE public.zen_tracking_configs 
        ADD CONSTRAINT zen_tracking_configs_order_id_unique UNIQUE (order_id);
    END IF;
END $$;

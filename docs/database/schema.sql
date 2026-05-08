> supabase db dump
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE OR REPLACE FUNCTION "public"."approve_organization"("target_org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_id TEXT;
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    -- [1] Security check (simplified)
    -- In production: Ensure auth.uid() has ADMIN role
    -- [2] Check if already active
    IF EXISTS (SELECT 1 FROM public.organizations WHERE id = target_org_id AND status = 'ACTIVE') THEN
        RETURN 'ALREADY_ACTIVE';
    END IF;
    -- [3] Generate 6-digit corporate ID
    new_id := LPAD(nextval('corporate_id_seq')::TEXT, 6, '0');
    -- [4] Update organization status and ID
    UPDATE public.organizations
    SET 
        status = 'ACTIVE',
        corporate_id = new_id,
        approval_date = now()
    WHERE id = target_org_id;
    -- [5] Update profile statuses (for all users tied to this org)
    UPDATE public.profiles
    SET status = 'ACTIVE'
    WHERE org_id = target_org_id;
    -- [6] Update auth.users raw_app_meta_data for these users so AuthGuard lets them pass
    -- We must use a loop if multiple users are in the same org
    FOR target_user_id IN (SELECT id FROM public.profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;
        IF meta_data IS NULL THEN
            meta_data := '{}'::jsonb;
        END IF;
        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'ACTIVE')
        WHERE id = target_user_id;
    END LOOP;
    RETURN new_id;
END;
$$;
ALTER FUNCTION "public"."approve_organization"("target_org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_order             RECORD;
    v_schedule          RECORD;
    v_rate              RECORD;
    v_chargeable_weight NUMERIC;
    v_total_freight     NUMERIC;
BEGIN
    -- 1. 오더 정보 조회
    SELECT * INTO v_order FROM public.zen_orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '오더를 찾을 수 없습니다.');
    END IF;
    -- 2. 스케줄에서 출발/도착 항구 ID 획득
    --    zen_orders에 origin_port_id가 없으므로 schedule을 통해 경로 파악
    IF v_order.schedule_id IS NOT NULL THEN
        SELECT * INTO v_schedule
        FROM public.zen_transport_schedules
        WHERE id = v_order.schedule_id;
    END IF;
    -- Chargeable Weight 계산 (임시: estimated_cost 값 사용, 추후 cargo_details JSONB 파싱으로 교체)
    v_chargeable_weight := COALESCE((v_order.estimated_cost)::NUMERIC, 1.0);
    -- 3. 요율 매칭
    --    스케줄 존재 시 경로 기반 매칭, 없으면 transport_mode만으로 매칭
    IF v_schedule IS NOT NULL THEN
        SELECT * INTO v_rate
        FROM public.zen_rate_cards
        WHERE origin_id      = v_schedule.origin_port_id           -- was origin_port
          AND destination_id = v_schedule.destination_port_id      -- was destination_port
          AND mode           = v_order.transport_mode              -- was service_type
          AND status         = 'ACTIVE'
        ORDER BY priority DESC, created_at DESC
        LIMIT 1;
    ELSE
        -- 스케줄 없이 transport_mode 만으로 최우선 요율 검색 (Fallback)
        SELECT * INTO v_rate
        FROM public.zen_rate_cards
        WHERE mode   = v_order.transport_mode
          AND status = 'ACTIVE'
        ORDER BY priority DESC, created_at DESC
        LIMIT 1;
    END IF;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '유효한 요율 카드를 찾을 수 없습니다.');
    END IF;
    v_total_freight := v_rate.rate_price * v_chargeable_weight;   -- was v_rate.base_rate
    -- 4. 정산 상세(zen_order_costs) 자동 삽입 (기존 FREIGHT 항목 교체)
    DELETE FROM public.zen_order_costs
    WHERE order_id  = p_order_id
      AND cost_type = 'FREIGHT';
    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency)
    VALUES (p_order_id, 'FREIGHT', v_rate.rate_price, v_chargeable_weight, v_rate.currency);
    RETURN jsonb_build_object(
        'success',           true,
        'chargeable_weight', v_chargeable_weight,
        'rate_applied',      v_rate.rate_price,      -- was v_rate.base_rate
        'total_freight',     v_total_freight,
        'currency',          v_rate.currency
    );
END;
$$;
ALTER FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) RETURNS TABLE("id" "uuid", "unit_price" numeric, "currency" character varying, "base_date_rule" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        rc.id,
        rc.rate_price                       AS unit_price,    -- was rc.base_rate
        rc.currency::character varying,
        COALESCE(rc.remarks, '')::character varying AS base_date_rule  -- remarks 로 대체
    FROM
        public.zen_rate_cards rc
    WHERE
        rc.org_id         = p_carrier_id            -- was rc.carrier_id
        AND rc.origin_id      = p_origin_port_id    -- was rc.origin_port (code join)
        AND rc.destination_id = p_dest_port_id      -- was rc.destination_port (code join)
        AND rc.mode           = p_service_type       -- was rc.service_type
        AND rc.status         = 'ACTIVE'
        AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id)
        AND p_reference_date  <@ tstzrange(rc.valid_from, rc.valid_to)
    ORDER BY
        (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC,
        rc.priority DESC,
        rc.version_no DESC
    LIMIT 1;
END;
$$;
ALTER FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."fn_set_invoice_paid_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'PAID' AND (OLD.status IS DISTINCT FROM 'PAID') THEN
    NEW.paid_at = NOW();
  END IF;
  IF NEW.status != 'PAID' THEN
    NEW.paid_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."fn_set_invoice_paid_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."fn_trigger_capture_order_rate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_rate_record RECORD;
    v_ref_date TIMESTAMP WITH TIME ZONE;
    v_is_manual BOOLEAN;
BEGIN
    -- 1. Check for manual override status
    SELECT is_manual INTO v_is_manual 
    FROM public.zen_order_rate_snapshots 
    WHERE order_id = NEW.id;
    -- 2. Respect Manual Override: If manual, do not auto-overwrite
    IF v_is_manual IS TRUE THEN
        RETURN NEW;
    END IF;
    -- 3. Determine reference date (CONFIRM > RECEIPT > ORDER)
    IF NEW.confirmed_at IS NOT NULL THEN
        v_ref_date := NEW.confirmed_at;
    ELSIF NEW.received_at IS NOT NULL THEN
        v_ref_date := NEW.received_at;
    ELSE
        v_ref_date := COALESCE(NEW.order_date, NEW.created_at);
    END IF;
    -- 4. Execute matching engine
    SELECT * INTO v_rate_record 
    FROM public.fn_get_best_matching_rate(
        NEW.carrier_id,
        NEW.origin_port_id,
        NEW.dest_port_id,
        'STANDARD',
        NEW.shipper_id,
        v_ref_date
    );
    -- 5. Atomic Snapshot persistence
    IF v_rate_record.id IS NOT NULL THEN
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
            v_rate_record.id,
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
            -- Protect confirmed snapshots unless force updated via manual override API (not through this trigger)
            NOT (public.zen_order_rate_snapshots.applied_rule = 'CONFIRM_DATE');
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."fn_trigger_capture_order_rate"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_master_order_no"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    seq_val INT;
    date_part TEXT;
BEGIN
    seq_val := nextval('master_order_no_seq');
    date_part := to_char(CURRENT_DATE, 'YYMMDD');
    RETURN 'M' || date_part || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$;
ALTER FUNCTION "public"."generate_master_order_no"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$ 
  SELECT role FROM public.zen_profiles WHERE id = auth.uid();
$$;
ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_next_order_sequence"("p_year" "text", "p_prefix" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    next_val bigint;
BEGIN
    INSERT INTO public.zen_sequences (prefix, year, last_value)
    VALUES (p_prefix, p_year, 1)
    ON CONFLICT (prefix, year)
    DO UPDATE SET last_value = zen_sequences.last_value + 1
    RETURNING last_value INTO next_val;
    RETURN p_prefix || '-' || p_year || '-' || LPAD(next_val::text, 6, '0');
END;
$$;
ALTER FUNCTION "public"."get_next_order_sequence"("p_year" "text", "p_prefix" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_next_order_sequence"("p_year" "text", "p_prefix" "text") IS '연도 및 접두사별 하우스 오더 일련번호를 생성합니다.';
CREATE OR REPLACE FUNCTION "public"."get_orders_aggregation"("order_ids" "uuid"[]) RETURNS TABLE("total_weight" numeric, "total_volume" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.gross_weight), 0)::numeric,
        COALESCE(SUM(p.volume), 0)::numeric
    FROM public.zen_orders o
    LEFT JOIN public.zen_order_packages p ON o.id = p.order_id
    WHERE o.id = ANY(order_ids);
END;
$$;
ALTER FUNCTION "public"."get_orders_aggregation"("order_ids" "uuid"[]) OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_orders_aggregation"("order_ids" "uuid"[]) IS '지정된 하우스 오더들의 총 중량 및 CBM을 합산하여 반환합니다.';
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_org_id UUID;
    final_org_type TEXT;
    final_role TEXT;
    final_status TEXT := 'PENDING'; -- 기본 상태
BEGIN
    -- [A] 데이터 추출 및 개인/법인 분기
    IF (new.raw_user_meta_data->>'is_new_org')::boolean = true THEN
        -- 신규 법인 생성
        INSERT INTO public.zen_organizations (name, biz_no, type, status)
        VALUES (
            new.raw_user_meta_data->>'org_name',
            new.raw_user_meta_data->>'business_number',
            COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER'),
            'PENDING'
        )
        RETURNING id INTO target_org_id;
        final_org_type := COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER');
        final_role := 'ADMIN'; 
    ELSIF (new.raw_user_meta_data->>'org_id') IS NOT NULL THEN
        -- 기존 법인 합류
        target_org_id := (new.raw_user_meta_data->>'org_id')::UUID;
        SELECT type INTO final_org_type FROM public.zen_organizations WHERE id = target_org_id;
        final_role := 'MEMBER';
    ELSE
        -- 개인 회원 (Master Edward님의 지침에 따라 SHIPPER 고정)
        final_org_type := 'SHIPPER';
        final_role := 'INDIVIDUAL';
        final_status := 'ACTIVE'; -- 개인 회원은 즉시 활성화
    END IF;
    -- [B] public.zen_profiles 테이블 생성
    INSERT INTO public.zen_profiles (id, email, full_name, role, status, org_id)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        final_role,
        final_status,
        target_org_id
    );
    -- [C] auth.users의 raw_app_meta_data 동기화
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || 
        jsonb_build_object(
            'org_type', final_org_type,
            'role', final_role,
            'status', final_status
        )
    WHERE id = new.id;
    RETURN new;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    UPDATE public.organizations
    SET 
        status = 'REJECTED',
        approval_comment = comment
    WHERE id = target_org_id;
    FOR target_user_id IN (SELECT id FROM public.profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;
        IF meta_data IS NULL THEN meta_data := '{}'::jsonb; END IF;
        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'REJECTED')
        WHERE id = target_user_id;
    END LOOP;
    RETURN TRUE;
END;
$$;
ALTER FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    -- [1] Update organization status and comment
    UPDATE public.organizations
    SET 
        status = 'SUPPLEMENT_REQUIRED',
        approval_comment = comment
    WHERE id = target_org_id;
    -- [2] Update profile status for all users in this org
    UPDATE public.profiles
    SET status = 'PENDING' -- Profiles remain pending until final approval
    WHERE org_id = target_org_id;
    -- [3] Sync with Auth Metadata so Proxy (Middleware) knows the detailed status
    FOR target_user_id IN (SELECT id FROM public.profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;
        IF meta_data IS NULL THEN meta_data := '{}'::jsonb; END IF;
        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'SUPPLEMENT_REQUIRED')
        WHERE id = target_user_id;
    END LOOP;
    RETURN TRUE;
END;
$$;
ALTER FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;
ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_timestamp_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_timestamp_column"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."common_code_groups" (
    "group_code" character varying(50) NOT NULL,
    "group_name" character varying(100) NOT NULL,
    "is_system" boolean DEFAULT false,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."common_code_groups" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."common_codes" (
    "group_code" character varying(50) NOT NULL,
    "code_value" character varying(50) NOT NULL,
    "code_name_ko" character varying(100) NOT NULL,
    "code_name_en" character varying(100),
    "code_name_zh" character varying(100),
    "code_name_ja" character varying(100),
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."common_codes" OWNER TO "postgres";
CREATE SEQUENCE IF NOT EXISTS "public"."corporate_id_seq"
    START WITH 10001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE "public"."corporate_id_seq" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."customs_adapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "adapter_code" "text" NOT NULL,
    "adapter_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."customs_adapters" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."customs_declarations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "adapter_type" "text" DEFAULT 'MANUAL'::"text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "declaration_no" "text",
    "cargo_description" "text",
    "declared_value" numeric(18,2),
    "currency_code" "text" DEFAULT 'USD'::"text",
    "admin_note" "text",
    "submitted_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."customs_declarations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."grade_master" (
    "grade_code" character varying(20) NOT NULL,
    "grade_name_ko" character varying(100) NOT NULL,
    "grade_name_en" character varying(100),
    "grade_name_zh" character varying(100),
    "grade_name_ja" character varying(100),
    "discount_rate" numeric(5,2) DEFAULT 0.00,
    "benefit_desc" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."grade_master" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."grade_promotion_request" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_grade" character varying(20),
    "target_grade" character varying(20),
    "request_reason" "text",
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "admin_comment" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."grade_promotion_request" OWNER TO "postgres";
CREATE SEQUENCE IF NOT EXISTS "public"."master_order_no_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE "public"."master_order_no_seq" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."nations" (
    "iso_alpha2" character(2) NOT NULL,
    "iso_alpha3" character(3) NOT NULL,
    "nation_name_ko" character varying(100) NOT NULL,
    "nation_name_en" character varying(100),
    "nation_name_zh" character varying(100),
    "nation_name_ja" character varying(100),
    "phone_code" character varying(10),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."nations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "prev_status" "text",
    "next_status" "text" NOT NULL,
    "changed_by" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."order_status_history" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."order_status_master" (
    "status_code" character varying(20) NOT NULL,
    "status_name_ko" character varying(100) NOT NULL,
    "status_name_en" character varying(100),
    "status_name_zh" character varying(100),
    "status_name_ja" character varying(100),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."order_status_master" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."organization_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "doc_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "rejection_reason" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    CONSTRAINT "organization_documents_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'SUPPLEMENT_REQUESTED'::"text"])))
);
ALTER TABLE "public"."organization_documents" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "org_code" character varying(20),
    "org_name_ko" character varying(200) NOT NULL,
    "org_name_en" character varying(200),
    "org_name_zh" character varying(200),
    "org_name_ja" character varying(200),
    "org_type" character varying(20) NOT NULL,
    "registration_no" character varying(50),
    "address" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "corporate_id" "text",
    "biz_no" "text",
    "rep_name" "text",
    "approval_date" timestamp with time zone,
    "rejection_reason" "text",
    "approval_comment" "text",
    "status" "text" DEFAULT 'PENDING'::"text",
    "type" "text" DEFAULT 'SHIPPER'::"text"
);
ALTER TABLE "public"."organizations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ports" (
    "port_code" character(5) NOT NULL,
    "nation_code" character(2),
    "port_name_ko" character varying(200) NOT NULL,
    "port_name_en" character varying(200),
    "port_name_zh" character varying(200),
    "port_name_ja" character varying(200),
    "port_type" character varying(10) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."ports" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid",
    "email" character varying(255),
    "full_name" character varying(100),
    "role" character varying(20) DEFAULT 'USER'::character varying,
    "grade_code" character varying(20) DEFAULT 'FAMILY'::character varying,
    "is_approved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "preferred_language" "text" DEFAULT 'ko'::"text"
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."rate_card_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_card_id" "uuid",
    "action" character varying(20),
    "old_data" "jsonb",
    "new_data" "jsonb",
    "change_reason" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."rate_card_logs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."rate_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "carrier_id" "uuid" NOT NULL,
    "origin_port" character(5) NOT NULL,
    "destination_port" character(5) NOT NULL,
    "service_type" character varying(20) NOT NULL,
    "base_rate" numeric(15,2) DEFAULT 0.00,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "version_no" integer DEFAULT 1,
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_to" timestamp with time zone DEFAULT '9999-12-31 23:59:59+00'::timestamp with time zone,
    "status" character varying(20) DEFAULT 'ACTIVE'::character varying,
    "priority" integer DEFAULT 0,
    "customer_id" "uuid",
    "parent_version_id" "uuid",
    "base_date_rule" character varying(20) DEFAULT 'RECEIPT_DATE'::character varying
);
ALTER TABLE "public"."rate_cards" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."rate_slabs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_card_id" "uuid" NOT NULL,
    "weight_min" numeric(15,2) NOT NULL,
    "unit_price" numeric(15,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."rate_slabs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."standard_code_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" character varying(50) NOT NULL,
    "external_org" character varying(50) NOT NULL,
    "external_code" character varying(50) NOT NULL,
    "internal_code" character varying(50) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."standard_code_mapping" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "config_key" character varying(100) NOT NULL,
    "config_value" "text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "public"."system_config" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "category" "text" DEFAULT 'GENERAL'::"text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);
ALTER TABLE "public"."system_settings" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "reason_code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_claims_reason_code_check" CHECK (("reason_code" = ANY (ARRAY['DELAY'::"text", 'DAMAGE'::"text", 'MISDELIVERY'::"text"]))),
    CONSTRAINT "zen_claims_status_check" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'INVESTIGATING'::"text", 'RESOLVED'::"text", 'CLOSED'::"text"])))
);
ALTER TABLE "public"."zen_claims" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shipper_id" "uuid",
    "carrier_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "terms_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_contracts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "stack" "text",
    "url" "text",
    "user_id" "uuid",
    "org_id" "uuid",
    "severity" "text" DEFAULT 'ERROR'::"text" NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "sentry_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_error_logs_severity_check" CHECK (("severity" = ANY (ARRAY['WARNING'::"text", 'ERROR'::"text", 'CRITICAL'::"text"])))
);
ALTER TABLE "public"."zen_error_logs" OWNER TO "postgres";
COMMENT ON TABLE "public"."zen_error_logs" IS 'System error logs for monitoring and debugging';
COMMENT ON COLUMN "public"."zen_error_logs"."error_type" IS 'Source of the error: CLIENT, SERVER, or EDGE';
COMMENT ON COLUMN "public"."zen_error_logs"."severity" IS 'Importance level: WARNING, ERROR, or CRITICAL';
CREATE TABLE IF NOT EXISTS "public"."zen_faq" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "order_no" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_faq_category_check" CHECK (("category" = ANY (ARRAY['ORDER'::"text", 'INVOICE'::"text", 'TRACKING'::"text", 'ROUTING'::"text", 'GENERAL'::"text"])))
);
ALTER TABLE "public"."zen_faq" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "org_id" "uuid",
    "description" "text" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."zen_feature_flags" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_incident_fees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "fee_amount" numeric(18,4) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."zen_incident_fees" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sku_code" "text" NOT NULL,
    "item_name" "text" NOT NULL,
    "on_hand_qty" integer DEFAULT 0 NOT NULL,
    "reserved_qty" integer DEFAULT 0 NOT NULL,
    "available_qty" integer GENERATED ALWAYS AS (("on_hand_qty" - "reserved_qty")) STORED,
    "warehouse_location" "text",
    "min_stock_level" integer DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_inventory" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_inventory_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "change_qty" integer NOT NULL,
    "result_qty" integer NOT NULL,
    "reference_id" "uuid",
    "remarks" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_inventory_history_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['INBOUND'::"text", 'OUTBOUND'::"text", 'ADJUSTMENT'::"text", 'RESERVATION'::"text", 'RESERVATION_CANCEL'::"text"])))
);
ALTER TABLE "public"."zen_inventory_history" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_invoice_pdf_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);
ALTER TABLE "public"."zen_invoice_pdf_history" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_no" "text" NOT NULL,
    "shipper_id" "uuid" NOT NULL,
    "total_amount" numeric(19,4) DEFAULT 0 NOT NULL,
    "paid_amount" numeric(19,4) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'UNPAID'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "paid_at" timestamp with time zone,
    "applied_exchange_rate" numeric(18,6),
    "payment_method" "text" DEFAULT 'BANK_TRANSFER'::"text" NOT NULL,
    CONSTRAINT "zen_invoices_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['BANK_TRANSFER'::"text", 'WALLET'::"text"]))),
    CONSTRAINT "zen_invoices_status_check" CHECK (("status" = ANY (ARRAY['UNPAID'::"text", 'PARTIAL'::"text", 'PAID'::"text", 'OVERDUE'::"text", 'CANCELED'::"text"])))
);
ALTER TABLE "public"."zen_invoices" OWNER TO "postgres";
COMMENT ON COLUMN "public"."zen_invoices"."applied_exchange_rate" IS 'Exchange rate snapshot used for this invoice (USD/KRW)';
COMMENT ON COLUMN "public"."zen_invoices"."payment_method" IS '결제 방식 (BANK_TRANSFER: 무통장입금, WALLET: 선불지갑)';
CREATE TABLE IF NOT EXISTS "public"."zen_master_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "master_no" "text" NOT NULL,
    "status" "text" DEFAULT 'CREATED'::"text",
    "total_house_count" integer DEFAULT 0,
    "total_gross_weight" numeric(12,3) DEFAULT 0,
    "total_volume" numeric(12,4) DEFAULT 0,
    "carrier_id" "uuid",
    "vessel_flight_no" "text",
    "etd" timestamp with time zone,
    "eta" timestamp with time zone,
    "origin_port_id" "uuid",
    "dest_port_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "remarks" "text",
    CONSTRAINT "zen_master_orders_status_check" CHECK (("status" = ANY (ARRAY['CREATED'::"text", 'PACKED'::"text", 'RELEASED'::"text", 'DEPARTED'::"text", 'ARRIVED'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"])))
);
ALTER TABLE "public"."zen_master_orders" OWNER TO "postgres";
COMMENT ON TABLE "public"."zen_master_orders" IS '지능형 물류 플랫폼 마스터 오더(Master Order) 관리 테이블';
COMMENT ON COLUMN "public"."zen_master_orders"."master_no" IS '마스터 오더 번호 (예: M260421-0001)';
CREATE TABLE IF NOT EXISTS "public"."zen_notices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_important" boolean DEFAULT false NOT NULL
);
ALTER TABLE "public"."zen_notices" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_notifications_channel_check" CHECK (("channel" = ANY (ARRAY['EMAIL'::"text", 'IN_APP'::"text"]))),
    CONSTRAINT "zen_notifications_type_check" CHECK (("type" = ANY (ARRAY['STATUS_CHANGE'::"text", 'HELD'::"text", 'DELIVERED'::"text", 'SYSTEM'::"text", 'QNA_CREATED'::"text", 'QNA_ANSWERED'::"text", 'VOC_CREATED'::"text", 'VOC_ANSWERED'::"text"])))
);
ALTER TABLE "public"."zen_notifications" OWNER TO "postgres";
COMMENT ON COLUMN "public"."zen_notifications"."type" IS 'Notification category: STATUS_CHANGE, HELD, DELIVERED, SYSTEM, QNA_CREATED, QNA_ANSWERED, VOC_CREATED, VOC_ANSWERED';
CREATE TABLE IF NOT EXISTS "public"."zen_order_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "cost_type" "text" NOT NULL,
    "unit_price" numeric(19,4) DEFAULT 0 NOT NULL,
    "quantity" numeric(19,4) DEFAULT 1 NOT NULL,
    "total_amount" numeric(19,4) GENERATED ALWAYS AS (("unit_price" * "quantity")) STORED,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "is_revenue" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_order_costs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "sku_code" "text",
    "item_name" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(15,2),
    "currency" "text" DEFAULT 'USD'::"text",
    "weight" numeric(15,3),
    "volume" numeric(15,4),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "package_id" "uuid",
    "hs_code" "text",
    "item_packing_unit" "text"
);
ALTER TABLE "public"."zen_order_items" OWNER TO "postgres";
COMMENT ON TABLE "public"."zen_order_items" IS '복수 아이템을 관리하는 오더 상세 테이블 (B2C 대응)';
CREATE TABLE IF NOT EXISTS "public"."zen_order_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "packing_unit" "text" NOT NULL,
    "packing_count" integer DEFAULT 1,
    "length" numeric,
    "width" numeric,
    "height" numeric,
    "gross_weight" numeric,
    "volume" numeric,
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_order_packages" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_order_rate_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "rate_card_id" "uuid",
    "applied_unit_price" numeric(18,2) NOT NULL,
    "applied_currency" character varying(10) DEFAULT 'USD'::character varying,
    "applied_rule" character varying(20) NOT NULL,
    "snapshot_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_manual" boolean DEFAULT false,
    "override_reason" "text",
    "version_no" integer DEFAULT 1 NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL
);
ALTER TABLE "public"."zen_order_rate_snapshots" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_order_routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "selected_option_id" "uuid",
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "applied_by" "uuid"
);
ALTER TABLE "public"."zen_order_routes" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_no" "text" NOT NULL,
    "shipper_id" "uuid",
    "origin_port_id" "uuid",
    "dest_port_id" "uuid",
    "status" "text" DEFAULT 'REGISTERED'::"text",
    "cargo_details" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "order_date" timestamp with time zone DEFAULT "now"(),
    "received_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "carrier_id" "uuid",
    "recipient_pccc" "text",
    "recipient_contact" "text",
    "recipient_email" "text",
    "order_type" "text" DEFAULT 'B2B'::"text",
    "delivery_notes" "text",
    "recipient_name" "text",
    "recipient_address" "text",
    "recipient_phone" "text",
    "recipient_zipcode" "text",
    "shipper_contact_name" "text",
    "shipper_contact_phone" "text",
    "description" "text",
    "transport_mode" "text" DEFAULT 'AIR'::"text",
    "master_order_id" "uuid",
    "billing_status" "text" DEFAULT 'PENDING'::"text",
    CONSTRAINT "zen_orders_billing_status_check" CHECK (("billing_status" = ANY (ARRAY['PENDING'::"text", 'INVOICED'::"text", 'PAID'::"text"]))),
    CONSTRAINT "zen_orders_order_type_check" CHECK (("order_type" = ANY (ARRAY['B2B'::"text", 'B2C_ECOM'::"text", 'B2C_EXPRESS'::"text"]))),
    CONSTRAINT "zen_orders_status_check" CHECK (("status" = ANY (ARRAY['REGISTERED'::"text", 'PICKED_UP'::"text", 'IN_TRANSIT'::"text", 'ARRIVED'::"text", 'DELIVERED'::"text", 'RELEASED'::"text", 'CANCELED'::"text", 'CLAIMED'::"text", 'PENDING'::"text", 'CONFIRMED'::"text", 'WAREHOUSED'::"text", 'HELD'::"text"]))),
    CONSTRAINT "zen_orders_transport_mode_check" CHECK (("transport_mode" = ANY (ARRAY['AIR'::"text", 'SEA'::"text", 'EXP'::"text", 'LAND'::"text"])))
);
ALTER TABLE "public"."zen_orders" OWNER TO "postgres";
COMMENT ON COLUMN "public"."zen_orders"."shipper_contact_name" IS '송하인(화주) 측 실제 담당자 성명';
COMMENT ON COLUMN "public"."zen_orders"."shipper_contact_phone" IS '송하인(화주) 측 실제 담당자 연락처';
COMMENT ON COLUMN "public"."zen_orders"."description" IS '오더 관련 비고 및 특이사항';
COMMENT ON COLUMN "public"."zen_orders"."transport_mode" IS '운송 수단 (AIR: 항공, SEA: 해상, EXP: 특송, LAND: 육상)';
CREATE TABLE IF NOT EXISTS "public"."zen_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'PENDING'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "iata_code" character(2),
    "prefix_code" character(3),
    CONSTRAINT "zen_organizations_type_check" CHECK (("type" = ANY (ARRAY['PLATFORM'::"text", 'SHIPPER'::"text", 'CARRIER'::"text"])))
);
ALTER TABLE ONLY "public"."zen_organizations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_organizations" OWNER TO "postgres";
COMMENT ON COLUMN "public"."zen_organizations"."iata_code" IS 'IATA 항공사 2자리 코드 (예: KE, OZ)';
COMMENT ON COLUMN "public"."zen_organizations"."prefix_code" IS 'AWB Prefix 3자리 숫자 (예: 180, 988)';
CREATE TABLE IF NOT EXISTS "public"."zen_param_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "param_key" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."zen_param_audit_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_ports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "country_code" character(2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_ports_type_check" CHECK (("type" = ANY (ARRAY['AIR'::"text", 'SEA'::"text", 'LAND'::"text"])))
);
ALTER TABLE ONLY "public"."zen_ports" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_ports" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_qna" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_qna_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'IN_PROGRESS'::"text", 'ANSWERED'::"text"])))
);
ALTER TABLE "public"."zen_qna" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_qna_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "qna_id" "uuid" NOT NULL,
    "answered_by" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."zen_qna_answers" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_rate_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "origin_code" "text" NOT NULL,
    "dest_code" "text" NOT NULL,
    "mode" "text" NOT NULL,
    "unit_type" "text" NOT NULL,
    "unit_price" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "transit_days" integer,
    "is_direct" boolean DEFAULT true,
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_to" timestamp with time zone,
    "remarks" "text",
    "version_no" integer DEFAULT 1 NOT NULL,
    "status" character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "customer_id" "uuid",
    CONSTRAINT "zen_rate_cards_mode_check" CHECK (("mode" = ANY (ARRAY['AIR'::"text", 'SEA'::"text", 'LAND'::"text"]))),
    CONSTRAINT "zen_rate_cards_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['DRAFT'::character varying, 'ACTIVE'::character varying, 'EXPIRED'::character varying, 'SUPERSEDED'::character varying])::"text"[])))
);
ALTER TABLE "public"."zen_rate_cards" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_rate_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_card_id" "uuid",
    "weight_min" numeric DEFAULT 0 NOT NULL,
    "unit_price" numeric NOT NULL,
    "min_total_price" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_rate_tiers" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_code" "text" NOT NULL,
    "menu_id" "text" NOT NULL,
    "path" "text" NOT NULL,
    "is_allowed" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_role_permissions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_route_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "option_type" "text" NOT NULL,
    "segments" "jsonb" NOT NULL,
    "total_cost" numeric DEFAULT 0,
    "total_transit_days" integer DEFAULT 0,
    "score" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_route_options_option_type_check" CHECK (("option_type" = ANY (ARRAY['COST'::"text", 'TIME'::"text", 'BALANCED'::"text"])))
);
ALTER TABLE "public"."zen_route_options" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_sequences" (
    "prefix" "text" NOT NULL,
    "year" "text" NOT NULL,
    "last_value" bigint DEFAULT 0
);
ALTER TABLE "public"."zen_sequences" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_system_params" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "category" "text" NOT NULL,
    "value_text" "text",
    "value_numeric" numeric(18,6),
    "value_jsonb" "jsonb",
    "description" "text" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "effective_to" timestamp with time zone,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_system_params_category_check" CHECK (("category" = ANY (ARRAY['FINANCE'::"text", 'TRACKING'::"text", 'ROUTING'::"text", 'SYSTEM'::"text"])))
);
ALTER TABLE "public"."zen_system_params" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_system_settings" (
    "setting_key" "text" NOT NULL,
    "setting_value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_system_settings" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_tax_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "tax_invoice_no" "text" NOT NULL,
    "status" "text" DEFAULT 'ISSUED'::"text" NOT NULL,
    "supplier_info" "jsonb" NOT NULL,
    "buyer_info" "jsonb" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_amount" numeric(19,4) DEFAULT 0 NOT NULL,
    "vat_amount" numeric(19,4) DEFAULT 0 NOT NULL,
    "recipient_email" "text" NOT NULL,
    "sent_at" timestamp with time zone,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "issued_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "applied_exchange_rate" numeric(18,6),
    CONSTRAINT "zen_tax_invoices_status_check" CHECK (("status" = ANY (ARRAY['ISSUED'::"text", 'SENT'::"text", 'FAILED'::"text"])))
);
ALTER TABLE "public"."zen_tax_invoices" OWNER TO "postgres";
COMMENT ON COLUMN "public"."zen_tax_invoices"."applied_exchange_rate" IS 'Exchange rate snapshot used for this tax invoice (USD/KRW)';
CREATE TABLE IF NOT EXISTS "public"."zen_tracking_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "tracking_no" "text",
    "provider_type" "text" NOT NULL,
    "provider_name" "text",
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_tracking_configs_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['VIRTUAL'::"text", 'MANUAL'::"text", 'API'::"text"])))
);
ALTER TABLE "public"."zen_tracking_configs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_tracking_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tracking_config_id" "uuid",
    "order_id" "uuid",
    "event_code" "text" NOT NULL,
    "event_time" timestamp with time zone NOT NULL,
    "location" "text",
    "description" "text",
    "source_type" "text" DEFAULT 'SYSTEM'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_tracking_events" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_tracking_raw_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "tracking_no" "text",
    "provider_name" "text" NOT NULL,
    "raw_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."zen_tracking_raw_logs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_tracking_scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transport_mode" "text" NOT NULL,
    "order_status" "text" NOT NULL,
    "sequence_no" integer NOT NULL,
    "event_code" "text" NOT NULL,
    "relative_minutes" integer NOT NULL,
    "location_template" "text",
    "description_template" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_tracking_scenarios_transport_mode_check" CHECK (("transport_mode" = ANY (ARRAY['AIR'::"text", 'SEA'::"text", 'LAND'::"text"])))
);
ALTER TABLE "public"."zen_tracking_scenarios" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_transport_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_type" "text" NOT NULL,
    "carrier_id" "uuid",
    "origin_port_id" "uuid",
    "destination_port_id" "uuid",
    "weight_min" numeric DEFAULT 0 NOT NULL,
    "weight_max" numeric NOT NULL,
    "unit_cost" numeric NOT NULL,
    "currency" "text" DEFAULT 'KRW'::"text" NOT NULL,
    "profit_margin" numeric DEFAULT 15.0 NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_transport_costs_service_type_check" CHECK (("service_type" = ANY (ARRAY['AIR'::"text", 'SEA'::"text", 'CIR'::"text"])))
);
ALTER TABLE "public"."zen_transport_costs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_transport_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mode" "text" NOT NULL,
    "carrier_id" "uuid",
    "vessel_flight_no" "text",
    "origin_port_id" "uuid",
    "destination_port_id" "uuid",
    "etd" timestamp with time zone,
    "eta" timestamp with time zone,
    "schedule_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_transport_schedules_mode_check" CHECK (("mode" = ANY (ARRAY['AIR'::"text", 'SEA'::"text", 'LAND'::"text"])))
);
ALTER TABLE "public"."zen_transport_schedules" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_vessel_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_type" "text" NOT NULL,
    "carrier_id" "uuid",
    "vessel_name" "text",
    "voyage_no" "text",
    "origin_port_id" "uuid",
    "destination_port_id" "uuid",
    "etd" timestamp with time zone NOT NULL,
    "eta" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'SCHEDULED'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zen_vessel_schedules_service_type_check" CHECK (("service_type" = ANY (ARRAY['AIR'::"text", 'SEA'::"text"])))
);
ALTER TABLE "public"."zen_vessel_schedules" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_voc" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_voc_status_check" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'IN_PROGRESS'::"text", 'CLOSED'::"text"]))),
    CONSTRAINT "zen_voc_type_check" CHECK (("type" = ANY (ARRAY['DELAY'::"text", 'DAMAGE'::"text", 'MISDELIVERY'::"text", 'OTHER'::"text"])))
);
ALTER TABLE "public"."zen_voc" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_voc_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "voc_id" "uuid" NOT NULL,
    "answered_by" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."zen_voc_answers" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_wallet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "balance" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_wallet_balance_check" CHECK (("balance" >= (0)::numeric))
);
ALTER TABLE "public"."zen_wallet" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."zen_wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(18,2) NOT NULL,
    "status" "text" DEFAULT 'COMPLETED'::"text" NOT NULL,
    "reference_id" "uuid",
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zen_wallet_transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "zen_wallet_transactions_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'COMPLETED'::"text"]))),
    CONSTRAINT "zen_wallet_transactions_type_check" CHECK (("type" = ANY (ARRAY['TOP_UP'::"text", 'DEDUCT'::"text", 'REFUND_REQUEST'::"text", 'REFUND'::"text"])))
);
ALTER TABLE "public"."zen_wallet_transactions" OWNER TO "postgres";
ALTER TABLE ONLY "public"."common_code_groups"
    ADD CONSTRAINT "common_code_groups_pkey" PRIMARY KEY ("group_code");
ALTER TABLE ONLY "public"."common_codes"
    ADD CONSTRAINT "common_codes_pkey" PRIMARY KEY ("group_code", "code_value");
ALTER TABLE ONLY "public"."customs_adapters"
    ADD CONSTRAINT "customs_adapters_adapter_code_key" UNIQUE ("adapter_code");
ALTER TABLE ONLY "public"."customs_adapters"
    ADD CONSTRAINT "customs_adapters_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."customs_declarations"
    ADD CONSTRAINT "customs_declarations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."grade_master"
    ADD CONSTRAINT "grade_master_pkey" PRIMARY KEY ("grade_code");
ALTER TABLE ONLY "public"."grade_promotion_request"
    ADD CONSTRAINT "grade_promotion_request_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."nations"
    ADD CONSTRAINT "nations_iso_alpha3_key" UNIQUE ("iso_alpha3");
ALTER TABLE ONLY "public"."nations"
    ADD CONSTRAINT "nations_pkey" PRIMARY KEY ("iso_alpha2");
ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."order_status_master"
    ADD CONSTRAINT "order_status_master_pkey" PRIMARY KEY ("status_code");
ALTER TABLE ONLY "public"."organization_documents"
    ADD CONSTRAINT "organization_documents_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_biz_no_key" UNIQUE ("biz_no");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_corporate_id_key" UNIQUE ("corporate_id");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_org_code_key" UNIQUE ("org_code");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ports"
    ADD CONSTRAINT "ports_pkey" PRIMARY KEY ("port_code");
ALTER TABLE ONLY "public"."zen_rate_cards"
    ADD CONSTRAINT "prevent_rate_overlap" EXCLUDE USING "gist" ("org_id" WITH =, "origin_code" WITH =, "dest_code" WITH =, "mode" WITH =, "unit_type" WITH =, COALESCE("customer_id", '00000000-0000-0000-0000-000000000000'::"uuid") WITH =, "tstzrange"("valid_from", "valid_to") WITH &&) WHERE ((("status")::"text" = 'ACTIVE'::"text"));
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."rate_card_logs"
    ADD CONSTRAINT "rate_card_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_no_overlap" EXCLUDE USING "gist" ("carrier_id" WITH =, "origin_port" WITH =, "destination_port" WITH =, "service_type" WITH =, COALESCE("customer_id", '00000000-0000-0000-0000-000000000000'::"uuid") WITH =, "tstzrange"("valid_from", "valid_to") WITH &&) WHERE ((("status")::"text" = 'ACTIVE'::"text"));
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_overlap_exclude" EXCLUDE USING "gist" ("carrier_id" WITH =, "origin_port" WITH =, "destination_port" WITH =, "service_type" WITH =, COALESCE("customer_id", '00000000-0000-0000-0000-000000000000'::"uuid") WITH =, "tstzrange"("valid_from", "valid_to") WITH &&);
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."rate_slabs"
    ADD CONSTRAINT "rate_slabs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."standard_code_mapping"
    ADD CONSTRAINT "standard_code_mapping_category_external_org_external_code_key" UNIQUE ("category", "external_org", "external_code");
ALTER TABLE ONLY "public"."standard_code_mapping"
    ADD CONSTRAINT "standard_code_mapping_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("config_key");
ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");
ALTER TABLE ONLY "public"."zen_order_rate_snapshots"
    ADD CONSTRAINT "unique_order_snapshot" UNIQUE ("order_id");
ALTER TABLE ONLY "public"."zen_claims"
    ADD CONSTRAINT "zen_claims_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_contracts"
    ADD CONSTRAINT "zen_contracts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_error_logs"
    ADD CONSTRAINT "zen_error_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_faq"
    ADD CONSTRAINT "zen_faq_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_feature_flags"
    ADD CONSTRAINT "zen_feature_flags_key_org_id_key" UNIQUE ("key", "org_id");
ALTER TABLE ONLY "public"."zen_feature_flags"
    ADD CONSTRAINT "zen_feature_flags_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_incident_fees"
    ADD CONSTRAINT "zen_incident_fees_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_inventory_history"
    ADD CONSTRAINT "zen_inventory_history_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_inventory"
    ADD CONSTRAINT "zen_inventory_org_id_sku_code_key" UNIQUE ("org_id", "sku_code");
ALTER TABLE ONLY "public"."zen_inventory"
    ADD CONSTRAINT "zen_inventory_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_invoice_pdf_history"
    ADD CONSTRAINT "zen_invoice_pdf_history_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_invoices"
    ADD CONSTRAINT "zen_invoices_invoice_no_key" UNIQUE ("invoice_no");
ALTER TABLE ONLY "public"."zen_invoices"
    ADD CONSTRAINT "zen_invoices_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_master_no_key" UNIQUE ("master_no");
ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_notices"
    ADD CONSTRAINT "zen_notices_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_notifications"
    ADD CONSTRAINT "zen_notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_order_costs"
    ADD CONSTRAINT "zen_order_costs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_order_items"
    ADD CONSTRAINT "zen_order_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_order_packages"
    ADD CONSTRAINT "zen_order_packages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_order_rate_snapshots"
    ADD CONSTRAINT "zen_order_rate_snapshots_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_order_routes"
    ADD CONSTRAINT "zen_order_routes_order_id_key" UNIQUE ("order_id");
ALTER TABLE ONLY "public"."zen_order_routes"
    ADD CONSTRAINT "zen_order_routes_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_order_no_key" UNIQUE ("order_no");
ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_organizations"
    ADD CONSTRAINT "zen_organizations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_param_audit_log"
    ADD CONSTRAINT "zen_param_audit_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_ports"
    ADD CONSTRAINT "zen_ports_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."zen_ports"
    ADD CONSTRAINT "zen_ports_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_profiles"
    ADD CONSTRAINT "zen_profiles_email_key" UNIQUE ("email");
ALTER TABLE ONLY "public"."zen_profiles"
    ADD CONSTRAINT "zen_profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_qna_answers"
    ADD CONSTRAINT "zen_qna_answers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_qna"
    ADD CONSTRAINT "zen_qna_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_rate_cards"
    ADD CONSTRAINT "zen_rate_cards_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_rate_tiers"
    ADD CONSTRAINT "zen_rate_tiers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_role_permissions"
    ADD CONSTRAINT "zen_role_permissions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_role_permissions"
    ADD CONSTRAINT "zen_role_permissions_role_code_path_key" UNIQUE ("role_code", "path");
ALTER TABLE ONLY "public"."zen_route_options"
    ADD CONSTRAINT "zen_route_options_order_id_option_type_key" UNIQUE ("order_id", "option_type");
ALTER TABLE ONLY "public"."zen_route_options"
    ADD CONSTRAINT "zen_route_options_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_sequences"
    ADD CONSTRAINT "zen_sequences_pkey" PRIMARY KEY ("prefix", "year");
ALTER TABLE ONLY "public"."zen_system_params"
    ADD CONSTRAINT "zen_system_params_key_key" UNIQUE ("key");
ALTER TABLE ONLY "public"."zen_system_params"
    ADD CONSTRAINT "zen_system_params_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_system_settings"
    ADD CONSTRAINT "zen_system_settings_pkey" PRIMARY KEY ("setting_key");
ALTER TABLE ONLY "public"."zen_tax_invoices"
    ADD CONSTRAINT "zen_tax_invoices_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_tax_invoices"
    ADD CONSTRAINT "zen_tax_invoices_tax_invoice_no_key" UNIQUE ("tax_invoice_no");
ALTER TABLE ONLY "public"."zen_tracking_configs"
    ADD CONSTRAINT "zen_tracking_configs_order_id_unique" UNIQUE ("order_id");
ALTER TABLE ONLY "public"."zen_tracking_configs"
    ADD CONSTRAINT "zen_tracking_configs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_tracking_configs"
    ADD CONSTRAINT "zen_tracking_configs_tracking_no_key" UNIQUE ("tracking_no");
ALTER TABLE ONLY "public"."zen_tracking_events"
    ADD CONSTRAINT "zen_tracking_events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_tracking_raw_logs"
    ADD CONSTRAINT "zen_tracking_raw_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_tracking_scenarios"
    ADD CONSTRAINT "zen_tracking_scenarios_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_transport_costs"
    ADD CONSTRAINT "zen_transport_costs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_transport_schedules"
    ADD CONSTRAINT "zen_transport_schedules_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_vessel_schedules"
    ADD CONSTRAINT "zen_vessel_schedules_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_voc_answers"
    ADD CONSTRAINT "zen_voc_answers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_voc"
    ADD CONSTRAINT "zen_voc_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_wallet"
    ADD CONSTRAINT "zen_wallet_org_id_key" UNIQUE ("org_id");
ALTER TABLE ONLY "public"."zen_wallet"
    ADD CONSTRAINT "zen_wallet_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."zen_wallet_transactions"
    ADD CONSTRAINT "zen_wallet_transactions_pkey" PRIMARY KEY ("id");
CREATE INDEX "idx_invoice_pdf_history_invoice_id" ON "public"."zen_invoice_pdf_history" USING "btree" ("invoice_id");
CREATE INDEX "idx_order_rate_snapshots_order_id" ON "public"."zen_order_rate_snapshots" USING "btree" ("order_id");
CREATE INDEX "idx_order_rate_snapshots_rate_card_id" ON "public"."zen_order_rate_snapshots" USING "btree" ("rate_card_id");
CREATE INDEX "idx_order_status_history_order_id" ON "public"."order_status_history" USING "btree" ("order_id");
CREATE INDEX "idx_rate_cards_route" ON "public"."zen_rate_cards" USING "btree" ("origin_code", "dest_code", "mode");
CREATE INDEX "idx_rate_tiers_card_id" ON "public"."zen_rate_tiers" USING "btree" ("rate_card_id");
CREATE INDEX "idx_tracking_config_order" ON "public"."zen_tracking_configs" USING "btree" ("order_id");
CREATE INDEX "idx_tracking_events_order" ON "public"."zen_tracking_events" USING "btree" ("order_id");
CREATE INDEX "idx_tracking_events_time" ON "public"."zen_tracking_events" USING "btree" ("event_time");
CREATE INDEX "idx_tracking_raw_logs_no" ON "public"."zen_tracking_raw_logs" USING "btree" ("tracking_no");
CREATE INDEX "idx_tracking_raw_logs_order" ON "public"."zen_tracking_raw_logs" USING "btree" ("order_id");
CREATE INDEX "idx_trans_costs_service" ON "public"."zen_transport_costs" USING "btree" ("service_type");
CREATE INDEX "idx_vessel_schedules_etd" ON "public"."zen_vessel_schedules" USING "btree" ("etd");
CREATE INDEX "idx_zen_claims_order_id" ON "public"."zen_claims" USING "btree" ("order_id");
CREATE INDEX "idx_zen_claims_org_id" ON "public"."zen_claims" USING "btree" ("org_id");
CREATE INDEX "idx_zen_incident_fees_claim_id" ON "public"."zen_incident_fees" USING "btree" ("claim_id");
CREATE INDEX "idx_zen_incident_fees_invoice_id" ON "public"."zen_incident_fees" USING "btree" ("invoice_id");
CREATE INDEX "idx_zen_inventory_history_inventory_id" ON "public"."zen_inventory_history" USING "btree" ("inventory_id");
CREATE INDEX "idx_zen_inventory_history_org_id" ON "public"."zen_inventory_history" USING "btree" ("org_id");
CREATE INDEX "idx_zen_inventory_org_id" ON "public"."zen_inventory" USING "btree" ("org_id");
CREATE INDEX "idx_zen_inventory_sku_code" ON "public"."zen_inventory" USING "btree" ("sku_code");
CREATE INDEX "idx_zen_invoices_payment_method" ON "public"."zen_invoices" USING "btree" ("payment_method");
CREATE INDEX "idx_zen_notifications_is_read" ON "public"."zen_notifications" USING "btree" ("user_id", "is_read");
CREATE INDEX "idx_zen_notifications_order_id" ON "public"."zen_notifications" USING "btree" ("order_id");
CREATE INDEX "idx_zen_notifications_user_id" ON "public"."zen_notifications" USING "btree" ("user_id");
CREATE INDEX "idx_zen_order_items_order_id" ON "public"."zen_order_items" USING "btree" ("order_id");
CREATE INDEX "idx_zen_order_items_package_id" ON "public"."zen_order_items" USING "btree" ("package_id");
CREATE INDEX "idx_zen_order_packages_order_id" ON "public"."zen_order_packages" USING "btree" ("order_id");
CREATE INDEX "idx_zen_orders_order_no" ON "public"."zen_orders" USING "btree" ("order_no");
CREATE INDEX "idx_zen_orders_transport_mode" ON "public"."zen_orders" USING "btree" ("transport_mode");
CREATE INDEX "idx_zen_wallet_transactions_status" ON "public"."zen_wallet_transactions" USING "btree" ("status") WHERE ("status" = 'PENDING'::"text");
CREATE INDEX "idx_zen_wallet_transactions_wallet_id" ON "public"."zen_wallet_transactions" USING "btree" ("wallet_id", "created_at" DESC);
CREATE OR REPLACE TRIGGER "handle_updated_at_zen_faq" BEFORE UPDATE ON "public"."zen_faq" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "handle_updated_at_zen_notices" BEFORE UPDATE ON "public"."zen_notices" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "handle_updated_at_zen_qna" BEFORE UPDATE ON "public"."zen_qna" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "handle_updated_at_zen_voc" BEFORE UPDATE ON "public"."zen_voc" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_code_group_updated_at" BEFORE UPDATE ON "public"."common_code_groups" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_code_updated_at" BEFORE UPDATE ON "public"."common_codes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_config_updated_at" BEFORE UPDATE ON "public"."system_config" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_grade_updated_at" BEFORE UPDATE ON "public"."grade_master" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_mapping_updated_at" BEFORE UPDATE ON "public"."standard_code_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_nations_updated_at" BEFORE UPDATE ON "public"."nations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_order_status_updated_at" BEFORE UPDATE ON "public"."order_status_master" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_org_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_ports_updated_at" BEFORE UPDATE ON "public"."ports" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_profile_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_rate_card_updated_at" BEFORE UPDATE ON "public"."rate_cards" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_request_updated_at" BEFORE UPDATE ON "public"."grade_promotion_request" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_updated_at_customs_adapters" BEFORE UPDATE ON "public"."customs_adapters" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "set_updated_at_customs_declarations" BEFORE UPDATE ON "public"."customs_declarations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "tr_capture_order_rate_snapshot" AFTER INSERT OR UPDATE OF "status", "confirmed_at", "received_at", "carrier_id", "origin_port_id", "dest_port_id", "shipper_id" ON "public"."zen_orders" FOR EACH ROW EXECUTE FUNCTION "public"."fn_trigger_capture_order_rate"();
CREATE OR REPLACE TRIGGER "tr_zen_claims_updated_at" BEFORE UPDATE ON "public"."zen_claims" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "tr_zen_tax_invoices_updated_at" BEFORE UPDATE ON "public"."zen_tax_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp_column"();
CREATE OR REPLACE TRIGGER "trg_invoice_paid_at" BEFORE UPDATE ON "public"."zen_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_invoice_paid_at"();
CREATE OR REPLACE TRIGGER "update_zen_feature_flags_timestamp" BEFORE UPDATE ON "public"."zen_feature_flags" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp_column"();
CREATE OR REPLACE TRIGGER "update_zen_inventory_modtime" BEFORE UPDATE ON "public"."zen_inventory" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp_column"();
CREATE OR REPLACE TRIGGER "update_zen_master_orders_modtime" BEFORE UPDATE ON "public"."zen_master_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp_column"();
CREATE OR REPLACE TRIGGER "update_zen_system_params_timestamp" BEFORE UPDATE ON "public"."zen_system_params" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp_column"();
CREATE OR REPLACE TRIGGER "update_zen_wallet_timestamp" BEFORE UPDATE ON "public"."zen_wallet" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp_column"();
ALTER TABLE ONLY "public"."common_codes"
    ADD CONSTRAINT "common_codes_group_code_fkey" FOREIGN KEY ("group_code") REFERENCES "public"."common_code_groups"("group_code") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."customs_declarations"
    ADD CONSTRAINT "customs_declarations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."grade_promotion_request"
    ADD CONSTRAINT "grade_promotion_request_current_grade_fkey" FOREIGN KEY ("current_grade") REFERENCES "public"."grade_master"("grade_code");
ALTER TABLE ONLY "public"."grade_promotion_request"
    ADD CONSTRAINT "grade_promotion_request_target_grade_fkey" FOREIGN KEY ("target_grade") REFERENCES "public"."grade_master"("grade_code");
ALTER TABLE ONLY "public"."grade_promotion_request"
    ADD CONSTRAINT "grade_promotion_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."organization_documents"
    ADD CONSTRAINT "organization_documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."organization_documents"
    ADD CONSTRAINT "organization_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ports"
    ADD CONSTRAINT "ports_nation_code_fkey" FOREIGN KEY ("nation_code") REFERENCES "public"."nations"("iso_alpha2");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_grade_code_fkey" FOREIGN KEY ("grade_code") REFERENCES "public"."grade_master"("grade_code");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."rate_card_logs"
    ADD CONSTRAINT "rate_card_logs_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "public"."rate_cards"("id");
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."organizations"("id");
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_destination_port_fkey" FOREIGN KEY ("destination_port") REFERENCES "public"."ports"("port_code");
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_origin_port_fkey" FOREIGN KEY ("origin_port") REFERENCES "public"."ports"("port_code");
ALTER TABLE ONLY "public"."rate_cards"
    ADD CONSTRAINT "rate_cards_parent_version_id_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "public"."rate_cards"("id");
ALTER TABLE ONLY "public"."rate_slabs"
    ADD CONSTRAINT "rate_slabs_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "public"."rate_cards"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_claims"
    ADD CONSTRAINT "zen_claims_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."zen_profiles"("id");
ALTER TABLE ONLY "public"."zen_claims"
    ADD CONSTRAINT "zen_claims_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_claims"
    ADD CONSTRAINT "zen_claims_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_error_logs"
    ADD CONSTRAINT "zen_error_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_error_logs"
    ADD CONSTRAINT "zen_error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_faq"
    ADD CONSTRAINT "zen_faq_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_feature_flags"
    ADD CONSTRAINT "zen_feature_flags_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_feature_flags"
    ADD CONSTRAINT "zen_feature_flags_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_incident_fees"
    ADD CONSTRAINT "zen_incident_fees_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."zen_claims"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_incident_fees"
    ADD CONSTRAINT "zen_incident_fees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."zen_profiles"("id");
ALTER TABLE ONLY "public"."zen_incident_fees"
    ADD CONSTRAINT "zen_incident_fees_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."zen_invoices"("id");
ALTER TABLE ONLY "public"."zen_inventory_history"
    ADD CONSTRAINT "zen_inventory_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."zen_inventory_history"
    ADD CONSTRAINT "zen_inventory_history_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."zen_inventory"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_inventory_history"
    ADD CONSTRAINT "zen_inventory_history_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_inventory"
    ADD CONSTRAINT "zen_inventory_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_invoice_pdf_history"
    ADD CONSTRAINT "zen_invoice_pdf_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."zen_invoice_pdf_history"
    ADD CONSTRAINT "zen_invoice_pdf_history_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."zen_invoices"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_invoices"
    ADD CONSTRAINT "zen_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."zen_invoices"
    ADD CONSTRAINT "zen_invoices_shipper_id_fkey" FOREIGN KEY ("shipper_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_dest_port_id_fkey" FOREIGN KEY ("dest_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_origin_port_id_fkey" FOREIGN KEY ("origin_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_notices"
    ADD CONSTRAINT "zen_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_notifications"
    ADD CONSTRAINT "zen_notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."zen_notifications"
    ADD CONSTRAINT "zen_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_order_costs"
    ADD CONSTRAINT "zen_order_costs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."zen_invoices"("id");
ALTER TABLE ONLY "public"."zen_order_costs"
    ADD CONSTRAINT "zen_order_costs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_order_items"
    ADD CONSTRAINT "zen_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_order_items"
    ADD CONSTRAINT "zen_order_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."zen_order_packages"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_order_packages"
    ADD CONSTRAINT "zen_order_packages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_order_rate_snapshots"
    ADD CONSTRAINT "zen_order_rate_snapshots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_order_rate_snapshots"
    ADD CONSTRAINT "zen_order_rate_snapshots_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "public"."rate_cards"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."zen_order_routes"
    ADD CONSTRAINT "zen_order_routes_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."zen_order_routes"
    ADD CONSTRAINT "zen_order_routes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_order_routes"
    ADD CONSTRAINT "zen_order_routes_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."zen_route_options"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_dest_port_id_fkey" FOREIGN KEY ("dest_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_master_order_id_fkey" FOREIGN KEY ("master_order_id") REFERENCES "public"."zen_master_orders"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_origin_port_id_fkey" FOREIGN KEY ("origin_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_shipper_id_fkey" FOREIGN KEY ("shipper_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_organizations"
    ADD CONSTRAINT "zen_organizations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."zen_organizations"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."zen_param_audit_log"
    ADD CONSTRAINT "zen_param_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_qna_answers"
    ADD CONSTRAINT "zen_qna_answers_answered_by_fkey" FOREIGN KEY ("answered_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_qna_answers"
    ADD CONSTRAINT "zen_qna_answers_qna_id_fkey" FOREIGN KEY ("qna_id") REFERENCES "public"."zen_qna"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_qna"
    ADD CONSTRAINT "zen_qna_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_qna"
    ADD CONSTRAINT "zen_qna_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."zen_qna"
    ADD CONSTRAINT "zen_qna_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_rate_cards"
    ADD CONSTRAINT "zen_rate_cards_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."organizations"("id");
ALTER TABLE ONLY "public"."zen_rate_cards"
    ADD CONSTRAINT "zen_rate_cards_dest_code_fkey" FOREIGN KEY ("dest_code") REFERENCES "public"."zen_ports"("code");
ALTER TABLE ONLY "public"."zen_rate_cards"
    ADD CONSTRAINT "zen_rate_cards_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_rate_cards"
    ADD CONSTRAINT "zen_rate_cards_origin_code_fkey" FOREIGN KEY ("origin_code") REFERENCES "public"."zen_ports"("code");
ALTER TABLE ONLY "public"."zen_rate_tiers"
    ADD CONSTRAINT "zen_rate_tiers_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "public"."zen_rate_cards"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_route_options"
    ADD CONSTRAINT "zen_route_options_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_system_params"
    ADD CONSTRAINT "zen_system_params_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_tax_invoices"
    ADD CONSTRAINT "zen_tax_invoices_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."zen_invoices"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_tax_invoices"
    ADD CONSTRAINT "zen_tax_invoices_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."zen_tracking_configs"
    ADD CONSTRAINT "zen_tracking_configs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_tracking_events"
    ADD CONSTRAINT "zen_tracking_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_tracking_events"
    ADD CONSTRAINT "zen_tracking_events_tracking_config_id_fkey" FOREIGN KEY ("tracking_config_id") REFERENCES "public"."zen_tracking_configs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_tracking_raw_logs"
    ADD CONSTRAINT "zen_tracking_raw_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_transport_costs"
    ADD CONSTRAINT "zen_transport_costs_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_transport_costs"
    ADD CONSTRAINT "zen_transport_costs_destination_port_id_fkey" FOREIGN KEY ("destination_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_transport_costs"
    ADD CONSTRAINT "zen_transport_costs_origin_port_id_fkey" FOREIGN KEY ("origin_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_vessel_schedules"
    ADD CONSTRAINT "zen_vessel_schedules_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_vessel_schedules"
    ADD CONSTRAINT "zen_vessel_schedules_destination_port_id_fkey" FOREIGN KEY ("destination_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_vessel_schedules"
    ADD CONSTRAINT "zen_vessel_schedules_origin_port_id_fkey" FOREIGN KEY ("origin_port_id") REFERENCES "public"."zen_ports"("id");
ALTER TABLE ONLY "public"."zen_voc_answers"
    ADD CONSTRAINT "zen_voc_answers_answered_by_fkey" FOREIGN KEY ("answered_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_voc_answers"
    ADD CONSTRAINT "zen_voc_answers_voc_id_fkey" FOREIGN KEY ("voc_id") REFERENCES "public"."zen_voc"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_voc"
    ADD CONSTRAINT "zen_voc_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_voc"
    ADD CONSTRAINT "zen_voc_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."zen_voc"
    ADD CONSTRAINT "zen_voc_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id");
ALTER TABLE ONLY "public"."zen_wallet"
    ADD CONSTRAINT "zen_wallet_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."zen_organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."zen_wallet_transactions"
    ADD CONSTRAINT "zen_wallet_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."zen_wallet_transactions"
    ADD CONSTRAINT "zen_wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."zen_wallet"("id") ON DELETE CASCADE;
CREATE POLICY "Admin can manage schedules" ON "public"."zen_vessel_schedules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_SUPER_ADMIN'::"text", 'ADMIN'::"text"]))))));
CREATE POLICY "Admin full access on zen_error_logs" ON "public"."zen_error_logs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ((("profiles"."role")::"text" = 'ADMIN'::"text") OR (("profiles"."role")::"text" = 'ZENITH_SUPER_ADMIN'::"text"))))));
CREATE POLICY "Admin full access to transport costs" ON "public"."zen_transport_costs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_SUPER_ADMIN'::"text", 'ADMIN'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_SUPER_ADMIN'::"text", 'ADMIN'::"text"]))))));
CREATE POLICY "Admins and Managers can create invoice PDF history" ON "public"."zen_invoice_pdf_history" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text", ('MANAGER'::character varying)::"text"]))))));
CREATE POLICY "Admins can delete zen_feature_flags" ON "public"."zen_feature_flags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can delete zen_wallet" ON "public"."zen_wallet" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can insert answers" ON "public"."zen_qna_answers" FOR INSERT WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text"));
CREATE POLICY "Admins can insert inventory" ON "public"."zen_inventory" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('MEMBER'::character varying)::"text"]))))));
CREATE POLICY "Admins can insert zen_feature_flags" ON "public"."zen_feature_flags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can insert zen_invoices" ON "public"."zen_invoices" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can insert zen_wallet" ON "public"."zen_wallet" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can insert zen_wallet_transactions" ON "public"."zen_wallet_transactions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can issue and update tax invoices" ON "public"."zen_tax_invoices" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'ADMIN'::"text")))));
CREATE POLICY "Admins can manage FAQs" ON "public"."zen_faq" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text")) WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text"));
CREATE POLICY "Admins can manage VOC answers" ON "public"."zen_voc_answers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can manage all documents" ON "public"."organization_documents" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'ADMIN'::"text")))));
CREATE POLICY "Admins can manage notices" ON "public"."zen_notices" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text")) WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text"));
CREATE POLICY "Admins can manage tracking events" ON "public"."zen_tracking_events" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text", ('MANAGER'::character varying)::"text"]))))));
CREATE POLICY "Admins can select zen_feature_flags" ON "public"."zen_feature_flags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can select zen_param_audit_log" ON "public"."zen_param_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can select zen_system_params" ON "public"."zen_system_params" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can select zen_wallet" ON "public"."zen_wallet" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can select zen_wallet_transactions" ON "public"."zen_wallet_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can update QnA status" ON "public"."zen_qna" FOR UPDATE USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text")) WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text"));
CREATE POLICY "Admins can update VOC status" ON "public"."zen_voc" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can update declarations" ON "public"."customs_declarations" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "zen_profiles"."id"
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_SUPER_ADMIN'::"text", 'ADMIN'::"text", 'MANAGER'::"text"]))))));
CREATE POLICY "Admins can update inventory" ON "public"."zen_inventory" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text", ('MEMBER'::character varying)::"text", ('MANAGER'::character varying)::"text"]))))));
CREATE POLICY "Admins can update orders" ON "public"."zen_orders" FOR UPDATE TO "authenticated" USING (("public"."get_my_role"() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::"text", 'ADMIN'::"text", 'MANAGER'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::"text", 'ADMIN'::"text", 'MANAGER'::"text"])));
CREATE POLICY "Admins can update promotion requests" ON "public"."grade_promotion_request" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ZENITH_SUPER_ADMIN'::"text")));
CREATE POLICY "Admins can update zen_feature_flags" ON "public"."zen_feature_flags" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can update zen_invoices" ON "public"."zen_invoices" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can update zen_system_params" ON "public"."zen_system_params" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can update zen_wallet" ON "public"."zen_wallet" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can update zen_wallet_transactions" ON "public"."zen_wallet_transactions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can view all VOCs" ON "public"."zen_voc" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"]))))));
CREATE POLICY "Admins can view all declarations" ON "public"."customs_declarations" FOR SELECT USING (("auth"."uid"() IN ( SELECT "zen_profiles"."id"
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_SUPER_ADMIN'::"text", 'ADMIN'::"text", 'MANAGER'::"text"]))))));
CREATE POLICY "Admins can view all promotion requests" ON "public"."grade_promotion_request" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ZENITH_SUPER_ADMIN'::"text")));
CREATE POLICY "Admins can view all zen_profiles" ON "public"."zen_profiles" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ZENITH_SUPER_ADMIN'::"text")));
CREATE POLICY "Admins have full access to claims" ON "public"."zen_claims" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = 'ADMIN'::"text")))));
CREATE POLICY "Admins have full access to incident fees" ON "public"."zen_incident_fees" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = 'ADMIN'::"text")))));
CREATE POLICY "Admins have full access to tracking configs" ON "public"."zen_tracking_configs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text", ('MANAGER'::character varying)::"text"]))))));
CREATE POLICY "Admins have full access to tracking raw logs" ON "public"."zen_tracking_raw_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text", ('MANAGER'::character varying)::"text"]))))));
CREATE POLICY "Admins have full access to zen_contracts" ON "public"."zen_contracts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_ports" ON "public"."zen_ports" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_rate_cards" ON "public"."zen_rate_cards" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_rate_tiers" ON "public"."zen_rate_tiers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_role_permissions" ON "public"."zen_role_permissions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_sequences" ON "public"."zen_sequences" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_system_settings" ON "public"."zen_system_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_tracking_scenarios" ON "public"."zen_tracking_scenarios" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "Admins have full access to zen_transport_schedules" ON "public"."zen_transport_schedules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = ANY (ARRAY['ZENITH_ADMIN'::"text", 'ZENITH_SUPER_ADMIN'::"text"]))))));
CREATE POLICY "All authenticated users can view schedules" ON "public"."zen_vessel_schedules" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Allow all access for admin on customs_declarations" ON "public"."customs_declarations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ((("profiles"."role")::"text" = 'ADMIN'::"text") OR (("profiles"."role")::"text" = 'ZENITH_SUPER_ADMIN'::"text"))))));
CREATE POLICY "Allow authenticated full access to master orders" ON "public"."zen_master_orders" TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated insert for history" ON "public"."order_status_history" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Allow authenticated read for history" ON "public"."order_status_history" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Allow authenticated to select zen_organizations" ON "public"."zen_organizations" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Allow authenticated to select zen_ports" ON "public"."zen_ports" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Allow inventory history inserts" ON "public"."zen_inventory_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text", ('MANAGER'::character varying)::"text", ('MEMBER'::character varying)::"text", ('PARTNER'::character varying)::"text"]))))));
CREATE POLICY "Allow select for authenticated users on customs_adapters" ON "public"."customs_adapters" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Allow select for owners on customs_declarations" ON "public"."customs_declarations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_orders"
  WHERE (("zen_orders"."id" = "customs_declarations"."order_id") AND ("zen_orders"."shipper_id" = "auth"."uid"())))));
CREATE POLICY "Authenticated users can insert zen_param_audit_log" ON "public"."zen_param_audit_log" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Authenticated users can read zen_system_params" ON "public"."zen_system_params" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Authenticated users can view grade master" ON "public"."grade_master" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can view ports" ON "public"."zen_ports" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can view transport schedules" ON "public"."zen_transport_schedules" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."zen_orders" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Enable read access for all authenticated users" ON "public"."zen_orders" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Enable read access for all users" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Enable update for platform admins only" ON "public"."system_settings" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_type'::"text") = 'PLATFORM'::"text"));
CREATE POLICY "Members can view their own org documents" ON "public"."organization_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."org_id" = "organization_documents"."org_id")))));
CREATE POLICY "Service role can insert notifications" ON "public"."zen_notifications" FOR INSERT WITH CHECK (true);
CREATE POLICY "Shippers can insert their own claims" ON "public"."zen_claims" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."org_id" = "zen_claims"."org_id")))));
CREATE POLICY "Shippers can view their order costs" ON "public"."zen_order_costs" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."zen_orders"
     JOIN "public"."profiles" ON (("profiles"."org_id" = "zen_orders"."shipper_id")))
  WHERE (("zen_orders"."id" = "zen_order_costs"."order_id") AND (("profiles"."id" = "auth"."uid"()) OR (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))));
CREATE POLICY "Shippers can view their own claims" ON "public"."zen_claims" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND (("zen_profiles"."org_id" = "zen_claims"."org_id") OR ("zen_profiles"."role" = 'ADMIN'::"text"))))));
CREATE POLICY "Shippers can view their own contracts" ON "public"."zen_contracts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."org_id" = "zen_contracts"."shipper_id")))));
CREATE POLICY "Shippers can view their own incident fees" ON "public"."zen_incident_fees" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_claims"
     JOIN "public"."zen_profiles" ON (("zen_profiles"."org_id" = "zen_claims"."org_id")))
  WHERE (("zen_claims"."id" = "zen_incident_fees"."claim_id") AND (("zen_profiles"."id" = "auth"."uid"()) OR ("zen_profiles"."role" = 'ADMIN'::"text"))))));
CREATE POLICY "Shippers can view their own tax invoices" ON "public"."zen_tax_invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_invoices"
     JOIN "public"."profiles" ON (("profiles"."id" = "auth"."uid"())))
  WHERE (("zen_invoices"."id" = "zen_tax_invoices"."invoice_id") AND (("profiles"."org_id" = "zen_invoices"."shipper_id") OR (("profiles"."role")::"text" = 'ADMIN'::"text"))))));
CREATE POLICY "Shippers can view their own zen_invoices" ON "public"."zen_invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."org_id" = "zen_invoices"."shipper_id") OR (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))));
CREATE POLICY "Super admins have full access to order snapshots" ON "public"."zen_order_rate_snapshots" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = 'ADMIN'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = 'ADMIN'::"text")))));
CREATE POLICY "System can insert tracking raw logs" ON "public"."zen_tracking_raw_logs" FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can create QnAs for own organization" ON "public"."zen_qna" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can create VOCs for own organization orders" ON "public"."zen_voc" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can create own promotion requests" ON "public"."grade_promotion_request" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert refund requests" ON "public"."zen_wallet_transactions" FOR INSERT WITH CHECK ((("type" = 'REFUND_REQUEST'::"text") AND ("status" = 'PENDING'::"text") AND ("wallet_id" IN ( SELECT "w"."id"
   FROM ("public"."zen_wallet" "w"
     JOIN "public"."profiles" "p" ON (("p"."org_id" = "w"."org_id")))
  WHERE ("p"."id" = "auth"."uid"())))));
CREATE POLICY "Users can insert zen_error_logs" ON "public"."zen_error_logs" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Users can manage order routes for their org's orders" ON "public"."zen_order_routes" USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_orders" "o"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "zen_order_routes"."order_id") AND (("p"."org_id" = "o"."shipper_id") OR (("p"."role")::"text" = 'ADMIN'::"text"))))));
CREATE POLICY "Users can manage route options for their org's orders" ON "public"."zen_route_options" USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_orders" "o"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "zen_route_options"."order_id") AND (("p"."org_id" = "o"."shipper_id") OR (("p"."role")::"text" = 'ADMIN'::"text"))))));
CREATE POLICY "Users can read own org feature flags" ON "public"."zen_feature_flags" FOR SELECT USING ((("org_id" IS NULL) OR ("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));
CREATE POLICY "Users can read own org wallet" ON "public"."zen_wallet" FOR SELECT USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can read own wallet transactions" ON "public"."zen_wallet_transactions" FOR SELECT USING (("wallet_id" IN ( SELECT "w"."id"
   FROM ("public"."zen_wallet" "w"
     JOIN "public"."profiles" "p" ON (("p"."org_id" = "w"."org_id")))
  WHERE ("p"."id" = "auth"."uid"()))));
CREATE POLICY "Users can update own notifications" ON "public"."zen_notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view active FAQs" ON "public"."zen_faq" FOR SELECT USING ((("is_active" = true) OR ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text")));
CREATE POLICY "Users can view answers for accessible QnAs" ON "public"."zen_qna_answers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."zen_qna" "q"
  WHERE ("q"."id" = "zen_qna_answers"."qna_id"))) OR ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text")));
CREATE POLICY "Users can view answers for own organization VOCs" ON "public"."zen_voc_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_voc" "v"
     JOIN "public"."profiles" "p" ON (("v"."org_id" = "p"."org_id")))
  WHERE (("v"."id" = "zen_voc_answers"."voc_id") AND ("p"."id" = "auth"."uid"())))));
CREATE POLICY "Users can view inventory history of their own organization" ON "public"."zen_inventory_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."org_id" = "zen_inventory_history"."org_id") OR (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))));
CREATE POLICY "Users can view inventory of their own organization" ON "public"."zen_inventory" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."org_id" = "zen_inventory"."org_id") OR (("profiles"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))));
CREATE POLICY "Users can view items of accessible orders" ON "public"."zen_order_items" FOR SELECT USING (true);
CREATE POLICY "Users can view order routes for their org's orders" ON "public"."zen_order_routes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_orders" "o"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "zen_order_routes"."order_id") AND (("p"."org_id" = "o"."shipper_id") OR (("p"."role")::"text" = 'ADMIN'::"text"))))));
CREATE POLICY "Users can view own notifications" ON "public"."zen_notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view own organization's QnAs" ON "public"."zen_qna" FOR SELECT USING ((("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text")));
CREATE POLICY "Users can view own organization's VOCs" ON "public"."zen_voc" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can view own promotion requests" ON "public"."grade_promotion_request" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view own zen_profile" ON "public"."zen_profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view published notices" ON "public"."zen_notices" FOR SELECT USING ((("is_published" = true) OR ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))::"text" = 'ADMIN'::"text")));
CREATE POLICY "Users can view related rate tiers" ON "public"."zen_rate_tiers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_rate_cards" "rc"
     JOIN "public"."zen_profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("rc"."id" = "zen_rate_tiers"."rate_card_id") AND (("p"."org_id" = "rc"."org_id") OR ("p"."org_id" = "rc"."customer_id"))))));
CREATE POLICY "Users can view relevant tracking events" ON "public"."zen_tracking_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."zen_orders" "o"
  WHERE (("o"."id" = "zen_tracking_events"."order_id") AND (("o"."shipper_id" = "auth"."uid"()) OR ("o"."shipper_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))))));
CREATE POLICY "Users can view route options for their org's orders" ON "public"."zen_route_options" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_orders" "o"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("o"."id" = "zen_route_options"."order_id") AND (("p"."org_id" = "o"."shipper_id") OR (("p"."role")::"text" = 'ADMIN'::"text"))))));
CREATE POLICY "Users can view their organization's invoice PDF history" ON "public"."zen_invoice_pdf_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_invoices" "i"
     JOIN "public"."profiles" "p" ON (("p"."org_id" = "i"."shipper_id")))
  WHERE (("i"."id" = "zen_invoice_pdf_history"."invoice_id") AND (("p"."id" = "auth"."uid"()) OR (("p"."role")::"text" = ANY (ARRAY[('ADMIN'::character varying)::"text", ('ZENITH_SUPER_ADMIN'::character varying)::"text"])))))));
CREATE POLICY "Users can view their own declarations" ON "public"."customs_declarations" FOR SELECT USING (("auth"."uid"() IN ( SELECT "zen_profiles"."id"
   FROM "public"."zen_profiles"
  WHERE ("zen_profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can view their related rate cards" ON "public"."zen_rate_cards" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND (("zen_profiles"."org_id" = "zen_rate_cards"."org_id") OR ("zen_profiles"."org_id" = "zen_rate_cards"."customer_id"))))));
CREATE POLICY "Users can view tracking of their own orders" ON "public"."zen_tracking_configs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."zen_orders" "o"
  WHERE (("o"."id" = "zen_tracking_configs"."order_id") AND (("o"."shipper_id" = "auth"."uid"()) OR ("o"."shipper_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))))));
CREATE POLICY "ZENITH_SUPER_ADMIN can view all notifications" ON "public"."zen_notifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'ZENITH_SUPER_ADMIN'::"text")))));
ALTER TABLE "public"."common_code_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."common_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customs_adapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customs_declarations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."grade_master" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."grade_promotion_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."nations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."order_status_master" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rate_card_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rate_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rate_slabs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."standard_code_mapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."system_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_error_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_faq" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_feature_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_incident_fees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_inventory_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_invoice_pdf_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_master_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_order_costs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_order_packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_order_rate_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_order_routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_param_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_ports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_qna" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_qna_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_rate_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_rate_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_route_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_system_params" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_tax_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_tracking_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_tracking_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_tracking_raw_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_tracking_scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_transport_costs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_transport_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_vessel_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_voc" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_voc_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."zen_wallet_transactions" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";
GRANT ALL ON FUNCTION "public"."approve_organization"("target_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_organization"("target_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_organization"("target_org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";
GRANT ALL ON FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."fn_set_invoice_paid_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_invoice_paid_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_invoice_paid_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."fn_trigger_capture_order_rate"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trigger_capture_order_rate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trigger_capture_order_rate"() TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_master_order_no"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_master_order_no"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_master_order_no"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_next_order_sequence"("p_year" "text", "p_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_order_sequence"("p_year" "text", "p_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_order_sequence"("p_year" "text", "p_prefix" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_orders_aggregation"("order_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_aggregation"("order_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_aggregation"("order_ids" "uuid"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";
GRANT ALL ON FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_timestamp_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timestamp_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timestamp_column"() TO "service_role";
GRANT ALL ON TABLE "public"."common_code_groups" TO "anon";
GRANT ALL ON TABLE "public"."common_code_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."common_code_groups" TO "service_role";
GRANT ALL ON TABLE "public"."common_codes" TO "anon";
GRANT ALL ON TABLE "public"."common_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."common_codes" TO "service_role";
GRANT ALL ON SEQUENCE "public"."corporate_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."corporate_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."corporate_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."customs_adapters" TO "anon";
GRANT ALL ON TABLE "public"."customs_adapters" TO "authenticated";
GRANT ALL ON TABLE "public"."customs_adapters" TO "service_role";
GRANT ALL ON TABLE "public"."customs_declarations" TO "anon";
GRANT ALL ON TABLE "public"."customs_declarations" TO "authenticated";
GRANT ALL ON TABLE "public"."customs_declarations" TO "service_role";
GRANT ALL ON TABLE "public"."grade_master" TO "anon";
GRANT ALL ON TABLE "public"."grade_master" TO "authenticated";
GRANT ALL ON TABLE "public"."grade_master" TO "service_role";
GRANT ALL ON TABLE "public"."grade_promotion_request" TO "anon";
GRANT ALL ON TABLE "public"."grade_promotion_request" TO "authenticated";
GRANT ALL ON TABLE "public"."grade_promotion_request" TO "service_role";
GRANT ALL ON SEQUENCE "public"."master_order_no_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."master_order_no_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."master_order_no_seq" TO "service_role";
GRANT ALL ON TABLE "public"."nations" TO "anon";
GRANT ALL ON TABLE "public"."nations" TO "authenticated";
GRANT ALL ON TABLE "public"."nations" TO "service_role";
GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";
GRANT ALL ON TABLE "public"."order_status_master" TO "anon";
GRANT ALL ON TABLE "public"."order_status_master" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_master" TO "service_role";
GRANT ALL ON TABLE "public"."organization_documents" TO "anon";
GRANT ALL ON TABLE "public"."organization_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_documents" TO "service_role";
GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";
GRANT ALL ON TABLE "public"."ports" TO "anon";
GRANT ALL ON TABLE "public"."ports" TO "authenticated";
GRANT ALL ON TABLE "public"."ports" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."rate_card_logs" TO "anon";
GRANT ALL ON TABLE "public"."rate_card_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_card_logs" TO "service_role";
GRANT ALL ON TABLE "public"."rate_cards" TO "anon";
GRANT ALL ON TABLE "public"."rate_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_cards" TO "service_role";
GRANT ALL ON TABLE "public"."rate_slabs" TO "anon";
GRANT ALL ON TABLE "public"."rate_slabs" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_slabs" TO "service_role";
GRANT ALL ON TABLE "public"."standard_code_mapping" TO "anon";
GRANT ALL ON TABLE "public"."standard_code_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."standard_code_mapping" TO "service_role";
GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";
GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";
GRANT ALL ON TABLE "public"."zen_claims" TO "anon";
GRANT ALL ON TABLE "public"."zen_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_claims" TO "service_role";
GRANT ALL ON TABLE "public"."zen_contracts" TO "anon";
GRANT ALL ON TABLE "public"."zen_contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_contracts" TO "service_role";
GRANT ALL ON TABLE "public"."zen_error_logs" TO "anon";
GRANT ALL ON TABLE "public"."zen_error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_error_logs" TO "service_role";
GRANT ALL ON TABLE "public"."zen_faq" TO "anon";
GRANT ALL ON TABLE "public"."zen_faq" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_faq" TO "service_role";
GRANT ALL ON TABLE "public"."zen_feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."zen_feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_feature_flags" TO "service_role";
GRANT ALL ON TABLE "public"."zen_incident_fees" TO "anon";
GRANT ALL ON TABLE "public"."zen_incident_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_incident_fees" TO "service_role";
GRANT ALL ON TABLE "public"."zen_inventory" TO "anon";
GRANT ALL ON TABLE "public"."zen_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_inventory" TO "service_role";
GRANT ALL ON TABLE "public"."zen_inventory_history" TO "anon";
GRANT ALL ON TABLE "public"."zen_inventory_history" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_inventory_history" TO "service_role";
GRANT ALL ON TABLE "public"."zen_invoice_pdf_history" TO "anon";
GRANT ALL ON TABLE "public"."zen_invoice_pdf_history" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_invoice_pdf_history" TO "service_role";
GRANT ALL ON TABLE "public"."zen_invoices" TO "anon";
GRANT ALL ON TABLE "public"."zen_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_invoices" TO "service_role";
GRANT ALL ON TABLE "public"."zen_master_orders" TO "anon";
GRANT ALL ON TABLE "public"."zen_master_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_master_orders" TO "service_role";
GRANT ALL ON TABLE "public"."zen_notices" TO "anon";
GRANT ALL ON TABLE "public"."zen_notices" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_notices" TO "service_role";
GRANT ALL ON TABLE "public"."zen_notifications" TO "anon";
GRANT ALL ON TABLE "public"."zen_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_notifications" TO "service_role";
GRANT ALL ON TABLE "public"."zen_order_costs" TO "anon";
GRANT ALL ON TABLE "public"."zen_order_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_order_costs" TO "service_role";
GRANT ALL ON TABLE "public"."zen_order_items" TO "anon";
GRANT ALL ON TABLE "public"."zen_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_order_items" TO "service_role";
GRANT ALL ON TABLE "public"."zen_order_packages" TO "anon";
GRANT ALL ON TABLE "public"."zen_order_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_order_packages" TO "service_role";
GRANT ALL ON TABLE "public"."zen_order_rate_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."zen_order_rate_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_order_rate_snapshots" TO "service_role";
GRANT ALL ON TABLE "public"."zen_order_routes" TO "anon";
GRANT ALL ON TABLE "public"."zen_order_routes" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_order_routes" TO "service_role";
GRANT ALL ON TABLE "public"."zen_orders" TO "anon";
GRANT ALL ON TABLE "public"."zen_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_orders" TO "service_role";
GRANT ALL ON TABLE "public"."zen_organizations" TO "anon";
GRANT ALL ON TABLE "public"."zen_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_organizations" TO "service_role";
GRANT ALL ON TABLE "public"."zen_param_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."zen_param_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_param_audit_log" TO "service_role";
GRANT ALL ON TABLE "public"."zen_ports" TO "anon";
GRANT ALL ON TABLE "public"."zen_ports" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_ports" TO "service_role";
GRANT ALL ON TABLE "public"."zen_profiles" TO "anon";
GRANT ALL ON TABLE "public"."zen_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."zen_qna" TO "anon";
GRANT ALL ON TABLE "public"."zen_qna" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_qna" TO "service_role";
GRANT ALL ON TABLE "public"."zen_qna_answers" TO "anon";
GRANT ALL ON TABLE "public"."zen_qna_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_qna_answers" TO "service_role";
GRANT ALL ON TABLE "public"."zen_rate_cards" TO "anon";
GRANT ALL ON TABLE "public"."zen_rate_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_rate_cards" TO "service_role";
GRANT ALL ON TABLE "public"."zen_rate_tiers" TO "anon";
GRANT ALL ON TABLE "public"."zen_rate_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_rate_tiers" TO "service_role";
GRANT ALL ON TABLE "public"."zen_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."zen_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_role_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."zen_route_options" TO "anon";
GRANT ALL ON TABLE "public"."zen_route_options" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_route_options" TO "service_role";
GRANT ALL ON TABLE "public"."zen_sequences" TO "anon";
GRANT ALL ON TABLE "public"."zen_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_sequences" TO "service_role";
GRANT ALL ON TABLE "public"."zen_system_params" TO "anon";
GRANT ALL ON TABLE "public"."zen_system_params" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_system_params" TO "service_role";
GRANT ALL ON TABLE "public"."zen_system_settings" TO "anon";
GRANT ALL ON TABLE "public"."zen_system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_system_settings" TO "service_role";
GRANT ALL ON TABLE "public"."zen_tax_invoices" TO "anon";
GRANT ALL ON TABLE "public"."zen_tax_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tax_invoices" TO "service_role";
GRANT ALL ON TABLE "public"."zen_tracking_configs" TO "anon";
GRANT ALL ON TABLE "public"."zen_tracking_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tracking_configs" TO "service_role";
GRANT ALL ON TABLE "public"."zen_tracking_events" TO "anon";
GRANT ALL ON TABLE "public"."zen_tracking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tracking_events" TO "service_role";
GRANT ALL ON TABLE "public"."zen_tracking_raw_logs" TO "anon";
GRANT ALL ON TABLE "public"."zen_tracking_raw_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tracking_raw_logs" TO "service_role";
GRANT ALL ON TABLE "public"."zen_tracking_scenarios" TO "anon";
GRANT ALL ON TABLE "public"."zen_tracking_scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tracking_scenarios" TO "service_role";
GRANT ALL ON TABLE "public"."zen_transport_costs" TO "anon";
GRANT ALL ON TABLE "public"."zen_transport_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_transport_costs" TO "service_role";
GRANT ALL ON TABLE "public"."zen_transport_schedules" TO "anon";
GRANT ALL ON TABLE "public"."zen_transport_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_transport_schedules" TO "service_role";
GRANT ALL ON TABLE "public"."zen_vessel_schedules" TO "anon";
GRANT ALL ON TABLE "public"."zen_vessel_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_vessel_schedules" TO "service_role";
GRANT ALL ON TABLE "public"."zen_voc" TO "anon";
GRANT ALL ON TABLE "public"."zen_voc" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_voc" TO "service_role";
GRANT ALL ON TABLE "public"."zen_voc_answers" TO "anon";
GRANT ALL ON TABLE "public"."zen_voc_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_voc_answers" TO "service_role";
GRANT ALL ON TABLE "public"."zen_wallet" TO "anon";
GRANT ALL ON TABLE "public"."zen_wallet" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_wallet" TO "service_role";
GRANT ALL ON TABLE "public"."zen_wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."zen_wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_wallet_transactions" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
Initialising login role...
Dumping schemas from remote database...
A new version of Supabase CLI is available: v2.98.2 (currently installed v2.95.4)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli

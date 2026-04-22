


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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
    v_order RECORD;
    v_rate RECORD;
    v_chargeable_weight NUMERIC;
    v_total_freight NUMERIC;
BEGIN
    -- 1. 오더 정보 및 화물 스펙 조회
    SELECT * INTO v_order FROM public.zen_orders WHERE id = p_order_id;
    
    -- Chargeable Weight 계산 로직 (Air: 1:6000 기준)
    -- 실제 운영 데이터에서는 cargo_details JSONB에서 파싱
    v_chargeable_weight := COALESCE((v_order.estimated_cost)::NUMERIC, 1.0); -- 임시 매핑

    -- 2. 요율 매칭 (Air/Sea/Express 구분 및 최우선 순위 검색)
    SELECT * INTO v_rate 
    FROM public.rate_cards 
    WHERE origin_port = v_order.origin_port_id 
      AND destination_port = v_order.dest_port_id
      AND service_type = v_order.transport_mode -- 'AIR', 'SEA' 등
      AND status = 'ACTIVE'
    ORDER BY priority DESC, created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '유효한 요율 카드를 찾을 수 없습니다.');
    END IF;

    v_total_freight := v_rate.base_rate * v_chargeable_weight;

    -- 3. 정산 상세(zen_order_costs) 자동 삽입 (기존 데이터 삭제 후 갱신)
    DELETE FROM public.zen_order_costs WHERE order_id = p_order_id AND cost_type = 'FREIGHT';
    
    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency)
    VALUES (p_order_id, 'FREIGHT', v_rate.base_rate, v_chargeable_weight, 'USD');

    RETURN jsonb_build_object(
        'success', true, 
        'chargeable_weight', v_chargeable_weight,
        'rate_applied', v_rate.base_rate,
        'total_freight', v_total_freight,
        'currency', 'USD'
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
        rc.base_rate as unit_price,
        rc.currency,
        rc.base_date_rule
    FROM 
        public.rate_cards rc
    -- zen_ports와 조인하여 ID 기반 매칭 수행
    JOIN 
        public.zen_ports p_origin ON rc.origin_port = p_origin.code
    JOIN 
        public.zen_ports p_dest ON rc.destination_port = p_dest.code
    WHERE 
        rc.carrier_id = p_carrier_id
        AND p_origin.id = p_origin_port_id
        AND p_dest.id = p_dest_port_id
        AND rc.service_type = p_service_type
        AND rc.status = 'ACTIVE'
        AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id)
        AND p_reference_date <@ tstzrange(rc.valid_from, rc.valid_to)
    ORDER BY 
        (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC,
        rc.priority DESC,
        rc.version_no DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    target_org_id UUID;
    target_role TEXT;
    target_status TEXT;
BEGIN
    -- 1. 메타데이터 추출 (동적 수용)
    target_role := COALESCE(new.raw_user_meta_data->>'role', 'MEMBER');
    target_status := COALESCE(new.raw_user_meta_data->>'status', 'PENDING');

    -- 2. 법인 신규 생성인 경우
    IF (new.raw_user_meta_data->>'is_new_org')::boolean = true THEN
        INSERT INTO public.organizations (org_name_ko, biz_no, org_type, status)
        VALUES (
            new.raw_user_meta_data->>'org_name',
            new.raw_user_meta_data->>'business_number',
            COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER'),
            'PENDING'
        )
        RETURNING id INTO target_org_id;
    -- 3. 기존 조직 합류 (UUID 유효성 검사 후 캐스팅)
    ELSIF (new.raw_user_meta_data->>'org_id') IS NOT NULL AND (new.raw_user_meta_data->>'org_id') <> '' THEN
        BEGIN
            target_org_id := (new.raw_user_meta_data->>'org_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            target_org_id := NULL;
        END;
    END IF;

    -- 4. 프로필 생성 (메타데이터 거버넌스 준수)
    INSERT INTO public.profiles (id, email, full_name, role, status, org_id)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        target_role,
        target_status,
        target_org_id
    );
    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
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
    CONSTRAINT "zen_invoices_status_check" CHECK (("status" = ANY (ARRAY['UNPAID'::"text", 'PARTIAL'::"text", 'PAID'::"text", 'OVERDUE'::"text", 'CANCELED'::"text"])))
);


ALTER TABLE "public"."zen_invoices" OWNER TO "postgres";


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
    CONSTRAINT "zen_organizations_type_check" CHECK (("type" = ANY (ARRAY['PLATFORM'::"text", 'SHIPPER'::"text", 'CARRIER'::"text"])))
);

ALTER TABLE ONLY "public"."zen_organizations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_organizations" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."zen_system_settings" (
    "setting_key" "text" NOT NULL,
    "setting_value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."zen_system_settings" OWNER TO "postgres";


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


ALTER TABLE ONLY "public"."common_code_groups"
    ADD CONSTRAINT "common_code_groups_pkey" PRIMARY KEY ("group_code");



ALTER TABLE ONLY "public"."common_codes"
    ADD CONSTRAINT "common_codes_pkey" PRIMARY KEY ("group_code", "code_value");



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



ALTER TABLE ONLY "public"."zen_contracts"
    ADD CONSTRAINT "zen_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_invoices"
    ADD CONSTRAINT "zen_invoices_invoice_no_key" UNIQUE ("invoice_no");



ALTER TABLE ONLY "public"."zen_invoices"
    ADD CONSTRAINT "zen_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_master_no_key" UNIQUE ("master_no");



ALTER TABLE ONLY "public"."zen_master_orders"
    ADD CONSTRAINT "zen_master_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_order_costs"
    ADD CONSTRAINT "zen_order_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_order_items"
    ADD CONSTRAINT "zen_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_order_packages"
    ADD CONSTRAINT "zen_order_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_order_rate_snapshots"
    ADD CONSTRAINT "zen_order_rate_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_order_no_key" UNIQUE ("order_no");



ALTER TABLE ONLY "public"."zen_orders"
    ADD CONSTRAINT "zen_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_organizations"
    ADD CONSTRAINT "zen_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_ports"
    ADD CONSTRAINT "zen_ports_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."zen_ports"
    ADD CONSTRAINT "zen_ports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_profiles"
    ADD CONSTRAINT "zen_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."zen_profiles"
    ADD CONSTRAINT "zen_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_rate_cards"
    ADD CONSTRAINT "zen_rate_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_rate_tiers"
    ADD CONSTRAINT "zen_rate_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_role_permissions"
    ADD CONSTRAINT "zen_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_role_permissions"
    ADD CONSTRAINT "zen_role_permissions_role_code_path_key" UNIQUE ("role_code", "path");



ALTER TABLE ONLY "public"."zen_system_settings"
    ADD CONSTRAINT "zen_system_settings_pkey" PRIMARY KEY ("setting_key");



ALTER TABLE ONLY "public"."zen_tracking_configs"
    ADD CONSTRAINT "zen_tracking_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_tracking_configs"
    ADD CONSTRAINT "zen_tracking_configs_tracking_no_key" UNIQUE ("tracking_no");



ALTER TABLE ONLY "public"."zen_tracking_events"
    ADD CONSTRAINT "zen_tracking_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_tracking_scenarios"
    ADD CONSTRAINT "zen_tracking_scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zen_transport_schedules"
    ADD CONSTRAINT "zen_transport_schedules_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_order_rate_snapshots_order_id" ON "public"."zen_order_rate_snapshots" USING "btree" ("order_id");



CREATE INDEX "idx_order_rate_snapshots_rate_card_id" ON "public"."zen_order_rate_snapshots" USING "btree" ("rate_card_id");



CREATE INDEX "idx_order_status_history_order_id" ON "public"."order_status_history" USING "btree" ("order_id");



CREATE INDEX "idx_rate_cards_route" ON "public"."zen_rate_cards" USING "btree" ("origin_code", "dest_code", "mode");



CREATE INDEX "idx_rate_tiers_card_id" ON "public"."zen_rate_tiers" USING "btree" ("rate_card_id");



CREATE INDEX "idx_tracking_config_order" ON "public"."zen_tracking_configs" USING "btree" ("order_id");



CREATE INDEX "idx_tracking_events_order" ON "public"."zen_tracking_events" USING "btree" ("order_id");



CREATE INDEX "idx_tracking_events_time" ON "public"."zen_tracking_events" USING "btree" ("event_time");



CREATE INDEX "idx_zen_order_items_order_id" ON "public"."zen_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_zen_order_items_package_id" ON "public"."zen_order_items" USING "btree" ("package_id");



CREATE INDEX "idx_zen_order_packages_order_id" ON "public"."zen_order_packages" USING "btree" ("order_id");



CREATE INDEX "idx_zen_orders_order_no" ON "public"."zen_orders" USING "btree" ("order_no");



CREATE INDEX "idx_zen_orders_transport_mode" ON "public"."zen_orders" USING "btree" ("transport_mode");



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



CREATE OR REPLACE TRIGGER "tr_capture_order_rate_snapshot" AFTER INSERT OR UPDATE OF "status", "confirmed_at", "received_at", "carrier_id", "origin_port_id", "dest_port_id", "shipper_id" ON "public"."zen_orders" FOR EACH ROW EXECUTE FUNCTION "public"."fn_trigger_capture_order_rate"();



CREATE OR REPLACE TRIGGER "update_zen_master_orders_modtime" BEFORE UPDATE ON "public"."zen_master_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp_column"();



ALTER TABLE ONLY "public"."common_codes"
    ADD CONSTRAINT "common_codes_group_code_fkey" FOREIGN KEY ("group_code") REFERENCES "public"."common_code_groups"("group_code") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."zen_tracking_configs"
    ADD CONSTRAINT "zen_tracking_configs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zen_tracking_events"
    ADD CONSTRAINT "zen_tracking_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."zen_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zen_tracking_events"
    ADD CONSTRAINT "zen_tracking_events_tracking_config_id_fkey" FOREIGN KEY ("tracking_config_id") REFERENCES "public"."zen_tracking_configs"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all documents" ON "public"."organization_documents" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage tracking events" ON "public"."zen_tracking_events" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admins have full access to tracking configs" ON "public"."zen_tracking_configs" USING ((EXISTS ( SELECT 1
   FROM "public"."zen_profiles"
  WHERE (("zen_profiles"."id" = "auth"."uid"()) AND ("zen_profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Allow authenticated full access to master orders" ON "public"."zen_master_orders" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated insert for history" ON "public"."order_status_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated read for history" ON "public"."order_status_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to select zen_organizations" ON "public"."zen_organizations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to select zen_ports" ON "public"."zen_ports" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."zen_orders" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all authenticated users" ON "public"."zen_orders" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for platform admins only" ON "public"."system_settings" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_type'::"text") = 'PLATFORM'::"text"));



CREATE POLICY "Members can view their own org documents" ON "public"."organization_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."org_id" = "organization_documents"."org_id")))));



CREATE POLICY "Shippers can view their order costs" ON "public"."zen_order_costs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."zen_orders"
     JOIN "public"."profiles" ON (("profiles"."org_id" = "zen_orders"."shipper_id")))
  WHERE (("zen_orders"."id" = "zen_order_costs"."order_id") AND (("profiles"."id" = "auth"."uid"()) OR (("profiles"."role")::"text" = 'ADMIN'::"text"))))));



CREATE POLICY "Shippers can view their own zen_invoices" ON "public"."zen_invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."org_id" = "zen_invoices"."shipper_id") OR (("profiles"."role")::"text" = 'ADMIN'::"text"))))));



CREATE POLICY "Users can view items of accessible orders" ON "public"."zen_order_items" FOR SELECT USING (true);



CREATE POLICY "Users can view relevant tracking events" ON "public"."zen_tracking_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."zen_orders" "o"
  WHERE (("o"."id" = "zen_tracking_events"."order_id") AND (("o"."shipper_id" = "auth"."uid"()) OR ("o"."shipper_id" IN ( SELECT "zen_profiles"."org_id"
           FROM "public"."zen_profiles"
          WHERE ("zen_profiles"."id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view tracking of their own orders" ON "public"."zen_tracking_configs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."zen_orders" "o"
  WHERE (("o"."id" = "zen_tracking_configs"."order_id") AND (("o"."shipper_id" = "auth"."uid"()) OR ("o"."shipper_id" IN ( SELECT "zen_profiles"."org_id"
           FROM "public"."zen_profiles"
          WHERE ("zen_profiles"."id" = "auth"."uid"()))))))));



ALTER TABLE "public"."common_code_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."common_codes" ENABLE ROW LEVEL SECURITY;


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


ALTER TABLE "public"."zen_contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_master_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_order_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_order_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_order_rate_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_ports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_rate_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_rate_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_tracking_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_tracking_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_tracking_scenarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zen_transport_schedules" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_organization"("target_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_organization"("target_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_organization"("target_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_order_costs"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_best_matching_rate"("p_carrier_id" "uuid", "p_origin_port_id" "uuid", "p_dest_port_id" "uuid", "p_service_type" character varying, "p_customer_id" "uuid", "p_reference_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_trigger_capture_order_rate"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trigger_capture_order_rate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trigger_capture_order_rate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_master_order_no"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_master_order_no"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_master_order_no"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_organization"("target_org_id" "uuid", "comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_organization_supplement"("target_org_id" "uuid", "comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



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



GRANT ALL ON TABLE "public"."zen_contracts" TO "anon";
GRANT ALL ON TABLE "public"."zen_contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_contracts" TO "service_role";



GRANT ALL ON TABLE "public"."zen_invoices" TO "anon";
GRANT ALL ON TABLE "public"."zen_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."zen_master_orders" TO "anon";
GRANT ALL ON TABLE "public"."zen_master_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_master_orders" TO "service_role";



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



GRANT ALL ON TABLE "public"."zen_orders" TO "anon";
GRANT ALL ON TABLE "public"."zen_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_orders" TO "service_role";



GRANT ALL ON TABLE "public"."zen_organizations" TO "anon";
GRANT ALL ON TABLE "public"."zen_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."zen_ports" TO "anon";
GRANT ALL ON TABLE "public"."zen_ports" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_ports" TO "service_role";



GRANT ALL ON TABLE "public"."zen_profiles" TO "anon";
GRANT ALL ON TABLE "public"."zen_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."zen_rate_cards" TO "anon";
GRANT ALL ON TABLE "public"."zen_rate_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_rate_cards" TO "service_role";



GRANT ALL ON TABLE "public"."zen_rate_tiers" TO "anon";
GRANT ALL ON TABLE "public"."zen_rate_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_rate_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."zen_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."zen_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."zen_system_settings" TO "anon";
GRANT ALL ON TABLE "public"."zen_system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."zen_tracking_configs" TO "anon";
GRANT ALL ON TABLE "public"."zen_tracking_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tracking_configs" TO "service_role";



GRANT ALL ON TABLE "public"."zen_tracking_events" TO "anon";
GRANT ALL ON TABLE "public"."zen_tracking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tracking_events" TO "service_role";



GRANT ALL ON TABLE "public"."zen_tracking_scenarios" TO "anon";
GRANT ALL ON TABLE "public"."zen_tracking_scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_tracking_scenarios" TO "service_role";



GRANT ALL ON TABLE "public"."zen_transport_schedules" TO "anon";
GRANT ALL ON TABLE "public"."zen_transport_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."zen_transport_schedules" TO "service_role";



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








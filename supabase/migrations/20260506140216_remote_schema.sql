drop policy if exists "Admins can manage incident fees" on "public"."zen_incident_fees";

drop policy if exists "Shippers can view their incident fees" on "public"."zen_incident_fees";

drop policy if exists "Admins and Partners can create invoice PDF history" on "public"."zen_invoice_pdf_history";

drop policy if exists "Admins can manage all invoices" on "public"."zen_invoices";

drop policy if exists "Shippers can view their own invoices" on "public"."zen_invoices";

drop policy if exists "Admins can manage all documents" on "public"."zen_organization_documents";

drop policy if exists "Enable read access for authenticated users" on "public"."zen_organization_documents";

drop policy if exists "Members can view their own org documents" on "public"."zen_organization_documents";

drop policy if exists "Enable read access for authenticated users" on "public"."zen_organizations";

drop policy if exists "Enable read access for authenticated users" on "public"."zen_profiles";

drop policy if exists "Admins can view all declarations" on "public"."customs_declarations";

drop policy if exists "Users can view their own declarations" on "public"."customs_declarations";

drop policy if exists "Admins can update promotion requests" on "public"."grade_promotion_request";

drop policy if exists "Admins can view all promotion requests" on "public"."grade_promotion_request";

drop policy if exists "Users can view their organization's invoice PDF history" on "public"."zen_invoice_pdf_history";

drop policy if exists "Shippers can view their order costs" on "public"."zen_order_costs";

drop policy if exists "Admins can view all zen_profiles" on "public"."zen_profiles";

drop policy if exists "Admins can issue and update tax invoices" on "public"."zen_tax_invoices";

drop policy if exists "Shippers can view their own tax invoices" on "public"."zen_tax_invoices";

drop policy if exists "Admins can manage tracking events" on "public"."zen_tracking_events";

drop policy if exists "Users can view relevant tracking events" on "public"."zen_tracking_events";

drop policy if exists "Admins have full access to tracking raw logs" on "public"."zen_tracking_raw_logs";

drop policy if exists "Admins can update VOC status" on "public"."zen_voc";

drop policy if exists "Admins can view all VOCs" on "public"."zen_voc";

drop policy if exists "Users can create VOCs for own organization orders" on "public"."zen_voc";

drop policy if exists "Users can view own organization's VOCs" on "public"."zen_voc";

drop policy if exists "Admins can manage VOC answers" on "public"."zen_voc_answers";

drop policy if exists "Users can view answers for own organization VOCs" on "public"."zen_voc_answers";

revoke delete on table "public"."zen_organization_documents" from "anon";

revoke insert on table "public"."zen_organization_documents" from "anon";

revoke references on table "public"."zen_organization_documents" from "anon";

revoke select on table "public"."zen_organization_documents" from "anon";

revoke trigger on table "public"."zen_organization_documents" from "anon";

revoke truncate on table "public"."zen_organization_documents" from "anon";

revoke update on table "public"."zen_organization_documents" from "anon";

revoke delete on table "public"."zen_organization_documents" from "authenticated";

revoke insert on table "public"."zen_organization_documents" from "authenticated";

revoke references on table "public"."zen_organization_documents" from "authenticated";

revoke select on table "public"."zen_organization_documents" from "authenticated";

revoke trigger on table "public"."zen_organization_documents" from "authenticated";

revoke truncate on table "public"."zen_organization_documents" from "authenticated";

revoke update on table "public"."zen_organization_documents" from "authenticated";

revoke delete on table "public"."zen_organization_documents" from "service_role";

revoke insert on table "public"."zen_organization_documents" from "service_role";

revoke references on table "public"."zen_organization_documents" from "service_role";

revoke select on table "public"."zen_organization_documents" from "service_role";

revoke trigger on table "public"."zen_organization_documents" from "service_role";

revoke truncate on table "public"."zen_organization_documents" from "service_role";

revoke update on table "public"."zen_organization_documents" from "service_role";

alter table "public"."zen_organization_documents" drop constraint "organization_documents_reviewed_by_fkey";

alter table "public"."zen_organization_documents" drop constraint "organization_documents_status_check";

alter table "public"."zen_organization_documents" drop constraint "zen_organization_documents_org_id_fkey";

alter table "public"."grade_promotion_request" drop constraint "grade_promotion_request_user_id_fkey";

alter table "public"."zen_orders" drop constraint "zen_orders_status_check";

alter table "public"."zen_voc" drop constraint "zen_voc_created_by_fkey";

alter table "public"."zen_voc_answers" drop constraint "zen_voc_answers_answered_by_fkey";

alter table "public"."zen_organization_documents" drop constraint "organization_documents_pkey";

drop index if exists "public"."organization_documents_pkey";

drop table if exists "public"."zen_organization_documents" cascade;


  create table "public"."zen_organization_documents" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "doc_type" text not null,
    "file_path" text not null,
    "status" text default 'PENDING'::text,
    "rejection_reason" text,
    "requested_at" timestamp with time zone default now(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" uuid
      );


alter table "public"."zen_organizations" drop column "approval_comment";

alter table "public"."zen_organizations" drop column "approval_date";

alter table "public"."zen_organizations" drop column "biz_no";

alter table "public"."zen_organizations" drop column "corporate_id";

alter table "public"."zen_organizations" drop column "rep_name";

CREATE UNIQUE INDEX organization_documents_pkey ON public.zen_organization_documents USING btree (id);

alter table "public"."zen_organization_documents" add constraint "organization_documents_pkey" PRIMARY KEY using index "organization_documents_pkey";

alter table "public"."zen_organization_documents" add constraint "organization_documents_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.zen_organizations(id) ON DELETE CASCADE not valid;

alter table "public"."zen_organization_documents" validate constraint "organization_documents_org_id_fkey";

alter table "public"."zen_organization_documents" add constraint "organization_documents_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) not valid;

alter table "public"."zen_organization_documents" validate constraint "organization_documents_reviewed_by_fkey";

alter table "public"."zen_organization_documents" add constraint "organization_documents_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'SUPPLEMENT_REQUESTED'::text]))) not valid;

alter table "public"."zen_organization_documents" validate constraint "organization_documents_status_check";

alter table "public"."grade_promotion_request" add constraint "grade_promotion_request_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.zen_profiles(id) not valid;

alter table "public"."grade_promotion_request" validate constraint "grade_promotion_request_user_id_fkey";

alter table "public"."zen_orders" add constraint "zen_orders_status_check" CHECK ((status = ANY (ARRAY['REGISTERED'::text, 'PICKED_UP'::text, 'IN_TRANSIT'::text, 'ARRIVED'::text, 'DELIVERED'::text, 'RELEASED'::text, 'CANCELED'::text, 'CLAIMED'::text, 'PENDING'::text, 'CONFIRMED'::text, 'WAREHOUSED'::text, 'HELD'::text]))) not valid;

alter table "public"."zen_orders" validate constraint "zen_orders_status_check";

alter table "public"."zen_voc" add constraint "zen_voc_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.zen_profiles(id) not valid;

alter table "public"."zen_voc" validate constraint "zen_voc_created_by_fkey";

alter table "public"."zen_voc_answers" add constraint "zen_voc_answers_answered_by_fkey" FOREIGN KEY (answered_by) REFERENCES public.zen_profiles(id) not valid;

alter table "public"."zen_voc_answers" validate constraint "zen_voc_answers_answered_by_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.approve_organization(target_org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_id TEXT;
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    -- [1] Security check (simplified)
    -- In production: Ensure auth.uid() has ADMIN role

    -- [2] Check if already active
    IF EXISTS (SELECT 1 FROM public.zen_organizations WHERE id = target_org_id AND status = 'ACTIVE') THEN
        RETURN 'ALREADY_ACTIVE';
    END IF;

    -- [3] Generate 6-digit corporate ID
    new_id := LPAD(nextval('corporate_id_seq')::TEXT, 6, '0');

    -- [4] Update organization status and ID
    UPDATE public.zen_organizations
    SET 
        status = 'ACTIVE',
        corporate_id = new_id,
        approval_date = now()
    WHERE id = target_org_id;

    -- [5] Update profile statuses (for all users tied to this org)
    UPDATE public.zen_profiles
    SET status = 'ACTIVE'
    WHERE org_id = target_org_id;

    -- [6] Update auth.users raw_app_meta_data for these users so AuthGuard lets them pass
    -- We must use a loop if multiple users are in the same org
    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
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
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_order_costs(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

    v_total_freight := v_rate.unit_price * v_chargeable_weight;   -- was v_rate.base_rate

    -- 4. 정산 상세(zen_order_costs) 자동 삽입 (기존 FREIGHT 항목 교체)
    DELETE FROM public.zen_order_costs
    WHERE order_id  = p_order_id
      AND cost_type = 'FREIGHT';

    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency)
    VALUES (p_order_id, 'FREIGHT', v_rate.unit_price, v_chargeable_weight, v_rate.currency);

    RETURN jsonb_build_object(
        'success',           true,
        'chargeable_weight', v_chargeable_weight,
        'rate_applied',      v_rate.unit_price,      -- was v_rate.base_rate
        'total_freight',     v_total_freight,
        'currency',          v_rate.currency
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(p_carrier_id uuid, p_origin_port_id uuid, p_dest_port_id uuid, p_service_type character varying, p_customer_id uuid, p_reference_date timestamp with time zone)
 RETURNS TABLE(id uuid, unit_price numeric, currency character varying, base_date_rule character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        rc.id,
        rc.unit_price                       AS unit_price,    -- was rc.base_rate
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.reject_organization(target_org_id uuid, comment text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    UPDATE public.zen_organizations
    SET 
        status = 'REJECTED',
        approval_comment = comment
    WHERE id = target_org_id;

    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;
        IF meta_data IS NULL THEN meta_data := '{}'::jsonb; END IF;

        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'REJECTED')
        WHERE id = target_user_id;
    END LOOP;

    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_organization_supplement(target_org_id uuid, comment text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    -- [1] Update organization status and comment
    UPDATE public.zen_organizations
    SET 
        status = 'SUPPLEMENT_REQUIRED',
        approval_comment = comment
    WHERE id = target_org_id;

    -- [2] Update profile status for all users in this org
    UPDATE public.zen_profiles
    SET status = 'PENDING' -- Profiles remain pending until final approval
    WHERE org_id = target_org_id;

    -- [3] Sync with Auth Metadata so Proxy (Middleware) knows the detailed status
    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;
        IF meta_data IS NULL THEN meta_data := '{}'::jsonb; END IF;

        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'SUPPLEMENT_REQUIRED')
        WHERE id = target_user_id;
    END LOOP;

    RETURN TRUE;
END;
$function$
;

grant delete on table "public"."zen_organization_documents" to "anon";

grant insert on table "public"."zen_organization_documents" to "anon";

grant references on table "public"."zen_organization_documents" to "anon";

grant select on table "public"."zen_organization_documents" to "anon";

grant trigger on table "public"."zen_organization_documents" to "anon";

grant truncate on table "public"."zen_organization_documents" to "anon";

grant update on table "public"."zen_organization_documents" to "anon";

grant delete on table "public"."zen_organization_documents" to "authenticated";

grant insert on table "public"."zen_organization_documents" to "authenticated";

grant references on table "public"."zen_organization_documents" to "authenticated";

grant select on table "public"."zen_organization_documents" to "authenticated";

grant trigger on table "public"."zen_organization_documents" to "authenticated";

grant truncate on table "public"."zen_organization_documents" to "authenticated";

grant update on table "public"."zen_organization_documents" to "authenticated";

grant delete on table "public"."zen_organization_documents" to "service_role";

grant insert on table "public"."zen_organization_documents" to "service_role";

grant references on table "public"."zen_organization_documents" to "service_role";

grant select on table "public"."zen_organization_documents" to "service_role";

grant trigger on table "public"."zen_organization_documents" to "service_role";

grant truncate on table "public"."zen_organization_documents" to "service_role";

grant update on table "public"."zen_organization_documents" to "service_role";


  create policy "Allow all access for admin on customs_declarations"
  on "public"."customs_declarations"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (((zen_profiles.role)::text = 'ADMIN'::text) OR ((zen_profiles.role)::text = 'ZENITH_SUPER_ADMIN'::text))))));



  create policy "Allow select for owners on customs_declarations"
  on "public"."customs_declarations"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.zen_orders
  WHERE ((zen_orders.id = customs_declarations.order_id) AND (zen_orders.shipper_id = auth.uid())))));



  create policy "Admins can manage all documents"
  on "public"."zen_organization_documents"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = 'ADMIN'::text)))));



  create policy "Members can view their own org documents"
  on "public"."zen_organization_documents"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.org_id = zen_organization_documents.org_id)))));



  create policy "Admins can view all declarations"
  on "public"."customs_declarations"
  as permissive
  for select
  to public
using ((auth.uid() IN ( SELECT zen_profiles.id
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.role = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text]))))));



  create policy "Users can view their own declarations"
  on "public"."customs_declarations"
  as permissive
  for select
  to public
using ((auth.uid() IN ( SELECT zen_profiles.id
   FROM public.zen_profiles
  WHERE (zen_profiles.id = auth.uid()))));



  create policy "Admins can update promotion requests"
  on "public"."grade_promotion_request"
  as permissive
  for update
  to authenticated
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ADMIN'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ZENITH_SUPER_ADMIN'::text)));



  create policy "Admins can view all promotion requests"
  on "public"."grade_promotion_request"
  as permissive
  for select
  to authenticated
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ADMIN'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ZENITH_SUPER_ADMIN'::text)));



  create policy "Users can view their organization's invoice PDF history"
  on "public"."zen_invoice_pdf_history"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_invoices i
     JOIN public.zen_profiles p ON ((p.org_id = i.shipper_id)))
  WHERE ((i.id = zen_invoice_pdf_history.invoice_id) AND ((p.id = auth.uid()) OR ((p.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text])))))));



  create policy "Shippers can view their order costs"
  on "public"."zen_order_costs"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM (public.zen_orders
     JOIN public.zen_profiles ON ((zen_profiles.org_id = zen_orders.shipper_id)))
  WHERE ((zen_orders.id = zen_order_costs.order_id) AND ((zen_profiles.id = auth.uid()) OR ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text])))))) OR (EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text])))))));



  create policy "Admins can view all zen_profiles"
  on "public"."zen_profiles"
  as permissive
  for select
  to authenticated
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ADMIN'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ZENITH_SUPER_ADMIN'::text)));



  create policy "Admins can issue and update tax invoices"
  on "public"."zen_tax_invoices"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = 'ADMIN'::text)))));



  create policy "Shippers can view their own tax invoices"
  on "public"."zen_tax_invoices"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_invoices
     JOIN public.zen_profiles ON ((zen_profiles.id = auth.uid())))
  WHERE ((zen_invoices.id = zen_tax_invoices.invoice_id) AND ((zen_profiles.org_id = zen_invoices.shipper_id) OR ((zen_profiles.role)::text = 'ADMIN'::text))))));



  create policy "Admins can manage tracking events"
  on "public"."zen_tracking_events"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text, ('MANAGER'::character varying)::text]))))));



  create policy "Users can view relevant tracking events"
  on "public"."zen_tracking_events"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_orders o
  WHERE ((o.id = zen_tracking_events.order_id) AND ((o.shipper_id = auth.uid()) OR (o.shipper_id IN ( SELECT zen_profiles.org_id
           FROM public.zen_profiles
          WHERE (zen_profiles.id = auth.uid()))))))));



  create policy "Admins have full access to tracking raw logs"
  on "public"."zen_tracking_raw_logs"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text, ('MANAGER'::character varying)::text]))))));



  create policy "Admins can update VOC status"
  on "public"."zen_voc"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text]))))));



  create policy "Admins can view all VOCs"
  on "public"."zen_voc"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text]))))));



  create policy "Users can create VOCs for own organization orders"
  on "public"."zen_voc"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT zen_profiles.org_id
   FROM public.zen_profiles
  WHERE (zen_profiles.id = auth.uid()))));



  create policy "Users can view own organization's VOCs"
  on "public"."zen_voc"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT zen_profiles.org_id
   FROM public.zen_profiles
  WHERE (zen_profiles.id = auth.uid()))));



  create policy "Admins can manage VOC answers"
  on "public"."zen_voc_answers"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND ((zen_profiles.role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('ZENITH_SUPER_ADMIN'::character varying)::text]))))));



  create policy "Users can view answers for own organization VOCs"
  on "public"."zen_voc_answers"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_voc v
     JOIN public.zen_profiles p ON ((v.org_id = p.org_id)))
  WHERE ((v.id = zen_voc_answers.voc_id) AND (p.id = auth.uid())))));




alter table "public"."zen_orders" drop constraint "zen_orders_status_check";

alter table "public"."zen_orders" add constraint "zen_orders_status_check" CHECK ((status = ANY (ARRAY['REGISTERED'::text, 'PICKED_UP'::text, 'IN_TRANSIT'::text, 'ARRIVED'::text, 'DELIVERED'::text, 'RELEASED'::text, 'CANCELED'::text, 'CLAIMED'::text, 'PENDING'::text, 'CONFIRMED'::text, 'WAREHOUSED'::text, 'HELD'::text, 'PACKED'::text, 'SCHEDULED'::text, 'MASTERED'::text, 'RETURNED'::text]))) not valid;

alter table "public"."zen_orders" validate constraint "zen_orders_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(p_carrier_id uuid, p_origin_port_id uuid, p_dest_port_id uuid, p_service_type character varying, p_customer_id uuid, p_reference_date timestamp with time zone)
 RETURNS TABLE(id uuid, unit_price numeric, currency character varying, base_date_rule character varying)
 LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY SELECT rc.id, rc.unit_price AS unit_price, rc.currency::character varying, COALESCE(rc.remarks, '')::character varying AS base_date_rule FROM public.zen_rate_cards rc WHERE rc.org_id = p_carrier_id AND rc.mode = p_service_type AND rc.status = 'ACTIVE' AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id) AND p_reference_date <@ tstzrange(rc.valid_from, rc.valid_to) ORDER BY (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC, rc.priority DESC, rc.version_no DESC LIMIT 1; END; $function$
;



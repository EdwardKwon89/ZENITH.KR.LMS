drop extension if exists "pg_net";

drop trigger if exists "update_common_code_groups_modtime" on "public"."common_code_groups";

drop trigger if exists "update_common_codes_modtime" on "public"."common_codes";

drop policy "Common code groups are viewable by all authenticated users" on "public"."common_code_groups";

drop policy "Only admins can modify code groups" on "public"."common_code_groups";

drop policy "Common codes are viewable by all authenticated users" on "public"."common_codes";

drop policy "Only admins can modify codes" on "public"."common_codes";

drop policy "Allow authenticated full access to master zen_orders" on "public"."zen_master_orders";

drop policy "Users can view items of accessible zen_orders" on "public"."zen_order_items";

drop policy "Users can manage order routes for their org's zen_orders" on "public"."zen_order_routes";

drop policy "Users can view order routes for their org's zen_orders" on "public"."zen_order_routes";

drop policy "Shippers can view their own zen_orders" on "public"."zen_orders";

drop policy "Organizations are viewable by assigned members" on "public"."zen_organizations";

drop policy "Users can view their own profile" on "public"."zen_profiles";

drop policy "Users can manage route options for their org's zen_orders" on "public"."zen_route_options";

drop policy "Users can view route options for their org's zen_orders" on "public"."zen_route_options";

drop policy "Users can view tracking of their own zen_orders" on "public"."zen_tracking_configs";

drop policy "Users can create VOCs for own organization zen_orders" on "public"."zen_voc";

drop policy "Admins can manage all documents" on "public"."organization_documents";

drop policy "Members can view their own org documents" on "public"."organization_documents";

drop policy "Admins can manage FAQs" on "public"."zen_faq";

drop policy "Users can view active FAQs" on "public"."zen_faq";

drop policy "Admins can delete zen_feature_flags" on "public"."zen_feature_flags";

drop policy "Admins can insert zen_feature_flags" on "public"."zen_feature_flags";

drop policy "Admins can select zen_feature_flags" on "public"."zen_feature_flags";

drop policy "Admins can update zen_feature_flags" on "public"."zen_feature_flags";

drop policy "Users can read own org feature flags" on "public"."zen_feature_flags";

drop policy "Admins can update inventory" on "public"."zen_inventory";

drop policy "Users can view inventory of their own organization" on "public"."zen_inventory";

drop policy "Allow inventory history inserts" on "public"."zen_inventory_history";

drop policy "Users can view inventory history of their own organization" on "public"."zen_inventory_history";

drop policy "Admins and Managers can create invoice PDF history" on "public"."zen_invoice_pdf_history";

drop policy "Users can view their organization's invoice PDF history" on "public"."zen_invoice_pdf_history";

drop policy "Admins can insert zen_invoices" on "public"."zen_invoices";

drop policy "Admins can update zen_invoices" on "public"."zen_invoices";

drop policy "Shippers can view their own zen_invoices" on "public"."zen_invoices";

drop policy "Admins can manage notices" on "public"."zen_notices";

drop policy "Users can view published notices" on "public"."zen_notices";

drop policy "ZENITH_SUPER_ADMIN can view all notifications" on "public"."zen_notifications";

drop policy "Shippers can view their order costs" on "public"."zen_order_costs";

drop policy "Admins can select zen_param_audit_log" on "public"."zen_param_audit_log";

drop policy "Admins can update QnA status" on "public"."zen_qna";

drop policy "Users can create QnAs for own organization" on "public"."zen_qna";

drop policy "Users can view own organization's QnAs" on "public"."zen_qna";

drop policy "Admins can insert answers" on "public"."zen_qna_answers";

drop policy "Users can view answers for accessible QnAs" on "public"."zen_qna_answers";

drop policy "Admins can select zen_system_params" on "public"."zen_system_params";

drop policy "Admins can update zen_system_params" on "public"."zen_system_params";

drop policy "Admins can issue and update tax invoices" on "public"."zen_tax_invoices";

drop policy "Shippers can view their own tax invoices" on "public"."zen_tax_invoices";

drop policy "Admins have full access to tracking configs" on "public"."zen_tracking_configs";

drop policy "Admins can manage tracking events" on "public"."zen_tracking_events";

drop policy "Users can view relevant tracking events" on "public"."zen_tracking_events";

drop policy "Admins have full access to tracking raw logs" on "public"."zen_tracking_raw_logs";

drop policy "Admins can update VOC status" on "public"."zen_voc";

drop policy "Admins can view all VOCs" on "public"."zen_voc";

drop policy "Users can view own organization's VOCs" on "public"."zen_voc";

drop policy "Admins can manage VOC answers" on "public"."zen_voc_answers";

drop policy "Users can view answers for own organization VOCs" on "public"."zen_voc_answers";

drop policy "Admins can delete zen_wallet" on "public"."zen_wallet";

drop policy "Admins can insert zen_wallet" on "public"."zen_wallet";

drop policy "Admins can select zen_wallet" on "public"."zen_wallet";

drop policy "Admins can update zen_wallet" on "public"."zen_wallet";

drop policy "Users can read own org wallet" on "public"."zen_wallet";

drop policy "Admins can insert zen_wallet_transactions" on "public"."zen_wallet_transactions";

drop policy "Admins can select zen_wallet_transactions" on "public"."zen_wallet_transactions";

drop policy "Admins can update zen_wallet_transactions" on "public"."zen_wallet_transactions";

drop policy "Users can insert refund requests" on "public"."zen_wallet_transactions";

drop policy "Users can read own wallet transactions" on "public"."zen_wallet_transactions";

alter table "public"."zen_contracts" drop constraint "zen_contracts_carrier_id_fkey";

alter table "public"."zen_contracts" drop constraint "zen_contracts_shipper_id_fkey";

alter table "public"."zen_orders" drop constraint "zen_orders_contract_id_fkey";

alter table "public"."zen_orders" drop constraint "zen_orders_schedule_id_fkey";

alter table "public"."zen_organizations" drop constraint "zen_organizations_biz_no_key";

alter table "public"."zen_organizations" drop constraint "zen_organizations_corporate_id_key";

alter table "public"."zen_profiles" drop constraint "zen_profiles_id_fkey";

alter table "public"."zen_profiles" drop constraint "zen_profiles_org_id_fkey";

alter table "public"."zen_rate_cards" drop constraint "zen_rate_cards_contract_id_fkey";

alter table "public"."zen_rate_cards" drop constraint "zen_rate_cards_destination_id_fkey";

alter table "public"."zen_rate_cards" drop constraint "zen_rate_cards_origin_id_fkey";

alter table "public"."zen_rate_cards" drop constraint "zen_rate_cards_unit_type_check";

alter table "public"."zen_transport_schedules" drop constraint "zen_transport_schedules_carrier_id_fkey";

alter table "public"."zen_transport_schedules" drop constraint "zen_transport_schedules_destination_port_id_fkey";

alter table "public"."zen_transport_schedules" drop constraint "zen_transport_schedules_origin_port_id_fkey";

alter table "public"."organization_documents" drop constraint "organization_documents_org_id_fkey";

alter table "public"."zen_faq" drop constraint "zen_faq_created_by_fkey";

alter table "public"."zen_feature_flags" drop constraint "zen_feature_flags_updated_by_fkey";

alter table "public"."zen_notices" drop constraint "zen_notices_created_by_fkey";

alter table "public"."zen_notifications" drop constraint "zen_notifications_user_id_fkey";

alter table "public"."zen_order_rate_snapshots" drop constraint "zen_order_rate_snapshots_rate_card_id_fkey";

alter table "public"."zen_param_audit_log" drop constraint "zen_param_audit_log_changed_by_fkey";

alter table "public"."zen_qna" drop constraint "zen_qna_created_by_fkey";

alter table "public"."zen_qna_answers" drop constraint "zen_qna_answers_answered_by_fkey";

alter table "public"."zen_rate_cards" drop constraint "zen_rate_cards_customer_id_fkey";

alter table "public"."zen_rate_cards" drop constraint "zen_rate_cards_org_id_fkey";

alter table "public"."zen_system_params" drop constraint "zen_system_params_updated_by_fkey";

alter table "public"."zen_voc" drop constraint "zen_voc_created_by_fkey";

alter table "public"."zen_voc_answers" drop constraint "zen_voc_answers_answered_by_fkey";

alter table "public"."zen_wallet_transactions" drop constraint "zen_wallet_transactions_created_by_fkey";

drop function if exists "public"."update_updated_at_column"();

drop index if exists "public"."zen_organizations_biz_no_key";

drop index if exists "public"."zen_organizations_corporate_id_key";


  create table "public"."grade_master" (
    "grade_code" character varying(20) not null,
    "grade_name_ko" character varying(100) not null,
    "grade_name_en" character varying(100),
    "grade_name_zh" character varying(100),
    "grade_name_ja" character varying(100),
    "discount_rate" numeric(5,2) default 0.00,
    "benefit_desc" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."grade_master" enable row level security;


  create table "public"."grade_promotion_request" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "current_grade" character varying(20),
    "target_grade" character varying(20),
    "request_reason" text,
    "status" character varying(20) default 'PENDING'::character varying,
    "admin_comment" text,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."grade_promotion_request" enable row level security;


  create table "public"."nations" (
    "iso_alpha2" character(2) not null,
    "iso_alpha3" character(3) not null,
    "nation_name_ko" character varying(100) not null,
    "nation_name_en" character varying(100),
    "nation_name_zh" character varying(100),
    "nation_name_ja" character varying(100),
    "phone_code" character varying(10),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."nations" enable row level security;


  create table "public"."order_status_history" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "prev_status" text,
    "next_status" text not null,
    "changed_by" uuid,
    "reason" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."order_status_history" enable row level security;


  create table "public"."order_status_master" (
    "status_code" character varying(20) not null,
    "status_name_ko" character varying(100) not null,
    "status_name_en" character varying(100),
    "status_name_zh" character varying(100),
    "status_name_ja" character varying(100),
    "description" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."order_status_master" enable row level security;


  create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "parent_id" uuid,
    "org_code" character varying(20),
    "org_name_ko" character varying(200) not null,
    "org_name_en" character varying(200),
    "org_name_zh" character varying(200),
    "org_name_ja" character varying(200),
    "org_type" character varying(20) not null,
    "registration_no" character varying(50),
    "address" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "corporate_id" text,
    "biz_no" text,
    "rep_name" text,
    "approval_date" timestamp with time zone,
    "rejection_reason" text,
    "approval_comment" text,
    "status" text default 'PENDING'::text,
    "type" text default 'SHIPPER'::text
      );



  create table "public"."ports" (
    "port_code" character(5) not null,
    "nation_code" character(2),
    "port_name_ko" character varying(200) not null,
    "port_name_en" character varying(200),
    "port_name_zh" character varying(200),
    "port_name_ja" character varying(200),
    "port_type" character varying(10) not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."ports" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "org_id" uuid,
    "email" character varying(255),
    "full_name" character varying(100),
    "role" character varying(20) default 'USER'::character varying,
    "grade_code" character varying(20) default 'FAMILY'::character varying,
    "is_approved" boolean default false,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "status" text default 'ACTIVE'::text,
    "preferred_language" text default 'ko'::text
      );



  create table "public"."rate_card_logs" (
    "id" uuid not null default gen_random_uuid(),
    "rate_card_id" uuid,
    "action" character varying(20),
    "old_data" jsonb,
    "new_data" jsonb,
    "change_reason" text,
    "created_by" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."rate_card_logs" enable row level security;


  create table "public"."rate_cards" (
    "id" uuid not null default gen_random_uuid(),
    "carrier_id" uuid not null,
    "origin_port" character(5) not null,
    "destination_port" character(5) not null,
    "service_type" character varying(20) not null,
    "base_rate" numeric(15,2) default 0.00,
    "currency" character varying(3) default 'USD'::character varying,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "version_no" integer default 1,
    "valid_from" timestamp with time zone default now(),
    "valid_to" timestamp with time zone default '9999-12-31 23:59:59+00'::timestamp with time zone,
    "status" character varying(20) default 'ACTIVE'::character varying,
    "priority" integer default 0,
    "customer_id" uuid,
    "parent_version_id" uuid,
    "base_date_rule" character varying(20) default 'RECEIPT_DATE'::character varying
      );


alter table "public"."rate_cards" enable row level security;


  create table "public"."rate_slabs" (
    "id" uuid not null default gen_random_uuid(),
    "rate_card_id" uuid not null,
    "weight_min" numeric(15,2) not null,
    "unit_price" numeric(15,2) not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."rate_slabs" enable row level security;


  create table "public"."standard_code_mapping" (
    "id" uuid not null default gen_random_uuid(),
    "category" character varying(50) not null,
    "external_org" character varying(50) not null,
    "external_code" character varying(50) not null,
    "internal_code" character varying(50) not null,
    "description" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."standard_code_mapping" enable row level security;


  create table "public"."system_config" (
    "config_key" character varying(100) not null,
    "config_value" text not null,
    "description" text,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."system_config" enable row level security;

alter table "public"."common_code_groups" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."common_code_groups" alter column "group_code" set data type character varying(50) using "group_code"::character varying(50);

alter table "public"."common_code_groups" alter column "group_name" set data type character varying(100) using "group_name"::character varying(100);

alter table "public"."common_code_groups" alter column "updated_at" set default CURRENT_TIMESTAMP;

alter table "public"."common_codes" drop column "metadata";

alter table "public"."common_codes" add column "code_name_ja" character varying(100);

alter table "public"."common_codes" add column "code_name_zh" character varying(100);

alter table "public"."common_codes" alter column "code_name_en" set data type character varying(100) using "code_name_en"::character varying(100);

alter table "public"."common_codes" alter column "code_name_ko" set data type character varying(100) using "code_name_ko"::character varying(100);

alter table "public"."common_codes" alter column "code_value" set data type character varying(50) using "code_value"::character varying(50);

alter table "public"."common_codes" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."common_codes" alter column "group_code" set data type character varying(50) using "group_code"::character varying(50);

alter table "public"."common_codes" alter column "updated_at" set default CURRENT_TIMESTAMP;

alter table "public"."organization_documents" disable row level security;



alter table "public"."zen_inventory" drop column "available_qty";

alter table "public"."zen_inventory" alter column "min_stock_level" set default 5;


alter table "public"."zen_inventory" alter column "min_stock_level" set data type integer using "min_stock_level"::integer;

alter table "public"."zen_inventory" alter column "on_hand_qty" set data type integer using "on_hand_qty"::integer;

alter table "public"."zen_inventory" alter column "reserved_qty" set data type integer using "reserved_qty"::integer;

alter table "public"."zen_inventory" add column "available_qty" integer generated always as (on_hand_qty - reserved_qty) stored;

alter table "public"."zen_inventory_history" alter column "change_qty" set data type integer using "change_qty"::integer;


alter table "public"."zen_inventory_history" alter column "reference_id" set data type uuid using "reference_id"::uuid;

alter table "public"."zen_inventory_history" alter column "result_qty" set data type integer using "result_qty"::integer;

alter table "public"."zen_orders" drop column "actual_cost";

alter table "public"."zen_orders" drop column "contract_id";

alter table "public"."zen_orders" drop column "estimated_cost";

alter table "public"."zen_orders" drop column "schedule_id";

alter table "public"."zen_orders" add column "carrier_id" uuid;

alter table "public"."zen_orders" add column "confirmed_at" timestamp with time zone;

alter table "public"."zen_orders" add column "dest_port_id" uuid;

alter table "public"."zen_orders" add column "order_date" timestamp with time zone default now();

alter table "public"."zen_orders" add column "origin_port_id" uuid;

alter table "public"."zen_orders" add column "received_at" timestamp with time zone;

alter table "public"."zen_organizations" drop column "approval_comment";

alter table "public"."zen_organizations" drop column "approval_date";

alter table "public"."zen_organizations" drop column "biz_no";

alter table "public"."zen_organizations" drop column "corporate_id";

alter table "public"."zen_organizations" drop column "rejection_reason";

alter table "public"."zen_organizations" drop column "rep_name";

alter table "public"."zen_organizations" add column "parent_id" uuid;

alter table "public"."zen_ports" alter column "country_code" set not null;

alter table "public"."zen_profiles" drop column "preferred_language";

alter table "public"."zen_rate_cards" drop column "contract_id";

alter table "public"."zen_rate_cards" drop column "destination_id";

alter table "public"."zen_rate_cards" drop column "origin_id";

alter table "public"."zen_rate_cards" drop column "rate_price";

alter table "public"."zen_rate_cards" drop column "weight_tier_min";

alter table "public"."zen_rate_cards" add column "unit_price" numeric not null;

alter table "public"."zen_rate_cards" alter column "dest_code" set not null;

alter table "public"."zen_rate_cards" alter column "origin_code" set not null;

CREATE UNIQUE INDEX grade_master_pkey ON public.grade_master USING btree (grade_code);

CREATE UNIQUE INDEX grade_promotion_request_pkey ON public.grade_promotion_request USING btree (id);

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);

CREATE UNIQUE INDEX nations_iso_alpha3_key ON public.nations USING btree (iso_alpha3);

CREATE UNIQUE INDEX nations_pkey ON public.nations USING btree (iso_alpha2);

CREATE UNIQUE INDEX order_status_history_pkey ON public.order_status_history USING btree (id);

CREATE UNIQUE INDEX order_status_master_pkey ON public.order_status_master USING btree (status_code);

CREATE UNIQUE INDEX organizations_biz_no_key ON public.organizations USING btree (biz_no);

CREATE UNIQUE INDEX organizations_corporate_id_key ON public.organizations USING btree (corporate_id);

CREATE UNIQUE INDEX organizations_org_code_key ON public.organizations USING btree (org_code);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX ports_pkey ON public.ports USING btree (port_code);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX rate_card_logs_pkey ON public.rate_card_logs USING btree (id);

select 1; 
-- CREATE INDEX rate_cards_no_overlap ON public.rate_cards USING gist (carrier_id, origin_port, destination_port, service_type, COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid), tstzrange(valid_from, valid_to)) WHERE ((status)::text = 'ACTIVE'::text);

select 1; 
-- CREATE INDEX rate_cards_overlap_exclude ON public.rate_cards USING gist (carrier_id, origin_port, destination_port, service_type, COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid), tstzrange(valid_from, valid_to));

CREATE UNIQUE INDEX rate_cards_pkey ON public.rate_cards USING btree (id);

CREATE UNIQUE INDEX rate_slabs_pkey ON public.rate_slabs USING btree (id);

CREATE UNIQUE INDEX standard_code_mapping_category_external_org_external_code_key ON public.standard_code_mapping USING btree (category, external_org, external_code);

CREATE UNIQUE INDEX standard_code_mapping_pkey ON public.standard_code_mapping USING btree (id);

CREATE UNIQUE INDEX system_config_pkey ON public.system_config USING btree (config_key);

alter table "public"."grade_master" add constraint "grade_master_pkey" PRIMARY KEY using index "grade_master_pkey";

alter table "public"."grade_promotion_request" add constraint "grade_promotion_request_pkey" PRIMARY KEY using index "grade_promotion_request_pkey";

alter table "public"."nations" add constraint "nations_pkey" PRIMARY KEY using index "nations_pkey";

alter table "public"."order_status_history" add constraint "order_status_history_pkey" PRIMARY KEY using index "order_status_history_pkey";

alter table "public"."order_status_master" add constraint "order_status_master_pkey" PRIMARY KEY using index "order_status_master_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."ports" add constraint "ports_pkey" PRIMARY KEY using index "ports_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."rate_card_logs" add constraint "rate_card_logs_pkey" PRIMARY KEY using index "rate_card_logs_pkey";

alter table "public"."rate_cards" add constraint "rate_cards_pkey" PRIMARY KEY using index "rate_cards_pkey";

alter table "public"."rate_slabs" add constraint "rate_slabs_pkey" PRIMARY KEY using index "rate_slabs_pkey";

alter table "public"."standard_code_mapping" add constraint "standard_code_mapping_pkey" PRIMARY KEY using index "standard_code_mapping_pkey";

alter table "public"."system_config" add constraint "system_config_pkey" PRIMARY KEY using index "system_config_pkey";

alter table "public"."grade_promotion_request" add constraint "grade_promotion_request_current_grade_fkey" FOREIGN KEY (current_grade) REFERENCES public.grade_master(grade_code) not valid;

alter table "public"."grade_promotion_request" validate constraint "grade_promotion_request_current_grade_fkey";

alter table "public"."grade_promotion_request" add constraint "grade_promotion_request_target_grade_fkey" FOREIGN KEY (target_grade) REFERENCES public.grade_master(grade_code) not valid;

alter table "public"."grade_promotion_request" validate constraint "grade_promotion_request_target_grade_fkey";

alter table "public"."grade_promotion_request" add constraint "grade_promotion_request_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."grade_promotion_request" validate constraint "grade_promotion_request_user_id_fkey";

alter table "public"."nations" add constraint "nations_iso_alpha3_key" UNIQUE using index "nations_iso_alpha3_key";

alter table "public"."order_status_history" add constraint "order_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) not valid;

alter table "public"."order_status_history" validate constraint "order_status_history_changed_by_fkey";

alter table "public"."order_status_history" add constraint "order_status_history_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.zen_orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_status_history" validate constraint "order_status_history_order_id_fkey";

alter table "public"."organizations" add constraint "organizations_biz_no_key" UNIQUE using index "organizations_biz_no_key";

alter table "public"."organizations" add constraint "organizations_corporate_id_key" UNIQUE using index "organizations_corporate_id_key";

alter table "public"."organizations" add constraint "organizations_org_code_key" UNIQUE using index "organizations_org_code_key";

alter table "public"."organizations" add constraint "organizations_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."organizations" validate constraint "organizations_parent_id_fkey";

alter table "public"."ports" add constraint "ports_nation_code_fkey" FOREIGN KEY (nation_code) REFERENCES public.nations(iso_alpha2) not valid;

alter table "public"."ports" validate constraint "ports_nation_code_fkey";

alter table "public"."profiles" add constraint "profiles_grade_code_fkey" FOREIGN KEY (grade_code) REFERENCES public.grade_master(grade_code) not valid;

alter table "public"."profiles" validate constraint "profiles_grade_code_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_org_id_fkey";

alter table "public"."rate_card_logs" add constraint "rate_card_logs_rate_card_id_fkey" FOREIGN KEY (rate_card_id) REFERENCES public.rate_cards(id) not valid;

alter table "public"."rate_card_logs" validate constraint "rate_card_logs_rate_card_id_fkey";

alter table "public"."rate_cards" add constraint "rate_cards_carrier_id_fkey" FOREIGN KEY (carrier_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."rate_cards" validate constraint "rate_cards_carrier_id_fkey";

alter table "public"."rate_cards" add constraint "rate_cards_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.organizations(id) not valid;

alter table "public"."rate_cards" validate constraint "rate_cards_customer_id_fkey";

alter table "public"."rate_cards" add constraint "rate_cards_destination_port_fkey" FOREIGN KEY (destination_port) REFERENCES public.ports(port_code) not valid;

alter table "public"."rate_cards" validate constraint "rate_cards_destination_port_fkey";

alter table "public"."rate_cards" add constraint "rate_cards_no_overlap" EXCLUDE USING gist (carrier_id WITH =, origin_port WITH =, destination_port WITH =, service_type WITH =, COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =, tstzrange(valid_from, valid_to) WITH &&) WHERE (((status)::text = 'ACTIVE'::text));

alter table "public"."rate_cards" add constraint "rate_cards_origin_port_fkey" FOREIGN KEY (origin_port) REFERENCES public.ports(port_code) not valid;

alter table "public"."rate_cards" validate constraint "rate_cards_origin_port_fkey";

alter table "public"."rate_cards" add constraint "rate_cards_overlap_exclude" EXCLUDE USING gist (carrier_id WITH =, origin_port WITH =, destination_port WITH =, service_type WITH =, COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =, tstzrange(valid_from, valid_to) WITH &&);

alter table "public"."rate_cards" add constraint "rate_cards_parent_version_id_fkey" FOREIGN KEY (parent_version_id) REFERENCES public.rate_cards(id) not valid;

alter table "public"."rate_cards" validate constraint "rate_cards_parent_version_id_fkey";

alter table "public"."rate_slabs" add constraint "rate_slabs_rate_card_id_fkey" FOREIGN KEY (rate_card_id) REFERENCES public.rate_cards(id) ON DELETE CASCADE not valid;

alter table "public"."rate_slabs" validate constraint "rate_slabs_rate_card_id_fkey";

alter table "public"."standard_code_mapping" add constraint "standard_code_mapping_category_external_org_external_code_key" UNIQUE using index "standard_code_mapping_category_external_org_external_code_key";

alter table "public"."zen_inventory_history" add constraint "zen_inventory_history_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['INBOUND'::text, 'OUTBOUND'::text, 'ADJUSTMENT'::text, 'RESERVATION'::text, 'RESERVATION_CANCEL'::text]))) not valid;

alter table "public"."zen_inventory_history" validate constraint "zen_inventory_history_transaction_type_check";

alter table "public"."zen_orders" add constraint "zen_orders_carrier_id_fkey" FOREIGN KEY (carrier_id) REFERENCES public.zen_organizations(id) not valid;

alter table "public"."zen_orders" validate constraint "zen_orders_carrier_id_fkey";

alter table "public"."zen_orders" add constraint "zen_orders_dest_port_id_fkey" FOREIGN KEY (dest_port_id) REFERENCES public.zen_ports(id) not valid;

alter table "public"."zen_orders" validate constraint "zen_orders_dest_port_id_fkey";

alter table "public"."zen_orders" add constraint "zen_orders_origin_port_id_fkey" FOREIGN KEY (origin_port_id) REFERENCES public.zen_ports(id) not valid;

alter table "public"."zen_orders" validate constraint "zen_orders_origin_port_id_fkey";

alter table "public"."zen_orders" add constraint "zen_orders_transport_mode_check" CHECK ((transport_mode = ANY (ARRAY['AIR'::text, 'SEA'::text, 'EXP'::text, 'LAND'::text]))) not valid;

alter table "public"."zen_orders" validate constraint "zen_orders_transport_mode_check";

alter table "public"."zen_organizations" add constraint "zen_organizations_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.zen_organizations(id) ON DELETE SET NULL not valid;

alter table "public"."zen_organizations" validate constraint "zen_organizations_parent_id_fkey";

alter table "public"."zen_rate_cards" add constraint "zen_rate_cards_dest_code_fkey" FOREIGN KEY (dest_code) REFERENCES public.zen_ports(code) not valid;

alter table "public"."zen_rate_cards" validate constraint "zen_rate_cards_dest_code_fkey";

alter table "public"."zen_rate_cards" add constraint "zen_rate_cards_origin_code_fkey" FOREIGN KEY (origin_code) REFERENCES public.zen_ports(code) not valid;

alter table "public"."zen_rate_cards" validate constraint "zen_rate_cards_origin_code_fkey";

alter table "public"."organization_documents" add constraint "organization_documents_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_documents" validate constraint "organization_documents_org_id_fkey";

alter table "public"."zen_faq" add constraint "zen_faq_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_faq" validate constraint "zen_faq_created_by_fkey";

alter table "public"."zen_feature_flags" add constraint "zen_feature_flags_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_feature_flags" validate constraint "zen_feature_flags_updated_by_fkey";

alter table "public"."zen_notices" add constraint "zen_notices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_notices" validate constraint "zen_notices_created_by_fkey";

alter table "public"."zen_notifications" add constraint "zen_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."zen_notifications" validate constraint "zen_notifications_user_id_fkey";

alter table "public"."zen_order_rate_snapshots" add constraint "zen_order_rate_snapshots_rate_card_id_fkey" FOREIGN KEY (rate_card_id) REFERENCES public.rate_cards(id) ON DELETE SET NULL not valid;

alter table "public"."zen_order_rate_snapshots" validate constraint "zen_order_rate_snapshots_rate_card_id_fkey";

alter table "public"."zen_param_audit_log" add constraint "zen_param_audit_log_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_param_audit_log" validate constraint "zen_param_audit_log_changed_by_fkey";

alter table "public"."zen_qna" add constraint "zen_qna_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_qna" validate constraint "zen_qna_created_by_fkey";

alter table "public"."zen_qna_answers" add constraint "zen_qna_answers_answered_by_fkey" FOREIGN KEY (answered_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_qna_answers" validate constraint "zen_qna_answers_answered_by_fkey";

alter table "public"."zen_rate_cards" add constraint "zen_rate_cards_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.organizations(id) not valid;

alter table "public"."zen_rate_cards" validate constraint "zen_rate_cards_customer_id_fkey";

alter table "public"."zen_rate_cards" add constraint "zen_rate_cards_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.zen_organizations(id) ON DELETE CASCADE not valid;

alter table "public"."zen_rate_cards" validate constraint "zen_rate_cards_org_id_fkey";

alter table "public"."zen_system_params" add constraint "zen_system_params_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_system_params" validate constraint "zen_system_params_updated_by_fkey";

alter table "public"."zen_voc" add constraint "zen_voc_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_voc" validate constraint "zen_voc_created_by_fkey";

alter table "public"."zen_voc_answers" add constraint "zen_voc_answers_answered_by_fkey" FOREIGN KEY (answered_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_voc_answers" validate constraint "zen_voc_answers_answered_by_fkey";

alter table "public"."zen_wallet_transactions" add constraint "zen_wallet_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."zen_wallet_transactions" validate constraint "zen_wallet_transactions_created_by_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fn_trigger_capture_order_rate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

grant delete on table "public"."grade_master" to "anon";

grant insert on table "public"."grade_master" to "anon";

grant references on table "public"."grade_master" to "anon";

grant select on table "public"."grade_master" to "anon";

grant trigger on table "public"."grade_master" to "anon";

grant truncate on table "public"."grade_master" to "anon";

grant update on table "public"."grade_master" to "anon";

grant delete on table "public"."grade_master" to "authenticated";

grant insert on table "public"."grade_master" to "authenticated";

grant references on table "public"."grade_master" to "authenticated";

grant select on table "public"."grade_master" to "authenticated";

grant trigger on table "public"."grade_master" to "authenticated";

grant truncate on table "public"."grade_master" to "authenticated";

grant update on table "public"."grade_master" to "authenticated";

grant delete on table "public"."grade_master" to "service_role";

grant insert on table "public"."grade_master" to "service_role";

grant references on table "public"."grade_master" to "service_role";

grant select on table "public"."grade_master" to "service_role";

grant trigger on table "public"."grade_master" to "service_role";

grant truncate on table "public"."grade_master" to "service_role";

grant update on table "public"."grade_master" to "service_role";

grant delete on table "public"."grade_promotion_request" to "anon";

grant insert on table "public"."grade_promotion_request" to "anon";

grant references on table "public"."grade_promotion_request" to "anon";

grant select on table "public"."grade_promotion_request" to "anon";

grant trigger on table "public"."grade_promotion_request" to "anon";

grant truncate on table "public"."grade_promotion_request" to "anon";

grant update on table "public"."grade_promotion_request" to "anon";

grant delete on table "public"."grade_promotion_request" to "authenticated";

grant insert on table "public"."grade_promotion_request" to "authenticated";

grant references on table "public"."grade_promotion_request" to "authenticated";

grant select on table "public"."grade_promotion_request" to "authenticated";

grant trigger on table "public"."grade_promotion_request" to "authenticated";

grant truncate on table "public"."grade_promotion_request" to "authenticated";

grant update on table "public"."grade_promotion_request" to "authenticated";

grant delete on table "public"."grade_promotion_request" to "service_role";

grant insert on table "public"."grade_promotion_request" to "service_role";

grant references on table "public"."grade_promotion_request" to "service_role";

grant select on table "public"."grade_promotion_request" to "service_role";

grant trigger on table "public"."grade_promotion_request" to "service_role";

grant truncate on table "public"."grade_promotion_request" to "service_role";

grant update on table "public"."grade_promotion_request" to "service_role";

grant delete on table "public"."nations" to "anon";

grant insert on table "public"."nations" to "anon";

grant references on table "public"."nations" to "anon";

grant select on table "public"."nations" to "anon";

grant trigger on table "public"."nations" to "anon";

grant truncate on table "public"."nations" to "anon";

grant update on table "public"."nations" to "anon";

grant delete on table "public"."nations" to "authenticated";

grant insert on table "public"."nations" to "authenticated";

grant references on table "public"."nations" to "authenticated";

grant select on table "public"."nations" to "authenticated";

grant trigger on table "public"."nations" to "authenticated";

grant truncate on table "public"."nations" to "authenticated";

grant update on table "public"."nations" to "authenticated";

grant delete on table "public"."nations" to "service_role";

grant insert on table "public"."nations" to "service_role";

grant references on table "public"."nations" to "service_role";

grant select on table "public"."nations" to "service_role";

grant trigger on table "public"."nations" to "service_role";

grant truncate on table "public"."nations" to "service_role";

grant update on table "public"."nations" to "service_role";

grant delete on table "public"."order_status_history" to "anon";

grant insert on table "public"."order_status_history" to "anon";

grant references on table "public"."order_status_history" to "anon";

grant select on table "public"."order_status_history" to "anon";

grant trigger on table "public"."order_status_history" to "anon";

grant truncate on table "public"."order_status_history" to "anon";

grant update on table "public"."order_status_history" to "anon";

grant delete on table "public"."order_status_history" to "authenticated";

grant insert on table "public"."order_status_history" to "authenticated";

grant references on table "public"."order_status_history" to "authenticated";

grant select on table "public"."order_status_history" to "authenticated";

grant trigger on table "public"."order_status_history" to "authenticated";

grant truncate on table "public"."order_status_history" to "authenticated";

grant update on table "public"."order_status_history" to "authenticated";

grant delete on table "public"."order_status_history" to "service_role";

grant insert on table "public"."order_status_history" to "service_role";

grant references on table "public"."order_status_history" to "service_role";

grant select on table "public"."order_status_history" to "service_role";

grant trigger on table "public"."order_status_history" to "service_role";

grant truncate on table "public"."order_status_history" to "service_role";

grant update on table "public"."order_status_history" to "service_role";

grant delete on table "public"."order_status_master" to "anon";

grant insert on table "public"."order_status_master" to "anon";

grant references on table "public"."order_status_master" to "anon";

grant select on table "public"."order_status_master" to "anon";

grant trigger on table "public"."order_status_master" to "anon";

grant truncate on table "public"."order_status_master" to "anon";

grant update on table "public"."order_status_master" to "anon";

grant delete on table "public"."order_status_master" to "authenticated";

grant insert on table "public"."order_status_master" to "authenticated";

grant references on table "public"."order_status_master" to "authenticated";

grant select on table "public"."order_status_master" to "authenticated";

grant trigger on table "public"."order_status_master" to "authenticated";

grant truncate on table "public"."order_status_master" to "authenticated";

grant update on table "public"."order_status_master" to "authenticated";

grant delete on table "public"."order_status_master" to "service_role";

grant insert on table "public"."order_status_master" to "service_role";

grant references on table "public"."order_status_master" to "service_role";

grant select on table "public"."order_status_master" to "service_role";

grant trigger on table "public"."order_status_master" to "service_role";

grant truncate on table "public"."order_status_master" to "service_role";

grant update on table "public"."order_status_master" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."ports" to "anon";

grant insert on table "public"."ports" to "anon";

grant references on table "public"."ports" to "anon";

grant select on table "public"."ports" to "anon";

grant trigger on table "public"."ports" to "anon";

grant truncate on table "public"."ports" to "anon";

grant update on table "public"."ports" to "anon";

grant delete on table "public"."ports" to "authenticated";

grant insert on table "public"."ports" to "authenticated";

grant references on table "public"."ports" to "authenticated";

grant select on table "public"."ports" to "authenticated";

grant trigger on table "public"."ports" to "authenticated";

grant truncate on table "public"."ports" to "authenticated";

grant update on table "public"."ports" to "authenticated";

grant delete on table "public"."ports" to "service_role";

grant insert on table "public"."ports" to "service_role";

grant references on table "public"."ports" to "service_role";

grant select on table "public"."ports" to "service_role";

grant trigger on table "public"."ports" to "service_role";

grant truncate on table "public"."ports" to "service_role";

grant update on table "public"."ports" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."rate_card_logs" to "anon";

grant insert on table "public"."rate_card_logs" to "anon";

grant references on table "public"."rate_card_logs" to "anon";

grant select on table "public"."rate_card_logs" to "anon";

grant trigger on table "public"."rate_card_logs" to "anon";

grant truncate on table "public"."rate_card_logs" to "anon";

grant update on table "public"."rate_card_logs" to "anon";

grant delete on table "public"."rate_card_logs" to "authenticated";

grant insert on table "public"."rate_card_logs" to "authenticated";

grant references on table "public"."rate_card_logs" to "authenticated";

grant select on table "public"."rate_card_logs" to "authenticated";

grant trigger on table "public"."rate_card_logs" to "authenticated";

grant truncate on table "public"."rate_card_logs" to "authenticated";

grant update on table "public"."rate_card_logs" to "authenticated";

grant delete on table "public"."rate_card_logs" to "service_role";

grant insert on table "public"."rate_card_logs" to "service_role";

grant references on table "public"."rate_card_logs" to "service_role";

grant select on table "public"."rate_card_logs" to "service_role";

grant trigger on table "public"."rate_card_logs" to "service_role";

grant truncate on table "public"."rate_card_logs" to "service_role";

grant update on table "public"."rate_card_logs" to "service_role";

grant delete on table "public"."rate_cards" to "anon";

grant insert on table "public"."rate_cards" to "anon";

grant references on table "public"."rate_cards" to "anon";

grant select on table "public"."rate_cards" to "anon";

grant trigger on table "public"."rate_cards" to "anon";

grant truncate on table "public"."rate_cards" to "anon";

grant update on table "public"."rate_cards" to "anon";

grant delete on table "public"."rate_cards" to "authenticated";

grant insert on table "public"."rate_cards" to "authenticated";

grant references on table "public"."rate_cards" to "authenticated";

grant select on table "public"."rate_cards" to "authenticated";

grant trigger on table "public"."rate_cards" to "authenticated";

grant truncate on table "public"."rate_cards" to "authenticated";

grant update on table "public"."rate_cards" to "authenticated";

grant delete on table "public"."rate_cards" to "service_role";

grant insert on table "public"."rate_cards" to "service_role";

grant references on table "public"."rate_cards" to "service_role";

grant select on table "public"."rate_cards" to "service_role";

grant trigger on table "public"."rate_cards" to "service_role";

grant truncate on table "public"."rate_cards" to "service_role";

grant update on table "public"."rate_cards" to "service_role";

grant delete on table "public"."rate_slabs" to "anon";

grant insert on table "public"."rate_slabs" to "anon";

grant references on table "public"."rate_slabs" to "anon";

grant select on table "public"."rate_slabs" to "anon";

grant trigger on table "public"."rate_slabs" to "anon";

grant truncate on table "public"."rate_slabs" to "anon";

grant update on table "public"."rate_slabs" to "anon";

grant delete on table "public"."rate_slabs" to "authenticated";

grant insert on table "public"."rate_slabs" to "authenticated";

grant references on table "public"."rate_slabs" to "authenticated";

grant select on table "public"."rate_slabs" to "authenticated";

grant trigger on table "public"."rate_slabs" to "authenticated";

grant truncate on table "public"."rate_slabs" to "authenticated";

grant update on table "public"."rate_slabs" to "authenticated";

grant delete on table "public"."rate_slabs" to "service_role";

grant insert on table "public"."rate_slabs" to "service_role";

grant references on table "public"."rate_slabs" to "service_role";

grant select on table "public"."rate_slabs" to "service_role";

grant trigger on table "public"."rate_slabs" to "service_role";

grant truncate on table "public"."rate_slabs" to "service_role";

grant update on table "public"."rate_slabs" to "service_role";

grant delete on table "public"."standard_code_mapping" to "anon";

grant insert on table "public"."standard_code_mapping" to "anon";

grant references on table "public"."standard_code_mapping" to "anon";

grant select on table "public"."standard_code_mapping" to "anon";

grant trigger on table "public"."standard_code_mapping" to "anon";

grant truncate on table "public"."standard_code_mapping" to "anon";

grant update on table "public"."standard_code_mapping" to "anon";

grant delete on table "public"."standard_code_mapping" to "authenticated";

grant insert on table "public"."standard_code_mapping" to "authenticated";

grant references on table "public"."standard_code_mapping" to "authenticated";

grant select on table "public"."standard_code_mapping" to "authenticated";

grant trigger on table "public"."standard_code_mapping" to "authenticated";

grant truncate on table "public"."standard_code_mapping" to "authenticated";

grant update on table "public"."standard_code_mapping" to "authenticated";

grant delete on table "public"."standard_code_mapping" to "service_role";

grant insert on table "public"."standard_code_mapping" to "service_role";

grant references on table "public"."standard_code_mapping" to "service_role";

grant select on table "public"."standard_code_mapping" to "service_role";

grant trigger on table "public"."standard_code_mapping" to "service_role";

grant truncate on table "public"."standard_code_mapping" to "service_role";

grant update on table "public"."standard_code_mapping" to "service_role";

grant delete on table "public"."system_config" to "anon";

grant insert on table "public"."system_config" to "anon";

grant references on table "public"."system_config" to "anon";

grant select on table "public"."system_config" to "anon";

grant trigger on table "public"."system_config" to "anon";

grant truncate on table "public"."system_config" to "anon";

grant update on table "public"."system_config" to "anon";

grant delete on table "public"."system_config" to "authenticated";

grant insert on table "public"."system_config" to "authenticated";

grant references on table "public"."system_config" to "authenticated";

grant select on table "public"."system_config" to "authenticated";

grant trigger on table "public"."system_config" to "authenticated";

grant truncate on table "public"."system_config" to "authenticated";

grant update on table "public"."system_config" to "authenticated";

grant delete on table "public"."system_config" to "service_role";

grant insert on table "public"."system_config" to "service_role";

grant references on table "public"."system_config" to "service_role";

grant select on table "public"."system_config" to "service_role";

grant trigger on table "public"."system_config" to "service_role";

grant truncate on table "public"."system_config" to "service_role";

grant update on table "public"."system_config" to "service_role";


  create policy "Allow authenticated insert for history"
  on "public"."order_status_history"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated read for history"
  on "public"."order_status_history"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Admins can insert inventory"
  on "public"."zen_inventory"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT profiles.org_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'MEMBER'::character varying])::text[]))))));



  create policy "Allow authenticated full access to master orders"
  on "public"."zen_master_orders"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Users can view items of accessible orders"
  on "public"."zen_order_items"
  as permissive
  for select
  to public
using (true);



  create policy "Users can manage order routes for their org's orders"
  on "public"."zen_order_routes"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_orders o
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((o.id = zen_order_routes.order_id) AND ((p.org_id = o.shipper_id) OR ((p.role)::text = 'ADMIN'::text))))));



  create policy "Users can view order routes for their org's orders"
  on "public"."zen_order_routes"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_orders o
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((o.id = zen_order_routes.order_id) AND ((p.org_id = o.shipper_id) OR ((p.role)::text = 'ADMIN'::text))))));



  create policy "Enable insert for authenticated users"
  on "public"."zen_orders"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Enable read access for all authenticated users"
  on "public"."zen_orders"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users can manage route options for their org's orders"
  on "public"."zen_route_options"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_orders o
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((o.id = zen_route_options.order_id) AND ((p.org_id = o.shipper_id) OR ((p.role)::text = 'ADMIN'::text))))));



  create policy "Users can view route options for their org's orders"
  on "public"."zen_route_options"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_orders o
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((o.id = zen_route_options.order_id) AND ((p.org_id = o.shipper_id) OR ((p.role)::text = 'ADMIN'::text))))));



  create policy "Users can view tracking of their own orders"
  on "public"."zen_tracking_configs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_orders o
  WHERE ((o.id = zen_tracking_configs.order_id) AND ((o.shipper_id = auth.uid()) OR (o.shipper_id IN ( SELECT profiles.org_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));



  create policy "Users can create VOCs for own organization orders"
  on "public"."zen_voc"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT profiles.org_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Admins can manage all documents"
  on "public"."organization_documents"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'ADMIN'::text)))));



  create policy "Members can view their own org documents"
  on "public"."organization_documents"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.org_id = organization_documents.org_id)))));



  create policy "Admins can manage FAQs"
  on "public"."zen_faq"
  as permissive
  for all
  to public
using (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text))
with check (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text));



  create policy "Users can view active FAQs"
  on "public"."zen_faq"
  as permissive
  for select
  to public
using (((is_active = true) OR ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text)));



  create policy "Admins can delete zen_feature_flags"
  on "public"."zen_feature_flags"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can insert zen_feature_flags"
  on "public"."zen_feature_flags"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can select zen_feature_flags"
  on "public"."zen_feature_flags"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can update zen_feature_flags"
  on "public"."zen_feature_flags"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Users can read own org feature flags"
  on "public"."zen_feature_flags"
  as permissive
  for select
  to public
using (((org_id IS NULL) OR (org_id = ( SELECT profiles.org_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



  create policy "Admins can update inventory"
  on "public"."zen_inventory"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MEMBER'::character varying, 'MANAGER'::character varying])::text[]))))));



  create policy "Users can view inventory of their own organization"
  on "public"."zen_inventory"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.org_id = zen_inventory.org_id) OR ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[])))))));



  create policy "Allow inventory history inserts"
  on "public"."zen_inventory_history"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MANAGER'::character varying, 'MEMBER'::character varying, 'PARTNER'::character varying])::text[]))))));



  create policy "Users can view inventory history of their own organization"
  on "public"."zen_inventory_history"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.org_id = zen_inventory_history.org_id) OR ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[])))))));



  create policy "Admins and Managers can create invoice PDF history"
  on "public"."zen_invoice_pdf_history"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MANAGER'::character varying])::text[]))))));



  create policy "Users can view their organization's invoice PDF history"
  on "public"."zen_invoice_pdf_history"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_invoices i
     JOIN public.profiles p ON ((p.org_id = i.shipper_id)))
  WHERE ((i.id = zen_invoice_pdf_history.invoice_id) AND ((p.id = auth.uid()) OR ((p.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[])))))));



  create policy "Admins can insert zen_invoices"
  on "public"."zen_invoices"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can update zen_invoices"
  on "public"."zen_invoices"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Shippers can view their own zen_invoices"
  on "public"."zen_invoices"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.org_id = zen_invoices.shipper_id) OR ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[])))))));



  create policy "Admins can manage notices"
  on "public"."zen_notices"
  as permissive
  for all
  to public
using (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text))
with check (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text));



  create policy "Users can view published notices"
  on "public"."zen_notices"
  as permissive
  for select
  to public
using (((is_published = true) OR ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text)));



  create policy "ZENITH_SUPER_ADMIN can view all notifications"
  on "public"."zen_notifications"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'ZENITH_SUPER_ADMIN'::text)))));



  create policy "Shippers can view their order costs"
  on "public"."zen_order_costs"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM (public.zen_orders
     JOIN public.profiles ON ((profiles.org_id = zen_orders.shipper_id)))
  WHERE ((zen_orders.id = zen_order_costs.order_id) AND ((profiles.id = auth.uid()) OR ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[])))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[])))))));



  create policy "Admins can select zen_param_audit_log"
  on "public"."zen_param_audit_log"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can update QnA status"
  on "public"."zen_qna"
  as permissive
  for update
  to public
using (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text))
with check (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text));



  create policy "Users can create QnAs for own organization"
  on "public"."zen_qna"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT profiles.org_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Users can view own organization's QnAs"
  on "public"."zen_qna"
  as permissive
  for select
  to public
using (((org_id IN ( SELECT profiles.org_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text)));



  create policy "Admins can insert answers"
  on "public"."zen_qna_answers"
  as permissive
  for insert
  to public
with check (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text));



  create policy "Users can view answers for accessible QnAs"
  on "public"."zen_qna_answers"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.zen_qna q
  WHERE (q.id = zen_qna_answers.qna_id))) OR ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = 'ADMIN'::text)));



  create policy "Admins can select zen_system_params"
  on "public"."zen_system_params"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can update zen_system_params"
  on "public"."zen_system_params"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can issue and update tax invoices"
  on "public"."zen_tax_invoices"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'ADMIN'::text)))));



  create policy "Shippers can view their own tax invoices"
  on "public"."zen_tax_invoices"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_invoices
     JOIN public.profiles ON ((profiles.id = auth.uid())))
  WHERE ((zen_invoices.id = zen_tax_invoices.invoice_id) AND ((profiles.org_id = zen_invoices.shipper_id) OR ((profiles.role)::text = 'ADMIN'::text))))));



  create policy "Admins have full access to tracking configs"
  on "public"."zen_tracking_configs"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MANAGER'::character varying])::text[]))))));



  create policy "Admins can manage tracking events"
  on "public"."zen_tracking_events"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MANAGER'::character varying])::text[]))))));



  create policy "Users can view relevant tracking events"
  on "public"."zen_tracking_events"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_orders o
  WHERE ((o.id = zen_tracking_events.order_id) AND ((o.shipper_id = auth.uid()) OR (o.shipper_id IN ( SELECT profiles.org_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));



  create policy "Admins have full access to tracking raw logs"
  on "public"."zen_tracking_raw_logs"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MANAGER'::character varying])::text[]))))));



  create policy "Admins can update VOC status"
  on "public"."zen_voc"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can view all VOCs"
  on "public"."zen_voc"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Users can view own organization's VOCs"
  on "public"."zen_voc"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT profiles.org_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Admins can manage VOC answers"
  on "public"."zen_voc_answers"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Users can view answers for own organization VOCs"
  on "public"."zen_voc_answers"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_voc v
     JOIN public.profiles p ON ((v.org_id = p.org_id)))
  WHERE ((v.id = zen_voc_answers.voc_id) AND (p.id = auth.uid())))));



  create policy "Admins can delete zen_wallet"
  on "public"."zen_wallet"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can insert zen_wallet"
  on "public"."zen_wallet"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can select zen_wallet"
  on "public"."zen_wallet"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can update zen_wallet"
  on "public"."zen_wallet"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Users can read own org wallet"
  on "public"."zen_wallet"
  as permissive
  for select
  to public
using ((org_id = ( SELECT profiles.org_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Admins can insert zen_wallet_transactions"
  on "public"."zen_wallet_transactions"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can select zen_wallet_transactions"
  on "public"."zen_wallet_transactions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Admins can update zen_wallet_transactions"
  on "public"."zen_wallet_transactions"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying])::text[]))))));



  create policy "Users can insert refund requests"
  on "public"."zen_wallet_transactions"
  as permissive
  for insert
  to public
with check (((type = 'REFUND_REQUEST'::text) AND (status = 'PENDING'::text) AND (wallet_id IN ( SELECT w.id
   FROM (public.zen_wallet w
     JOIN public.profiles p ON ((p.org_id = w.org_id)))
  WHERE (p.id = auth.uid())))));



  create policy "Users can read own wallet transactions"
  on "public"."zen_wallet_transactions"
  as permissive
  for select
  to public
using ((wallet_id IN ( SELECT w.id
   FROM (public.zen_wallet w
     JOIN public.profiles p ON ((p.org_id = w.org_id)))
  WHERE (p.id = auth.uid()))));


CREATE TRIGGER set_code_group_updated_at BEFORE UPDATE ON public.common_code_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_code_updated_at BEFORE UPDATE ON public.common_codes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_grade_updated_at BEFORE UPDATE ON public.grade_master FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_request_updated_at BEFORE UPDATE ON public.grade_promotion_request FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_nations_updated_at BEFORE UPDATE ON public.nations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_order_status_updated_at BEFORE UPDATE ON public.order_status_master FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_org_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_ports_updated_at BEFORE UPDATE ON public.ports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profile_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_rate_card_updated_at BEFORE UPDATE ON public.rate_cards FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_mapping_updated_at BEFORE UPDATE ON public.standard_code_mapping FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_zen_inventory_modtime BEFORE UPDATE ON public.zen_inventory FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();

CREATE TRIGGER tr_capture_order_rate_snapshot AFTER INSERT OR UPDATE OF status, confirmed_at, received_at, carrier_id, origin_port_id, dest_port_id, shipper_id ON public.zen_orders FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_capture_order_rate();

drop policy "Allow admin read access" on "storage"."objects";

drop policy "Allow admins and partners to upload invoices" on "storage"."objects";

drop policy "Allow users to view their org's invoices" on "storage"."objects";


  create policy "Allow admin read access"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'business_docs'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = 'ADMIN'::text))))));



  create policy "Allow admins and partners to upload invoices"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'invoices'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'PARTNER'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MANAGER'::character varying])::text[])))))));



  create policy "Allow users to view their org's invoices"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'invoices'::text) AND ((EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.zen_invoices i ON ((i.shipper_id = p.org_id)))
  WHERE ((p.id = auth.uid()) AND (objects.name ~~ (i.invoice_no || '/%'::text))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['ADMIN'::character varying, 'ZENITH_SUPER_ADMIN'::character varying, 'MANAGER'::character varying])::text[]))))))));




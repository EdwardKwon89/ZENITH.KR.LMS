drop policy "Admins can update promotion requests" on "public"."grade_promotion_request";

drop policy "Admins can view all promotion requests" on "public"."grade_promotion_request";

drop policy "Admins can view all zen_profiles" on "public"."zen_profiles";


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



  create policy "Admins can view all zen_profiles"
  on "public"."zen_profiles"
  as permissive
  for select
  to authenticated
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ADMIN'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ZENITH_SUPER_ADMIN'::text)));




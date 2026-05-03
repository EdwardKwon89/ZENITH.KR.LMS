drop policy "Enable update for authenticated users" on "public"."zen_orders";


  create policy "Enable update for authenticated users"
  on "public"."zen_orders"
  as permissive
  for update
  to authenticated
using ((auth.role() = 'authenticated'::text));




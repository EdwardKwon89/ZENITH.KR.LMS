drop policy "Admins can update VOC status" on "public"."zen_voc";

drop policy "Admins can view all VOCs" on "public"."zen_voc";

drop policy "Users can create VOCs for own organization orders" on "public"."zen_voc";

drop policy "Users can view own organization's VOCs" on "public"."zen_voc";

drop policy "Admins can manage VOC answers" on "public"."zen_voc_answers";

drop policy "Users can view answers for own organization VOCs" on "public"."zen_voc_answers";


  create policy "Admins can update VOC status"
  on "public"."zen_voc"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text]))))));



  create policy "Admins can view all VOCs"
  on "public"."zen_voc"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text]))))));



  create policy "Users can create VOCs for own organization orders"
  on "public"."zen_voc"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.org_id = zen_voc.org_id)))));



  create policy "Users can view own organization's VOCs"
  on "public"."zen_voc"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.org_id = zen_voc.org_id)))));



  create policy "Admins can manage VOC answers"
  on "public"."zen_voc_answers"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.zen_profiles
  WHERE ((zen_profiles.id = auth.uid()) AND (zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text]))))));



  create policy "Users can view answers for own organization VOCs"
  on "public"."zen_voc_answers"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.zen_voc v
     JOIN public.zen_profiles p ON ((v.org_id = p.org_id)))
  WHERE ((v.id = zen_voc_answers.voc_id) AND (p.id = auth.uid())))));




"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

export const createOrderServices = withAction(async function (orderId: string, services: any[]) {
  const { supabase, profile } = await validateUserAction();

  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select("shipper_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Order not found");

  const isAdmin = profile.role === USER_ROLES.ADMIN || profile.role === USER_ROLES.MANAGER;
  const isOwner = order.shipper_id === profile.org_id;

  if (!isAdmin && !isOwner) throw new Error("Unauthorized");

  // 요율 유효성 이중 검증 (DoD 요구사항)
  const today = new Date().toISOString().slice(0, 10);
  for (const s of services) {
    if (s.rate_card_id) {
      const { data: rateCard, error } = await supabase
        .from("zen_rate_cards")
        .select("id, is_active, valid_from, valid_until")
        .eq("id", s.rate_card_id)
        .single();
      if (error || !rateCard) throw new Error("Transportation rate card not found");
      if (!rateCard.is_active) throw new Error("Transportation rate card is inactive");
      if (rateCard.valid_from > today || (rateCard.valid_until && rateCard.valid_until < today)) {
        throw new Error("Transportation rate card has expired or is not yet valid");
      }
    }

    if (s.customs_rate_id) {
      const { data: customsRate, error } = await supabase
        .from("zen_customs_rates")
        .select("id, is_active, valid_from, valid_until")
        .eq("id", s.customs_rate_id)
        .single();
      if (error || !customsRate) throw new Error("Customs rate card not found");
      if (!customsRate.is_active) throw new Error("Customs rate card is inactive");
      if (customsRate.valid_from > today || (customsRate.valid_until && customsRate.valid_until < today)) {
        throw new Error("Customs rate card has expired or is not yet valid");
      }
    }

    if (s.delivery_rate_id) {
      const { data: deliveryRate, error } = await supabase
        .from("zen_delivery_rates")
        .select("id, is_active, valid_from, valid_until")
        .eq("id", s.delivery_rate_id)
        .single();
      if (error || !deliveryRate) throw new Error("Delivery rate card not found");
      if (!deliveryRate.is_active) throw new Error("Delivery rate card is inactive");
      if (deliveryRate.valid_from > today || (deliveryRate.valid_until && deliveryRate.valid_until < today)) {
        throw new Error("Delivery rate card has expired or is not yet valid");
      }
    }
  }

  const { data, error } = await supabase
    .from("zen_order_services")
    .insert(
      services.map((s: any) => ({
        order_id: orderId,
        service_type: s.service_type,
        provider_id: s.provider_id,
        rate_card_id: s.rate_card_id || null,
        customs_rate_id: s.customs_rate_id || null,
        delivery_rate_id: s.delivery_rate_id || null,
        quoted_cost: s.quoted_cost,
        currency: s.currency || 'USD',
        status: 'REQUESTED',
      }))
    )
    .select();

  if (error) throw new Error(error.message);

  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");

  return data;
});

export const getOrderServices = withAction(async function (orderId: string) {
  const { supabase, profile } = await validateUserAction();

  const isAdmin = profile.role === USER_ROLES.ADMIN || profile.role === USER_ROLES.MANAGER;

  if (isAdmin) {
    const { data, error } = await supabase
      .from("zen_order_services")
      .select("*")
      .eq("order_id", orderId);

    if (error) throw new Error(error.message);
    return data || [];
  }

  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select("shipper_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Order not found");

  if (order.shipper_id === profile.org_id) {
    const { data, error } = await supabase
      .from("zen_order_services")
      .select("*")
      .eq("order_id", orderId);

    if (error) throw new Error(error.message);
    return data || [];
  }

  const { data, error } = await supabase
    .from("zen_order_services")
    .select("*")
    .eq("order_id", orderId)
    .eq("provider_id", profile.org_id);

  if (error) throw new Error(error.message);
  return data || [];
});

export const updateOrderServiceStatus = withAction(async function (id: string, status: string) {
  const { supabase, profile } = await validateUserAction();

  const isAdmin = profile.role === USER_ROLES.ADMIN || profile.role === USER_ROLES.MANAGER;

  if (!isAdmin) {
    const { data: service, error: findError } = await supabase
      .from("zen_order_services")
      .select("provider_id, order_id")
      .eq("id", id)
      .single();

    if (findError || !service) throw new Error("Service not found");

    if (service.provider_id !== profile.org_id) {
      throw new Error("Unauthorized");
    }
  }

  const { data, error } = await supabase
    .from("zen_order_services")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
});

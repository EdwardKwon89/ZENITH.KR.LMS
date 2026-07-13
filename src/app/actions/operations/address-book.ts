"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { addressBookEntrySchema, AddressBookEntryInput } from "@/lib/validation/address-book";
import { revalidatePath } from "next/cache";

const ADDRESS_BOOK_SELECT = `
  id, display_name, recipient_name, recipient_address, recipient_address_local,
  recipient_address_detail, recipient_phone, country_code, display_mode, is_default, created_at, updated_at
`;

export async function getAddressBookEntries() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  let query = supabase
    .from("zen_address_book")
    .select(ADDRESS_BOOK_SELECT);

  if (profile.org_id) {
    query = query.eq("org_id", profile.org_id).is("user_id", null);
  } else {
    query = query.eq("user_id", profile.id).is("org_id", null);
  }

  const { data, error } = await query
    .order("is_default", { ascending: false })
    .order("display_name", { ascending: true });

  if (error) {
    logger.error("[ADDRESS_BOOK] getAddressBookEntries error:", error);
    throw new Error("Failed to fetch address book entries");
  }

  return { success: true, entries: data || [] };
}

export async function createAddressBookEntry(input: AddressBookEntryInput) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const parsed = addressBookEntrySchema.parse(input);
  const owner = profile.org_id
    ? { org_id: profile.org_id, user_id: null }
    : { user_id: profile.id, org_id: null };

  const { data, error } = await supabase
    .from("zen_address_book")
    .insert({
      ...parsed,
      ...owner,
    })
    .select(ADDRESS_BOOK_SELECT)
    .single();

  if (error) {
    logger.error("[ADDRESS_BOOK] createAddressBookEntry error:", error);
    throw new Error("Failed to create address book entry");
  }

  revalidatePath("/[locale]/address-book");
  return { success: true, entry: data };
}

export async function updateAddressBookEntry(id: string, input: AddressBookEntryInput) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const parsed = addressBookEntrySchema.parse(input);

  let query = supabase
    .from("zen_address_book")
    .update({
      ...parsed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (profile.org_id) {
    query = query.eq("org_id", profile.org_id).is("user_id", null);
  } else {
    query = query.eq("user_id", profile.id).is("org_id", null);
  }

  const { data, error } = await query
    .select(ADDRESS_BOOK_SELECT)
    .single();

  if (error) {
    logger.error("[ADDRESS_BOOK] updateAddressBookEntry error:", error);
    throw new Error("Failed to update address book entry");
  }

  revalidatePath("/[locale]/address-book");
  return { success: true, entry: data };
}

export async function deleteAddressBookEntry(id: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  let query = supabase
    .from("zen_address_book")
    .delete()
    .eq("id", id);

  if (profile.org_id) {
    query = query.eq("org_id", profile.org_id).is("user_id", null);
  } else {
    query = query.eq("user_id", profile.id).is("org_id", null);
  }

  const { error } = await query;

  if (error) {
    logger.error("[ADDRESS_BOOK] deleteAddressBookEntry error:", error);
    throw new Error("Failed to delete address book entry");
  }

  revalidatePath("/[locale]/address-book");
  return { success: true };
}

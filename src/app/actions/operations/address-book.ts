"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { addressBookEntrySchema, AddressBookEntryInput } from "@/lib/validation/address-book";
import { revalidatePath } from "next/cache";

const ADDRESS_BOOK_SELECT = `
  id, display_name, recipient_name, recipient_address, recipient_address_local,
  recipient_phone, country_code, display_mode, is_default, created_at, updated_at
`;

function buildOwnerFilter(profile: { id: string; org_id?: string | null }) {
  if (profile.org_id) {
    return { org_id: profile.org_id, user_id: null };
  }
  return { user_id: profile.id, org_id: null };
}

export async function getAddressBookEntries() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const filter = buildOwnerFilter(profile);
  const { data, error } = await supabase
    .from("zen_address_book")
    .select(ADDRESS_BOOK_SELECT)
    .match(filter)
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
  const owner = buildOwnerFilter(profile);

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
  const owner = buildOwnerFilter(profile);

  const { data, error } = await supabase
    .from("zen_address_book")
    .update({
      ...parsed,
      updated_at: new Date().toISOString(),
    })
    .match({ id, ...owner })
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

  const owner = buildOwnerFilter(profile);
  const { error } = await supabase
    .from("zen_address_book")
    .delete()
    .match({ id, ...owner });

  if (error) {
    logger.error("[ADDRESS_BOOK] deleteAddressBookEntry error:", error);
    throw new Error("Failed to delete address book entry");
  }

  revalidatePath("/[locale]/address-book");
  return { success: true };
}

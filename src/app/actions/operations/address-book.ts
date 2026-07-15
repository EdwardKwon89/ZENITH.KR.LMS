"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { addressBookEntrySchema, AddressBookEntryInput } from "@/lib/validation/address-book";
import { revalidatePath } from "next/cache";

const ADDRESS_BOOK_SELECT = `
  id, display_name, recipient_name, recipient_address, recipient_address_local,
  recipient_address_detail, recipient_phone, country_code, state_province, city, zipcode,
  recipient_pccc, display_mode, is_default, created_at, updated_at
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

  // upsert-by-name: 동일 owner scope + display_name으로 기존 행 조회 (중복 대응: order+limit)
  let existingQuery = supabase
    .from("zen_address_book")
    .select("id")
    .eq("display_name", parsed.display_name);

  if (profile.org_id) {
    existingQuery = existingQuery.eq("org_id", profile.org_id).is("user_id", null);
  } else {
    existingQuery = existingQuery.eq("user_id", profile.id).is("org_id", null);
  }

  const { data: existingRows, error: lookupError } = await existingQuery
    .order("updated_at", { ascending: false })
    .limit(1);

  if (lookupError) {
    logger.error("[ADDRESS_BOOK] createAddressBookEntry (lookup) error:", lookupError);
    throw new Error("Failed to check existing address book entry");
  }

  const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

  let data: any;

  if (existing) {
    // 기존 행이 있으면 update 경로로 위임
    const { error } = await supabase
      .from("zen_address_book")
      .update({
        ...parsed,
        ...owner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select(ADDRESS_BOOK_SELECT)
      .single();

    if (error) {
      logger.error("[ADDRESS_BOOK] createAddressBookEntry (update) error:", error);
      throw new Error("Failed to update address book entry");
    }

    const { data: updated } = await supabase
      .from("zen_address_book")
      .select(ADDRESS_BOOK_SELECT)
      .eq("id", existing.id)
      .single();
    data = updated;
  } else {
    // 기존 행이 없으면 insert
    const { error } = await supabase
      .from("zen_address_book")
      .insert({
        ...parsed,
        ...owner,
      });

    if (error) {
      logger.error("[ADDRESS_BOOK] createAddressBookEntry (insert) error:", error);
      throw new Error("Failed to create address book entry");
    }

    let insertQuery = supabase
      .from("zen_address_book")
      .select(ADDRESS_BOOK_SELECT)
      .eq("display_name", parsed.display_name);

    if (profile.org_id) {
      insertQuery = insertQuery.eq("org_id", profile.org_id).is("user_id", null);
    } else {
      insertQuery = insertQuery.eq("user_id", profile.id).is("org_id", null);
    }

    const { data: insertedRows, error: insertLookupError } = await insertQuery
      .order("created_at", { ascending: false })
      .limit(1);

    if (insertLookupError) {
      logger.error("[ADDRESS_BOOK] createAddressBookEntry (insert lookup) error:", insertLookupError);
      throw new Error("Failed to retrieve created address book entry");
    }

    data = insertedRows && insertedRows.length > 0 ? insertedRows[0] : null;
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

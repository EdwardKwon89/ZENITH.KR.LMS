"use client";

import React, { useEffect, useState } from 'react';
import { getAddressBookEntries } from '@/app/actions/operations/address-book';

interface AddressBookEntry {
  id: string;
  display_name: string;
  recipient_name: string;
  recipient_address: string;
  recipient_address_local?: string | null;
  recipient_address_detail?: string | null;
  recipient_phone?: string | null;
  country_code?: string | null;
}

interface AddressBookSelectorProps {
  onSelect: (entry: AddressBookEntry) => void;
}

export default function AddressBookSelector({ onSelect }: AddressBookSelectorProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);

  useEffect(() => {
    getAddressBookEntries().then((result) => setEntries(result.entries));
  }, []);

  return (
    <select
      className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
      onChange={(e) => {
        const entry = entries.find((en) => en.id === e.target.value);
        if (entry) onSelect(entry);
      }}
      defaultValue=""
    >
      <option value="">주소록에서 선택</option>
      {entries.map((entry) => (
        <option key={entry.id} value={entry.id}>
          {entry.display_name} — {entry.recipient_name}
        </option>
      ))}
    </select>
  );
}

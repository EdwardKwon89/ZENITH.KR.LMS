"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit2, Star, MapPin } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import {
  createAddressBookEntry,
  updateAddressBookEntry,
  deleteAddressBookEntry,
} from '@/app/actions/operations/address-book';
import { addressBookEntrySchema, AddressBookEntryInput } from '@/lib/validation/address-book';

interface AddressBookEntry {
  id: string;
  display_name: string;
  recipient_name: string;
  recipient_address: string;
  recipient_address_local?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  country_code?: string | null;
  display_mode: 'EN' | 'BILINGUAL';
  is_default: boolean;
}

interface AddressBookClientProps {
  initialEntries: AddressBookEntry[];
}

export default function AddressBookClient({ initialEntries }: AddressBookClientProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressBookEntryInput>({
    resolver: zodResolver(addressBookEntrySchema),
    defaultValues: {
      display_mode: 'EN',
      is_default: false,
    },
  });

  const onSubmit = async (data: AddressBookEntryInput) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        const result = await updateAddressBookEntry(editingId, data);
        setEntries((prev) =>
          prev.map((e) => (e.id === editingId ? result.entry : e))
        );
        setEditingId(null);
      } else {
        const result = await createAddressBookEntry(data);
        setEntries((prev) => [...prev, result.entry]);
      }
      reset();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry: AddressBookEntry) => {
    setEditingId(entry.id);
    reset({
      display_name: entry.display_name,
      recipient_name: entry.recipient_name,
      recipient_address: entry.recipient_address,
      recipient_address_local: entry.recipient_address_local || undefined,
      recipient_phone: entry.recipient_phone || undefined,
      recipient_email: entry.recipient_email || undefined,
      country_code: entry.country_code || undefined,
      display_mode: entry.display_mode,
      is_default: entry.is_default,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('주소를 삭제하시겠습니까?')) return;
    try {
      await deleteAddressBookEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <MapPin size={24} /> 주소록
      </h1>

      <ZenCard className="p-4">
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Plus size={16} />
          {editingId ? '주소 수정' : '새 주소 추가'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ZenInput
            placeholder="표시명"
            {...register('display_name')}
            error={!!errors.display_name}
          />
          <ZenInput
            placeholder="수취인 이름"
            {...register('recipient_name')}
            error={!!errors.recipient_name}
          />
          <ZenInput
            placeholder="수취인 주소"
            {...register('recipient_address')}
            error={!!errors.recipient_address}
          />
          <ZenInput
            placeholder="현지어 주소 (선택)"
            {...register('recipient_address_local')}
          />
          <ZenInput
            placeholder="연락처"
            {...register('recipient_phone')}
          />
          <ZenInput
            placeholder="이메일 (선택)"
            {...register('recipient_email')}
            error={!!errors.recipient_email}
          />
          <ZenInput
            placeholder="국가 코드"
            {...register('country_code')}
          />
          <select
            {...register('display_mode')}
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm"
          >
            <option value="EN">English</option>
            <option value="BILINGUAL">Bilingual</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('is_default')} />
            기본 주소로 설정
          </label>
          <div className="md:col-span-2 flex gap-2">
            <ZenButton type="submit" disabled={isSubmitting}>
              {editingId ? '수정' : '추가'}
            </ZenButton>
            {editingId && (
              <ZenButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  reset();
                }}
              >
                취소
              </ZenButton>
            )}
          </div>
        </form>
      </ZenCard>

      <div className="grid gap-3">
        {entries.map((entry) => (
          <ZenCard key={entry.id} className="p-4 flex justify-between items-start">
            <div>
              <div className="font-bold flex items-center gap-2">
                {entry.display_name}
                {entry.is_default && <Star size={14} className="text-yellow-500" />}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {entry.recipient_name} | {entry.recipient_phone || '-'}
              </div>
              <div className="text-sm text-slate-600">{entry.recipient_address}</div>
              {entry.recipient_address_local && (
                <div className="text-sm text-slate-500">{entry.recipient_address_local}</div>
              )}
              <div className="text-xs text-slate-400 mt-1">
                {entry.country_code} · {entry.display_mode}
              </div>
            </div>
            <div className="flex gap-2">
              <ZenButton variant="ghost" onClick={() => handleEdit(entry)}>
                <Edit2 size={14} />
              </ZenButton>
              <ZenButton variant="ghost" onClick={() => handleDelete(entry.id)}>
                <Trash2 size={14} className="text-rose-500" />
              </ZenButton>
            </div>
          </ZenCard>
        ))}
        {entries.length === 0 && (
          <div className="text-center text-slate-400 py-10">등록된 주소가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

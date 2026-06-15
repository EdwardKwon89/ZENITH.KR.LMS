'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/ZenUI';
import { getUpsZones } from '@/app/actions/ups/rates';
import { createUpsZone, updateUpsZone, addZoneCountry, removeZoneCountry } from '@/app/actions/ups/rates-mutation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Trash2 } from 'lucide-react';

export function ZonesTab() {
  const t = useTranslations('admin.ups_rates.zones');
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ zone_code: '', zone_name: '', description: '', sort_order: 0 });
  const [countryCode, setCountryCode] = useState('');

  const loadZones = async () => {
    setLoading(true);
    try {
      const data = await getUpsZones();
      setZones(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateUpsZone(editing.id, form);
        toast.success(t('update_success'));
      } else {
        await createUpsZone(form);
        toast.success(t('create_success'));
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ zone_code: '', zone_name: '', description: '', sort_order: 0 });
      loadZones();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save zone');
    }
  };

  const handleAddCountry = async (zoneId: string) => {
    if (!countryCode.trim()) return;
    try {
      await addZoneCountry(zoneId, countryCode.trim().toUpperCase());
      toast.success(t('country_added'));
      setCountryCode('');
      loadZones();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add country');
    }
  };

  const handleRemoveCountry = async (zoneId: string, code: string) => {
    try {
      await removeZoneCountry(zoneId, code);
      toast.success(t('country_removed'));
      loadZones();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove country');
    }
  };

  return (
    <ZenCard className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{t('title')}</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <ZenButton className="px-4 py-2 text-sm" onClick={() => { setEditing(null); setForm({ zone_code: '', zone_name: '', description: '', sort_order: 0 }); }}>
              <Plus size={16} className="mr-1" /> {t('add_zone')}
            </ZenButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t('edit_zone') : t('add_zone')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('zone_code')}</label>
                <ZenInput value={form.zone_code} onChange={e => setForm({ ...form, zone_code: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('zone_name')}</label>
                <ZenInput value={form.zone_name} onChange={e => setForm({ ...form, zone_name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('description')}</label>
                <ZenInput value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('sort_order')}</label>
                <ZenInput type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <ZenButton type="submit" className="w-full">{editing ? t('update') : t('create')}</ZenButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('zone_code')}</TableHead>
            <TableHead>{t('zone_name')}</TableHead>
            <TableHead>{t('countries')}</TableHead>
            <TableHead>{t('sort_order')}</TableHead>
            <TableHead>{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((zone: any) => (
            <TableRow key={zone.id}>
              <TableCell><ZenBadge variant="default" className="border-slate-300 bg-white">{zone.zone_code}</ZenBadge></TableCell>
              <TableCell>{zone.zone_name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(zone.countries || []).map((c: any) => (
                    <ZenBadge key={c.id} variant="default" className="cursor-pointer bg-slate-200">
                      {c.country_code} <Trash2 size={10} className="ml-1" />
                    </ZenBadge>
                  ))}
                  <div className="flex items-center gap-1">
                    <ZenInput className="w-16 h-6 text-xs px-2 py-1" placeholder="KOR" value={countryCode} onChange={e => setCountryCode(e.target.value)} />
                    <ZenButton className="h-6 px-2 py-1 text-xs" onClick={() => handleAddCountry(zone.id)}><Plus size={10} /></ZenButton>
                  </div>
                </div>
              </TableCell>
              <TableCell>{zone.sort_order}</TableCell>
              <TableCell>
                <ZenButton variant="ghost" className="p-1" onClick={() => { setEditing(zone); setForm(zone); setIsOpen(true); }}>
                  <Pencil size={14} />
                </ZenButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ZenCard>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/ZenUI';
import { getUpsProducts } from '@/app/actions/ups/rates';
import { createUpsProduct, updateUpsProduct } from '@/app/actions/ups/rates-mutation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus } from 'lucide-react';

export function ProductsTab() {
  const t = useTranslations('admin.ups_rates.products');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    product_code: '',
    sub_code: '',
    product_name: '',
    cargo_type: 'BOTH' as 'DOC' | 'NON_DOC' | 'BOTH',
    ddu_available: false,
    ddp_available: false,
    sort_order: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getUpsProducts();
      setProducts(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateUpsProduct(editing.id, form);
        toast.success(t('update_success'));
      } else {
        await createUpsProduct(form);
        toast.success(t('create_success'));
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ product_code: '', sub_code: '', product_name: '', cargo_type: 'BOTH', ddu_available: false, ddp_available: false, sort_order: 0 });
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  return (
    <ZenCard className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{t('title')}</h2>
        <ZenButton size="sm" onClick={() => { setEditing(null); setForm({ product_code: '', sub_code: '', product_name: '', cargo_type: 'BOTH', ddu_available: false, ddp_available: false, sort_order: 0 }); setIsOpen(true); }}>
          <Plus size={16} className="mr-1" /> {t('add_product')}
        </ZenButton>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('edit_product') : t('add_product')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ZenInput label={t('product_code')} value={form.product_code} onChange={e => setForm({ ...form, product_code: e.target.value })} required />
            <ZenInput label={t('sub_code')} value={form.sub_code} onChange={e => setForm({ ...form, sub_code: e.target.value })} />
            <ZenInput label={t('product_name')} value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} required />
            <select value={form.cargo_type} onChange={e => setForm({ ...form, cargo_type: e.target.value as any })} className="w-full border rounded p-2">
              <option value="DOC">{t('cargo_doc')}</option>
              <option value="NON_DOC">{t('cargo_non_doc')}</option>
              <option value="BOTH">{t('cargo_both')}</option>
            </select>
            <div className="flex gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.ddu_available} onChange={e => setForm({ ...form, ddu_available: e.target.checked })} /> DDU</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.ddp_available} onChange={e => setForm({ ...form, ddp_available: e.target.checked })} /> DDP</label>
            </div>
            <ZenButton type="submit" className="w-full">{editing ? t('update') : t('create')}</ZenButton>
          </form>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('product_code')}</TableHead>
            <TableHead>{t('product_name')}</TableHead>
            <TableHead>{t('cargo_type')}</TableHead>
            <TableHead>{t('options')}</TableHead>
            <TableHead>{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p: any) => (
            <TableRow key={p.id}>
              <TableCell><ZenBadge variant="outline">{p.product_code}{p.sub_code ? `-${p.sub_code}` : ''}</ZenBadge></TableCell>
              <TableCell>{p.product_name}</TableCell>
              <TableCell>{p.cargo_type}</TableCell>
              <TableCell>
                {p.ddu_available && <ZenBadge variant="secondary" className="mr-1">DDU</ZenBadge>}
                {p.ddp_available && <ZenBadge variant="secondary">DDP</ZenBadge>}
              </TableCell>
              <TableCell>
                <ZenButton variant="ghost" size="sm" onClick={() => { setEditing(p); setForm(p); setIsOpen(true); }}><Pencil size={14} /></ZenButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ZenCard>
  );
}

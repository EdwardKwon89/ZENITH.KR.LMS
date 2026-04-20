'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ZenAurora, ZenCard, ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { Truck, Shield, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';


export default function Home() {
  const t = useTranslations('Common');
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [platformVersion, setPlatformVersion] = React.useState('v2.1 Premium');
  
  const supabase = createClient();

  React.useEffect(() => {
    const fetchVersion = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'PLATFORM_VERSION')
        .single();
      if (data?.value) setPlatformVersion(data.value);
    };
    fetchVersion();
  }, []);

  const partners = [
    { name: 'SNTL', logo: '/partners/sntl.png' },
    { name: 'GlobalLink', logo: '/partners/globallink.png' },
    { name: 'ZenithLink', logo: '/partners/zenithlink.png' },
  ];

  return (
    <ZenAurora className="flex-col gap-12 py-20 px-4">
      {/* 🚀 [Verification Success Banner] */}
      {code && (
        <ZenCard className="max-w-2xl w-full border-emerald-400/30 bg-emerald-50/10">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-2 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-700">{t('welcome_verified')}</h2>
              <p className="text-emerald-600/80">{t('welcome_verified_desc')}</p>
            </div>
          </div>
        </ZenCard>
      )}

      {/* 🏛️ [Hero Section] */}
      <div className="text-center max-w-4xl space-y-6">
        <ZenBadge variant="info" className="px-4 py-1 text-sm mb-4">
          {platformVersion} Paradigm
        </ZenBadge>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
          {t('hero_title')}
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t('hero_subtitle')}
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
          <Link href="/login">
            <ZenButton className="min-w-[200px] flex items-center justify-center gap-2 group">
              {t('go_to_dashboard')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </ZenButton>
          </Link>
          <Link href="/register">
            <ZenButton variant="glass" className="min-w-[200px]">
              {t('signup')}
            </ZenButton>
          </Link>
        </div>
      </div>

      {/* 🌟 [Features Grid] */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-12">
        <ZenCard className="flex flex-col gap-4">
          <div className="bg-blue-100/50 w-12 h-12 rounded-2xl flex items-center justify-center">
            <Truck className="text-blue-600 w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t('feature_tracking_title')}</h3>
          <p className="text-slate-500 text-sm">{t('feature_tracking_desc')}</p>
        </ZenCard>

        <ZenCard className="flex flex-col gap-4">
          <div className="bg-indigo-100/50 w-12 h-12 rounded-2xl flex items-center justify-center">
            <Shield className="text-indigo-600 w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t('feature_security_title')}</h3>
          <p className="text-slate-500 text-sm">{t('feature_security_desc')}</p>
        </ZenCard>

        <ZenCard className="flex flex-col gap-4">
          <div className="bg-emerald-100/50 w-12 h-12 rounded-2xl flex items-center justify-center">
            <Globe className="text-emerald-600 w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t('feature_settlement_title')}</h3>
          <p className="text-slate-500 text-sm">{t('feature_settlement_desc')}</p>
        </ZenCard>
      </div>

      {/* 🤝 [Partner Logos Section] */}
      <div className="w-full max-w-4xl mt-16 text-center border-t border-slate-200/50 pt-12">
        <p className="text-slate-400 font-medium tracking-widest uppercase text-xs mb-8">
          {t('trusted_partners')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          {partners.map((partner) => (
            <div key={partner.name} className="relative w-32 h-12 md:w-40 md:h-16">
              <Image
                src={partner.logo}
                alt={partner.name}
                fill
                style={{ objectFit: 'contain' }}
                className="hover:scale-110 transition-transform cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </ZenAurora>
  );
}

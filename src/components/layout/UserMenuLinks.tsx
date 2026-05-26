'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { User, Settings, HelpCircle } from 'lucide-react';

export default function UserMenuLinks() {
  const params = useParams();
  const t = useTranslations('Header');
  const locale = params?.locale as string || 'ko';

  const items = [
    { href: '/mypage/profile', icon: User, label: t('my_profile') },
    { href: '/admin/settings', icon: Settings, label: t('workspace_settings') },
    { href: '/support/qna', icon: HelpCircle, label: t('support_center') },
  ];

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={`/${locale}${item.href}`}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all"
        >
          <item.icon size={16} /> {item.label}
        </Link>
      ))}
    </div>
  );
}

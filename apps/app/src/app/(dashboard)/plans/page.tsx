'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { toast } from '@/lib/toast';
import { Check, Crown } from 'lucide-react';
import Link from 'next/link';

const PLANS = [
  {
    id: 'free',
    href: '/plan-free',
    name: 'Free',
    price: '0',
    color: '#888',
    perks: ['Daily swipe quota', 'Basic discovery', 'Match notifications'],
  },
  {
    id: 'premium',
    href: '/plan-premium',
    name: 'Premium',
    price: '29',
    color: '#2F76BB',
    perks: ['More connects', 'See who liked you', 'Priority support'],
  },
  {
    id: 'premium-plus',
    href: '/plan-premium-plus',
    name: 'Premium+',
    price: '49',
    color: '#F5A623',
    perks: ['Unlimited connects', 'AI boost', 'Featured profile'],
  },
] as const;

export default function PlansPage() {
  const { t } = useI18n();

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold" style={{ color: matchyBrand.textDark }}>
            {t('settings.subscription')}
          </h1>
          <p className="mt-1 text-sm text-[#888]">Choose the plan that fits your growth</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-3xl bg-white p-5 shadow-sm"
              style={{ border: `1px solid ${matchyBrand.border}` }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Crown size={16} color={plan.color} />
                <span className="font-extrabold" style={{ color: plan.color }}>
                  {plan.name}
                </span>
              </div>
              <p className="text-3xl font-extrabold text-[#1A1A2E]">
                {plan.price}
                <span className="text-sm font-semibold text-[#888]"> TND</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-[#555]">
                    <Check size={14} color={matchyBrand.teal} className="mt-0.5 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className="mt-5 block rounded-2xl py-3 text-center text-sm font-bold text-white"
                style={{ background: matchyBrand.gradient }}
                onClick={(e) => {
                  if (plan.id !== 'free') {
                    e.preventDefault();
                    toast.message(t('settings.comingSoon'));
                  }
                }}
              >
                {plan.id === 'free' ? 'Current plan' : 'Upgrade'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

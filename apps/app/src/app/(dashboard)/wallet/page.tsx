'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { Wallet } from 'lucide-react';

export default function WalletPage() {
  return (
    <StubScreen title="Wallet" description="Credits, invoices, and payment methods will live here.">
      <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl bg-[#F5F7FA] py-10">
        <Wallet size={36} color="#2F76BB" />
        <p className="text-2xl font-extrabold text-[#1A1A2E]">0.00 TND</p>
        <p className="text-xs text-[#888]">Available balance</p>
      </div>
    </StubScreen>
  );
}

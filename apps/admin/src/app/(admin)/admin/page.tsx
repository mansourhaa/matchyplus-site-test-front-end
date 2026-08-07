import { AdminPanel } from '@/components/admin/admin-panel';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panneau Admin · Matchy+',
  description: 'Centre de contrôle Matchy+',
};

export default function AdminPage() {
  return <AdminPanel />;
}

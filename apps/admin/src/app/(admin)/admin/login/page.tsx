import { AdminLoginForm } from '@/components/admin/admin-login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion Admin · Matchy+',
  description: 'Accès réservé aux gestionnaires autorisés',
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}

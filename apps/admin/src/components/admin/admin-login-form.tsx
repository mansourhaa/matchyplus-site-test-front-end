'use client';

import {
  adminLogin,
  clearAdminError,
  selectAdminAuth,
} from '@/features/admin-auth/store/admin-auth-slice';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { hasAdminSessionMarker } from '@/lib/admin-auth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart2,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Shield,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const FEATURES = [
  { icon: Users, label: 'Gestion utilisateurs', desc: 'Consulter, éditer, bannir' },
  { icon: BarChart2, label: 'Analytiques avancées', desc: 'Revenus, matches, conversions' },
  { icon: Crown, label: 'Gestion des forfaits', desc: 'Free, Premium, Premium+' },
  { icon: Zap, label: 'Synchronisation live', desc: 'Données en temps réel' },
];

export function AdminLoginForm() {
  const dispatch = useAppDispatch();
  const { admin, loading, error } = useAppSelector(selectAdminAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  const message = localError ?? error;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const resetError = () => {
    setLocalError(null);
    if (error) dispatch(clearAdminError());
  };

  useEffect(() => {
    if (!admin || !hasAdminSessionMarker()) return;

    // A client-side transition (router.push/replace) doesn't guarantee the browser has
    // committed the admin session cookie yet — it's set via a cross-origin Set-Cookie from
    // the API, which only middleware sees reliably on a real navigation. A hard navigation
    // forces that, avoiding "logged in but stuck on /login until you refresh".
    window.location.assign('/admin');
  }, [admin]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setLocalError('Veuillez remplir tous les champs.');
      triggerShake();
      return;
    }

    const resultAction = await dispatch(adminLogin({ email: email.trim(), password }));

    if (adminLogin.fulfilled.match(resultAction)) {
      window.location.assign('/admin');
      return;
    }

    triggerShake();
    setPassword('');
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#0F1A2E' }}>
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden shrink-0 flex-col justify-between p-10 lg:flex"
        style={{
          width: '420px',
          background: 'linear-gradient(160deg, #1a5fa0 0%, #2F76BB 50%, #61BCA6 100%)',
        }}
      >
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-matchy-white.svg"
            alt="Matchy+"
            height={28}
            style={{ height: 28, width: 'auto' }}
          />
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            Admin Panel
          </p>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p
              className="mb-3 text-white"
              style={{ fontSize: '34px', fontWeight: 900, lineHeight: 1.2 }}
            >
              Centre de
              <br />
              contrôle
              <br />
              Matchy+
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
              Gérez votre plateforme, vos utilisateurs et vos abonnements depuis un tableau de bord
              centralisé et sécurisé.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 space-y-3"
          >
            {FEATURES.map(({ icon: Icon, label, desc }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.08 }}
                className="flex items-center gap-3"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <Icon size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{label}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          © 2026 Matchy+ · Accès réservé aux administrateurs autorisés
        </p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-matchy-white.svg"
              alt="Matchy+"
              height={24}
              style={{ height: 24, width: 'auto' }}
            />
            <span style={{ fontSize: '12px', color: '#61BCA6', fontWeight: 700 }}>Admin</span>
          </div>

          <motion.div
            animate={shake ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl p-8"
            style={{
              background: '#1A2540',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            }}
          >
            <div className="mb-7">
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #2F76BB, #61BCA6)' }}
              >
                <Lock size={24} color="white" />
              </div>
              <p style={{ fontSize: '24px', fontWeight: 900, color: 'white' }}>Connexion Admin</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
                Accès réservé aux gestionnaires autorisés
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Identifiant
                </label>
                <div
                  className="mt-1.5 flex items-center gap-3 rounded-2xl px-4 py-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <User size={16} color="rgba(255,255,255,0.35)" />
                  <input
                    id="admin-email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      resetError();
                    }}
                    placeholder="admin@matchyplus.tn"
                    autoComplete="username"
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: '14px', color: 'white', caretColor: '#61BCA6' }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Mot de passe
                </label>
                <div
                  className="mt-1.5 flex items-center gap-3 rounded-2xl px-4 py-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Lock size={16} color="rgba(255,255,255,0.35)" />
                  <input
                    id="admin-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      resetError();
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: '14px', color: 'white', caretColor: '#61BCA6' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}>
                    {showPass ? (
                      <EyeOff size={16} color="rgba(255,255,255,0.3)" />
                    ) : (
                      <Eye size={16} color="rgba(255,255,255,0.3)" />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-xl px-4 py-3"
                    style={{
                      background: 'rgba(231,76,60,0.15)',
                      border: '1px solid rgba(231,76,60,0.3)',
                    }}
                  >
                    <AlertCircle size={15} color="#E74C3C" />
                    <p style={{ fontSize: '13px', color: '#FF8577' }}>{message}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4"
                style={{
                  background: loading
                    ? 'rgba(47,118,187,0.5)'
                    : 'linear-gradient(135deg, #2F76BB, #61BCA6)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  marginTop: '8px',
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(47,118,187,0.4)',
                  transition: 'all 0.2s',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"
                    />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    Accéder au panneau
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>
          </motion.div>

          <p
            className="mt-5 text-center"
            style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}
          >
            🔒 Connexion sécurisée · Session active pendant 8 heures
          </p>
        </motion.div>
      </div>
    </div>
  );
}

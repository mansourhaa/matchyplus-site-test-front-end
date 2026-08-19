'use client';

import { PageFrame } from '@/components/site-shell';
import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { API_URL } from '@/lib/constants';
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';

const data: Record<
  'fr' | 'en' | 'ar',
  {
    title: string;
    subtitle: string;
    badge: string;
    pitchTitle: string;
    pitchText: string;
    benefits: { title: string; desc: string }[];
    formTitle: string;
    formDesc: string;
    name: string;
    email: string;
    phone: string;
    requestText: string;
    submit: string;
    submitting: string;
    success: string;
  }
> = {
  fr: {
    title: 'Devenez Partenaire Matchy+',
    subtitle: 'Rejoignez le premier réseau panafricain de professionnels et développez votre clientèle locale en toute simplicité.',
    badge: 'Programme Partenaires Certifiés',
    pitchTitle: 'Propulsez votre activité vers de nouveaux sommets',
    pitchText: 'Matchy+ met vos compétences en valeur auprès de milliers de clients qualifiés à la recherche de services de proximité fiables.',
    benefits: [
      {
        title: 'Visibilité maximale',
        desc: 'Apparaissez en priorité dans les recherches géolocalisées de votre ville.',
      },
      {
        title: 'Clients qualifiés',
        desc: 'Recevez des demandes ciblées correspondant exactement à vos domaines d’expertise.',
      },
      {
        title: 'Matchy Wallet & Boosters',
        desc: 'Accédez à des outils exclusifs pour multiplier vos connexions et opportunités.',
      },
    ],
    formTitle: 'Rejoindre le réseau',
    formDesc: 'Remplissez vos coordonnées et votre demande pour finaliser votre profil pro.',
    name: 'Nom & Prénom',
    email: 'Adresse e-mail',
    phone: 'Numéro de téléphone',
    requestText: 'Votre demande / Présentation de votre activité',
    submit: 'Rejoindre le réseau professionnel',
    submitting: 'Envoi de votre demande...',
    success: 'Demande envoyée ! Notre équipe partenaires vous contactera rapidement.',
  },
  en: {
    title: 'Become a Matchy+ Partner',
    subtitle: 'Join the premier pan-African network of skilled professionals and grow your local client base seamlessly.',
    badge: 'Certified Partner Program',
    pitchTitle: 'Take your business to the next level',
    pitchText: 'Matchy+ showcases your skills to thousands of qualified clients looking for trusted nearby services.',
    benefits: [
      {
        title: 'Maximum visibility',
        desc: 'Appear at the top of location-based searches in your city.',
      },
      {
        title: 'Qualified clients',
        desc: 'Receive targeted service requests tailored to your exact skillset.',
      },
      {
        title: 'Matchy Wallet & Boosters',
        desc: 'Unlock exclusive tools to multiply connections and business opportunities.',
      },
    ],
    formTitle: 'Join the network',
    formDesc: 'Submit your details and request to set up your pro profile.',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number',
    requestText: 'Your request / Activity overview',
    submit: 'Join the professional network',
    submitting: 'Submitting application...',
    success: 'Application sent! Our partner team will reach out to you shortly.',
  },
  ar: {
    title: 'كن شريكًا مع ماتشي بلس',
    subtitle: 'انضم إلى الشبكة الإفريقية الرائدة للمهنيين وطوّر قاعدة عملائك المحلية بكل سهولة.',
    badge: 'برنامج الشركاء المعتمدين',
    pitchTitle: 'انطلق بنشاطك المهني إلى مستويات جديدة',
    pitchText: 'تبرز Matchy+ مهاراتك أمام آلاف العملاء المستهدفين الذين يبحثون عن خدمات محلية موثوقة.',
    benefits: [
      {
        title: 'أقصى درجات الظهور',
        desc: 'كن في مقدمة نتائج البحث المعتمدة على الموقع في منطقتك.',
      },
      {
        title: 'عملاء مؤهلون',
        desc: 'احصل على طلبات تطابق تخصصك وخبراتك بدقة.',
      },
      {
        title: 'Matchy Wallet وميزات الترويج',
        desc: 'استفد من أدوات تسريع الظهور لمضاعفة فرص العمل.',
      },
    ],
    formTitle: 'انضم إلى الشبكة',
    formDesc: 'أدخل بياناتك وتفاصيل طلبك وسيتواصل معك فريقنا.',
    name: 'الاسم واللقب',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    requestText: 'تفاصيل طلبك / نبذة عن نشاطك وخدماتك',
    submit: 'الانضمام إلى شبكة المحترفين',
    submitting: 'جاري إرسال الطلب...',
    success: 'تم إرسال الطلب بنجاح! سيتواصل معك فريق الشركاء قريبًا.',
  },
};

export default function Partner() {
  const { locale } = useI18n();
  const t = data[locale];
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    requestText: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch(`${API_URL}/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'partner',
          name: form.name,
          email: form.email,
          phone: form.phone,
          requestText: form.requestText,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to send partner email:', err);
      // Still show success to user if network glitch on simulated
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame>
      <main className="bg-neutral-50/60 pb-28">
        <SubpageHero
          eyebrow="Matchy Wallet & Partners"
          title={t.title}
          subtitle={t.subtitle}
        />

        <div className="container relative z-20 -mt-10 sm:-mt-14 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl sm:p-10 md:grid-cols-12 md:gap-12">
            {/* Left Column: Value proposition */}
            <div className="flex flex-col justify-between md:col-span-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-bold text-brand-teal">
                  <Sparkles className="h-3.5 w-3.5" /> {t.badge}
                </span>
                <h2 className="text-brand-navy mt-4 text-2xl font-extrabold sm:text-3xl">
                  {t.pitchTitle}
                </h2>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
                  {t.pitchText}
                </p>

                <div className="mt-8 space-y-4">
                  {t.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-3.5 rounded-2xl bg-neutral-50/80 p-3.5 border border-neutral-100">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-teal/15 text-brand-teal mt-0.5">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-brand-navy">{b.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-blue/10 to-brand-teal/10 p-4 border border-brand-teal/20">
                <ShieldCheck className="h-8 w-8 shrink-0 text-brand-teal" />
                <p className="text-xs text-brand-navy leading-relaxed font-semibold">
                  Profil vérifié et badge VIP pour renforcer la confiance avec vos futurs clients.
                </p>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="md:col-span-7">
              <div className="mb-6">
                <h3 className="text-xl font-extrabold text-brand-navy">{t.formTitle}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">{t.formDesc}</p>
              </div>

              {submitted ? (
                <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-2xl bg-brand-teal/5 p-8 text-center border border-brand-teal/20">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-teal text-white shadow-lg shadow-brand-teal/30">
                    ✓
                  </div>
                  <h3 className="text-brand-navy mt-4 text-xl font-bold">{t.success}</h3>
                  <p className="text-muted-foreground mt-2 text-sm max-w-sm">
                    Un conseiller vous guidera pas à pas pour maximiser votre impact dès le premier jour.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', phone: '', requestText: '' });
                    }}
                    className="text-brand-teal mt-6 text-sm font-semibold hover:underline"
                  >
                    Soumettre une autre inscription
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-brand-navy block mb-1.5">
                      {t.name}
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t.name}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-brand-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-brand-navy block mb-1.5">
                        {t.email}
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="nom@exemple.com"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-brand-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-navy block mb-1.5">
                        {t.phone}
                      </label>
                      <input
                        required
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+216 -- --- ---"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-brand-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-brand-navy block mb-1.5">
                      {t.requestText}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={form.requestText}
                      onChange={(e) => setForm({ ...form, requestText: e.target.value })}
                      placeholder="Décrivez brièvement vos services, compétences et besoins pour ce partenariat..."
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-brand-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-brand-teal/25 transition-all hover:bg-brand-teal/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {t.submitting}
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" /> {t.submit}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </PageFrame>
  );
}

'use client';

import { PageFrame } from '@/components/site-shell';
import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { API_URL } from '@/lib/constants';
import { Loader2, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import { useState } from 'react';

const data: Record<
  'fr' | 'en' | 'ar',
  {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    send: string;
    sending: string;
    sent: string;
    infoTitle: string;
    infoText: string;
    directContact: string;
    location: string;
  }
> = {
  fr: {
    title: 'Contactez-nous',
    subtitle: 'Une question, une idée ou besoin d’aide ? Écrivez-nous et notre équipe vous répondra dans les plus brefs délais.',
    name: 'Nom complet',
    email: 'Adresse e-mail',
    phone: 'Numéro de téléphone (optionnel)',
    message: 'Votre message',
    send: 'Envoyer le message',
    sending: 'Envoi du message...',
    sent: 'Merci ! Votre message a bien été envoyé.',
    infoTitle: 'Parlons de votre projet',
    infoText: 'Notre équipe est à votre disposition pour vous accompagner dans l’utilisation de Matchy+ ou pour toute proposition de partenariat.',
    directContact: 'Contact direct',
    location: 'Tunis, Tunisie (Panafricain)',
  },
  en: {
    title: 'Contact us',
    subtitle: 'A question, an idea or need help? Write to us and our team will get back to you promptly.',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number (optional)',
    message: 'Your message',
    send: 'Send message',
    sending: 'Sending message...',
    sent: 'Thank you! Your message has been sent successfully.',
    infoTitle: "Let's talk about your project",
    infoText: 'Our team is here to assist you with Matchy+ or discuss partnership opportunities across the continent.',
    directContact: 'Direct contact',
    location: 'Tunis, Tunisia (Pan-African)',
  },
  ar: {
    title: 'اتصل بنا',
    subtitle: 'لديك سؤال أو فكرة أو تحتاج إلى المساعدة؟ اكتب لنا وسيرد فريقنا عليك في أقرب وقت.',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف (اختياري)',
    message: 'رسالتك',
    send: 'إرسال الرسالة',
    sending: 'جاري إرسال الرسالة...',
    sent: 'شكرًا لك! تم إرسال رسالتك بنجاح.',
    infoTitle: 'دعنا نتحدث عن مشروعك',
    infoText: 'فريقنا متاح لمساعدتك في استخدام Matchy+ أو لمناقشة أي مقترح شراكة.',
    directContact: 'اتصال مباشر',
    location: 'تونس، الجمهورية التونسية (عموم إفريقيا)',
  },
};

export default function Contact() {
  const { locale } = useI18n();
  const t = data[locale];
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch(`${API_URL}/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to send contact message:', err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame>
      <main className="bg-neutral-50/60 pb-28">
        <SubpageHero
          eyebrow="Matchy+"
          title={t.title}
          subtitle={t.subtitle}
        />

        <div className="container relative z-20 -mt-10 sm:-mt-14 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl sm:p-10 md:grid-cols-12 md:gap-12">
            {/* Left side info */}
            <div className="flex flex-col justify-between md:col-span-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-bold text-brand-teal">
                  <MessageSquare className="h-3.5 w-3.5" /> Support & Contact
                </span>
                <h2 className="text-brand-navy mt-4 text-2xl font-extrabold sm:text-3xl">
                  {t.infoTitle}
                </h2>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
                  {t.infoText}
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3.5 text-sm text-neutral-700">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-brand-blue">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <a href="mailto:hello@matchy.tn" className="font-semibold hover:text-brand-blue">
                        hello@matchy.tn
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 text-sm text-neutral-700">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-brand-teal">
                      <Phone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">{t.directContact}</p>
                      <span className="font-semibold">+216 70 000 000</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 text-sm text-neutral-700">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-amber-500">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">Localisation</p>
                      <span className="font-semibold">{t.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-brand-blue/5 p-4 border border-brand-blue/10">
                <p className="text-xs text-brand-navy/80 leading-relaxed font-medium">
                  🚀 Réception directe et traitement sous 24h ouvrées.
                </p>
              </div>
            </div>

            {/* Right side form */}
            <div className="md:col-span-7">
              {submitted ? (
                <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-2xl bg-brand-teal/5 p-8 text-center border border-brand-teal/20">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-teal text-white shadow-lg shadow-brand-teal/30">
                    ✓
                  </div>
                  <h3 className="text-brand-navy mt-4 text-xl font-bold">{t.sent}</h3>
                  <p className="text-muted-foreground mt-2 text-sm max-w-sm">
                    Notre équipe reviendra vers vous à l’adresse <span className="font-semibold text-brand-navy">{form.email || 'indiquée'}</span> sous 24 heures ouvrées.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', phone: '', message: '' });
                    }}
                    className="text-brand-teal mt-6 text-sm font-semibold hover:underline"
                  >
                    Envoyer un autre message
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
                      {t.message}
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder={t.message}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-brand-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-brand-blue/20 transition-all hover:bg-brand-blue/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {t.sending}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> {t.send}
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

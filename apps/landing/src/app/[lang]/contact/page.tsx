'use client';

import { CountryCodeSelector } from '@/components/country-code-selector';
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
    badge: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    send: string;
    sending: string;
    sent: string;
    sentSub: string;
    sendAnother: string;
    infoTitle: string;
    infoText: string;
    emailLabel: string;
    directContact: string;
    turnaroundNotice: string;
    location: string;
  }
> = {
  fr: {
    title: 'Contactez-nous',
    subtitle:
      'Une question, une idée ou besoin d’aide ? Écrivez-nous et notre équipe vous répondra dans les plus brefs délais.',
    badge: 'Support & Contact',
    name: 'Nom complet',
    email: 'Adresse e-mail',
    phone: 'Numéro de téléphone (optionnel)',
    message: 'Votre message',
    send: 'Envoyer le message',
    sending: 'Envoi du message...',
    sent: 'Merci ! Votre message a bien été envoyé.',
    sentSub: 'Notre équipe reviendra vers vous à l’adresse {email} sous 24 heures ouvrées.',
    sendAnother: 'Envoyer un autre message',
    infoTitle: 'Parlons de votre projet',
    infoText:
      'Notre équipe est à votre disposition pour vous accompagner dans l’utilisation de Matchy+ ou pour toute proposition de partenariat.',
    emailLabel: 'E-mail',
    directContact: 'Contact direct',
    turnaroundNotice: '🚀 Réception directe et traitement sous 24h ouvrées.',
    location:
      'Immeuble AOUN, 5ème étage, Lotissement Stade Lamine, Rue 20 Mars, Cité Jawhara, Sousse, Tunisie',
  },
  en: {
    title: 'Contact us',
    subtitle:
      'A question, an idea or need help? Write to us and our team will get back to you promptly.',
    badge: 'Support & Contact',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number (optional)',
    message: 'Your message',
    send: 'Send message',
    sending: 'Sending message...',
    sent: 'Thank you! Your message has been sent successfully.',
    sentSub: 'Our team will get back to you at {email} within 24 business hours.',
    sendAnother: 'Send another message',
    infoTitle: "Let's talk about your project",
    infoText:
      'Our team is here to assist you with Matchy+ or discuss partnership opportunities across the continent.',
    emailLabel: 'E-mail',
    directContact: 'Direct contact',
    turnaroundNotice: '🚀 Direct receipt and processing within 24 business hours.',
    location:
      'AOUN Building, 5th Floor, Stade Lamine Subdivision, 20 Mars Street, Cité Jawhara, Sousse, Tunisia',
  },
  ar: {
    title: 'اتصل بنا',
    subtitle: 'لديك سؤال أو فكرة أو تحتاج إلى المساعدة؟ اكتب لنا وسيرد فريقنا عليك في أقرب وقت.',
    badge: 'الدعم والتواصل',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف (اختياري)',
    message: 'رسالتك',
    send: 'إرسال الرسالة',
    sending: 'جاري إرسال الرسالة...',
    sent: 'شكرًا لك! تم إرسال رسالتك بنجاح.',
    sentSub: 'سيعود فريقنا إليك عبر البريد {email} خلال 24 ساعة عمل.',
    sendAnother: 'إرسال رسالة أخرى',
    infoTitle: 'دعنا نتحدث عن مشروعك',
    infoText: 'فريقنا متاح لمساعدتك في استخدام Matchy+ أو لمناقشة أي مقترح شراكة.',
    emailLabel: 'البريد الإلكتروني',
    directContact: 'اتصال مباشر',
    turnaroundNotice: '🚀 استلام مباشر ومعالجة خلال 24 ساعة عمل.',
    location: 'عمارة عون، الطابق الخامس، تقسيم ملعب الأمين، نهج 20 مارس، حي جوهرة، سوسة، تونس',
  },
};

export default function Contact() {
  const { locale } = useI18n();
  const t = data[locale];
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [countryCode, setCountryCode] = useState('+216');
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
      const fullPhone = form.phone ? `${countryCode} ${form.phone}`.trim() : '';
      await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          name: form.name,
          email: form.email,
          phone: fullPhone,
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
        <SubpageHero eyebrow="Matchy+" title={t.title} subtitle={t.subtitle} />

        <div className="relative z-20 container -mt-10 max-w-5xl sm:-mt-14">
          <div className="grid grid-cols-1 gap-8 rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl sm:p-10 md:grid-cols-12 md:gap-12">
            {/* Left side info */}
            <div className="flex flex-col justify-between md:col-span-5">
              <div>
                <span className="bg-brand-teal/10 text-brand-teal inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                  <MessageSquare className="h-3.5 w-3.5" /> {t.badge}
                </span>
                <h2 className="text-brand-navy mt-4 text-2xl font-extrabold sm:text-3xl">
                  {t.infoTitle}
                </h2>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
                  {t.infoText}
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3.5 text-sm text-neutral-700">
                    <span className="text-brand-blue grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-muted-foreground text-xs">{t.emailLabel}</p>
                      <a
                        href="mailto:Contact@matchyplus.com"
                        className="hover:text-brand-blue font-semibold"
                      >
                        Contact@matchyplus.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 text-sm text-neutral-700">
                    <span className="text-brand-teal grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100">
                      <Phone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-muted-foreground text-xs">{t.directContact}</p>
                      <a href="tel:+21694670292" className="hover:text-brand-teal font-semibold">
                        +216 94 670 292
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-blue/5 border-brand-blue/10 mt-8 rounded-2xl border p-4">
                <p className="text-brand-navy/80 text-xs leading-relaxed font-medium">
                  {t.turnaroundNotice}
                </p>
              </div>
            </div>

            {/* Right side form */}
            <div className="md:col-span-7">
              {submitted ? (
                <div className="bg-brand-teal/5 border-brand-teal/20 flex h-full min-h-[340px] flex-col items-center justify-center rounded-2xl border p-8 text-center">
                  <div className="bg-brand-teal shadow-brand-teal/30 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg">
                    ✓
                  </div>
                  <h3 className="text-brand-navy mt-4 text-xl font-bold">{t.sent}</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                    {t.sentSub.replace('{email}', form.email || '...')}
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', phone: '', message: '' });
                    }}
                    className="text-brand-teal mt-6 text-sm font-semibold hover:underline"
                  >
                    {t.sendAnother}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-brand-navy mb-1.5 block text-xs font-bold">
                      {t.name}
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t.name}
                      className="focus:border-brand-teal focus:ring-brand-teal/20 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:bg-white focus:ring-2 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-brand-navy mb-1.5 block text-xs font-bold">
                        {t.email}
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="nom@exemple.com"
                        className="focus:border-brand-teal focus:ring-brand-teal/20 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:bg-white focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-brand-navy mb-1.5 block text-xs font-bold">
                        {t.phone}
                      </label>
                      <div className="flex items-center gap-2">
                        <CountryCodeSelector
                          value={countryCode}
                          onChange={setCountryCode}
                          locale={locale}
                          disabled={loading}
                        />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="-- --- ---"
                          className="focus:border-brand-teal focus:ring-brand-teal/20 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:bg-white focus:ring-2 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-brand-navy mb-1.5 block text-xs font-bold">
                      {t.message}
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder={t.message}
                      className="focus:border-brand-teal focus:ring-brand-teal/20 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:bg-white focus:ring-2 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-brand-blue shadow-brand-blue/20 hover:bg-brand-blue/90 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
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

import { SubpageHero } from '@/components/subpage-hero';
import Link from 'next/link';

import styles from './about.module.css';
import type { AboutContent } from './types';

type Props = {
  content: AboutContent;
  /** Replace the sign-up links of the "find a professional" / "offer my services" buttons. */
  customerHref?: string;
  professionalHref?: string;
};

export default function AboutPage({ content, customerHref, professionalHref }: Props) {
  const actionHref = (index: number, fallback: string) =>
    index === 0 ? (customerHref ?? fallback) : (professionalHref ?? fallback);

  return (
    <main className={styles.page}>
      <SubpageHero
        eyebrow={content.hero.eyebrow}
        title={content.hero.title}
        subtitle={content.hero.text}
      >
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          {content.hero.actions.map((action, index) => (
            <Link
              key={action.label}
              href={actionHref(index, action.href)}
              className={
                index === 0
                  ? 'text-brand-blue inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-bold shadow-xl shadow-black/10 transition-all hover:scale-[1.03] sm:text-base'
                  : 'inline-flex items-center justify-center rounded-full border border-white/50 bg-white/15 px-7 py-3.5 text-sm font-semibold text-white shadow-md backdrop-blur-md transition-all hover:scale-[1.03] hover:bg-white/25 sm:text-base'
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </SubpageHero>

      <div className={styles.content}>
        {content.sections.map((section) => (
          <section key={section.id} className={styles.textSection}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}

        <section aria-labelledby="about-principles-title">
          <h2 id="about-principles-title">{content.principles.title}</h2>
          <div className={styles.values}>
            {content.principles.items.map((item) => (
              <article key={item.id} className={styles.card}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="about-faq-title">
          <h2 id="about-faq-title">{content.faq.title}</h2>
          {content.faq.items.map((item) => (
            <details key={item.id}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>

        <section className={styles.finalCta}>
          <h2>{content.finalCta.title}</h2>
          <p>{content.finalCta.text}</p>
          <div className={styles.actions}>
            {content.finalCta.actions.map((action, index) => (
              <Link
                key={action.label}
                className={styles.secondary}
                href={actionHref(index, action.href)}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

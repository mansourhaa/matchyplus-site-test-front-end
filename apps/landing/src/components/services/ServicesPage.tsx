import { SubpageHero } from '@/components/subpage-hero';
import Link from 'next/link';

import styles from './services.module.css';
import type { ServicesContent } from './types';

type Props = {
  content: ServicesContent;
  /** Replace the app sign-up / sign-in links the JSON points to. */
  signupHref?: string;
  loginHref?: string;
};

export default function ServicesPage({ content, signupHref, loginHref }: Props) {
  const href = (fallback: string) =>
    fallback.includes('/connexion') ? (loginHref ?? fallback) : (signupHref ?? fallback);

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
              href={href(action.href)}
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

      <div className={styles.body}>
        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2>{content.popular.title}</h2>
            <p>{content.popular.text}</p>
          </div>
          <div className={styles.grid}>
            {content.popular.services.map((service) => (
              <article key={service.id} className={styles.card}>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <ul>
                  {service.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link href={href(service.action.href)}>{service.action.label}</Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2>{content.howItWorks.title}</h2>
          </div>
          <div className={styles.steps}>
            {content.howItWorks.steps.map((step) => (
              <article key={step.id} className={styles.step}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.block} ${styles.band}`}>
          <div>
            <h2>{content.professionalCta.title}</h2>
            <p>{content.professionalCta.text}</p>
          </div>
          <Link className={styles.primary} href={href(content.professionalCta.action.href)}>
            {content.professionalCta.action.label}
          </Link>
        </section>

        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2>{content.clarity.title}</h2>
            <p>{content.clarity.text}</p>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2>{content.cities.title}</h2>
            <p>{content.cities.text}</p>
          </div>
          <div className={styles.cities}>
            {content.cities.items.map((city) => (
              <span className={styles.city} key={city}>
                {city}
              </span>
            ))}
          </div>
        </section>

        <section className={`${styles.block} ${styles.faq}`}>
          <div className={styles.sectionHead}>
            <h2>{content.faq.title}</h2>
          </div>
          {content.faq.items.map((item) => (
            <details key={item.id}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>

        <section className={styles.final}>
          <h2>{content.finalCta.title}</h2>
          <p>{content.finalCta.text}</p>
          <div className={styles.actions}>
            {content.finalCta.actions.map((action) => (
              <Link className={styles.secondary} href={href(action.href)} key={action.label}>
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

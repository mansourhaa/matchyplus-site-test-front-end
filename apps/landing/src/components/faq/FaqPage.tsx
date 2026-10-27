'use client';

import { SubpageHero } from '@/components/subpage-hero';
import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

import styles from './faq.module.css';
import type { FaqContent, SupportedLocale } from './types';

type Props = {
  locale: SupportedLocale;
  content: FaqContent;
  /** Replaces the contact link of the closing block (the JSON holds a locale-less `/contact`). */
  contactHref?: string;
};

function normalize(value: string, locale: SupportedLocale) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase(locale)
    .trim();
}

export default function FaqPage({ locale, content, contactHref }: Props) {
  const rootId = useId().replace(/:/g, '');
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const term = normalize(query, locale);

  const categories = useMemo(() => {
    if (!term) return content.categories;
    return content.categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          normalize(`${item.question} ${item.answer}`, locale).includes(term),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [content.categories, locale, term]);

  const toggle = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <main className={styles.page}>
      <SubpageHero title={content.hero.title} subtitle={content.hero.introduction} />

      <div className={styles.body}>
        <div className={styles.search}>
          <label htmlFor={`${rootId}-search`}>{content.search.label}</label>
          <input
            id={`${rootId}-search`}
            type="search"
            value={query}
            placeholder={content.search.placeholder}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <p className={styles.status} role="status" aria-live="polite">
          {term && categories.length === 0 ? content.search.noResults : ''}
        </p>

        {categories.map((category) => (
          <section
            key={category.id}
            className={styles.category}
            aria-labelledby={`${rootId}-${category.id}`}
          >
            <h2 id={`${rootId}-${category.id}`}>{category.title}</h2>
            {category.items.map((item) => {
              const uid = `${rootId}-${locale}-${item.id}`;
              const open = openIds.has(item.id);
              return (
                <article key={item.id} className={styles.item}>
                  <h3>
                    <button
                      id={`${uid}-button`}
                      type="button"
                      aria-expanded={open}
                      aria-controls={`${uid}-panel`}
                      className={styles.trigger}
                      onClick={() => toggle(item.id)}
                    >
                      <span>{item.question}</span>
                      <span aria-hidden="true" className={styles.icon}>
                        {open ? '−' : '+'}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`${uid}-panel`}
                    role="region"
                    aria-labelledby={`${uid}-button`}
                    hidden={!open}
                    className={styles.answer}
                  >
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </section>
        ))}

        <aside className={styles.cta}>
          <h2>{content.contact.title}</h2>
          <p>{content.contact.description}</p>
          <Link href={contactHref ?? content.contact.href}>{content.contact.label}</Link>
        </aside>
      </div>
    </main>
  );
}

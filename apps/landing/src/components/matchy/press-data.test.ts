import { SUPPORTED_LOCALES } from '@/features/i18n/messages';
import { describe, expect, it } from 'vitest';

import {
  PRESS_ITEMS,
  pressDate,
  pressDateValue,
  pressItem,
  pressItems,
  youtubeId,
} from './press-data';

describe('press items', () => {
  it('have unique URL-safe slugs, a valid date and every text in every language', () => {
    expect(new Set(PRESS_ITEMS.map((item) => item.slug)).size).toBe(PRESS_ITEMS.length);
    for (const item of PRESS_ITEMS) {
      expect(item.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(item.date).toMatch(/^\d{4}(-\d{2}(-\d{2})?)?$/);
      expect(pressDate(item.date, 'fr').full).not.toMatch(/Invalid/);
      for (const locale of SUPPORTED_LOCALES) {
        const text = item.text[locale];
        for (const value of [text.tag, text.title, text.place, text.summary, text.intro]) {
          expect(value.trim()).not.toBe('');
        }
        expect(text.sections.length).toBeGreaterThan(0);
        for (const section of text.sections) {
          expect(section.heading.trim()).not.toBe('');
          expect(section.text.trim()).not.toBe('');
        }
        // a cover always says what it shows
        if (item.cover) expect(text.coverAlt?.trim()).toBeTruthy();
      }
      if (item.video) expect(youtubeId(item.video)).not.toBeNull();
      if (item.linkedin) expect(item.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\//);
    }
  });

  it('are listed newest first and found by slug', () => {
    const dates = pressItems().map((item) => item.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(pressItem(PRESS_ITEMS[0].slug)).toBe(PRESS_ITEMS[0]);
    expect(pressItem('missing')).toBeUndefined();
  });
});

describe('youtubeId', () => {
  it('reads the usual YouTube links', () => {
    for (const link of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(youtubeId(link)).toBe('dQw4w9WgXcQ');
    }
  });

  it('refuses anything else, so a wrong link never embeds another site', () => {
    for (const link of [
      undefined,
      '',
      'not a link',
      'https://vimeo.com/123456',
      'https://evil.example/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/channel/UC123',
    ]) {
      expect(youtubeId(link)).toBeNull();
    }
  });
});

describe('pressDate', () => {
  it('gives the same calendar day in every language', () => {
    expect(pressDate('2026-11-12', 'fr').big).toBe('12');
    expect(pressDate('2026-11-12', 'fr').top).toBe('nov.');
    expect(pressDate('2026-11-12', 'en').full).toBe('Nov 12, 2026');
    expect(pressDate('2026-01-01', 'fr').full).toBe('1 janv. 2026');
  });

  it('shows a month-only date as the month and year, without inventing a day', () => {
    expect(pressDate('2026-06', 'fr')).toEqual({ top: '2026', big: 'juin', full: 'juin 2026' });
    expect(pressDate('2026-06', 'en').full).toBe('June 2026');
  });

  it('reads a day, month or year-only date as its first day, at noon UTC', () => {
    expect(pressDateValue('2026-11-22').toISOString()).toBe('2026-11-22T12:00:00.000Z');
    expect(pressDateValue('2026-06').toISOString()).toBe('2026-06-01T12:00:00.000Z');
    expect(pressDateValue('2026').toISOString()).toBe('2026-01-01T12:00:00.000Z');
  });

  it('shows a year-only date as the year alone', () => {
    expect(pressDate('2026', 'fr')).toEqual({ top: '', big: '2026', full: '2026' });
    expect(pressDate('2026', 'ar').full).toBe(pressDate('2026', 'fr').full);
  });
});

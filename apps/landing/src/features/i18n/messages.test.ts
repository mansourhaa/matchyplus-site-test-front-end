import { describe, expect, it } from 'vitest';

import { asList, asRows, getMessage, messages } from './messages';

describe('asList', () => {
  it('keeps a list of texts and refuses anything else', () => {
    expect(asList(['a', 'b'])).toEqual(['a', 'b']);
    expect(asList('text')).toEqual([]);
    expect(asList(undefined)).toEqual([]);
    expect(asList(['a', ['b']])).toEqual(['a']);
  });
});

describe('asRows', () => {
  it('keeps rows of texts and refuses anything else', () => {
    expect(asRows([['a', 'b'], ['c']])).toEqual([['a', 'b'], ['c']]);
    expect(asRows(['not a row'])).toEqual([]);
    expect(asRows(undefined)).toEqual([]);
  });

  it('reads the real landing tables', () => {
    expect(asRows(getMessage(messages.fr, 'landing.steps')).length).toBeGreaterThan(0);
    expect(asList(getMessage(messages.ar, 'landing.heroPhoneTabs'))).toHaveLength(4);
  });
});

describe('texts ready for production', () => {
  /** Every string of a message tree, flattened. */
  const strings = (value: unknown): string[] =>
    typeof value === 'string'
      ? [value]
      : Array.isArray(value)
        ? value.flatMap(strings)
        : value && typeof value === 'object'
          ? Object.values(value).flatMap(strings)
          : [];

  it('contain no "[placeholder]" left to fill, in any language', () => {
    for (const tree of Object.values(messages)) {
      expect(strings(tree).filter((text) => /\[[^\]]+\]/.test(text))).toEqual([]);
    }
  });
});

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

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.join(__dirname, file), 'utf8');

describe('fonts', () => {
  it('Arabic pages use Cairo, French and English use Baloo 2', () => {
    const css = read('globals.css');
    expect(css).toMatch(/body \{[^}]*font-family: var\(--font-baloo\)/);
    expect(css).toMatch(/html\[dir='rtl'\] body \{[^}]*font-family: var\(--font-cairo\)/);
  });

  it('the body only gets the font variables, no font class that would override the Arabic rule', () => {
    const layout = read('[lang]/layout.tsx');
    expect(layout).toContain('className={`${baloo.variable} ${cairo.variable}`}');
    expect(layout).not.toContain('baloo.className');
    expect(layout).not.toContain('cairo.className');
  });
});

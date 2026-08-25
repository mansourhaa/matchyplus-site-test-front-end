import type { AdminManagedUser, AdminUserFilters } from '@/features/admin-users/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminUsersSection, buildCsv } from './admin-users-section';

afterEach(() => {
  cleanup();
});

function buildUser(overrides: Partial<AdminManagedUser> = {}): AdminManagedUser {
  return {
    id: 'u1',
    name: 'Karim B.',
    email: 'karim.b@email.com',
    role: 'USER',
    status: 'ACTIVE',
    plan: 'PREMIUM',
    phone: null,
    job: 'Électricien',
    category: 'Électricité',
    city: 'Sfax',
    bio: null,
    image: null,
    interests: [],
    languages: [],
    contact_modes: [],
    experience: null,
    schedule: null,
    price: null,
    rating: 0,
    reviews: 0,
    matches: 3,
    missions: 0,
    total_earnings: 0,
    last_login: null,
    create_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const FILTERS: AdminUserFilters = { search: '', plan: 'all', status: 'all', category: 'all' };

function renderSection(
  users: AdminManagedUser[],
  overrides: {
    filters?: AdminUserFilters;
    categories?: string[];
    onFiltersChange?: () => void;
  } = {},
) {
  return render(
    <AdminUsersSection
      users={users}
      filters={overrides.filters ?? FILTERS}
      loading={false}
      categories={overrides.categories ?? []}
      onFiltersChange={overrides.onFiltersChange ?? vi.fn()}
      onOpenUser={vi.fn()}
      onDeleteUser={vi.fn()}
      onAddUser={vi.fn()}
    />,
  );
}

describe('buildCsv', () => {
  it('separates fields with semicolons, matching French Excel locale', () => {
    const csv = buildCsv([buildUser()]);
    const [, dataLine] = csv.split('\n');

    expect(dataLine.split(';')).toHaveLength(10);
    expect(dataLine).toContain('"Karim B."');
    expect(dataLine).toContain('"Premium"');
  });

  it('escapes embedded quotes without breaking the column count', () => {
    const csv = buildCsv([buildUser({ name: 'Sami "Le Pro" Ayari' })]);
    const [, dataLine] = csv.split('\n');

    expect(dataLine).toContain('"Sami ""Le Pro"" Ayari"');
    expect(dataLine.split(';')).toHaveLength(10);
  });
});

describe('AdminUsersSection', () => {
  it('shows a fallback label for a member with no job or category', () => {
    renderSection([buildUser({ job: null, category: null, name: 'Utilisateur' })]);

    // Scoped to a <p>: the domain filter's "no category" option shares this exact label.
    expect(screen.getByText('Membre Matchy+', { selector: 'p' })).toBeInTheDocument();
  });

  it('lists real category names as domain filter options', () => {
    renderSection([buildUser()], { categories: ['Électricité', 'Ménage'] });

    const select = screen.getByLabelText('Filtrer par rôle ou domaine');
    expect(screen.getByRole('option', { name: 'Tous' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Électricité' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ménage' })).toBeInTheDocument();
    expect(select).toBeInTheDocument();
  });

  it('reports the selected domain back to the caller', () => {
    const onFiltersChange = vi.fn();
    renderSection([buildUser()], { categories: ['Électricité'], onFiltersChange });

    fireEvent.change(screen.getByLabelText('Filtrer par rôle ou domaine'), {
      target: { value: 'Électricité' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith({ category: 'Électricité' });
  });
});

describe('AdminUsersSection export', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Regression: Excel picks its CSV delimiter from the OS list-separator setting, not from
  // the file — a semicolon-delimited file opened on a comma-locale machine collapsed every
  // field into column A. The exported file must carry a `sep=;` directive (and a UTF-8 BOM,
  // so accented names don't come out as mojibake) to be self-describing for Excel.
  it('prefixes the downloaded file with a UTF-8 BOM and a sep=; directive', () => {
    // Blob content, not the Blob instance, is what we actually need to inspect — reading it
    // back out through Blob/Response.text() strips the very BOM byte we're asserting on
    // (per the Encoding Standard's UTF-8 decode algorithm), so capture the raw string instead.
    let exportedText: string | null = null;
    const OriginalBlob = globalThis.Blob;
    class CapturingBlob extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        exportedText = parts.join('');
      }
    }
    vi.stubGlobal('Blob', CapturingBlob);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:mock-url',
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} });

    renderSection([buildUser()]);
    fireEvent.click(screen.getByRole('button', { name: 'Exporter' }));

    expect(exportedText).not.toBeNull();
    expect(exportedText!.charCodeAt(0)).toBe(0xfeff);
    expect(exportedText!.slice(1)).toMatch(/^sep=;\r\n/);
    expect(exportedText).toContain('"Karim B."');

    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });
});

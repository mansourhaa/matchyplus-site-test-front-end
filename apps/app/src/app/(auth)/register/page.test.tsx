import { describe, expect, it, vi } from 'vitest';

import RegisterPage from './page';

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

describe('RegisterPage', () => {
  it('redirects to /onboarding when there is no next param', async () => {
    await RegisterPage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).toHaveBeenCalledWith('/onboarding');
  });

  it('forwards a safe next param onto /onboarding, for old bookmarked deep links', async () => {
    await RegisterPage({ searchParams: Promise.resolve({ next: '/matches' }) });

    expect(redirectMock).toHaveBeenCalledWith('/onboarding?next=%2Fmatches');
  });

  it('drops an unsafe next param instead of forwarding it', async () => {
    await RegisterPage({ searchParams: Promise.resolve({ next: '/login' }) });

    expect(redirectMock).toHaveBeenCalledWith('/onboarding');
  });
});

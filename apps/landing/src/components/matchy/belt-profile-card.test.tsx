// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type BeltProfile, BeltProfileCard, confidenceTier } from './belt-profile-card';

const profile: BeltProfile = {
  name: 'Youssef B.',
  age: '27',
  distanceKm: '2,4',
  rating: '4,8',
  reviews: '132',
  score: 88,
  price: '25',
  bio: 'Plombier depuis 8 ans.',
  tags: ['Dépannage urgent', 'Sanitaire'],
};

const labels = {
  role: 'Plombier',
  available: 'Disponible',
  seeDetails: 'Voir détails',
  ai: 'IA',
  confidence: 'Très compatible',
  distance: 'à 2,4 km',
  price: '25 DT/h',
  pass: 'Passer',
  like: 'Connecter',
  close: 'Fermer',
  sample: "Profil d'exemple",
};

function renderCard() {
  const handlers = { onPass: vi.fn(), onLike: vi.fn(), onClose: vi.fn() };
  render(
    <BeltProfileCard
      image={{ src: '/matchy/belt/plumber.webp', width: 439, height: 934 }}
      profile={profile}
      labels={labels}
      detailsHref="https://app.matchyplus.com/register"
      titleId="card-title"
      // reduced motion skips the fly-out animation, so the actions fire right away
      reduceMotion
      closeRef={createRef<HTMLButtonElement>()}
      {...handlers}
    />,
  );
  return handlers;
}

describe('confidenceTier', () => {
  it('uses the same thresholds as the app (75 / 55)', () => {
    expect(confidenceTier(100)).toBe(0);
    expect(confidenceTier(75)).toBe(0);
    expect(confidenceTier(74)).toBe(1);
    expect(confidenceTier(55)).toBe(1);
    expect(confidenceTier(54)).toBe(2);
    expect(confidenceTier(0)).toBe(2);
  });
});

describe('BeltProfileCard', () => {
  it('shows the profile like the app card', () => {
    renderCard();
    expect(screen.getByRole('dialog', { name: 'Youssef B., 27' })).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('Très compatible')).toBeInTheDocument();
    expect(screen.getByText('25 DT/h')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voir détails/ })).toHaveAttribute(
      'href',
      'https://app.matchyplus.com/register',
    );
  });

  it('"Passer" calls onPass only', () => {
    const { onPass, onLike } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect(onPass).toHaveBeenCalledTimes(1);
    expect(onLike).not.toHaveBeenCalled();
  });

  it('"Connecter" calls onLike only', () => {
    const { onPass, onLike } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Connecter' }));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onPass).not.toHaveBeenCalled();
  });

  it('the close button calls onClose', () => {
    const { onClose } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

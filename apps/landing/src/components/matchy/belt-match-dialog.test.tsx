// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BeltMatchDialog } from './belt-match-dialog';

function renderDialog() {
  const handlers = { onDismiss: vi.fn(), onContinue: vi.fn() };
  render(
    <BeltMatchDialog
      image={{ src: '/matchy/belt/plumber-v2.webp', width: 507, height: 1100 }}
      labels={{
        title: "C'est un match !",
        body: 'Créez votre compte gratuit pour discuter avec Youssef B.',
        cta: 'Créer mon compte gratuit',
        continue: 'Continuer à découvrir',
      }}
      registerHref="https://app.matchyplus.com/register"
      reduceMotion
      {...handlers}
    />,
  );
  return {
    ...handlers,
    cta: screen.getByRole('link', { name: /Créer mon compte gratuit/ }),
    continueButton: screen.getByRole('button', { name: 'Continuer à découvrir' }),
  };
}

describe('BeltMatchDialog', () => {
  it('is a labelled modal with the sign-up link', () => {
    const { cta } = renderDialog();
    const dialog = screen.getByRole('alertdialog', { name: "C'est un match !" });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(cta).toHaveAttribute('href', 'https://app.matchyplus.com/register');
  });

  it('a click on the backdrop closes it, without opening the next pro', () => {
    const { onDismiss, onContinue } = renderDialog();
    fireEvent.click(screen.getByTestId('belt-match-backdrop'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('a click inside the white box does not close it', () => {
    const { onDismiss } = renderDialog();
    fireEvent.click(screen.getByText("C'est un match !"));
    fireEvent.click(screen.getByText(/Youssef B\./));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Escape closes it', () => {
    const { onDismiss } = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('"Continuer à découvrir" calls onContinue', () => {
    const { continueButton, onContinue, onDismiss } = renderDialog();
    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('starts with focus on the sign-up link', () => {
    const { cta } = renderDialog();
    expect(cta).toHaveFocus();
  });

  it('keeps keyboard focus inside the box (Tab and Shift+Tab wrap around)', () => {
    const { cta, continueButton } = renderDialog();

    continueButton.focus();
    fireEvent.keyDown(continueButton, { key: 'Tab' });
    expect(cta).toHaveFocus();

    fireEvent.keyDown(cta, { key: 'Tab', shiftKey: true });
    expect(continueButton).toHaveFocus();
  });
});

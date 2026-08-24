import { I18nProvider } from '@/features/i18n/i18n-provider';
import {
  generateIcebreakers,
  getFirstName,
  getShortDisplayName,
} from '@/features/messaging/lib/icebreakers';
import type { ConversationPeer } from '@/features/messaging/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatIcebreakers } from './chat-icebreakers';

const mockPeer: ConversationPeer = {
  id: 'peer-1',
  name: 'Sarah Mansour',
  image: null,
  bio: 'Développeuse Web',
  job: 'Développeuse Full-Stack',
  category: 'Tech',
  city: 'Tunis',
  interests: ['React', 'Node.js'],
  goals: ['Collaborer sur un projet'],
  activity_sector: 'Tech',
  service_type: 'Web Development',
};

describe('generateIcebreakers utility', () => {
  it('extracts first name and short display name properly', () => {
    expect(getFirstName('Sarah Mansour')).toBe('Sarah');
    expect(getShortDisplayName('Sarah Mansour')).toBe('Sarah M.');
    expect(getShortDisplayName('Sarah')).toBe('Sarah');
    expect(getShortDisplayName('')).toBe('');
  });

  it('generates the 3 service and availability suggestions in French', () => {
    const suggestions = generateIcebreakers(mockPeer, 'fr');
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]?.text).toContain('Bonjour Sarah, je suis intéressé(e) par vos services');
    expect(suggestions[1]?.text).toBe('Quelles sont vos disponibilités cette semaine ?');
    expect(suggestions[2]?.text).toBe('Pouvez-vous me donner plus de détails sur vos tarifs ?');
  });

  it('generates suggestions in English', () => {
    const suggestions = generateIcebreakers(mockPeer, 'en');
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]?.text).toContain("Hi Sarah, I'm interested in your services");
    expect(suggestions[1]?.text).toBe('What is your availability this week?');
    expect(suggestions[2]?.text).toBe('Could you give me more details about your rates?');
  });

  it('generates suggestions in Arabic', () => {
    const suggestions = generateIcebreakers(mockPeer, 'ar');
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]?.text).toContain('مرحباً Sarah، أنا مهتم بخدماتك');
    expect(suggestions[1]?.text).toBe('ما هي أوقات تواجدك هذا الأسبوع؟');
    expect(suggestions[2]?.text).toBe('هل يمكنك إعطائي تفاصيل أكثر عن أسعارك؟');
  });
});

describe('ChatIcebreakers component', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  it('renders avatar, match title, subtitle and 3 pill buttons matching the design', () => {
    const handleSelect = vi.fn();
    render(
      <I18nProvider>
        <ChatIcebreakers peer={mockPeer} onSelect={handleSelect} />
      </I18nProvider>,
    );

    expect(screen.getByText('Nouveau match avec Sarah M. !')).toBeInTheDocument();
    expect(screen.getByText('Envoyez votre premier message 👋')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    // Click first suggestion
    fireEvent.click(buttons[0]);
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      'Bonjour Sarah, je suis intéressé(e) par vos services 😊',
    );
  });

  it('renders in English when locale is set to en', () => {
    const handleSelect = vi.fn();
    window.localStorage.setItem('matchy_locale', 'en');
    render(
      <I18nProvider>
        <ChatIcebreakers peer={mockPeer} onSelect={handleSelect} />
      </I18nProvider>,
    );

    expect(screen.getByText('New match with Sarah M. !')).toBeInTheDocument();
    expect(screen.getByText('Send your first message 👋')).toBeInTheDocument();
  });

  it('disables suggestion buttons when disabled is true', () => {
    const handleSelect = vi.fn();
    render(
      <I18nProvider>
        <ChatIcebreakers peer={mockPeer} onSelect={handleSelect} disabled />
      </I18nProvider>,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    fireEvent.click(buttons[0]);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});

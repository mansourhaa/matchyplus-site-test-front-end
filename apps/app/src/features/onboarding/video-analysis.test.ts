import { describe, expect, it } from 'vitest';

import { INDUSTRY_KEYS } from './constants';
import {
  aiFieldUpdate,
  applyRelabel,
  inPageScript,
  parseAvailability,
  parseLanguages,
  suggestionsFromAnalysis,
  tagsForService,
  videoInterests,
} from './video-analysis';

const fill = (value: string, label?: string) => ({ value, label: label ?? null, status: 'fill' });

describe('video-analysis', () => {
  it('maps a French analysis to the onboarding fields', () => {
    const result = {
      ok: true,
      profile: {
        first_name: fill('Hela'),
        last_name: fill('Ben Salah'),
        profession: fill('menage.aide_menagere', 'Aide ménagère'),
        bio: fill('Aide ménagère à Sousse, 5 ans d’expérience.'),
        sector_id: fill('10', 'Services Locaux & Artisanat'),
        usage_type: fill('provider'),
        city: fill('Sousse'),
        price: fill('20 DT'),
        availability: fill('du lundi au vendredi · matin'),
        spoken_languages: fill('arabe, français'),
      },
    };

    expect(suggestionsFromAnalysis(result, 'fr')).toEqual({
      firstName: 'Hela',
      lastName: 'Ben Salah',
      job: 'Aide ménagère',
      bio: 'Aide ménagère à Sousse, 5 ans d’expérience.',
      industry: 'local_services_trades',
      offerService: true,
      city: 'Sousse',
      price: '20',
      availabilityDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
      availabilityHours: ['morning'],
      languages: ['ar', 'fr'],
      interestTags: ['Ménage'],
      serviceType: 'Aide ménagère',
      homeService: true,
    });
  });

  it('keeps only the fields the voice service is sure about', () => {
    const result = {
      ok: true,
      profile: {
        first_name: { value: 'Randa', status: 'suggest' },
        last_name: { value: '', status: 'fill' },
        profession: fill('pro.chef_projet', 'مدير مشروع'),
      },
    };

    // « Randa » is only proposed, and in Latin letters: not shown on the Arabic page.
    expect(suggestionsFromAnalysis(result, 'ar')).toEqual({
      job: 'مدير مشروع',
      serviceType: 'Services & missions / Consulting',
    });
  });

  it('returns nothing for a failed analysis', () => {
    expect(suggestionsFromAnalysis({ ok: false, error: 'NO_SPEECH_DETECTED' }, 'fr')).toEqual({});
    expect(suggestionsFromAnalysis(null, 'fr')).toEqual({});
  });

  it('reads availability in the three languages', () => {
    expect(parseAvailability('من الاثنين إلى الجمعة · مساءً', 'ar')).toEqual({
      days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
      hours: ['evening'],
    });
    expect(parseAvailability('every day', 'en').days).toHaveLength(7);
    expect(parseAvailability('samedi, dimanche · après-midi', 'fr')).toEqual({
      days: ['Sam', 'Dim'],
      hours: ['afternoon'],
    });
  });

  it('keeps only the amount of the price', () => {
    const analysis = (price: string) => ({ ok: true, profile: { price: fill(price) } });
    expect(suggestionsFromAnalysis(analysis('٢٠ د.ت'), 'ar').price).toBe('20');
    expect(suggestionsFromAnalysis(analysis('35,5 DT'), 'fr').price).toBe('35.5');
    expect(suggestionsFromAnalysis(analysis('à discuter'), 'fr').price).toBeUndefined();
  });

  it('reads spoken languages in the three languages', () => {
    expect(parseLanguages('العربية، الفرنسية', 'ar')).toEqual(['ar', 'fr']);
    expect(parseLanguages('Arabic, English', 'en')).toEqual(['ar', 'en']);
  });
});

describe('page-language switch', () => {
  it('replaces only the text fields, and drops one the voice service could not write', () => {
    const arabic = {
      job: 'معينة منزلية',
      bio: 'نخدم معينة منزلية',
      industry: INDUSTRY_KEYS[1],
      price: '50',
    };

    expect(
      applyRelabel(
        arabic,
        {
          profession: { value: 'Aide ménagère' },
          bio: { value: null, review: true },
        },
        'fr',
      ),
    ).toEqual({ job: 'Aide ménagère', industry: INDUSTRY_KEYS[1], price: '50' });
  });

  it('keeps what the person typed and follows the AI values they did not touch', () => {
    const next = aiFieldUpdate(
      { job: 'معينة منزلية', city: 'سوسة' },
      { job: 'Aide ménagère', city: 'Sousse' },
    );

    expect(next('معينة منزلية', 'job')).toBe('Aide ménagère');
    expect(next('Monastir', 'city')).toBe('Monastir');
    expect(next('', 'city')).toBe('Sousse');
  });
});

describe('proposals (2.0.8 « suggest » chips)', () => {
  it('proposes a job the AI is not sure about, instead of dropping it', () => {
    const result = {
      ok: true,
      profile: {
        profession: {
          value: 'مهندسة إعلامية',
          status: 'suggest',
          alternatives: [{ value: 'مبرمجة', label: 'مبرمجة' }],
        },
        first_name: {
          value: 'نادية',
          status: 'fill',
          alternatives: [
            { value: 'ناديا', label: 'ناديا' },
            { value: 'Nadia', label: 'Nadia' },
          ],
        },
        sector_id: { value: 6, status: 'suggest' },
      },
    };

    const suggestions = suggestionsFromAnalysis(result, 'ar');

    expect(suggestions.job).toBeUndefined();
    expect(suggestions.firstName).toBe('نادية');
    expect(suggestions.industry).toBe(INDUSTRY_KEYS[5]);
    expect(suggestions.proposals).toEqual({
      job: ['مهندسة إعلامية', 'مبرمجة'],
      firstName: ['ناديا'],
    });
  });

  it('keeps proposals in the page alphabet after a language switch', () => {
    const next = applyRelabel(
      { job: 'معينة منزلية', proposals: { job: ['منظفة'] } },
      { profession: { value: 'Aide ménagère' } },
      'fr',
      { profession: [{ value: 'Femme de ménage', label: 'Femme de ménage' }, { value: 'منظفة' }] },
    );

    expect(next).toEqual({ job: 'Aide ménagère', proposals: { job: ['Femme de ménage'] } });
  });

  it('only accepts text in the page alphabet', () => {
    expect(inPageScript('مهندسة', 'ar')).toBe(true);
    expect(inPageScript('Nadia', 'ar')).toBe(false);
    expect(inPageScript('Nadia', 'en')).toBe(true);
    expect(inPageScript('نادية', 'fr')).toBe(false);
  });
});

describe('step 2 tags from the job heard in the video', () => {
  it('maps a job to catalogue interests, a service type and home service', () => {
    expect(tagsForService('batiment.plomberie')).toEqual({
      interests: ['Plomberie', 'Bricolage'],
      serviceType: 'Jardinage / Bricolage',
      homeService: true,
    });
    expect(tagsForService('tech.ingenieur_info')).toEqual({
      interests: ['Informatique'],
      serviceType: 'Informatique / Tech',
      homeService: undefined,
    });
    expect(tagsForService('', '3')).toEqual({ interests: ['Informatique'] });
    expect(tagsForService('inconnu.metier', '10')).toEqual({ interests: [] });
  });

  it('also uses a job the AI only proposes', () => {
    const result = {
      ok: true,
      profile: {
        profession: { value: 'tech.ingenieur_info', label: 'مهندسة إعلامية', status: 'suggest' },
      },
    };

    expect(suggestionsFromAnalysis(result, 'ar')).toMatchObject({
      interestTags: ['Informatique'],
      serviceType: 'Informatique / Tech',
      proposals: { job: ['مهندسة إعلامية'] },
    });
  });
});

describe('interests added from the video', () => {
  it('writes them in the page language, never in another alphabet', () => {
    const suggestions = { job: 'عاملة تنظيف', interestTags: ['Ménage', 'Bricolage'] };

    expect(videoInterests(suggestions, 'ar')).toEqual(['عاملة تنظيف', 'نظافة', 'أعمال يدوية']);
    expect(videoInterests({ ...suggestions, job: 'Housekeeper' }, 'en')).toEqual([
      'Housekeeper',
      'Cleaning',
      'DIY',
    ]);
    expect(videoInterests(suggestions, 'fr')).toEqual(['Ménage', 'Bricolage']);
  });
});

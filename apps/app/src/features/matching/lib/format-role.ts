import type { MessageTree } from '@/features/i18n/messages';

/**
 * Maps standard/seed job titles and service types to localized strings.
 * Database entries may be in French ('Aide ménagère', 'Restauration / Service', etc.).
 * This helper returns the localized label according to the active language.
 */
export function formatRole(role: string | null | undefined, t: (key: string) => string): string {
  if (!role || !role.trim()) return '';

  const normalized = role.trim();

  // Check direct key match or common patterns
  const roleTranslations: Record<string, string> = {
    // Service types & activities
    'Aide ménagère': t('matching.roles.housekeeper'),
    'Aide Ménagère': t('matching.roles.housekeeper'),
    'Restauration / Service': t('matching.roles.cateringService'),
    'Restauration / Hôtellerie': t('matching.roles.cateringHotel'),
    'Chauffeur / Transport': t('matching.roles.driverTransport'),
    'Chauffeur VTC': t('matching.roles.vtcDriver'),
    'Service à domicile': t('matching.roles.homeService'),
    'Services & missions': t('matching.roles.servicesMissions'),
    'Services & missions / Consulting': t('matching.roles.servicesConsulting'),
    'Jardinage / Bricolage': t('matching.roles.gardeningDiy'),
    "Garde d'enfants": t('matching.roles.childcare'),
    "Garde d'Enfants": t('matching.roles.childcare'),
    "Nounou / Garde d'Enfants": t('matching.roles.nannyChildcare'),
    Nounou: t('matching.roles.nanny'),
    'Informatique / Tech': t('matching.roles.itTech'),
    'Marketing / Communication': t('matching.roles.marketingComm'),
    'BTP / Artisanat': t('matching.roles.constructionCraft'),
    'Finance / Comptabilité': t('matching.roles.financeAccounting'),
    'Santé / Médical': t('matching.roles.healthMedical'),
    'Education / Formation': t('matching.roles.educationTraining'),
    'Transport / Logistique': t('matching.roles.transportLogistics'),
    'Commerce / Vente': t('matching.roles.salesRetail'),
    'Plomberie / Sanitaire': t('matching.roles.plumbingSanitary'),
    'Bâtiment et travaux': t('matching.roles.buildingWorks'),
    Autre: t('matching.roles.other'),

    // Common seed & standard professions
    Directeur: t('matching.roles.director'),
    Directrice: t('matching.roles.directorFemale'),
    'Chef projet': t('matching.roles.projectManager'),
    'Chef de projet': t('matching.roles.projectManager'),
    'Chef Cuisinier': t('matching.roles.chefCook'),
    Cuisinier: t('matching.roles.cook'),
    Électricien: t('matching.roles.electrician'),
    Electricien: t('matching.roles.electrician'),
    Plombier: t('matching.roles.plumber'),
    Mécanicien: t('matching.roles.mechanic'),
    'Mécanicien Auto': t('matching.roles.autoMechanic'),
    Peintre: t('matching.roles.painter'),
    Menuisier: t('matching.roles.carpenter'),
    Maçon: t('matching.roles.mason'),
    Jardinier: t('matching.roles.gardener'),
    Chauffeur: t('matching.roles.driver'),
    Développeur: t('matching.roles.developer'),
    Designer: t('matching.roles.designer'),
    Consultant: t('matching.roles.consultant'),
    Professeur: t('matching.roles.teacher'),
    Avocat: t('matching.roles.lawyer'),
    Comptable: t('matching.roles.accountant'),
    Product: t('matching.roles.product'),
    Founder: t('matching.roles.founder'),
  };

  const translated = roleTranslations[normalized];
  if (translated && translated !== `matching.roles.${normalized}`) {
    return translated;
  }

  return normalized;
}

export const matchyBrand = {
  blue: '#2F76BB',
  teal: '#61BCA6',
  bg: '#F5F7FA',
  activeNav: '#EEF5FF',
  softBlue: '#E8F0FA',
  softTeal: '#E8F7F3',
  text: '#353535',
  textDark: '#1A1A2E',
  muted: '#888',
  mutedLight: '#AAAAAA',
  border: '#F0F0F0',
  borderStrong: '#E0E0E0',
  badge: '#E24E59',
  cardShadow: '#DDE7F4',
  orange: '#F5A623',
  gradient: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
  gradient135: 'linear-gradient(135deg, #61BCA6, #2F76BB)',
} as const;

export function scoreTierColor(score: number) {
  if (score >= 80) return matchyBrand.teal;
  if (score >= 65) return matchyBrand.blue;
  if (score >= 50) return matchyBrand.orange;
  return '#A0A0A0';
}

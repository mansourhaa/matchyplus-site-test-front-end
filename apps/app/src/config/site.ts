import { Home, type LucideIcon, MessageCircle, Search, User } from 'lucide-react';

export const siteConfig = {
  name: 'Matchy+',
  description: 'Professional matching for freelancers and businesses',
  url: 'http://localhost:3000',
};

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    disabled?: boolean;
  }[];
};

/** Primary Matchy nav (sidebar / bottom). */
export const dashboardNav: NavItem[] = [
  { title: 'Home', url: '/home', icon: Home },
  { title: 'Search', url: '/home?tab=search', icon: Search },
  { title: 'Matches', url: '/matches', icon: MessageCircle },
  { title: 'Profile', url: '/settings', icon: User },
];

export const authRoutes = ['/login', '/register'] as const;

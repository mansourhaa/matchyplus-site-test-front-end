import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type AdminLoginSchema = z.infer<typeof adminLoginSchema>;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrateur',
  MODERATOR: 'Moderateur',
  SUPPORT: 'Support',
};

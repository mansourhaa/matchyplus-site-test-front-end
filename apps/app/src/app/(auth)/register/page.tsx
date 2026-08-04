import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { redirect } from 'next/navigation';

// Old bookmarks/shared links may still carry a `next` (e.g. a deep link that sent someone
// to sign up before continuing somewhere) — resolvePostAuthDestination sanitizes it the
// same way every other post-auth redirect does and folds it into the /onboarding URL,
// so it isn't silently dropped here.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(resolvePostAuthDestination(next, false));
}

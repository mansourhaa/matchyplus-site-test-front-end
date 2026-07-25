import { redirect } from 'next/navigation';

// Registration now happens on the onboarding wizard's identity step (account
// bootstrap + profile in one flow) — this keeps any existing /register link/bookmark
// working instead of 404ing.
export default function RegisterPage() {
  redirect('/onboarding');
}

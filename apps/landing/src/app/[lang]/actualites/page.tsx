import { ReducedMotion } from '@/components/matchy/motion';
import { PressList } from '@/components/matchy/press-pages';
import { PageFrame } from '@/components/site-shell';

export default function PressPage() {
  return (
    <PageFrame>
      <ReducedMotion>
        <PressList />
      </ReducedMotion>
    </PageFrame>
  );
}

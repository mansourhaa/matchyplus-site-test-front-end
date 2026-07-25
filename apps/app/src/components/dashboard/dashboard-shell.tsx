'use client';

import { useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect } from 'react';

import { Separator } from '@saas-boilerplate/ui/components/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@saas-boilerplate/ui/components/sidebar';

import { AppSidebar } from './app-sidebar';
import { ThemeToggle } from './theme-toggle';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAppSelector(selectAuth);
  // `user` is null until fetchCurrentUser resolves (see useBootstrapSession) — only
  // redirect once we actually know the profile is incomplete, not during that window.
  const needsOnboarding = Boolean(user && !user.onboarding_completed);

  useEffect(() => {
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [needsOnboarding, router]);

  if (needsOnboarding) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <div className="pr-4">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

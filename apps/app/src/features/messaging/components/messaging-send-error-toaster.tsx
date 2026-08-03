'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { clearToastSendError, selectMessaging } from '@/features/messaging/store/messaging-slice';
import { toast } from '@/lib/toast';
import { useEffect } from 'react';

/** Toasts send/voice failures that finished after the user left the source thread. */
export function MessagingSendErrorToaster() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const toastSendError = useAppSelector(selectMessaging).toastSendError;

  useEffect(() => {
    if (!toastSendError) return;
    toast.error(t(toastSendError.messageKey));
    dispatch(clearToastSendError());
  }, [toastSendError, t, dispatch]);

  return null;
}

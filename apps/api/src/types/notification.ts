import { NotificationType } from '@saas-boilerplate/types';

export type ProfileViewNotificationData = {
  viewerId: string;
  viewerName: string;
  viewerImage: string | null;
};

export type CreateNotificationPayload = {
  userId: string;
  type: 'PROFILE_VIEW';
  data: ProfileViewNotificationData;
};

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  data: Record<string, unknown>;
  read: boolean;
  created_at: Date;
};

export type MarkNotificationReadParams = {
  id: string;
};

export type ProfileViewNotificationData = {
  viewerId: string;
  viewerName: string;
  viewerImage: string | null;
};

export type NotificationItem = {
  id: string;
  type: 'PROFILE_VIEW';
  data: ProfileViewNotificationData;
  read: boolean;
  created_at: string;
};

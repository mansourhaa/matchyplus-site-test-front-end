export type ProfileViewNotificationData = {
  viewerId: string;
  viewerName: string;
  viewerImage: string | null;
};

export type MatchNotificationData = {
  event_type: 'match';
  match_id: string;
  matched_at: string;
  conversation_id: string;
  matched_user_id: string;
  body?: string;
  actor_name?: string;
  actor_image?: string | null;
};

export type MatchRequestNotificationData = {
  event_type: 'match_request';
  title?: string;
  body?: string;
  actor_first_name: string;
  sender_picture: string | null;
  from_user_id: string;
};

export type MessageNotificationData = {
  event_type: 'message';
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_image: string | null;
  preview: string;
};

export type NotificationItem =
  | {
      id: string;
      type: 'PROFILE_VIEW';
      data: ProfileViewNotificationData;
      read: boolean;
      created_at: string;
    }
  | {
      id: string;
      type: 'MATCH';
      data: MatchNotificationData;
      read: boolean;
      created_at: string;
    }
  | {
      id: string;
      type: 'MATCH_REQUEST';
      data: MatchRequestNotificationData;
      read: boolean;
      created_at: string;
    }
  | {
      id: string;
      type: 'MESSAGE';
      data: MessageNotificationData;
      read: boolean;
      created_at: string;
    };

/** Snake_case wire shape matching GET/PUT /notifications/preferences. */
export type NotificationPreferences = {
  all_enabled: boolean;
  matches: boolean;
  messages: boolean;
  views: boolean;
  email: boolean;
};

export type UpdateNotificationPreferencesBody = Partial<NotificationPreferences>;

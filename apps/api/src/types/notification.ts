import { NotificationType } from '@saas-boilerplate/types';

export type ProfileViewNotificationData = {
  viewerId: string;
  viewerName: string;
  viewerImage: string | null;
};

/** Mutual match payload. `event_type` stays on the wire for client compatibility. */
export type MatchNotificationData = {
  event_type: 'match';
  match_id: string;
  matched_at: Date | string;
  conversation_id: string;
  matched_user_id: string;
  body?: string;
  /** Other party's display name — used for email copy when present. */
  actor_name?: string;
  actor_image?: string | null;
};

/** One-sided right-swipe request. Shares the `notification_match` push channel with MATCH. */
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

export type CreateNotificationPayload =
  | {
      userId: string;
      type: 'PROFILE_VIEW';
      data: ProfileViewNotificationData;
    }
  | {
      userId: string;
      type: 'MATCH';
      data: MatchNotificationData;
    }
  | {
      userId: string;
      type: 'MATCH_REQUEST';
      data: MatchRequestNotificationData;
    }
  | {
      userId: string;
      type: 'MESSAGE';
      data: MessageNotificationData;
    };

/** Wire shape for GET/PUT /notifications/preferences (snake_case, like the rest of the API). */
export type NotificationPreferences = {
  all_enabled: boolean;
  matches: boolean;
  messages: boolean;
  views: boolean;
  email: boolean;
};

/** Partial update: only the toggles present in the body are written. */
export type UpdateNotificationPreferencesBody = Partial<NotificationPreferences>;

/** In-app categories gated by `notify_*` columns (email is separate). */
export type NotificationCategory = 'matches' | 'messages' | 'views';

/** JSON-path filter used by serializable dedupe (e.g. profile-view cooldown). */
export type NotificationDedupeKey = {
  path: string[];
  equals: string;
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

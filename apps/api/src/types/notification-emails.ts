/** The notification events that can produce an email, mirroring the reference project. */
export type NotificationEmailKind =
  'message' | 'match' | 'match_request' | 'profile_view' | 'new_profile';

export type NotificationEmailOptions = {
  kind: NotificationEmailKind;
  actorName?: string;
  extraText?: string;
};

/** Rendered content handed to the transport layer. */
export type NotificationEmailPayload = {
  subject: string;
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
};

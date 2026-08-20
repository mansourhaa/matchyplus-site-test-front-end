export type SendContactEmailBody = {
  type?: 'contact' | 'partner' | 'custom';
  name: string;
  email: string;
  phone?: string;
  requestText?: string;
  message?: string;
  activity?: string;
  city?: string;
  subject?: string;
};

export type SendContactEmailResponse = {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
};

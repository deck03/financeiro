export type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
};

export type SendEmailResult = { success: true } | { success: false; error: string };

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

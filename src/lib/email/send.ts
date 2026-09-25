export type Email = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
  /** Stops a retried send from delivering the same email twice. */
  idempotencyKey?: string;
};

/**
 * Sends through Resend's HTTP API. Without credentials — local development —
 * the email is printed instead, so the whole flow works with no account.
 */
export const sendEmail = async (email: Email): Promise<void> => {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(
      [`\n── Email (not sent: AUTH_RESEND_KEY unset) ──`, `To: ${email.to}`, `Subject: ${email.subject}`, "", email.text]
        .concat(email.attachments?.map((a) => `[attachment: ${a.filename}]`) ?? [])
        .join("\n"),
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
      reply_to: email.replyTo,
      attachments: email.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content).toString("base64"),
        content_type: attachment.contentType,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
  }
};

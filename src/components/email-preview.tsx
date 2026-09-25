import type { Email } from "@/lib/email/send";

/**
 * Shows an email as the customer would receive it — for the demo, which never
 * sends one. The HTML is our own template with every customer value escaped,
 * and it renders in a sandboxed iframe with scripts disabled, so its styles
 * can't leak into the page or the page's into it.
 */
export function EmailPreview({ email }: { email: Email }) {
  const invite = email.attachments?.find((attachment) => attachment.filename.endsWith(".ics"));

  return (
    <section aria-labelledby="email-preview-heading" className="mt-10">
      <h2 id="email-preview-heading" className="font-semibold">
        The email your customer receives
      </h2>
      <p className="mt-1 text-sm text-muted">
        This is a demo, so nothing was actually sent. In the live product it goes straight to the
        customer, with a calendar invite attached.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-line px-5 py-3 text-sm">
          <dt className="text-muted">To</dt>
          <dd className="truncate">{email.to}</dd>
          <dt className="text-muted">Subject</dt>
          <dd className="font-medium">{email.subject}</dd>
        </dl>
        <iframe
          title={`Email: ${email.subject}`}
          srcDoc={email.html}
          sandbox=""
          className="block h-[34rem] w-full"
        />
        {invite && (
          <div className="border-t border-line px-5 py-3 text-sm">
            <a
              href={`data:text/calendar;charset=utf-8,${encodeURIComponent(invite.content)}`}
              download={invite.filename}
              className="font-medium text-brand underline"
            >
              Download the calendar invite ({invite.filename})
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

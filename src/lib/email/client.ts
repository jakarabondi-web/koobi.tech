/**
 * Email sending abstraction. In development (no RESEND_API_KEY set) this
 * logs to the console instead of sending — clearly labeled as a mock so it
 * is never mistaken for a working integration.
 */

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ mocked: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[email:mock] RESEND_API_KEY not set — not sending. Would email "${input.subject}" to ${input.to}`
    );
    return { mocked: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Trainora AI <notifications@trainora.ai>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send email: ${res.status} ${await res.text()}`);
  }

  return { mocked: false };
}

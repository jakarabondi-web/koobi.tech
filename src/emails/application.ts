import { brand } from "@/config/brand";

function shell(body: string) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#14161f;line-height:1.55">
  <p style="font-weight:600;font-size:18px;margin:0 0 20px">${brand.name}</p>
  ${body}
  <p style="color:#6b7080;font-size:12px;margin-top:28px;border-top:1px solid #e2e4ea;padding-top:14px">
    ${brand.legalName} · <a href="mailto:${brand.supportEmail}" style="color:#6b7080">${brand.supportEmail}</a>
  </p>
</div>`;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function applicationSubmittedEmail(firstName: string) {
  return {
    subject: `We've received your ${brand.name} application`,
    html: shell(`
      <p>Hi ${firstName},</p>
      <p>Thanks for applying to join the ${brand.name} expert network. Your application is now
      <strong>under consideration</strong> by our team.</p>
      <p>We review every application individually and will get back to you shortly. You'll receive
      an email here as soon as there's a decision — there's nothing you need to do in the meantime.</p>
      <p><a href="${appUrl()}/trainer/dashboard" style="color:#3450e0">Check your application status</a></p>
    `),
  };
}

export function applicationApprovedEmail(firstName: string) {
  return {
    subject: `You're approved to work on ${brand.name}`,
    html: shell(`
      <p>Hi ${firstName},</p>
      <p>Good news — your application has been approved. You now have access to the project
      marketplace and can start accepting assignments.</p>
      <p>Pay rates are shown on every project before you accept, and you can withdraw your
      approved earnings whenever you reach the payout minimum.</p>
      <p><a href="${appUrl()}/trainer/projects" style="color:#3450e0">Browse available projects</a></p>
    `),
  };
}

export function applicationMoreInfoEmail(firstName: string, message: string) {
  return {
    subject: `Additional information needed for your ${brand.name} application`,
    html: shell(`
      <p>Hi ${firstName},</p>
      <p>We've reviewed your application and need a little more information before we can finish:</p>
      <blockquote style="margin:14px 0;padding:10px 14px;border-left:3px solid #3450e0;background:#f5f6fb">${message}</blockquote>
      <p><a href="${appUrl()}/trainer/onboarding" style="color:#3450e0">Update your application</a></p>
    `),
  };
}

export function applicationWaitlistedEmail(firstName: string, message: string) {
  return {
    subject: `Your ${brand.name} application — waitlisted`,
    html: shell(`
      <p>Hi ${firstName},</p>
      <p>Thank you for applying. Your application was strong, but we don't currently have projects
      open that match your expertise.</p>
      <p>We've added you to our waitlist and will contact you as soon as suitable work becomes
      available.</p>
      ${message ? `<p>${message}</p>` : ""}
    `),
  };
}

export function applicationRejectedEmail(firstName: string, message: string) {
  return {
    subject: `Your ${brand.name} application`,
    html: shell(`
      <p>Hi ${firstName},</p>
      <p>Thank you for taking the time to apply to ${brand.name}. After review, we're not able to
      move forward with your application at this time.</p>
      ${message ? `<blockquote style="margin:14px 0;padding:10px 14px;border-left:3px solid #e2e4ea;background:#f7f7f9">${message}</blockquote>` : ""}
      <p>We appreciate your interest and wish you well.</p>
    `),
  };
}

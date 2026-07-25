/**
 * The app's public base URL, used to build links in outbound email.
 *
 * Getting this wrong is quiet and expensive: a deployment that falls back to
 * localhost sends verification and password-reset links that nobody outside
 * the server can open, and nothing errors. The order below means a correct
 * link is produced on Vercel even if `NEXT_PUBLIC_APP_URL` was never set.
 */
export function appUrl(): string {
  // Explicit configuration always wins — a custom domain is not something we
  // can infer.
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return stripTrailingSlash(configured);

  // Set by Vercel on production deployments, without a scheme. Stable across
  // deploys, unlike VERCEL_URL.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${stripTrailingSlash(production)}`;

  // Per-deployment URL: right for previews, wrong for production links, which
  // is why it comes last.
  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${stripTrailingSlash(deployment)}`;

  return "http://localhost:3000";
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

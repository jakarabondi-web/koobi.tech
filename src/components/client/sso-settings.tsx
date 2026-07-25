"use client";

import { useActionState, useState } from "react";
import { Check, Copy, ShieldCheck, ShieldAlert } from "lucide-react";

import { saveSsoConfig, setSsoEnforcement, verifySsoDomain, type SsoState } from "@/server/actions/sso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const initial: SsoState = { status: "idle" };

function Message({ state }: { state: SsoState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
      {state.message}
    </p>
  );
}

export type SsoConfig = {
  domain: string | null;
  verifiedAt: string | null;
  token: string | null;
  issuerUrl: string | null;
  clientId: string | null;
  providerName: string | null;
  enforced: boolean;
  /** Whether the client secret is present in the server environment. */
  secretConfigured: boolean;
  secretEnvVar: string;
};

export function SsoSettings({
  config,
  canManage,
  redirectUri,
}: {
  config: SsoConfig;
  canManage: boolean;
  redirectUri: string;
}) {
  const [saveState, saveAction, saving] = useActionState(saveSsoConfig, initial);
  const [verifyState, verifyAction, verifying] = useActionState(verifySsoDomain, initial);
  const [enforceState, enforceAction, enforcing] = useActionState(setSsoEnforcement, initial);
  const [copied, setCopied] = useState(false);

  const recordValue = config.token ? `trainora-domain-verification=${config.token}` : null;
  const verified = config.verifiedAt !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {verified ? (
          <Badge variant="success" className="gap-1">
            <ShieldCheck className="size-3" /> Domain verified
          </Badge>
        ) : config.domain ? (
          <Badge variant="outline" className="gap-1">
            <ShieldAlert className="size-3" /> Awaiting DNS verification
          </Badge>
        ) : null}
        {config.enforced ? <Badge variant="success">Enforced</Badge> : null}
        {config.domain && !config.secretConfigured ? (
          <Badge variant="destructive">Client secret not set</Badge>
        ) : null}
      </div>

      <form action={saveAction} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sso-domain">Email domain</Label>
          <Input
            id="sso-domain"
            name="domain"
            defaultValue={config.domain ?? ""}
            placeholder="acme.com"
            required
            disabled={!canManage}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            People with an address on this domain sign in through your provider.
          </p>
        </div>
        <div>
          <Label htmlFor="sso-provider">Provider name (optional)</Label>
          <Input
            id="sso-provider"
            name="providerName"
            defaultValue={config.providerName ?? ""}
            placeholder="Okta"
            disabled={!canManage}
          />
        </div>
        <div>
          <Label htmlFor="sso-issuer">OIDC issuer URL</Label>
          <Input
            id="sso-issuer"
            name="issuerUrl"
            defaultValue={config.issuerUrl ?? ""}
            placeholder="https://acme.okta.com"
            required
            disabled={!canManage}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We read <code className="font-mono">/.well-known/openid-configuration</code> from here.
          </p>
        </div>
        <div>
          <Label htmlFor="sso-client">Client ID</Label>
          <Input
            id="sso-client"
            name="clientId"
            defaultValue={config.clientId ?? ""}
            required
            disabled={!canManage}
          />
        </div>
        {canManage ? (
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Checking your provider…" : "Save SSO settings"}
            </Button>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Message state={saveState} />
        </div>
      </form>

      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">Redirect URI</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add this to your provider&apos;s allowed redirect URIs.
        </p>
        <code className="mt-2 block overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
          {redirectUri}
        </code>
      </div>

      {recordValue ? (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Verify domain ownership</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add this TXT record to <span className="font-mono">{config.domain}</span>, then verify.
            We check DNS directly — a domain can&apos;t be claimed without it.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
              {recordValue}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(recordValue);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          {canManage ? (
            <form action={verifyAction} className="mt-3 space-y-2">
              <Button type="submit" variant="outline" size="sm" disabled={verifying}>
                {verifying ? "Checking DNS…" : verified ? "Re-check DNS" : "Verify domain"}
              </Button>
              <Message state={verifyState} />
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Client secret</p>
        {config.secretConfigured ? (
          <p className="mt-1 text-sm text-muted-foreground">
            A client secret is present in the server environment. It is never stored in the
            database, and never shown here.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Single sign-on can&apos;t complete until the client secret is set on the server as{" "}
            <code className="font-mono text-xs">{config.secretEnvVar}</code>. Secrets aren&apos;t
            accepted through this form — send it to your Trainora contact over a secure channel.
          </p>
        )}
      </div>

      {canManage ? (
        <form action={enforceAction} className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium">
            {config.enforced ? "SSO is required" : "Require SSO for this domain"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {config.enforced
              ? "Password sign-in is blocked for accounts on your domain. Turning this off restores it."
              : "Blocks password sign-in for everyone on your verified domain. Make sure SSO works before enabling it."}
          </p>
          <input type="hidden" name="enforce" value={config.enforced ? "false" : "true"} />
          <Button
            type="submit"
            variant={config.enforced ? "outline" : "default"}
            size="sm"
            className="mt-3"
            disabled={enforcing || (!config.enforced && !verified)}
          >
            {config.enforced ? "Turn off enforcement" : "Require SSO"}
          </Button>
          {!verified && !config.enforced ? (
            <p className="mt-2 text-xs text-muted-foreground">Verify your domain first.</p>
          ) : null}
          <div className="mt-2">
            <Message state={enforceState} />
          </div>
        </form>
      ) : null}
    </div>
  );
}

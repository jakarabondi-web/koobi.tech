"use client";

import { useActionState } from "react";

import { createOrganization, type ActionState } from "@/server/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { status: "idle" };

const INDUSTRIES = [
  "Frontier model development", "Applied AI product", "AI safety research",
  "Academic research", "Enterprise AI platform", "Other",
];
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const VOLUMES = [
  "Under 1,000 tasks / month", "1,000-10,000 tasks / month",
  "10,000-50,000 tasks / month", "50,000+ tasks / month", "Not sure yet",
];

export function OrganizationSetupForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Company name</Label>
        <Input id="org-name" name="name" required placeholder="Meridian AI" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-contact">Primary contact</Label>
        <Input id="org-contact" name="contactName" required placeholder="Your full name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-web">Website (optional)</Label>
        <Input id="org-web" name="website" type="url" placeholder="https://example.com" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-industry">What do you build?</Label>
          <select id="org-industry" name="industry" required defaultValue={INDUSTRIES[0]}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-size">Company size</Label>
          <select id="org-size" name="companySize" required defaultValue={SIZES[1]}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-volume">Expected volume</Label>
        <select id="org-volume" name="estimatedVolume" required defaultValue={VOLUMES[1]}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
          {VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-usecase">What do you need human data for?</Label>
        <Textarea id="org-usecase" name="useCase" rows={4} required
          placeholder="e.g. RLHF preference data and safety evaluation for a general-purpose assistant." />
      </div>
      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" variant="violet" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}

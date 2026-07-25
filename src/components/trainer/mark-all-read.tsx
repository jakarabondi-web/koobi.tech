"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";

import { markAllNotificationsRead } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => { void markAllNotificationsRead(); })}>
      <CheckCheck className="size-4" /> {pending ? "Marking…" : "Mark all read"}
    </Button>
  );
}

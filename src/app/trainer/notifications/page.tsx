import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAllReadButton } from "@/components/trainer/mark-all-read";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={unread > 0 ? <MarkAllReadButton /> : undefined}
      />
      <Card>
        <CardContent className="pt-6 pb-6">
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="Updates about your work appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className={cn("flex gap-3 py-3", !n.readAt && "bg-accent/30 -mx-2 px-2 rounded")}>
                  {!n.readAt ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : <span className="mt-1.5 size-2 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                    {n.link ? (
                      <Link href={n.link} className="text-xs text-primary hover:underline">View</Link>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{n.createdAt.toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

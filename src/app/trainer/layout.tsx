import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { TrainerShell } from "@/components/trainer/trainer-shell";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  const [tasksDue, unreadNotifications] = userId
    ? await Promise.all([
        prisma.taskAssignment.count({ where: { userId, completedAt: null } }),
        prisma.notification.count({ where: { userId, readAt: null } }),
      ])
    : [0, 0];

  return (
    <TrainerShell
      userName={session?.user?.name ?? "Trainer"}
      userEmail={session?.user?.email ?? ""}
      tasksDue={tasksDue}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </TrainerShell>
  );
}

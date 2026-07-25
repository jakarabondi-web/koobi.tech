import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isReviewer as hasReviewerRole } from "@/lib/permissions/roles";
import { TrainerShell } from "@/components/trainer/trainer-shell";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  const reviewer = hasReviewerRole(session?.user?.roles ?? []);

  const [tasksDue, unreadNotifications, reviewQueue] = userId
    ? await Promise.all([
        prisma.taskAssignment.count({ where: { userId, completedAt: null } }),
        prisma.notification.count({ where: { userId, readAt: null } }),
        reviewer
          ? prisma.taskSubmission.count({
              where: { reviews: { none: {} }, submittedById: { not: userId } },
            })
          : Promise.resolve(0),
      ])
    : [0, 0, 0];

  return (
    <TrainerShell
      userName={session?.user?.name ?? "Trainer"}
      userEmail={session?.user?.email ?? ""}
      tasksDue={tasksDue}
      unreadNotifications={unreadNotifications}
      reviewQueue={reviewQueue}
      isReviewer={reviewer}
    >
      {children}
    </TrainerShell>
  );
}

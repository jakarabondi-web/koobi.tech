import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isReviewer as hasReviewerRole } from "@/lib/permissions/roles";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { TrainerShell } from "@/components/trainer/trainer-shell";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  const roles = session?.user?.roles ?? [];
  const reviewer = hasReviewerRole(roles);
  const leadReviewer = roles.includes("LEAD_REVIEWER") || roles.includes("QUALITY_MANAGER");

  const [tasksDue, unreadNotifications, reviewQueue, adjudicationQueue, gate] = userId
    ? await Promise.all([
        prisma.taskAssignment.count({ where: { userId, completedAt: null } }),
        prisma.notification.count({ where: { userId, readAt: null } }),
        reviewer
          ? prisma.taskSubmission.count({
              where: { reviews: { none: {} }, submittedById: { not: userId } },
            })
          : Promise.resolve(0),
        leadReviewer
          ? prisma.adjudication.count({ where: { status: "PENDING" } })
          : Promise.resolve(0),
        getTrainerGate(userId),
      ])
    : [0, 0, 0, 0, null];

  return (
    <TrainerShell
      userName={session?.user?.name ?? "Trainer"}
      userEmail={session?.user?.email ?? ""}
      tasksDue={tasksDue}
      unreadNotifications={unreadNotifications}
      reviewQueue={reviewQueue}
      adjudicationQueue={adjudicationQueue}
      isReviewer={reviewer}
      isLeadReviewer={leadReviewer}
      isApproved={gate?.canAccessAssignments ?? false}
    >
      {children}
    </TrainerShell>
  );
}

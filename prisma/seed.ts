import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { GLOBAL_ROLES } from "../src/lib/permissions/roles";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Trainora!Demo2026";

async function ensureRoles() {
  for (const key of GLOBAL_ROLES) {
    await prisma.role.upsert({
      where: { key },
      update: {},
      create: { key, name: key.replace(/_/g, " ") },
    });
  }
}

async function ensureSkillsAndLanguages() {
  const skills = [
    ["TypeScript", "Software engineering"],
    ["Python", "Software engineering"],
    ["Clinical medicine", "Medicine"],
    ["Contract law", "Law"],
    ["Financial modeling", "Finance"],
    ["Applied mathematics", "Mathematics"],
    ["Technical writing", "Writing"],
    ["Linguistics", "Linguistics"],
  ] as const;
  for (const [name, category] of skills) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name, category } });
  }

  const languages = [
    ["en", "English"],
    ["es", "Spanish"],
    ["fr", "French"],
    ["de", "German"],
    ["ja", "Japanese"],
  ] as const;
  for (const [code, name] of languages) {
    await prisma.language.upsert({ where: { code }, update: {}, create: { code, name } });
  }
}

async function upsertUser(params: {
  email: string;
  firstName: string;
  lastName: string;
  role: (typeof GLOBAL_ROLES)[number];
  password?: string;
}) {
  const passwordHash = await bcrypt.hash(params.password ?? DEMO_PASSWORD, 12);
  const role = await prisma.role.findUniqueOrThrow({ where: { key: params.role } });

  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: role.id } },
      consentRecords: { create: { type: "terms_of_service", version: "v1" } },
    },
  });

  return user;
}

async function main() {
  console.log("Seeding Trainora AI demo data…");

  await ensureRoles();
  await ensureSkillsAndLanguages();

  // --- Demo accounts (development only) ---
  const trainer = await upsertUser({
    email: "trainer@trainora.demo",
    firstName: "Maya",
    lastName: "Okafor",
    role: "TRAINER",
  });
  const reviewer = await upsertUser({
    email: "reviewer@trainora.demo",
    firstName: "Daniel",
    lastName: "Kessler",
    role: "REVIEWER",
  });
  const clientAdmin = await upsertUser({
    email: "client@trainora.demo",
    firstName: "Priya",
    lastName: "Raman",
    role: "CLIENT_ADMIN",
  });
  const admin = await upsertUser({
    email: "admin@trainora.demo",
    firstName: "Jordan",
    lastName: "Lee",
    role: "SUPER_ADMIN",
  });

  await prisma.trainerProfile.upsert({
    where: { userId: trainer.id },
    update: {},
    create: {
      userId: trainer.id,
      headline: "Senior software engineer & AI evaluation specialist",
      bio: "8 years building distributed systems; 2 years evaluating code-generation models.",
      country: "United States",
      city: "Austin",
      availableHoursPerWeek: 20,
      qualityScore: 0.94,
      reliabilityScore: 0.97,
      onboardingStep: 17,
    },
  });

  await prisma.trainerProfile.upsert({
    where: { userId: reviewer.id },
    update: {},
    create: {
      userId: reviewer.id,
      headline: "Lead reviewer, safety & policy evaluation",
      country: "Canada",
      city: "Toronto",
      availableHoursPerWeek: 25,
      qualityScore: 0.98,
      reliabilityScore: 0.99,
      onboardingStep: 17,
    },
  });

  // --- Demo organization & client ---
  const org = await prisma.organization.upsert({
    where: { slug: "meridian-ai" },
    update: {},
    create: {
      name: "Meridian AI",
      slug: "meridian-ai",
      website: "https://meridian-ai.example.com",
      industry: "Frontier model development",
      useCase: "RLHF and safety evaluation for a general-purpose assistant model",
      status: "ACTIVE",
      securityTier: "standard",
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: clientAdmin.id } },
    update: {},
    create: { organizationId: org.id, userId: clientAdmin.id, role: "ADMIN", joinedAt: new Date() },
  });

  await prisma.clientProfile.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      contactName: "Priya Raman",
      contactTitle: "Head of Data",
      companySize: "51-200",
      estimatedVolume: "10,000-50,000 tasks / month",
      onboardingStep: 11,
    },
  });

  // --- Demo project ---
  const project = await prisma.project.upsert({
    where: { id: "seed-project-pairwise-comparison" },
    update: {},
    create: {
      id: "seed-project-pairwise-comparison",
      organizationId: org.id,
      name: "Assistant response preference ranking — v4",
      description: "Pairwise comparison of assistant responses across helpfulness, safety, and tone.",
      domain: "General assistant",
      taskType: "PAIRWISE_COMPARISON",
      status: "ACTIVE",
      payPerTaskCents: 180,
      estimatedHoursPerWeek: 10,
      languages: ["en"],
      positionsAvailable: 12,
      budgetCents: 500_000,
      qualityThreshold: 0.85,
      securityLevel: "standard",
      containsSensitiveContent: false,
      startDate: new Date(),
      applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId: project.id, userId: trainer.id } },
    update: {},
    create: { projectId: project.id, userId: trainer.id, status: "ACTIVE" },
  });

  const rubric = await prisma.reviewRubric.create({
    data: {
      projectId: project.id,
      name: "Standard preference rubric",
      criteria: {
        categories: ["correctness", "relevance", "instruction_following", "clarity", "safety", "tone"],
      },
    },
  });

  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      payload: {
        prompt: "Explain the difference between TCP and UDP to a junior developer.",
        responseA: "TCP is connection-oriented and reliable; UDP is connectionless and faster but unreliable.",
        responseB:
          "TCP establishes a handshake and guarantees ordered delivery, retransmitting lost packets — ideal for file transfer or web pages. UDP skips the handshake, sending packets with no delivery guarantee, which suits real-time video or gaming where speed matters more than perfect delivery.",
      },
      status: "SUBMITTED",
    },
  });

  await prisma.taskAssignment.create({
    data: { taskId: task.id, userId: trainer.id, dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
  });

  const submission = await prisma.taskSubmission.create({
    data: {
      taskId: task.id,
      submittedById: trainer.id,
      content: { preferred: "B", confidence: 4, justification: "Response B is more complete and gives concrete use cases." },
      durationSeconds: 145,
    },
  });

  await prisma.review.create({
    data: {
      submissionId: submission.id,
      reviewerId: reviewer.id,
      decision: "APPROVED",
      feedback: "Clear justification, correct preference.",
      confidence: 0.95,
      scores: {
        create: [
          { rubricId: rubric.id, category: "correctness", score: 5 },
          { rubricId: rubric.id, category: "clarity", score: 4 },
        ],
      },
    },
  });

  await prisma.earning.create({
    data: {
      userId: trainer.id,
      projectId: project.id,
      taskCount: 1,
      baseCents: 180,
      bonusCents: 20,
      status: "APPROVED",
      expectedPaymentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  // A few weeks of prior approved work, so the demo wallet has a withdrawable
  // balance above the payout minimum.
  await prisma.earning.createMany({
    data: [
      { userId: trainer.id, projectId: project.id, taskCount: 48, baseCents: 8_640, bonusCents: 900, status: "APPROVED" },
      { userId: trainer.id, projectId: project.id, taskCount: 36, baseCents: 6_480, bonusCents: 400, status: "APPROVED" },
      { userId: trainer.id, projectId: project.id, taskCount: 12, baseCents: 2_160, status: "PENDING_REVIEW" },
      { userId: trainer.id, projectId: project.id, taskCount: 52, baseCents: 9_360, bonusCents: 1_200, status: "PAID" },
    ],
  });

  await prisma.paymentAccount.create({
    data: {
      userId: trainer.id,
      provider: "MPESA",
      mpesaPhoneNumber: "254712345678",
      isDefault: true,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: trainer.id,
        type: "task_reviewed",
        title: "Your submission was approved",
        body: "Task on “Assistant response preference ranking — v4” was approved by a reviewer.",
      },
      {
        userId: trainer.id,
        type: "new_project",
        title: "New project available: Multilingual safety review",
        body: "A new project matching your qualifications is now open for applications.",
      },
    ],
  });

  await prisma.supportTicket.create({
    data: {
      requesterId: trainer.id,
      category: "PAYMENT",
      subject: "Question about bonus calculation",
      status: "OPEN",
      messages: {
        create: {
          authorId: trainer.id,
          body: "Hi, could you clarify how the quality bonus on my last payout was calculated?",
        },
      },
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (password: %s):", DEMO_PASSWORD);
  console.log("  trainer@trainora.demo  — Trainer");
  console.log("  reviewer@trainora.demo — Reviewer");
  console.log("  client@trainora.demo   — Client Admin (Meridian AI)");
  console.log("  admin@trainora.demo    — Super Admin");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

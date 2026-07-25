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

async function ensureAssessments() {
  // --- Qualification assessments (industry practice test after signup) ---
  await prisma.assessment.upsert({
    where: { id: "seed-assessment-software" },
    update: {},
    create: {
      id: "seed-assessment-software",
      title: "Software engineering evaluation qualification",
      domain: "Software engineering",
      description:
        "Checks that you can judge technical answers on accuracy and usefulness rather than length or tone.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt:
              "A model answers \u201cHow do I stop SQL injection?\u201d with \u201cEscape single quotes in user input.\u201d How should you rate it?",
            options: [
              "Correct and complete",
              "Partially correct \u2014 escaping helps but parameterised queries are the actual fix",
              "Completely wrong",
              "Cannot be judged without more context",
            ],
            correctAnswer: "Partially correct \u2014 escaping helps but parameterised queries are the actual fix",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt:
              "Response A is three paragraphs and confident. Response B is two sentences, correct, and directly answers the question. Which is better?",
            options: [
              "A \u2014 more thorough",
              "B \u2014 correctness and directness beat length",
              "A \u2014 users prefer detail",
              "They are equal",
            ],
            correctAnswer: "B \u2014 correctness and directness beat length",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt:
              "A model invents a plausible-sounding library function that does not exist. What is the most accurate label?",
            options: ["Style issue", "Hallucination", "Instruction-following failure", "Safety violation"],
            correctAnswer: "Hallucination",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "A model is asked to review code containing a race condition and misses it, but suggests useful style improvements. Write the feedback you would give, and explain how you would score it.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: "seed-assessment-general" },
    update: {},
    create: {
      id: "seed-assessment-general",
      title: "General evaluation qualification",
      domain: "General assistant",
      description:
        "Core rubric reasoning: factual accuracy, calibration, safety, and instruction following.",
      timeLimitMins: 25,
      passThreshold: 0.75,
      maxAttempts: 2,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt:
              "A model gives a confident medical diagnosis from a one-line symptom description. What is the main problem?",
            options: [
              "Tone is too formal",
              "Overconfidence \u2014 it is not calibrated to the evidence available",
              "The answer is too short",
              "Nothing, it is helpful",
            ],
            correctAnswer: "Overconfidence \u2014 it is not calibrated to the evidence available",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for a summary in exactly three bullets. The model writes five excellent bullets. How do you score instruction following?",
            options: ["Full marks \u2014 quality is high", "Low \u2014 it did not follow the explicit constraint", "Ignore it", "Full marks if the content is correct"],
            correctAnswer: "Low \u2014 it did not follow the explicit constraint",
            points: 2,
          },
          {
            order: 3,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe a case where the more helpful-sounding response is the worse response, and explain how you would justify that in a review.",
            points: 4,
          },
        ],
      },
    },
  });
}

async function main() {
  console.log("Seeding Trainora AI demo data…");

  await ensureRoles();
  await ensureSkillsAndLanguages();

  await ensureAssessments();

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

  // Demo trainer is fully approved so the gated surfaces are explorable.
  await prisma.application.upsert({
    where: { userId: trainer.id },
    update: {},
    create: {
      userId: trainer.id,
      domain: "Software engineering",
      status: "APPROVED",
      submittedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      decidedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.identityVerification.upsert({
    where: { userId: trainer.id },
    update: {},
    create: {
      userId: trainer.id,
      status: "VERIFIED",
      provider: "PERSONA",
      providerRef: "seed_verified_trainer",
      documentType: "PASSPORT",
      documentCountry: "US",
      documentAuthentic: "PASS",
      livenessPassed: "PASS",
      faceMatchPassed: "PASS",
      duplicateCheckPassed: "PASS",
      faceMatchScore: 0.96,
      verifiedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.assessmentAttempt.create({
    data: {
      userId: trainer.id,
      assessmentId: "seed-assessment-software",
      status: "PASSED",
      score: 0.92,
      startedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    },
  });

  // A second applicant sitting in the review queue, so the admin screen
  // has something real to act on.
  const applicant = await upsertUser({
    email: "applicant@trainora.demo",
    firstName: "Tomas",
    lastName: "Ferreira",
    role: "TRAINER",
  });
  await prisma.trainerProfile.upsert({
    where: { userId: applicant.id },
    update: {},
    create: {
      userId: applicant.id,
      headline: "Computational linguist, 6 years in multilingual NLP evaluation",
      country: "Portugal",
      availableHoursPerWeek: 15,
      onboardingStep: 6,
    },
  });
  await prisma.application.upsert({
    where: { userId: applicant.id },
    update: {},
    create: {
      userId: applicant.id,
      domain: "Linguistics",
      status: "SUBMITTED",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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


  // Dataset + billing so the client portal has real content.
  const dataset = await prisma.dataset.create({
    data: {
      projectId: project.id,
      organizationId: org.id,
      name: "Preference pairs — batch 1",
      description: "Accepted pairwise comparisons ready for reward-model training.",
      items: {
        create: [
          { content: { prompt: "Explain TCP vs UDP", chosen: "B", rejected: "A" } },
          { content: { prompt: "Summarise this contract clause", chosen: "A", rejected: "B" } },
        ],
      },
    },
  });
  await prisma.export.create({
    data: { datasetId: dataset.id, format: "jsonl", status: "QUEUED", requestedBy: clientAdmin.id },
  });
  await prisma.billingAccount.upsert({
    where: { organizationId: org.id },
    update: {},
    create: { organizationId: org.id, billingEmail: clientAdmin.email },
  });
  await prisma.invoice.createMany({
    data: [
      { organizationId: org.id, amountCents: 248_000, status: "PAID", paidAt: new Date(Date.now() - 30 * 864e5) },
      { organizationId: org.id, amountCents: 187_500, status: "SENT", dueDate: new Date(Date.now() + 14 * 864e5) },
    ],
  });

  // Unreviewed submissions so the reviewer queue isn't empty.
  for (const [i, payload] of [
    {
      prompt: "A user asks how to safely dispose of old lithium batteries.",
      responseA: "Just throw them in the regular bin, they're small enough to not matter.",
      responseB: "Don't put them in household waste — they can ignite. Take them to a battery recycling point; most supermarkets and hardware stores have collection bins.",
    },
    {
      prompt: "Explain what a database index does, for a non-technical manager.",
      responseA: "An index is a B-tree structure that reduces lookup complexity from O(n) to O(log n) by maintaining sorted key references.",
      responseB: "It works like the index at the back of a book — instead of reading every page to find a topic, the database jumps straight to the right place. It makes reads much faster, at the cost of slightly slower writes and some extra storage.",
    },
  ].entries()) {
    const t = await prisma.task.create({
      data: { projectId: project.id, payload, status: "SUBMITTED" },
    });
    await prisma.taskAssignment.create({
      data: { taskId: t.id, userId: trainer.id, completedAt: new Date() },
    });
    await prisma.taskSubmission.create({
      data: {
        taskId: t.id,
        submittedById: trainer.id,
        content: {
          preferred: "B",
          confidence: 4,
          justification: i === 0
            ? "B is safer and actionable — A gives advice that could start a fire."
            : "B matches the audience. A is accurate but uses terms the manager wouldn't know.",
          scores: { correctness: 5, clarity: 4 },
          flags: { safety: i === 0, factuality: false, citation: false },
        },
        durationSeconds: 120 + i * 45,
      },
    });
  }

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

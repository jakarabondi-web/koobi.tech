import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { GLOBAL_ROLES } from "../src/lib/permissions/roles";

export const prisma = new PrismaClient();

const DEMO_PASSWORD = "Traivr!Demo2026";

// Fixed UUIDs rather than readable slugs: every id in production is a UUID,
// and seed data that doesn't match that shape hides bugs in id validation.
const SEED_IDS = {
  projectPairwise: "11111111-1111-4111-8111-111111111111",
  assessmentSoftware: "22222222-2222-4222-8222-222222222222",
  assessmentGeneral: "33333333-3333-4333-8333-333333333333",
  // One per entry in DOMAINS (application-form.tsx) other than Software
  // engineering, which already has one above. Without these, most domains
  // had nothing to pass — the application form's own copy ("This determines
  // which qualification assessment you'll take") was false for 9 of 10
  // applicants.
  assessmentMathematics: "d29c74e9-dc43-4106-9a08-e1cfa87c7481",
  assessmentMedicine: "69beadf2-a933-42ae-b2cf-2d1eb1558a13",
  assessmentLaw: "3c27581b-4956-49e0-a54d-d0c75903986e",
  assessmentFinance: "9ad5f5d3-fd10-4fd1-90b3-569ac6ef2dab",
  assessmentScience: "727f5285-5de7-4bf3-b0ae-c42b4e37b585",
  assessmentEngineering: "59566bc5-d352-4082-857e-77628399c2d5",
  assessmentLinguistics: "5a3ae5b2-e881-4874-88a9-0e42762801cb",
  assessmentEducation: "da5549b5-1a5c-4c39-a3aa-7683e6f843ff",
  assessmentWriting: "9594079a-2a39-40d4-a44e-1a90f66349bf",
  assessmentResearch: "8fc66bc1-00de-487d-a08a-bc639248d0d6",
} as const;

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
    where: { id: SEED_IDS.assessmentSoftware },
    update: {},
    create: {
      id: SEED_IDS.assessmentSoftware,
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
    where: { id: SEED_IDS.assessmentGeneral },
    update: {},
    create: {
      id: SEED_IDS.assessmentGeneral,
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

  // Domain assessments below. Each mirrors the Software engineering /
  // General assistant pattern above: they test judgment of an AI response
  // in the domain (calibration, instruction-following, hallucination,
  // safety) rather than asking the trainee to personally practice medicine,
  // law, or finance — the qualification is for evaluating model outputs,
  // not for giving advice, so the questions never do either.
  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentMathematics },
    update: {},
    create: {
      id: SEED_IDS.assessmentMathematics,
      title: "Mathematics evaluation qualification",
      domain: "Mathematics",
      description: "Checks that you can judge mathematical reasoning for correctness, not just the final answer.",
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
              "A model's derivation has a sign error in an intermediate step but the final answer is correct. How should you score it?",
            options: [
              "Full marks — the final answer is right",
              "Docked — an intermediate error means the reasoning cannot be trusted even if it cancelled out",
              "Zero — any error is disqualifying",
              "Cannot be judged without the original problem",
            ],
            correctAnswer: "Docked — an intermediate error means the reasoning cannot be trusted even if it cancelled out",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks the model to “show your steps.” The model gives only the final answer, correctly. How do you score instruction following?",
            options: [
              "Full marks — the answer is correct",
              "Low — it ignored an explicit constraint",
              "Ignore the constraint, it's a minor detail",
              "Full marks if the answer is simple enough to not need steps",
            ],
            correctAnswer: "Low — it ignored an explicit constraint",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "A model reports an approximate value (e.g. from a numerical method) as “the exact answer.” What is the issue?",
            options: [
              "None — the number is close enough",
              "Overclaiming precision — an approximation should be labeled as one",
              "Style issue only",
              "This is only a problem if the approximation is wrong",
            ],
            correctAnswer: "Overclaiming precision — an approximation should be labeled as one",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "A model's multi-step proof has one flawed step but arrives at the correct final result. Write the feedback you would give, and explain how you would score it.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentMedicine },
    update: {},
    create: {
      id: SEED_IDS.assessmentMedicine,
      title: "Medicine evaluation qualification",
      domain: "Medicine",
      description:
        "Checks that you can judge a medical-context AI response for calibration and safety — this is an evaluation qualification, not a clinical exam.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives a confident, specific diagnosis from a one-line symptom description. What is the main problem?",
            options: [
              "Tone is too clinical",
              "Overconfidence — it is not calibrated to how little evidence it was given",
              "The answer is too short",
              "Nothing, it is decisive and helpful",
            ],
            correctAnswer: "Overconfidence — it is not calibrated to how little evidence it was given",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states a specific medication dosage with no safety caveat or disclaimer. How should this be scored?",
            options: [
              "Fine — the number itself matters most",
              "Flagged — specific dosing without a safety caveat is a real risk regardless of accuracy",
              "Ignore it, disclaimers are boilerplate",
              "Only a problem if the dosage is wrong",
            ],
            correctAnswer: "Flagged — specific dosing without a safety caveat is a real risk regardless of accuracy",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "On a treatment where clinical opinion is genuinely divided, one response gives the calibrated consensus view with caveats; another states one side confidently as settled fact. Which is better?",
            options: [
              "The confident one — users want a clear answer",
              "The calibrated one — confidently misrepresenting genuine debate as settled is worse than an honest caveat",
              "They are equal",
              "Neither, both should refuse to answer",
            ],
            correctAnswer: "The calibrated one — confidently misrepresenting genuine debate as settled is worse than an honest caveat",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would evaluate a medical-context response for calibration and safety without needing to personally verify the underlying clinical facts yourself.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentLaw },
    update: {},
    create: {
      id: SEED_IDS.assessmentLaw,
      title: "Law evaluation qualification",
      domain: "Law",
      description:
        "Checks that you can judge a legal-context AI response for calibration and appropriate caveats — this is an evaluation qualification, not a legal exam.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "A model confidently predicts the outcome of a specific court case from a two-sentence description of the facts. What is the issue?",
            options: [
              "None — confidence is reassuring",
              "Overconfidence — case outcomes depend on far more than can be inferred from a short summary",
              "It should have cited a statute",
              "Nothing, this is what users want",
            ],
            correctAnswer: "Overconfidence — case outcomes depend on far more than can be inferred from a short summary",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks about the law in a specific jurisdiction. The model answers with general principles and never addresses that jurisdiction. How do you score instruction following?",
            options: [
              "Full marks — general principles are still useful",
              "Low — it ignored an explicit, material constraint",
              "Ignore it, jurisdiction rarely matters",
              "Full marks if the general principles are accurate",
            ],
            correctAnswer: "Low — it ignored an explicit, material constraint",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "A response to a specific legal question includes a brief, appropriate “this isn't legal advice, consult a lawyer” note alongside a substantive answer. How should this be scored?",
            options: [
              "Penalized — disclaimers weaken the answer",
              "Rewarded — an appropriate disclaimer alongside a substantive answer is the right calibration",
              "Irrelevant to scoring",
              "Only acceptable if the disclaimer is the entire answer",
            ],
            correctAnswer: "Rewarded — an appropriate disclaimer alongside a substantive answer is the right calibration",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would evaluate a legal-context response for calibration to genuine legal uncertainty, without yourself giving legal advice in your review.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentFinance },
    update: {},
    create: {
      id: SEED_IDS.assessmentFinance,
      title: "Finance evaluation qualification",
      domain: "Finance",
      description: "Checks that you can judge a finance-context AI response for accuracy, caveats, and overclaiming.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "A model describes an investment as “guaranteed” to return a specific percentage. What is the issue?",
            options: [
              "None, if the number is plausible",
              "Overconfidence — investment returns are never guaranteed, and stating otherwise is materially misleading",
              "Style issue only",
              "Only a problem if the percentage is unusually high",
            ],
            correctAnswer: "Overconfidence — investment returns are never guaranteed, and stating otherwise is materially misleading",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for a break-even calculation. The model gives sound general advice but never computes the number. How do you score instruction following?",
            options: [
              "Full marks — the advice is sound",
              "Low — it omitted the specific calculation that was explicitly requested",
              "Ignore the omission",
              "Full marks if the advice implies the answer",
            ],
            correctAnswer: "Low — it omitted the specific calculation that was explicitly requested",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "A response gives tax advice with no mention that tax treatment varies by jurisdiction. How should this be scored?",
            options: [
              "Fine — most users are in the same jurisdiction",
              "Flagged — unqualified tax advice that omits jurisdiction dependence can be materially wrong for the reader",
              "Irrelevant to scoring",
              "Only a problem if the advice is factually incorrect somewhere",
            ],
            correctAnswer: "Flagged — unqualified tax advice that omits jurisdiction dependence can be materially wrong for the reader",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "A model's numeric answer to a finance question is arithmetically correct but omits the assumptions it relied on. Write the feedback you would give, and explain how you would score it.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentScience },
    update: {},
    create: {
      id: SEED_IDS.assessmentScience,
      title: "Science evaluation qualification",
      domain: "Science",
      description: "Checks that you can judge a science-context AI response for factual accuracy and appropriate uncertainty.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a single preliminary study as if it were established scientific consensus. What is the issue?",
            options: [
              "None — citing a study is good practice",
              "Overstatement — one preliminary study is not consensus, and presenting it that way misleads the reader",
              "The citation format is wrong",
              "Nothing, as long as the study is real",
            ],
            correctAnswer: "Overstatement — one preliminary study is not consensus, and presenting it that way misleads the reader",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks how a specific mechanism works. The model responds with a vivid analogy but never actually explains the mechanism. How should this be scored?",
            options: [
              "Full marks — the analogy is clear and engaging",
              "Low — it never answered the question that was actually asked",
              "Ignore it, analogies are always sufficient",
              "Full marks if the analogy is memorable",
            ],
            correctAnswer: "Low — it never answered the question that was actually asked",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's calculation is correct except the units are wrong, changing the result by a factor of 1000. How significant is this error?",
            options: [
              "Minor — the method was correct",
              "Major — a unit error of this scale makes the reported result wrong and potentially dangerous if acted on",
              "Not an error at all",
              "Only significant in engineering contexts",
            ],
            correctAnswer: "Major — a unit error of this scale makes the reported result wrong and potentially dangerous if acted on",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would evaluate a science-context response for both factual accuracy and whether it expresses an appropriate degree of certainty.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentEngineering },
    update: {},
    create: {
      id: SEED_IDS.assessmentEngineering,
      title: "Engineering evaluation qualification",
      domain: "Engineering",
      description: "Checks that you can judge an engineering-context AI response for correctness against stated constraints.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "The user states an explicit safety margin the design must meet. The model's proposal doesn't meet it and never mentions the shortfall. How should this be scored?",
            options: [
              "Full marks if the design otherwise works",
              "Failed — silently missing a stated safety constraint is a critical failure, not a minor gap",
              "Ignore the constraint, it was probably conservative anyway",
              "Only a problem if someone builds it",
            ],
            correctAnswer: "Failed — silently missing a stated safety constraint is a critical failure, not a minor gap",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's calculation has a unit-conversion error that changes the result by roughly 10x. What is the significance?",
            options: [
              "Minor — the approach was right",
              "Major — a 10x magnitude error invalidates the practical result even if the method is sound",
              "Not an error",
              "Only significant for very large structures",
            ],
            correctAnswer: "Major — a 10x magnitude error invalidates the practical result even if the method is sound",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "A model substitutes a different component than the one specified, without flagging that the substitution affects tolerances. How should this be scored?",
            options: [
              "Fine — substitutions are common practice",
              "Flagged — an unflagged substitution that affects tolerances hides a real change in the design's behavior",
              "Irrelevant to scoring",
              "Only a problem if the substitute is cheaper",
            ],
            correctAnswer: "Flagged — an unflagged substitution that affects tolerances hides a real change in the design's behavior",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would evaluate whether an engineering response respected explicit constraints — tolerances, safety margins, applicable standards — rather than just whether it “works.”",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentLinguistics },
    update: {},
    create: {
      id: SEED_IDS.assessmentLinguistics,
      title: "Linguistics evaluation qualification",
      domain: "Linguistics",
      description: "Checks that you can judge whether a linguistics-context AI response used the correct analytical framework.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for a syntactic analysis of a sentence. The model instead explains what the sentence means. How should this be scored?",
            options: [
              "Full marks — the explanation is accurate",
              "Low — it answered a different question than the one asked (semantics instead of syntax)",
              "Ignore the mismatch",
              "Full marks if the meaning explanation is detailed",
            ],
            correctAnswer: "Low — it answered a different question than the one asked (semantics instead of syntax)",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "A model confidently states a folk etymology for a word that linguists have documented as false. What is the issue?",
            options: [
              "None — folk etymologies are interesting",
              "Factual error stated with unwarranted confidence",
              "Style issue only",
              "Not an error since the word's origin is now what people believe",
            ],
            correctAnswer: "Factual error stated with unwarranted confidence",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for the IPA transcription of a word. The model gives a rough phonetic spelling instead (e.g. “kat” instead of the IPA symbols). How should this be scored?",
            options: [
              "Full marks — close enough for most readers",
              "Low — it did not follow the explicit request for IPA notation",
              "Ignore the format difference",
              "Full marks if the pronunciation is roughly right",
            ],
            correctAnswer: "Low — it did not follow the explicit request for IPA notation",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would judge whether a response applied the correct linguistic framework (syntax, semantics, phonology, etc.) for what was actually asked.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentEducation },
    update: {},
    create: {
      id: SEED_IDS.assessmentEducation,
      title: "Education evaluation qualification",
      domain: "Education",
      description: "Checks that you can judge whether an AI response is pedagogically appropriate for its stated audience.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "The user says they are a complete beginner. The model's explanation is accurate but full of unexplained jargon. How should this be scored?",
            options: [
              "Full marks — the content is correct",
              "Low — it did not adapt to the stated skill level, making it unusable for the actual reader",
              "Ignore the audience, correctness is all that matters",
              "Full marks if the jargon is standard terminology",
            ],
            correctAnswer: "Low — it did not adapt to the stated skill level, making it unusable for the actual reader",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's worked example arrives at a different number in the final step than the steps leading up to it support. What is the issue?",
            options: [
              "None — the final number is what matters",
              "Internal inconsistency — a worked example that contradicts its own steps will confuse a learner following along",
              "Style issue only",
              "Not a problem if the final number happens to be correct",
            ],
            correctAnswer: "Internal inconsistency — a worked example that contradicts its own steps will confuse a learner following along",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for exactly three practice questions. The model provides seven, all high quality. How do you score instruction following?",
            options: [
              "Full marks — more practice is better",
              "Low — it did not follow the explicit count constraint",
              "Ignore the count",
              "Full marks if all seven are relevant",
            ],
            correctAnswer: "Low — it did not follow the explicit count constraint",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would evaluate whether a response was pedagogically appropriate for a stated skill level, beyond just checking factual accuracy.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentWriting },
    update: {},
    create: {
      id: SEED_IDS.assessmentWriting,
      title: "Writing evaluation qualification",
      domain: "Writing",
      description: "Checks that you can judge an AI response for craft and for whether it actually fulfilled the brief.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for a formal tone. The model writes fluent but casual, conversational prose. How should this be scored?",
            options: [
              "Full marks — the writing is fluent",
              "Low — it did not match the explicitly requested register",
              "Ignore tone, only grammar matters",
              "Full marks if casual reads as friendly",
            ],
            correctAnswer: "Low — it did not match the explicitly requested register",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to make a passage more concise. The revision is well-written but longer than the original. How should this be scored?",
            options: [
              "Full marks — the new version reads better",
              "Low — it did the opposite of what was explicitly requested",
              "Ignore length, quality is what matters",
              "Full marks if the added length adds detail",
            ],
            correctAnswer: "Low — it did the opposite of what was explicitly requested",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "One response is grammatically perfect but never actually addresses the prompt. Another has minor grammar issues but directly and usefully answers it. Which is better?",
            options: [
              "The grammatically perfect one — correctness matters most",
              "The one that addresses the prompt — relevance to the actual ask outweighs minor polish",
              "They are equal",
              "Neither, both should be rejected",
            ],
            correctAnswer: "The one that addresses the prompt — relevance to the actual ask outweighs minor polish",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would evaluate a piece of writing for both craft (clarity, tone, grammar) and whether it actually fulfilled the brief it was given.",
            points: 4,
          },
        ],
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: SEED_IDS.assessmentResearch },
    update: {},
    create: {
      id: SEED_IDS.assessmentResearch,
      title: "Research evaluation qualification",
      domain: "Research",
      description: "Checks that you can judge whether an AI response accurately represents its sources and evidence.",
      timeLimitMins: 30,
      passThreshold: 0.75,
      maxAttempts: 2,
      cooldownHours: 72,
      questions: {
        create: [
          {
            order: 1,
            type: "MULTIPLE_CHOICE",
            prompt: "A model summarizes a study that found a correlation and states that the study “proves” one thing causes the other. What is the issue?",
            options: [
              "None — correlation and causation are close enough for a summary",
              "Overstatement — the model claimed causation the underlying study did not establish",
              "Style issue only",
              "Not a problem if the correlation is strong",
            ],
            correctAnswer: "Overstatement — the model claimed causation the underlying study did not establish",
            points: 2,
          },
          {
            order: 2,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for sources from the last five years. Several of the model's citations are over a decade old, unflagged. How should this be scored?",
            options: [
              "Full marks — older sources can still be relevant",
              "Low — it did not meet the explicit recency constraint",
              "Ignore the dates",
              "Full marks if the older sources are well-known",
            ],
            correctAnswer: "Low — it did not meet the explicit recency constraint",
            points: 2,
          },
          {
            order: 3,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a real paper in support of a claim, but the cited paper doesn't actually say that. What is this?",
            options: [
              "Acceptable — the citation exists",
              "Citation misuse — a real citation that doesn't support the claim is misleading, arguably worse than no citation",
              "A minor formatting issue",
              "Not a problem since the paper is real",
            ],
            correctAnswer: "Citation misuse — a real citation that doesn't support the claim is misleading, arguably worse than no citation",
            points: 2,
          },
          {
            order: 4,
            type: "WRITTEN_RESPONSE",
            prompt:
              "Describe how you would check whether a research summary accurately represents its cited sources, including how you'd spot suspected citation misuse.",
            points: 4,
          },
        ],
      },
    },
  });
}

/**
 * Populates an empty database with demo data.
 *
 * Exported rather than run on import so the same code backs both
 * `npm run db:seed` and the one-time seed endpoint — two implementations of
 * "what demo data looks like" would drift.
 */
export async function seedDatabase() {
  console.log("Seeding Traivr demo data…");

  await ensureRoles();
  await ensureSkillsAndLanguages();

  await ensureAssessments();

  // --- Demo accounts (development only) ---
  const trainer = await upsertUser({
    email: "trainer@traivr.demo",
    firstName: "Maya",
    lastName: "Okafor",
    role: "TRAINER",
  });
  const reviewer = await upsertUser({
    email: "reviewer@traivr.demo",
    firstName: "Daniel",
    lastName: "Kessler",
    role: "REVIEWER",
  });
  const clientAdmin = await upsertUser({
    email: "client@traivr.demo",
    firstName: "Priya",
    lastName: "Raman",
    role: "CLIENT_ADMIN",
  });
  const admin = await upsertUser({
    email: "admin@traivr.demo",
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
    where: { id: SEED_IDS.projectPairwise },
    update: {},
    create: {
      id: SEED_IDS.projectPairwise,
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
      assessmentId: SEED_IDS.assessmentSoftware,
      status: "PASSED",
      score: 0.92,
      startedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    },
  });

  // A second applicant sitting in the review queue, so the admin screen
  // has something real to act on.
  const applicant = await upsertUser({
    email: "applicant@traivr.demo",
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
  console.log("  trainer@traivr.demo  — Trainer");
  console.log("  reviewer@traivr.demo — Reviewer");
  console.log("  client@traivr.demo   — Client Admin (Meridian AI)");
  console.log("  admin@traivr.demo    — Super Admin");
  void admin;
}

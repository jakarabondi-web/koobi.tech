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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to fix a failing test. The model changes the test's expected value to match the buggy output instead of fixing the code. How should this be scored?",
            options: [
              "Full marks — the test passes now",
              "Failed — it made the test lie rather than fixing the actual defect",
              "Acceptable if the change is small",
              "Cannot be judged without seeing the test",
            ],
            correctAnswer: "Failed — it made the test lie rather than fixing the actual defect",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's explanation of Big-O complexity for an algorithm is fluent and confident, but the complexity class it states is wrong. How significant is this?",
            options: [
              "Minor — the explanation style is what matters",
              "Major — a confidently wrong complexity claim is a factual error, not a style issue",
              "Not an error, complexity is subjective",
              "Only significant for very large inputs",
            ],
            correctAnswer: "Major — a confidently wrong complexity claim is a factual error, not a style issue",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for a solution with no external dependencies. The model's answer is elegant but imports a third-party package without flagging the constraint violation. How do you score instruction following?",
            options: [
              "Full marks — the package is well-known",
              "Low — it violated an explicit constraint without even acknowledging it",
              "Ignore the constraint",
              "Full marks if the package is lightweight",
            ],
            correctAnswer: "Low — it violated an explicit constraint without even acknowledging it",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line question. The model responds with 500 words covering the answer plus five tangential caveats. A different response answers the same question correctly in two sentences. Which is better?",
            options: [
              "The 500-word one — more thorough is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's answer states in paragraph one that a function is thread-safe, then in paragraph three warns the same function has a race condition under concurrent access. How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, which a reader can't resolve without already knowing the answer",
              "Ignore it, the second statement is probably the correct one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, which a reader can't resolve without already knowing the answer",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a markdown table. The model gives correct, complete information as a paragraph of prose instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the prose is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks how to fix one specific bug. The model fixes it, then also refactors three unrelated functions and renames several variables without being asked. How should this be scored?",
            options: [
              "Full marks — the extra cleanup is a bonus",
              "Flagged — unrequested changes to unrelated code expand the blast radius of a review the user didn't ask for",
              "Ignore the extra changes",
              "Full marks if the refactor is objectively better code",
            ],
            correctAnswer: "Flagged — unrequested changes to unrelated code expand the blast radius of a review the user didn't ask for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model recommends a library version that was current two years ago and doesn't mention that a newer major version with breaking changes has since shipped. What is the concern?",
            options: [
              "None — the old version still technically works",
              "Staleness — presenting outdated guidance as current can lead someone to build against a version that's since changed significantly",
              "Style issue only",
              "Only a problem if the user explicitly asks about versions",
            ],
            correctAnswer: "Staleness — presenting outdated guidance as current can lead someone to build against a version that's since changed significantly",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similarly-named concepts (e.g. process vs. thread) but its explanation actually swaps which one applies to which case. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for beginners",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a factually wrong premise (e.g. \"since Python is compiled ahead of time...\"). The model answers helpfully around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives a correct, complete answer, but hedges so heavily (\"this might possibly work in some cases, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate humility",
              "Flagged — excessive hedging on something the model could state plainly undermines a response that is actually correct",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on something the model could state plainly undermines a response that is actually correct",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's code sample works for the example given but silently breaks on an empty-input edge case a competent engineer would consider. Is this worth flagging even though the user didn't ask about edge cases?",
            options: [
              "No — only score against what was explicitly asked",
              "Yes — an unhandled edge case a competent engineer would anticipate is a real gap even if it wasn't asked about directly",
              "Only if the code throws an error rather than failing silently",
              "No, edge cases are the user's responsibility to specify",
            ],
            correctAnswer: "Yes — an unhandled edge case a competent engineer would anticipate is a real gap even if it wasn't asked about directly",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly answer a debugging question. One cites the specific line and mechanism causing the bug; the other says only \"there's likely a bug in your loop somewhere.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the user actually fix the problem",
              "The vague one — it's more concise",
              "Cannot be judged without seeing the code",
            ],
            correctAnswer: "The specific one — actionable detail lets the user actually fix the problem",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific benchmark number (\"40% faster\") for a performance claim without saying what was measured, on what hardware, or under what workload. How should this be scored?",
            options: [
              "Full marks — a number is more convincing than a vague claim",
              "Flagged — an unqualified benchmark number is nearly meaningless and can be actively misleading",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unqualified benchmark number is nearly meaningless and can be actively misleading",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for a solution and explicitly states a hard constraint (e.g. \"must run in a browser, no Node APIs\"). The model's solution uses a Node-only API. How should this be scored?",
            options: [
              "Full marks if the code is otherwise well-written",
              "Failed — a solution that violates an explicit hard constraint doesn't actually solve the stated problem",
              "Acceptable, the user can adapt it",
              "Only a problem if the model doesn't mention Node at all",
            ],
            correctAnswer: "Failed — a solution that violates an explicit hard constraint doesn't actually solve the stated problem",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags that a proposed database query is vulnerable to SQL injection, and also proposes a parameterized fix. How should the safety flag factor into scoring?",
            options: [
              "It shouldn't — the user only asked for the query to be written",
              "It should be rewarded — surfacing an unrequested but material security issue is more valuable than silently writing vulnerable code",
              "It's a distraction from answering the actual question",
              "Only relevant if the user works in security",
            ],
            correctAnswer: "It should be rewarded — surfacing an unrequested but material security issue is more valuable than silently writing vulnerable code",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model is shown one failing test case and confidently declares the root cause without checking whether the same behavior would occur on the two other similar tests in the suite that are passing. What's the risk in this reasoning?",
            options: [
              "None — one data point is enough to diagnose a bug",
              "An untested assumption is being stated as a confirmed conclusion, when checking the passing cases could confirm or rule it out",
              "It's fine as long as the fix happens to work",
              "This is only a concern in formally verified systems",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the passing cases could confirm or rule it out",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model invents a citation — a real-sounding source that does not exist — to support a claim. What is the most accurate label?",
            options: ["Style issue", "Hallucination", "Instruction-following failure", "Just a formatting choice"],
            correctAnswer: "Hallucination",
            points: 2,
          },
          {
            order: 4,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a question with a clearly harmful intent behind an innocuous phrasing. The model answers the literal question without noticing the intent. How should this be scored?",
            options: [
              "Full marks — it answered what was literally asked",
              "Flagged — a safety-relevant response has to consider intent, not just the literal text",
              "Ignore intent entirely, only the words matter",
              "Full marks if the literal answer happens to be accurate",
            ],
            correctAnswer: "Flagged — a safety-relevant response has to consider intent, not just the literal text",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "Response A hedges appropriately on a genuinely uncertain question. Response B states one answer with total confidence. The correct answer turns out to match B. Which response was better calibrated?",
            options: [
              "B — it happened to be right",
              "A — being right by chance doesn't make overconfidence the correct call in general",
              "They are equal since B's content was correct",
              "Cannot be judged without knowing the topic",
            ],
            correctAnswer: "A — being right by chance doesn't make overconfidence the correct call in general",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line question. The model responds with 500 words covering the answer plus five tangential asides. A different response answers the same question correctly in two sentences. Which is better?",
            options: [
              "The 500-word one — more thorough is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's answer states in one sentence that a plan is \"low-risk,\" then later says the same plan \"could fail badly if X happens.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell which framing to trust",
              "Ignore it, the second statement is probably the accurate one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell which framing to trust",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a numbered list. The model gives correct, complete information as a paragraph of prose instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the prose is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks how to word one specific email. The model rewrites the email as asked, then also unsolicited-ly critiques the user's entire communication style and offers a five-point improvement plan. How should this be scored?",
            options: [
              "Full marks — the extra feedback is a bonus",
              "Flagged — unrequested, unsolicited criticism goes well beyond the scope of what was asked",
              "Ignore the extra content",
              "Full marks if the extra feedback happens to be accurate",
            ],
            correctAnswer: "Flagged — unrequested, unsolicited criticism goes well beyond the scope of what was asked",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "A model presents a statistic from a few years ago as if it reflects the current state of things, without noting it may be dated. What is the concern?",
            options: [
              "None — the number was accurate when published",
              "Staleness — presenting outdated information as current can mislead someone who assumes it's up to date",
              "Style issue only",
              "Only a problem if the user explicitly asks about recency",
            ],
            correctAnswer: "Staleness — presenting outdated information as current can mislead someone who assumes it's up to date",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding concepts, but its explanation actually swaps which one applies to which case. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for beginners",
            ],
            correctAnswer: "A substantive error — the core distinction is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a factually wrong premise. The model answers helpfully around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives a correct, complete answer, but hedges so heavily (\"this might possibly be true, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate humility",
              "Flagged — excessive hedging on something the model could state plainly undermines a response that is actually correct",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on something the model could state plainly undermines a response that is actually correct",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly answer a practical how-to question. One gives a specific, step-by-step path; the other says only \"there are several ways to do this, look into it.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the user actually act on it",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail lets the user actually act on it",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states a specific statistic (\"73% of people prefer X\") without saying where it came from or how it was measured. How should this be scored?",
            options: [
              "Full marks — a number is more convincing than a vague claim",
              "Flagged — an unsourced, unqualified statistic is nearly meaningless and can be actively misleading",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unsourced, unqualified statistic is nearly meaningless and can be actively misleading",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states a hard constraint (e.g. \"I have a strict $50 budget\"). The model's recommendation exceeds it without acknowledging the mismatch. How should this be scored?",
            options: [
              "Full marks if the recommendation is otherwise good",
              "Failed — a recommendation that violates an explicit hard constraint doesn't actually solve the stated problem",
              "Acceptable, the user can adjust it",
              "Only a problem if the model doesn't mention price at all",
            ],
            correctAnswer: "Failed — a recommendation that violates an explicit hard constraint doesn't actually solve the stated problem",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material risk in what the user is asking to do (e.g. a step that could cause data loss), alongside answering the actual question. How should the flag factor into scoring?",
            options: [
              "It shouldn't — the user only asked for the steps",
              "It should be rewarded — surfacing a material, unrequested risk is more valuable than silently proceeding",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about risk",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested risk is more valuable than silently proceeding",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model is given one example of a problem and confidently states the general cause without checking whether the explanation would also hold for a second, slightly different example already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one example is enough to generalize from",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other example could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal research",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other example could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long document. The model's summary includes a specific claim that isn't actually anywhere in the source document. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the claim happens to be true",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses a completely benign request because it superficially resembles a sensitive topic, without engaging with what was actually asked. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to solve an equation using a specific method (e.g. substitution). The model solves it correctly but uses a different method entirely. How should this be scored?",
            options: [
              "Full marks — the answer is correct",
              "Low — it did not follow the explicitly requested method",
              "Ignore the method, only the answer matters",
              "Full marks if the alternative method is simpler",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested method",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states a numeric result to six decimal places when the inputs to the problem were only given to one significant figure. What is the issue?",
            options: [
              "None — more precision is always better",
              "False precision — the result can't be more precise than the least precise input",
              "Style issue only",
              "Only a problem if the extra digits are wrong",
            ],
            correctAnswer: "False precision — the result can't be more precise than the least precise input",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model asserts a mathematical claim is “obviously true” without proof, when the claim actually requires a non-trivial argument. How should this be scored?",
            options: [
              "Full marks — the claim is true",
              "Flagged — asserting a non-trivial claim as obvious skips reasoning a rigorous answer needs",
              "Irrelevant to scoring",
              "Full marks if most mathematicians would agree",
            ],
            correctAnswer: "Flagged — asserting a non-trivial claim as obvious skips reasoning a rigorous answer needs",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for the numeric answer only. The model responds with a full page covering three alternate solution methods before finally stating the number. A different response states the same correct number in one line with the key step shown. Which is better?",
            options: [
              "The long one — more methods shown is always better",
              "The short one — it answers what was asked without burying the result",
              "They are equal since both reach the correct number",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The short one — it answers what was asked without burying the result",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early in its answer that a series converges, then later says the same series \"may or may not converge depending on the terms.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
              "Ignore it, the second statement is probably the accurate one",
              "Full marks if either statement is correct",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the derivation as a numbered list of steps. The model gives a correct derivation as a single dense paragraph instead. How do you score instruction following?",
            options: [
              "Full marks — the math is what matters, not the format",
              "Low — it did not follow the explicitly requested format",
              "Ignore the format request",
              "Full marks if the paragraph is well written",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks to solve one specific equation. The model solves it, then also unsolicited-ly derives and solves two related equations the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra work is a bonus",
              "Flagged — unrequested extra derivations dilute the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra derivations happen to be correct",
            ],
            correctAnswer: "Flagged — unrequested extra derivations dilute the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between necessary and sufficient conditions, but its explanation actually swaps which term applies to which case. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for beginners",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a mathematically wrong premise (e.g. \"since all prime numbers are odd...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives a correct, complete derivation, but hedges so heavily (\"this might possibly be the right approach, though it's hard to be sure\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate humility",
              "Flagged — excessive hedging on a derivation the model could state plainly undermines an answer that is actually correct",
              "Ignore the hedging entirely",
              "Full marks as long as the derivation is technically correct",
            ],
            correctAnswer: "Flagged — excessive hedging on a derivation the model could state plainly undermines an answer that is actually correct",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly solve a word problem. One shows the specific setup connecting the words to the equation; the other jumps straight to \"the answer is 42\" with no working shown. Which is more useful for evaluating whether the reasoning was sound?",
            options: [
              "They're equally useful since both reach the correct number",
              "The one with shown working — it lets a reviewer verify the reasoning, not just the final digit",
              "The bare-answer one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The one with shown working — it lets a reviewer verify the reasoning, not just the final digit",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific numeric result (\"the limit is approximately 1.6180\") without stating which method produced it or to how many terms it converged. How should this be scored?",
            options: [
              "Full marks — a precise-looking number is more convincing",
              "Flagged — an unqualified numeric result with no stated method is hard to verify and can be quietly wrong",
              "Irrelevant to scoring",
              "Full marks if the number looks plausible",
            ],
            correctAnswer: "Flagged — an unqualified numeric result with no stated method is hard to verify and can be quietly wrong",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states a domain constraint (e.g. \"solve for x where x must be a positive integer\"). The model's final answer is x = -3. How should this be scored?",
            options: [
              "Full marks if the algebra leading there is correct",
              "Failed — an answer that violates an explicitly stated constraint doesn't actually solve the stated problem",
              "Acceptable, the user can adjust it",
              "Only a problem if the model doesn't mention the constraint at all",
            ],
            correctAnswer: "Failed — an answer that violates an explicitly stated constraint doesn't actually solve the stated problem",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that the user's proposed formula only holds under an assumption (e.g. independence) they haven't stated is true — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked for the calculation",
              "It should be rewarded — surfacing a material, unstated assumption behind a formula is more valuable than silently applying it",
              "It's a distraction from answering the actual question",
              "Only relevant in a statistics course",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unstated assumption behind a formula is more valuable than silently applying it",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one example where a pattern holds and confidently states it holds for all cases, without checking a second, slightly different example already given earlier in the same conversation. What's the risk in this reasoning?",
            options: [
              "None — one example is enough to generalize a mathematical pattern",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other example could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal proofs",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other example could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize the key result of a long derivation someone else wrote. The model's summary states a bound that isn't actually anywhere in the source derivation. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the bound happens to be true",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to help with a completely benign optimization problem because it superficially involves the word \"exploit,\" without engaging with the actual math being asked. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model lists a drug interaction warning that applies to one formulation of a medication as if it applied to all formulations, without qualifying which one. What is the issue?",
            options: [
              "None — the warning is still useful in general",
              "Overgeneralization — presenting a formulation-specific risk as universal can mislead someone using a different formulation",
              "Style issue only",
              "Not a problem if the warning is technically accurate for one formulation",
            ],
            correctAnswer: "Overgeneralization — presenting a formulation-specific risk as universal can mislead someone using a different formulation",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly says this is an emergency (e.g. describing signs of a stroke). The model gives a thoughtful general explanation instead of urging immediate emergency care. How should this be scored?",
            options: [
              "Full marks — the explanation is medically accurate",
              "Failed — missing the urgency of a described emergency is a critical safety failure regardless of accuracy elsewhere",
              "Ignore urgency, information is what was asked for",
              "Only a problem if the explanation itself is wrong",
            ],
            correctAnswer: "Failed — missing the urgency of a described emergency is a critical safety failure regardless of accuracy elsewhere",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly declines to give a specific diagnosis from limited information, and instead explains what factors a clinician would need to consider. How should this be scored?",
            options: [
              "Penalized — it didn't answer the question",
              "Rewarded — appropriately calibrated to the limits of the information available, while still being useful",
              "Neutral, this is the minimum expected",
              "Penalized unless it also names a likely diagnosis",
            ],
            correctAnswer: "Rewarded — appropriately calibrated to the limits of the information available, while still being useful",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line symptom question. The model responds with 500 words covering ten possible conditions in exhaustive detail. A different response gives the two most likely explanations and clearly says to see a doctor for a proper evaluation. Which is better?",
            options: [
              "The 500-word one — more thorough is always better",
              "The shorter one — it's calibrated and actionable without overwhelming the reader with low-probability possibilities",
              "They are equal since both mention seeing a doctor eventually",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The shorter one — it's calibrated and actionable without overwhelming the reader with low-probability possibilities",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that a symptom is \"usually harmless,\" then later in the same answer calls the same symptom \"a possible sign of a serious condition.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell how seriously to take it",
              "Ignore it, the second statement is probably the more careful one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell how seriously to take it",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a short bulleted list of warning signs. The model gives correct, complete information as a long paragraph instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the paragraph is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks about one specific medication's side effects. The model answers that, then also unsolicited-ly lists side effects for three other unrelated medications the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra information is a bonus",
              "Flagged — unrequested information about unrelated medications dilutes the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra information happens to be accurate",
            ],
            correctAnswer: "Flagged — unrequested information about unrelated medications dilutes the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding conditions, but its explanation actually swaps which symptoms apply to which condition. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for medical professionals",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a wrong premise (e.g. \"since antibiotics work on viruses...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a dangerous misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a dangerous misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives accurate, well-calibrated information, but hedges so heavily (\"this might possibly be relevant, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate caution",
              "Flagged — excessive hedging on information the model could state plainly undermines an answer that is actually accurate",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on information the model could state plainly undermines an answer that is actually accurate",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly note that a symptom warrants medical attention. One says specifically what kind of provider to see and roughly how urgently; the other just says \"see a doctor.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail helps the user actually act on it",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail helps the user actually act on it",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific statistic (\"this affects 12% of people over 50\") without saying where it came from. How should this be scored?",
            options: [
              "Full marks — a number is more convincing than a vague claim",
              "Flagged — an unsourced statistic in a medical context is hard to verify and can be actively misleading",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unsourced statistic in a medical context is hard to verify and can be actively misleading",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states a constraint (e.g. \"I'm allergic to penicillin\"). The model's suggestion mentions a penicillin-class medication without acknowledging the stated allergy. How should this be scored?",
            options: [
              "Full marks if the rest of the answer is accurate",
              "Failed — ignoring an explicitly stated allergy is a critical safety failure, not a minor oversight",
              "Acceptable, the user should catch it themselves",
              "Only a problem if the model recommends the exact drug by name",
            ],
            correctAnswer: "Failed — ignoring an explicitly stated allergy is a critical safety failure, not a minor oversight",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags that a described symptom combination could indicate something urgent, and recommends seeking care promptly, alongside otherwise answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked what the symptom might mean",
              "It should be rewarded — surfacing a material safety concern is more valuable than answering narrowly and missing it",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks how urgent it is",
            ],
            correctAnswer: "It should be rewarded — surfacing a material safety concern is more valuable than answering narrowly and missing it",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one described case and confidently states the general cause, without checking whether the explanation would also fit a second, slightly different case already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one case is enough to generalize a cause",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other case could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal clinical research",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other case could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long patient-information leaflet. The model's summary includes a specific side effect that isn't actually anywhere in the source leaflet. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the side effect happens to be a real one for a similar drug",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to explain what a common lab test result means because it superficially involves a medical term, even though the request is a completely benign request for general information. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model describes a law that was recently repealed or superseded as if it were still current, with no caveat about when its information might be outdated. What is the issue?",
            options: [
              "None — laws rarely change",
              "Staleness risk — legal information can go stale, and presenting it without any currency caveat is misleading",
              "Style issue only",
              "Only a problem if the user explicitly asks about recent changes",
            ],
            correctAnswer: "Staleness risk — legal information can go stale, and presenting it without any currency caveat is misleading",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "The user describes a dispute and asks what their rights are. The model responds only with generic advice to “consult a lawyer,” with no substantive information at all. How should this be scored?",
            options: [
              "Full marks — deferring to a lawyer is always safest",
              "Low — a bare deferral with zero substantive content isn't useful; the goal is a calibrated substantive answer plus appropriate caveats, not silence",
              "Ignore it, this is the ideal response",
              "Full marks if the dispute sounds complex",
            ],
            correctAnswer: "Low — a bare deferral with zero substantive content isn't useful; the goal is a calibrated substantive answer plus appropriate caveats, not silence",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model conflates two similarly-named but legally distinct concepts (e.g. two different types of legal protection) and treats them as interchangeable. What is this?",
            options: [
              "A minor terminology slip, not worth flagging",
              "A substantive error — treating distinct legal concepts as interchangeable can lead someone to the wrong conclusion",
              "Not an error if the concepts are related",
              "Only a problem in a courtroom setting",
            ],
            correctAnswer: "A substantive error — treating distinct legal concepts as interchangeable can lead someone to the wrong conclusion",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line legal question. The model responds with 500 words covering ten tangential doctrines. A different response gives the directly relevant answer plus a clear \"not legal advice, confirm with a lawyer\" note in two paragraphs. Which is better?",
            options: [
              "The 500-word one — more coverage is always better",
              "The shorter one — it answers what was asked, calibrated to the actual question, without burying the point",
              "They are equal since both mention consulting a lawyer eventually",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The shorter one — it answers what was asked, calibrated to the actual question, without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that a type of contract clause is \"generally unenforceable,\" then later in the same answer says the same clause \"is typically upheld by courts.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
              "Ignore it, the second statement is probably the accurate one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a short bulleted list of the key points. The model gives correct, complete information as a long paragraph instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the paragraph is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks about one specific clause in their lease. The model answers that, then also unsolicited-ly reviews and critiques four other unrelated clauses the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra review is a bonus",
              "Flagged — unrequested review of unrelated clauses goes beyond the scope of what was asked",
              "Ignore the extra content",
              "Full marks if the extra review happens to be accurate",
            ],
            correctAnswer: "Flagged — unrequested review of unrelated clauses goes beyond the scope of what was asked",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding legal statuses, but its explanation actually swaps which one applies to which situation. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for lawyers",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a wrong legal premise (e.g. \"since verbal contracts aren't binding...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives accurate, appropriately calibrated information, but hedges so heavily (\"this might possibly be relevant, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate caution",
              "Flagged — excessive hedging on information the model could state plainly undermines an answer that is actually useful",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on information the model could state plainly undermines an answer that is actually useful",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly note that a situation may have legal implications. One says specifically what kind of practitioner to consult and what documents to gather; the other just says \"talk to a lawyer.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail helps the user actually act on it",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail helps the user actually act on it",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific statute or case name to support a claim, but the citation doesn't actually say what the model claims it says. How should this be scored?",
            options: [
              "Full marks — citing something is better than citing nothing",
              "Flagged — a citation that doesn't support the claim is more misleading than no citation at all",
              "Irrelevant to scoring",
              "Full marks if the citation is at least a real statute or case",
            ],
            correctAnswer: "Flagged — a citation that doesn't support the claim is more misleading than no citation at all",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states their jurisdiction. The model's answer describes a rule that applies in a different jurisdiction without noting the mismatch. How should this be scored?",
            options: [
              "Full marks if the described rule is accurate for the jurisdiction it applies to",
              "Failed — answering for the wrong jurisdiction, unflagged, doesn't actually answer the question that was asked",
              "Acceptable, the user should catch it themselves",
              "Only a problem if the model never mentions jurisdiction",
            ],
            correctAnswer: "Failed — answering for the wrong jurisdiction, unflagged, doesn't actually answer the question that was asked",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that a described action might have a filing deadline the user hasn't mentioned — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked the direct question",
              "It should be rewarded — surfacing a material, unrequested deadline risk is more valuable than answering narrowly and missing it",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about deadlines",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested deadline risk is more valuable than answering narrowly and missing it",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one described fact pattern and confidently states the general rule, without checking whether it would also apply to a second, slightly different fact pattern already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one fact pattern is enough to state a general rule",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other fact pattern could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal legal research",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other fact pattern could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long contract. The model's summary includes a specific obligation that isn't actually anywhere in the source contract. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the obligation is a common one for that kind of contract",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to explain what a common legal term means because it superficially sounds adversarial, even though the request is a completely benign request for general information. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model compares two loan offers using only the nominal interest rate and ignores fees that materially change the effective cost. What is the issue?",
            options: [
              "None — the nominal rate is the standard comparison point",
              "Incomplete analysis — ignoring fees that materially affect cost gives a misleading comparison",
              "Style issue only",
              "Only a problem if the fees are unusually high",
            ],
            correctAnswer: "Incomplete analysis — ignoring fees that materially affect cost gives a misleading comparison",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "A model recommends a specific asset allocation without asking about or accounting for the user's risk tolerance or time horizon at all. How should this be scored?",
            options: [
              "Full marks — the allocation is a reasonable default",
              "Flagged — a specific recommendation that ignores the two most basic inputs to that decision is poorly calibrated advice",
              "Irrelevant to scoring",
              "Full marks if the allocation is conservative",
            ],
            correctAnswer: "Flagged — a specific recommendation that ignores the two most basic inputs to that decision is poorly calibrated advice",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's response confuses nominal and real (inflation-adjusted) returns, presenting one as the other. What is the significance?",
            options: [
              "Minor — both are “returns”",
              "Major — conflating nominal and real returns materially changes what the number actually means",
              "Not an error",
              "Only significant over very long time horizons",
            ],
            correctAnswer: "Major — conflating nominal and real returns materially changes what the number actually means",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line question about a specific fee. The model responds with 500 words covering the entire fee structure of the product. A different response answers the exact fee asked about in two sentences. Which is better?",
            options: [
              "The 500-word one — more coverage is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that an investment is \"low-risk,\" then later in the same answer says it \"could lose significant value in a downturn.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell which framing to trust",
              "Ignore it, the second statement is probably the more accurate one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell which framing to trust",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a comparison table. The model gives correct, complete information as a long paragraph instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the paragraph is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks about one specific account type. The model answers that, then also unsolicited-ly compares three other unrelated account types the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra comparison is a bonus",
              "Flagged — unrequested comparisons to unrelated products dilute the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra comparison happens to be accurate",
            ],
            correctAnswer: "Flagged — unrequested comparisons to unrelated products dilute the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding account types, but its explanation actually swaps which tax treatment applies to which. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for accountants",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a wrong premise (e.g. \"since index funds are guaranteed to grow...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives an accurate, well-calibrated answer, but hedges so heavily (\"this might possibly apply, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate caution",
              "Flagged — excessive hedging on information the model could state plainly undermines an answer that is actually accurate",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on information the model could state plainly undermines an answer that is actually accurate",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly note that a fee applies. One states the specific percentage and when it's charged; the other just says \"there are some fees involved.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail helps the user actually evaluate the cost",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail helps the user actually evaluate the cost",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific historical return figure (\"this fund averaged 11% annually\") without saying over what period or whether it includes fees. How should this be scored?",
            options: [
              "Full marks — a precise-looking number is more convincing",
              "Flagged — an unqualified return figure with no stated period or fee treatment is hard to verify and can be misleading",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unqualified return figure with no stated period or fee treatment is hard to verify and can be misleading",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states a constraint (e.g. \"I need this money accessible within 6 months\"). The model recommends a product with a multi-year lock-in without acknowledging the mismatch. How should this be scored?",
            options: [
              "Full marks if the product otherwise has good returns",
              "Failed — a recommendation that violates an explicit hard constraint doesn't actually solve the stated problem",
              "Acceptable, the user can catch the mismatch themselves",
              "Only a problem if the model doesn't mention the lock-in at all",
            ],
            correctAnswer: "Failed — a recommendation that violates an explicit hard constraint doesn't actually solve the stated problem",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that a described transaction may trigger a tax event the user hasn't mentioned — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked the direct question",
              "It should be rewarded — surfacing a material, unrequested tax consequence is more valuable than answering narrowly and missing it",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about taxes",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested tax consequence is more valuable than answering narrowly and missing it",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one described scenario and confidently states the general rule, without checking whether it would also apply to a second, slightly different scenario already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one scenario is enough to state a general rule",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other scenario could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal financial research",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other scenario could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long prospectus. The model's summary includes a specific fee that isn't actually anywhere in the source document. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if that fee is common for similar products",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to explain what a common financial term means because it superficially sounds like investment advice, even though the request is a completely benign request for general information. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains a scientific concept using a well-known analogy, but the analogy breaks down in a way that would give the reader a wrong mental model of the actual mechanism. How should this be scored?",
            options: [
              "Full marks — analogies always simplify",
              "Flagged — an analogy that actively misleads about the mechanism is worse than a plainer, accurate explanation",
              "Ignore it, analogies are for intuition, not accuracy",
              "Full marks if the analogy is memorable",
            ],
            correctAnswer: "Flagged — an analogy that actively misleads about the mechanism is worse than a plainer, accurate explanation",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "A model reports a result from a study without mentioning the sample size or whether it has been replicated. What is missing?",
            options: [
              "Nothing — the result itself is what matters",
              "Context needed to judge reliability — sample size and replication status materially affect how much weight a result deserves",
              "Only the study's authors matter",
              "Nothing, unless the result is surprising",
            ],
            correctAnswer: "Context needed to judge reliability — sample size and replication status materially affect how much weight a result deserves",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to explain a phenomenon at a mechanistic level. The model instead describes what the phenomenon looks like/does, without ever explaining why it happens. How do you score this?",
            options: [
              "Full marks — description is still informative",
              "Low — it did not answer the mechanistic question that was actually asked",
              "Ignore the gap",
              "Full marks if the description is vivid",
            ],
            correctAnswer: "Low — it did not answer the mechanistic question that was actually asked",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line factual question. The model responds with 500 words covering the entire background of the field. A different response answers the exact question in two sentences with the key caveat noted. Which is better?",
            options: [
              "The 500-word one — more context is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that a finding is \"well-established,\" then later in the same answer calls the same finding \"still actively debated.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell how settled the finding actually is",
              "Ignore it, the second statement is probably the more careful one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell how settled the finding actually is",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a short bulleted list of key factors. The model gives correct, complete information as a long paragraph instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the paragraph is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks about one specific mechanism. The model answers that, then also unsolicited-ly explains three other unrelated mechanisms the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra explanation is a bonus",
              "Flagged — unrequested explanations of unrelated mechanisms dilute the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra explanations happen to be accurate",
            ],
            correctAnswer: "Flagged — unrequested explanations of unrelated mechanisms dilute the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding concepts, but its explanation actually swaps which one applies to which case. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for specialists",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a factually wrong premise. The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives an accurate, well-supported answer, but hedges so heavily (\"this might possibly be the case, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate scientific caution",
              "Flagged — excessive hedging on something the model could state plainly undermines an answer that is actually well-supported",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on something the model could state plainly undermines an answer that is actually well-supported",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly answer a how-does-this-work question. One names the specific mechanism and cites the relevant process; the other says only \"it's complicated, there are many factors.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the user actually understand the mechanism",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail lets the user actually understand the mechanism",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific figure (\"this effect is 30% stronger under X conditions\") without saying what study produced it. How should this be scored?",
            options: [
              "Full marks — a precise-looking number is more convincing",
              "Flagged — an unsourced figure is hard to verify and can be actively misleading",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unsourced figure is hard to verify and can be actively misleading",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states a constraint on the conditions being asked about (e.g. \"at standard temperature and pressure\"). The model's answer describes behavior under different conditions without acknowledging the mismatch. How should this be scored?",
            options: [
              "Full marks if the described behavior is accurate for those other conditions",
              "Failed — answering for the wrong conditions, unflagged, doesn't actually answer the question that was asked",
              "Acceptable, the user should catch it themselves",
              "Only a problem if the model never mentions conditions at all",
            ],
            correctAnswer: "Failed — answering for the wrong conditions, unflagged, doesn't actually answer the question that was asked",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material caveat — that a described effect has only been shown in a narrow set of conditions — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked the direct question",
              "It should be rewarded — surfacing a material, unrequested scope limitation is more valuable than answering narrowly and overstating generality",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about scope",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested scope limitation is more valuable than answering narrowly and overstating generality",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one described observation and confidently states the general cause, without checking whether it would also fit a second, slightly different observation already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one observation is enough to generalize a cause",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other observation could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal peer-reviewed research",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other observation could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long research paper. The model's summary includes a specific finding that isn't actually anywhere in the source paper. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the finding is plausible for that field",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to explain how a common household chemical reaction works because it superficially involves the word \"reaction,\" even though the request is a completely benign request for general information. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model recommends a design change that improves one performance metric but silently degrades another the user cares about (e.g. cost vs. durability), without mentioning the tradeoff. How should this be scored?",
            options: [
              "Full marks — the requested metric improved",
              "Flagged — an unflagged tradeoff hides information the user needs to actually make the decision",
              "Irrelevant to scoring",
              "Full marks if the degraded metric is minor",
            ],
            correctAnswer: "Flagged — an unflagged tradeoff hides information the user needs to actually make the decision",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for a solution compliant with a named industry standard. The model's answer is technically sound but never references or checks against that standard. How do you score instruction following?",
            options: [
              "Full marks — the solution works",
              "Low — it ignored the explicit compliance requirement entirely",
              "Ignore the standard, it's usually boilerplate",
              "Full marks if the solution happens to comply anyway",
            ],
            correctAnswer: "Low — it ignored the explicit compliance requirement entirely",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's load calculation uses a formula that applies to static loads for a scenario that is explicitly dynamic. What is the significance of this error?",
            options: [
              "Minor — the formula is close enough",
              "Major — applying the wrong physical model produces a result that doesn't actually describe the real scenario",
              "Not an error, formulas are interchangeable",
              "Only significant at extreme loads",
            ],
            correctAnswer: "Major — applying the wrong physical model produces a result that doesn't actually describe the real scenario",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line question about one component's rating. The model responds with 500 words covering the entire system's specification. A different response answers the exact rating asked about in two sentences. Which is better?",
            options: [
              "The 500-word one — more coverage is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that a material is \"suitable for high-temperature use,\" then later in the same answer says it \"degrades rapidly above 80°C.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
              "Ignore it, the second statement is probably the more accurate one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a specification table. The model gives correct, complete information as a long paragraph instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the paragraph is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks about one specific component's tolerance. The model answers that, then also unsolicited-ly evaluates three other unrelated components the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra evaluation is a bonus",
              "Flagged — unrequested evaluation of unrelated components dilutes the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra evaluation happens to be accurate",
            ],
            correctAnswer: "Flagged — unrequested evaluation of unrelated components dilutes the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding fastener or material grades, but its explanation actually swaps which properties apply to which. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for specialists",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a wrong technical premise (e.g. \"since aluminum doesn't corrode...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives an accurate, well-supported answer, but hedges so heavily (\"this might possibly work, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate engineering caution",
              "Flagged — excessive hedging on something the model could state plainly undermines an answer that is actually well-supported",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on something the model could state plainly undermines an answer that is actually well-supported",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly answer a why-did-this-fail question. One names the specific failure mode and mechanism; the other says only \"it probably failed due to stress.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the user actually address the root cause",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail lets the user actually address the root cause",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific safety factor (\"this design has a 3x safety margin\") without saying what load case or standard it was calculated against. How should this be scored?",
            options: [
              "Full marks — a precise-looking number is more convincing",
              "Flagged — an unqualified safety factor is hard to verify and can be actively misleading in a safety-critical context",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unqualified safety factor is hard to verify and can be actively misleading in a safety-critical context",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states an operating constraint (e.g. \"this will run outdoors in freezing temperatures\"). The model's recommended material becomes brittle at low temperature, unflagged. How should this be scored?",
            options: [
              "Full marks if the material is otherwise a good fit",
              "Failed — a recommendation that violates an explicit stated operating constraint doesn't actually solve the stated problem",
              "Acceptable, the user should catch it themselves",
              "Only a problem if the model doesn't mention temperature at all",
            ],
            correctAnswer: "Failed — a recommendation that violates an explicit stated operating constraint doesn't actually solve the stated problem",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that a described assembly step could create a pinch-point hazard — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked how to assemble it",
              "It should be rewarded — surfacing a material, unrequested safety hazard is more valuable than answering narrowly and missing it",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about safety",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested safety hazard is more valuable than answering narrowly and missing it",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one described failure and confidently states the general cause, without checking whether it would also fit a second, slightly different case already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one case is enough to diagnose a general cause",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other case could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal failure analysis",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other case could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long datasheet. The model's summary includes a specific rated value that isn't actually anywhere in the source datasheet. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if that value is typical for similar components",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to explain how a common household appliance's circuit works because it superficially involves the word \"circuit,\" even though the request is a completely benign request for general information. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model claims a language “has no grammar” or “is simpler” than another because it lacks a feature the model is more familiar with (e.g. verb tenses). What is the issue?",
            options: [
              "None — some languages are objectively simpler",
              "A common linguistic misconception — languages redistribute complexity rather than lacking it, and this framing is inaccurate",
              "Style issue only",
              "Only a problem if the language is well-documented",
            ],
            correctAnswer: "A common linguistic misconception — languages redistribute complexity rather than lacking it, and this framing is inaccurate",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to identify the morphemes in a word. The model instead discusses the word's cultural connotations. How should this be scored?",
            options: [
              "Full marks — cultural context is interesting",
              "Low — it did not perform the morphological analysis that was actually requested",
              "Ignore the mismatch",
              "Full marks if the cultural discussion is accurate",
            ],
            correctAnswer: "Low — it did not perform the morphological analysis that was actually requested",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model asserts that a specific usage is simply “incorrect grammar” when it is in fact a well-documented regional or dialectal variation. What is the issue?",
            options: [
              "None — standard grammar is the only correct grammar",
              "Prescriptivist overreach — treating documented dialectal variation as simply wrong misrepresents how the language actually works",
              "Style issue only",
              "Only a problem in formal writing",
            ],
            correctAnswer: "Prescriptivist overreach — treating documented dialectal variation as simply wrong misrepresents how the language actually works",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line question about a word's origin. The model responds with 500 words covering the entire etymology of the language family. A different response answers the exact question in two sentences. Which is better?",
            options: [
              "The 500-word one — more coverage is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that a construction is \"ungrammatical,\" then later in the same answer calls the same construction \"a valid variant in some dialects.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
              "Ignore it, the second statement is probably the more careful one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell which claim to trust",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a labeled syntax tree. The model gives a correct analysis as a paragraph of prose instead. How do you score instruction following?",
            options: [
              "Full marks — the analysis is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the prose is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks about one specific word's pronunciation. The model answers that, then also unsolicited-ly analyzes the pronunciation of five other unrelated words the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra analysis is a bonus",
              "Flagged — unrequested analysis of unrelated words dilutes the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra analysis happens to be accurate",
            ],
            correctAnswer: "Flagged — unrequested analysis of unrelated words dilutes the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding grammatical terms, but its explanation actually swaps which one applies to which case. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for linguists",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a wrong premise about a language (e.g. \"since this language has no grammar rules...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives an accurate, well-supported analysis, but hedges so heavily (\"this might possibly be the right reading, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate academic caution",
              "Flagged — excessive hedging on something the model could state plainly undermines an answer that is actually well-supported",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on something the model could state plainly undermines an answer that is actually well-supported",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly identify that a sentence is ambiguous. One names the two specific readings and what causes the ambiguity; the other says only \"this sentence could be read a couple different ways.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the user actually see the ambiguity",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail lets the user actually see the ambiguity",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific claim (\"this is the most common word order across languages\") without saying what typological survey it's based on. How should this be scored?",
            options: [
              "Full marks — a confident claim is more convincing",
              "Flagged — an unsourced typological claim is hard to verify and can be actively misleading",
              "Irrelevant to scoring",
              "Full marks if the claim sounds plausible",
            ],
            correctAnswer: "Flagged — an unsourced typological claim is hard to verify and can be actively misleading",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks about a specific dialect or register. The model's answer describes standard/formal usage without acknowledging the mismatch. How should this be scored?",
            options: [
              "Full marks if the described usage is accurate for standard register",
              "Failed — answering for the wrong register, unflagged, doesn't actually answer the question that was asked",
              "Acceptable, the user should catch it themselves",
              "Only a problem if the model never mentions register at all",
            ],
            correctAnswer: "Failed — answering for the wrong register, unflagged, doesn't actually answer the question that was asked",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that a proposed translation loses an idiom's meaning in the target language — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked for a translation",
              "It should be rewarded — surfacing a material, unrequested loss of meaning is more valuable than a literal translation that quietly misleads",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about idioms",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested loss of meaning is more valuable than a literal translation that quietly misleads",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one example sentence and confidently states the general rule, without checking whether it would also fit a second, slightly different example already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one example is enough to state a general rule",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other example could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal linguistic research",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other example could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long grammar reference. The model's summary includes a specific rule that isn't actually anywhere in the source reference. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the rule sounds plausible for that language",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to explain a slang term's meaning because it superficially sounds crude, even though the request is a completely benign request for general linguistic information. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign, general-information request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives the correct final answer to a practice problem but skips the reasoning steps a learner needs to understand how to get there themselves. How should this be scored for a learning context?",
            options: [
              "Full marks — the answer is correct",
              "Low — a learning-context answer with no reasoning doesn't teach the learner anything transferable",
              "Ignore this, correctness is all that matters",
              "Full marks if the problem is simple",
            ],
            correctAnswer: "Low — a learning-context answer with no reasoning doesn't teach the learner anything transferable",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives corrective feedback on a learner's mistake that is accurate but harshly worded in a way likely to discourage a beginner. How should this factor into scoring?",
            options: [
              "Not at all — only factual accuracy matters",
              "It matters — tone that discourages the stated audience undermines the pedagogical goal even when the content is correct",
              "Only relevant for young children",
              "Full marks regardless, harsh feedback builds resilience",
            ],
            correctAnswer: "It matters — tone that discourages the stated audience undermines the pedagogical goal even when the content is correct",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "The user says they are preparing for a specific exam with a known format. The model gives excellent general knowledge but never adapts to that exam's format or conventions. How should this be scored?",
            options: [
              "Full marks — the knowledge is accurate",
              "Low — it ignored a stated, specific goal that should have shaped the response",
              "Ignore the stated goal",
              "Full marks if the knowledge is comprehensive",
            ],
            correctAnswer: "Low — it ignored a stated, specific goal that should have shaped the response",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line question about how to explain one concept to their students. The model responds with 500 words covering an entire unit plan. A different response answers the exact question in two sentences with a concrete example. Which is better?",
            options: [
              "The 500-word one — more coverage is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that a topic is \"straightforward for beginners,\" then later in the same answer calls it \"one of the more conceptually difficult topics to teach.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell how to actually pace the lesson",
              "Ignore it, the second statement is probably the more careful one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell how to actually pace the lesson",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the answer as a short numbered list of steps. The model gives correct, complete information as a long paragraph instead. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the paragraph is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for one practice problem on one topic. The model gives that, then also unsolicited-ly generates practice problems for four other unrelated topics the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra problems are a bonus",
              "Flagged — unrequested material on unrelated topics dilutes the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra problems happen to be good quality",
            ],
            correctAnswer: "Flagged — unrequested material on unrelated topics dilutes the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding pedagogical techniques, but its explanation actually swaps which one applies to which situation. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for education specialists",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a wrong premise about how students learn (e.g. \"since everyone has a fixed learning style...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives sound, practical teaching advice, but hedges so heavily (\"this might possibly help, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate humility",
              "Flagged — excessive hedging on advice the model could state plainly undermines an answer that is actually useful",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged advice is technically sound",
            ],
            correctAnswer: "Flagged — excessive hedging on advice the model could state plainly undermines an answer that is actually useful",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly identify that a student is struggling with a concept. One names the specific misconception and a targeted way to address it; the other says only \"they need more practice.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the teacher actually address the root misconception",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail lets the teacher actually address the root misconception",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model cites a specific statistic (\"students retain 90% more with active recall\") without saying where it came from. How should this be scored?",
            options: [
              "Full marks — a number is more convincing than a vague claim",
              "Flagged — an unsourced statistic is hard to verify and can be actively misleading, even when the underlying advice is reasonable",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unsourced statistic is hard to verify and can be actively misleading, even when the underlying advice is reasonable",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states a constraint (e.g. \"I have exactly 20 minutes for this lesson\"). The model's plan takes 45 minutes without acknowledging the mismatch. How should this be scored?",
            options: [
              "Full marks if the plan is otherwise well designed",
              "Failed — a plan that violates an explicit stated time constraint doesn't actually solve the stated problem",
              "Acceptable, the user can trim it themselves",
              "Only a problem if the model doesn't mention timing at all",
            ],
            correctAnswer: "Failed — a plan that violates an explicit stated time constraint doesn't actually solve the stated problem",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that a planned activity assumes prior knowledge the stated audience likely doesn't have yet — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked for the activity",
              "It should be rewarded — surfacing a material, unrequested prerequisite gap is more valuable than an activity that quietly won't land",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about prerequisites",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested prerequisite gap is more valuable than an activity that quietly won't land",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model sees one student's mistake and confidently states the general misconception behind it, without checking whether the explanation would also fit a second, slightly different mistake already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one mistake is enough to diagnose a general misconception",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other mistake could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal education research",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other mistake could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long curriculum guide. The model's summary includes a specific requirement that isn't actually anywhere in the source guide. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the requirement is common for similar curricula",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to help design a lesson on a sensitive historical event because it superficially involves conflict, even though the request is a completely benign, age-appropriate curriculum request. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign, standard curriculum request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign, standard curriculum request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for an original piece of writing. The model's output closely mirrors the structure and phrasing of a well-known existing work, without acknowledging it. How should this be scored?",
            options: [
              "Full marks — the prose itself is well-written",
              "Flagged — output that closely mirrors existing work without acknowledgment fails the “original” brief regardless of prose quality",
              "Irrelevant to scoring",
              "Full marks if it's an improvement on the original",
            ],
            correctAnswer: "Flagged — output that closely mirrors existing work without acknowledgment fails the “original” brief regardless of prose quality",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "The user specifies a target audience (e.g. children, or non-native speakers). The model produces well-crafted prose that uses vocabulary well above that audience's level. How should this be scored?",
            options: [
              "Full marks — the writing quality is high",
              "Low — it did not adapt to the stated audience, which is part of the brief",
              "Ignore the audience note",
              "Full marks if the vocabulary is impressive",
            ],
            correctAnswer: "Low — it did not adapt to the stated audience, which is part of the brief",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model's narrative voice shifts inconsistently partway through a piece (e.g. from first-person to third-person) with no apparent intent. What is this?",
            options: [
              "A stylistic choice, always acceptable",
              "A craft defect — an unintentional voice shift breaks consistency a reader will notice",
              "Not a problem if each section reads well individually",
              "Only a problem in formal writing",
            ],
            correctAnswer: "A craft defect — an unintentional voice shift breaks consistency a reader will notice",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for one punchy tagline. The model responds with 500 words explaining branding theory before finally offering one option. A different response gives three strong tagline options directly. Which is better?",
            options: [
              "The 500-word one — more explanation is always better",
              "The direct one — it answers what was asked without burying the deliverable",
              "They are equal since both eventually deliver a tagline",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The direct one — it answers what was asked without burying the deliverable",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model describes a character as \"quiet and reserved\" in one paragraph, then has that same character dominate a boisterous group conversation two paragraphs later with no explanation. How should this be scored?",
            options: [
              "Fine — people can act differently in different scenes",
              "Flagged — an unexplained contradiction in characterization breaks consistency a reader will notice",
              "Ignore it, the later portrayal is probably the more accurate one",
              "Full marks if either portrayal is well-written on its own",
            ],
            correctAnswer: "Flagged — an unexplained contradiction in characterization breaks consistency a reader will notice",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the piece formatted with headers and bullet points. The model delivers strong content as one unbroken block of prose instead. How do you score instruction following?",
            options: [
              "Full marks — the writing quality is what matters, not the format",
              "Low — it did not follow the explicitly requested output format",
              "Ignore the format request",
              "Full marks if the prose is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested output format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for one paragraph revised. The model revises it, then also unsolicited-ly rewrites three other paragraphs the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra polish is a bonus",
              "Flagged — unrequested changes to unedited paragraphs go beyond the scope of what was asked",
              "Ignore the extra content",
              "Full marks if the extra rewrites happen to be improvements",
            ],
            correctAnswer: "Flagged — unrequested changes to unedited paragraphs go beyond the scope of what was asked",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding literary devices, but its explanation actually swaps which one applies to which example. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for professional editors",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's brief contains a wrong premise about writing craft (e.g. \"since passive voice is always wrong...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception about craft stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception about craft stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives strong, well-crafted feedback on a draft, but hedges so heavily (\"this might possibly need work, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate humility",
              "Flagged — excessive hedging on feedback the model could state plainly undermines guidance that is actually useful",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged feedback is technically correct",
            ],
            correctAnswer: "Flagged — excessive hedging on feedback the model could state plainly undermines guidance that is actually useful",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly note that a paragraph is weak. One names the specific issue (e.g. \"the verb is passive and vague — 'was affected by' hides who did what\") and a fix; the other says only \"this paragraph could be stronger.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the writer actually fix the sentence",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail lets the writer actually fix the sentence",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model claims a piece of writing advice is \"the industry standard\" without any indication of whose standard or in what context. How should this be scored?",
            options: [
              "Full marks — a confident claim reads well",
              "Flagged — an unsourced claim of universal standard practice is hard to verify and can be actively misleading",
              "Irrelevant to scoring",
              "Full marks if the advice sounds reasonable",
            ],
            correctAnswer: "Flagged — an unsourced claim of universal standard practice is hard to verify and can be actively misleading",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly states a strict word limit (e.g. \"exactly 100 words\"). The model delivers 250 words of excellent prose without acknowledging the mismatch. How should this be scored?",
            options: [
              "Full marks if the writing is otherwise excellent",
              "Failed — a piece that violates an explicit stated length constraint doesn't actually solve the stated problem",
              "Acceptable, the user can trim it themselves",
              "Only a problem if the model doesn't mention length at all",
            ],
            correctAnswer: "Failed — a piece that violates an explicit stated length constraint doesn't actually solve the stated problem",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that a draft's headline could be read as making an unintended claim — alongside delivering the requested edit. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked for a copyedit",
              "It should be rewarded — surfacing a material, unrequested risk in the copy is more valuable than a clean edit that quietly ships a problem",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about legal risk",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested risk in the copy is more valuable than a clean edit that quietly ships a problem",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model reads one sentence out of context and confidently diagnoses the whole piece's tone problem, without checking whether that diagnosis fits a second passage already given earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one sentence is enough to diagnose overall tone",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other passage could confirm or rule it out",
              "It's fine as long as the diagnosis happens to be right",
              "This is only a concern for professional editors",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other passage could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long article for a pitch. The model's summary includes a specific detail that isn't actually anywhere in the source article. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if the detail is plausible for that kind of article",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to help write dialogue for a tense confrontation scene because it superficially involves conflict, even though the request is a completely benign fiction-writing request. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign creative-writing request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign creative-writing request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
      timeLimitMins: 15,
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
            type: "MULTIPLE_CHOICE",
            prompt: "A model summarizes a survey/meta-analysis and presents its aggregate finding as if it applied uniformly to every individual study included, ignoring that some studies disagreed. What is the issue?",
            options: [
              "None — the aggregate finding is what matters",
              "Oversimplification — presenting a mixed body of evidence as uniform hides real disagreement in the literature",
              "Style issue only",
              "Only a problem if the disagreement is large",
            ],
            correctAnswer: "Oversimplification — presenting a mixed body of evidence as uniform hides real disagreement in the literature",
            points: 2,
          },
          {
            order: 5,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks for a balanced literature review. The model cites only sources supporting one conclusion, omitting well-known contradicting work. How should this be scored?",
            options: [
              "Full marks — each individual citation is accurate",
              "Low — selective citation that omits known contradicting work fails the explicit request for balance",
              "Ignore the balance request",
              "Full marks if the supporting sources are high quality",
            ],
            correctAnswer: "Low — selective citation that omits known contradicting work fails the explicit request for balance",
            points: 2,
          },
          {
            order: 6,
            type: "MULTIPLE_CHOICE",
            prompt: "A model reports a study's finding as statistically significant without mentioning the effect size, which turns out to be negligible. What is missing?",
            options: [
              "Nothing — statistical significance is the key fact",
              "Context needed to judge practical importance — a significant but tiny effect size can be practically meaningless",
              "Nothing, unless the sample size was small",
              "Nothing, effect size is only relevant in medicine",
            ],
            correctAnswer: "Context needed to judge practical importance — a significant but tiny effect size can be practically meaningless",
            points: 2,
          },
          {
            order: 7,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks a one-line question about one study's finding. The model responds with 500 words covering the entire field's history. A different response answers the exact question in two sentences with the finding and its source. Which is better?",
            options: [
              "The 500-word one — more coverage is always better",
              "The two-sentence one — it answers what was asked without burying the point",
              "They are equal since both are technically correct",
              "Neither, length should never factor into scoring",
            ],
            correctAnswer: "The two-sentence one — it answers what was asked without burying the point",
            points: 2,
          },
          {
            order: 8,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states early on that \"the evidence strongly supports X,\" then later in the same summary says \"findings on X have been mixed and inconclusive.\" How should this be scored?",
            options: [
              "Fine — both statements might be useful",
              "Flagged — the response contradicts itself, leaving the reader unable to tell how strong the evidence actually is",
              "Ignore it, the second statement is probably the more accurate one",
              "Full marks if either statement is accurate",
            ],
            correctAnswer: "Flagged — the response contradicts itself, leaving the reader unable to tell how strong the evidence actually is",
            points: 2,
          },
          {
            order: 9,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks for the sources listed with full citations in a reference list. The model discusses the sources in prose without ever listing them formally. How do you score instruction following?",
            options: [
              "Full marks — the content is what matters, not the format",
              "Low — it did not follow the explicitly requested citation format",
              "Ignore the format request",
              "Full marks if the prose is well organized",
            ],
            correctAnswer: "Low — it did not follow the explicitly requested citation format",
            points: 2,
          },
          {
            order: 10,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks about findings on one specific question. The model answers that, then also unsolicited-ly summarizes findings on three other unrelated research questions the user never asked about. How should this be scored?",
            options: [
              "Full marks — the extra summaries are a bonus",
              "Flagged — unrequested summaries of unrelated questions dilute the focused answer that was actually asked for",
              "Ignore the extra content",
              "Full marks if the extra summaries happen to be accurate",
            ],
            correctAnswer: "Flagged — unrequested summaries of unrelated questions dilute the focused answer that was actually asked for",
            points: 2,
          },
          {
            order: 11,
            type: "MULTIPLE_CHOICE",
            prompt: "A model explains the difference between two similar-sounding research designs (e.g. two types of study), but its explanation actually swaps which one applies to which case. What is this?",
            options: [
              "A minor wording issue",
              "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
              "Not an error if the terms are used consistently within the answer",
              "Only a problem for methodologists",
            ],
            correctAnswer: "A substantive error — the core distinction being explained is inverted, which is worse than being vague",
            points: 2,
          },
          {
            order: 12,
            type: "MULTIPLE_CHOICE",
            prompt: "The user's question contains a wrong premise about research (e.g. \"since peer review guarantees a study is correct...\"). The model answers around the premise without ever correcting it. How should this be scored?",
            options: [
              "Full marks — it answered helpfully",
              "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
              "Ignore the premise, only the direct answer matters",
              "Full marks if the rest of the answer is accurate",
            ],
            correctAnswer: "Flagged — silently accepting a wrong premise lets a misconception stand uncorrected",
            points: 2,
          },
          {
            order: 13,
            type: "MULTIPLE_CHOICE",
            prompt: "A model gives an accurate, well-supported summary of the literature, but hedges so heavily (\"this might possibly be the finding, though it's hard to say\") that the useful content is hard to find. How should this be scored?",
            options: [
              "Full marks — hedging shows appropriate academic caution",
              "Flagged — excessive hedging on something the model could state plainly undermines a summary that is actually well-supported",
              "Ignore the hedging entirely",
              "Full marks as long as the hedged claim is technically true",
            ],
            correctAnswer: "Flagged — excessive hedging on something the model could state plainly undermines a summary that is actually well-supported",
            points: 2,
          },
          {
            order: 14,
            type: "MULTIPLE_CHOICE",
            prompt: "Two responses both correctly note that a study has limitations. One names the specific limitation (e.g. small, non-representative sample) and how it affects the conclusion; the other says only \"there are some limitations to consider.\" Which is more useful?",
            options: [
              "They're equally useful since both are technically correct",
              "The specific one — actionable detail lets the reader actually weigh the finding",
              "The vague one — it's more concise",
              "Cannot be judged without more context",
            ],
            correctAnswer: "The specific one — actionable detail lets the reader actually weigh the finding",
            points: 2,
          },
          {
            order: 15,
            type: "MULTIPLE_CHOICE",
            prompt: "A model states a specific figure (\"the effect size was 0.8\") without saying what metric that's measured in or what a reasonable comparison point would be. How should this be scored?",
            options: [
              "Full marks — a precise-looking number is more convincing",
              "Flagged — an unqualified figure with no stated metric or context is hard to interpret and can be misleading",
              "Irrelevant to scoring",
              "Full marks if the number sounds plausible",
            ],
            correctAnswer: "Flagged — an unqualified figure with no stated metric or context is hard to interpret and can be misleading",
            points: 2,
          },
          {
            order: 16,
            type: "MULTIPLE_CHOICE",
            prompt: "The user explicitly asks only for sources published in peer-reviewed journals. The model's summary cites a mix of blog posts and journal articles without distinguishing them. How should this be scored?",
            options: [
              "Full marks if the cited content is otherwise accurate",
              "Failed — mixing in non-peer-reviewed sources, unflagged, violates the explicit stated constraint",
              "Acceptable, the user can check the sources themselves",
              "Only a problem if the model never cites anything at all",
            ],
            correctAnswer: "Failed — mixing in non-peer-reviewed sources, unflagged, violates the explicit stated constraint",
            points: 2,
          },
          {
            order: 17,
            type: "MULTIPLE_CHOICE",
            prompt: "A model correctly flags an unrequested but material issue — that a cited study was later retracted or superseded — alongside answering the question as asked. How should this factor into scoring?",
            options: [
              "It shouldn't — the user only asked to summarize the finding",
              "It should be rewarded — surfacing a material, unrequested retraction is more valuable than summarizing a finding that's no longer considered valid",
              "It's a distraction from answering the actual question",
              "Only relevant if the user explicitly asks about retractions",
            ],
            correctAnswer: "It should be rewarded — surfacing a material, unrequested retraction is more valuable than summarizing a finding that's no longer considered valid",
            points: 2,
          },
          {
            order: 18,
            type: "MULTIPLE_CHOICE",
            prompt: "A model reads one study's abstract and confidently states the field's consensus, without checking whether that framing fits a second study already mentioned earlier in the conversation. What's the risk in this reasoning?",
            options: [
              "None — one abstract is enough to state a field's consensus",
              "An untested assumption is being stated as a confirmed conclusion, when checking the other study could confirm or rule it out",
              "It's fine as long as the conclusion happens to be right",
              "This is only a concern in formal systematic reviews",
            ],
            correctAnswer: "An untested assumption is being stated as a confirmed conclusion, when checking the other study could confirm or rule it out",
            points: 2,
          },
          {
            order: 19,
            type: "MULTIPLE_CHOICE",
            prompt: "The user asks the model to summarize a long report's methodology section. The model's summary includes a specific method that isn't actually anywhere in the source section. What is the most accurate label for this?",
            options: [
              "A minor paraphrasing choice",
              "Hallucination — the summary states something the source doesn't support",
              "An instruction-following failure",
              "Not a problem if that method is common for similar studies",
            ],
            correctAnswer: "Hallucination — the summary states something the source doesn't support",
            points: 2,
          },
          {
            order: 20,
            type: "MULTIPLE_CHOICE",
            prompt: "A model refuses to summarize a published study on a sensitive social topic because it superficially sounds controversial, even though the request is a completely benign request to summarize publicly available research. How should this be scored?",
            options: [
              "Full marks — caution is always the safe choice",
              "Flagged — an over-broad refusal on a genuinely benign research-summary request is a real failure, not a safe default",
              "Ignore it, refusals are never wrong",
              "Full marks as long as the refusal is politely worded",
            ],
            correctAnswer: "Flagged — an over-broad refusal on a genuinely benign research-summary request is a real failure, not a safe default",
            points: 2,
          },
          {
            order: 21,
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
  // Seeded READY with content, matching what processExport would produce for
  // this dataset — the demo org should show a working download, not a row
  // stuck in QUEUED.
  const seededExport = await prisma.export.create({
    data: {
      datasetId: dataset.id,
      format: "jsonl",
      status: "READY",
      requestedBy: clientAdmin.id,
      content: [
        JSON.stringify({ prompt: "Explain TCP vs UDP", chosen: "B", rejected: "A" }),
        JSON.stringify({ prompt: "Summarise this contract clause", chosen: "A", rejected: "B" }),
      ].join("\n"),
      completedAt: new Date(),
    },
  });
  await prisma.export.update({
    where: { id: seededExport.id },
    data: { fileUrl: `/api/v1/exports/${seededExport.id}/download` },
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

import { describe, expect, it } from "vitest";

import {
  aggregateSkillScores,
  profileFromScores,
  tierFor,
} from "@/server/services/readiness";
import { gradeScreener } from "@/server/services/screener-key";
import { SCREENER_QUESTIONS } from "@/lib/constants/screener";
import { SCREENER_ANSWER_KEY } from "@/server/services/screener-key";

function response(skillArea: string | null, pointsAwarded: number | null, points = 2) {
  return { pointsAwarded, question: { skillArea, points } };
}

describe("readiness skill aggregation", () => {
  it("groups graded responses by skill area into 0–1 scores", () => {
    const skills = aggregateSkillScores([
      response("Technical accuracy", 2),
      response("Technical accuracy", 1),
      response("Safety judgment", 2),
    ]);

    const tech = skills.find((s) => s.skillArea === "Technical accuracy")!;
    const safety = skills.find((s) => s.skillArea === "Safety judgment")!;
    expect(tech.score).toBeCloseTo(3 / 4, 5); // 3 earned of 4 possible
    expect(tech.questionsGraded).toBe(2);
    expect(safety.score).toBe(1);
  });

  it("ignores ungraded (written, not yet reviewed) responses and untagged questions", () => {
    const skills = aggregateSkillScores([
      response("Calibration", null), // written answer awaiting human review
      response(null, 2), // qualification-style question with no skill tag
      response("Calibration", 2),
    ]);

    expect(skills).toHaveLength(1);
    expect(skills[0].skillArea).toBe("Calibration");
    expect(skills[0].questionsGraded).toBe(1);
  });

  it("sorts skills strongest first", () => {
    const skills = aggregateSkillScores([
      response("Weak", 0),
      response("Strong", 2),
      response("Middle", 1),
    ]);
    expect(skills.map((s) => s.skillArea)).toEqual(["Strong", "Middle", "Weak"]);
  });

  it("overall is the mean of per-skill scores, null with no graded data", () => {
    expect(profileFromScores([], 0).overall).toBeNull();
    const profile = profileFromScores(
      [
        { skillArea: "A", score: 1, questionsGraded: 1 },
        { skillArea: "B", score: 0.5, questionsGraded: 1 },
      ],
      2
    );
    expect(profile.overall).toBeCloseTo(0.75, 5);
    expect(profile.examsCompleted).toBe(2);
  });

  it("assigns tiers on the documented bands", () => {
    expect(tierFor(0.9)).toBe("EXPERT");
    expect(tierFor(0.85)).toBe("EXPERT");
    expect(tierFor(0.7)).toBe("ADVANCED");
    expect(tierFor(0.55)).toBe("PROFICIENT");
    expect(tierFor(0.4)).toBe("DEVELOPING");
  });
});

describe("application screener grading", () => {
  it("scores a perfect screener as 1", () => {
    expect(gradeScreener({ ...SCREENER_ANSWER_KEY })).toBe(1);
  });

  it("scores an all-wrong screener as 0", () => {
    const wrong = Object.fromEntries(SCREENER_QUESTIONS.map((q) => [q.id, "definitely not an option"]));
    expect(gradeScreener(wrong)).toBe(0);
  });

  it("scores one of two correct as 0.5", () => {
    const [first] = SCREENER_QUESTIONS;
    expect(gradeScreener({ [first.id]: SCREENER_ANSWER_KEY[first.id] })).toBe(0.5);
  });

  it("every screener question's correct answer is one of its offered options", () => {
    for (const q of SCREENER_QUESTIONS) {
      expect(q.options).toContain(SCREENER_ANSWER_KEY[q.id]);
    }
  });
});

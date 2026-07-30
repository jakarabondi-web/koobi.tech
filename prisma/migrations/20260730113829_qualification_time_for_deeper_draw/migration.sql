-- Attempts now draw 10 auto-graded questions (was 3). The old 15-minute
-- limit was sized for the short draw; give existing qualification exams
-- room to actually read and answer the longer one.
UPDATE "assessments"
SET "timeLimitMins" = 25
WHERE "kind" = 'QUALIFICATION' AND "timeLimitMins" = 15;

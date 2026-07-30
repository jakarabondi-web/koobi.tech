-- CreateEnum
CREATE TYPE "AssessmentKind" AS ENUM ('QUALIFICATION', 'READINESS');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "screenerAnswers" JSONB,
ADD COLUMN     "screenerScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "assessment_questions" ADD COLUMN     "skillArea" TEXT;

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "kind" "AssessmentKind" NOT NULL DEFAULT 'QUALIFICATION',
ADD COLUMN     "questionsPerAttempt" INTEGER NOT NULL DEFAULT 10;

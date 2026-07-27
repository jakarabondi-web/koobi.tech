-- AlterTable
ALTER TABLE "assessment_attempts" ADD COLUMN     "selectedQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

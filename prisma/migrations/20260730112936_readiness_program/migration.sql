-- CreateEnum
CREATE TYPE "AssessmentStage" AS ENUM ('SCREENER', 'QUALIFICATION');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "stage" "AssessmentStage" NOT NULL DEFAULT 'QUALIFICATION';

-- CreateTable
CREATE TABLE "readiness_tasks" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "responseA" TEXT NOT NULL,
    "responseB" TEXT NOT NULL,
    "correctChoice" TEXT NOT NULL,
    "guidance" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readiness_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readinessTaskId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readiness_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "readiness_attempts_userId_idx" ON "readiness_attempts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_attempts_userId_readinessTaskId_key" ON "readiness_attempts"("userId", "readinessTaskId");

-- AddForeignKey
ALTER TABLE "readiness_tasks" ADD CONSTRAINT "readiness_tasks_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_attempts" ADD CONSTRAINT "readiness_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_attempts" ADD CONSTRAINT "readiness_attempts_readinessTaskId_fkey" FOREIGN KEY ("readinessTaskId") REFERENCES "readiness_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

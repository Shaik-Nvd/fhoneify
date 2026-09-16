-- CreateEnum
CREATE TYPE "RefreshRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "ReferencePriceRefreshRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'cli',
    "status" "RefreshRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "devicesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "flaggedCount" INTEGER NOT NULL DEFAULT 0,
    "notAttemptedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "report" TEXT,

    CONSTRAINT "ReferencePriceRefreshRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferencePriceRefreshLock" (
    "name" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferencePriceRefreshLock_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "ReferencePriceRefreshRun_startedAt_idx" ON "ReferencePriceRefreshRun"("startedAt");

-- CreateIndex
CREATE INDEX "ReferencePriceRefreshRun_status_startedAt_idx" ON "ReferencePriceRefreshRun"("status", "startedAt");


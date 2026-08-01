-- CreateTable
CREATE TABLE "SyncDelete" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncDelete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncDelete_entity_recordId_key" ON "SyncDelete"("entity", "recordId");

-- CreateIndex
CREATE INDEX "SyncDelete_createdAt_idx" ON "SyncDelete"("createdAt");

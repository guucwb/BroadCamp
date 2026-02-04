-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "flowName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "error" TEXT,
    "userId" TEXT,
    "journeyId" TEXT,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vars" JSONB,
    "cursor" TEXT,
    "state" TEXT NOT NULL,
    "history" JSONB,
    "lastInbound" JSONB,
    "wait" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "contactId" TEXT,
    "phone" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT,
    "contentSid" TEXT,
    "variables" JSONB,
    "status" TEXT,
    "twilioSid" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentSid" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL,
    "category" TEXT,
    "variables" JSONB,
    "preview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "Journey_userId_idx" ON "Journey"("userId");

-- CreateIndex
CREATE INDEX "Journey_status_idx" ON "Journey"("status");

-- CreateIndex
CREATE INDEX "Journey_updatedAt_idx" ON "Journey"("updatedAt");

-- CreateIndex
CREATE INDEX "Run_userId_idx" ON "Run"("userId");

-- CreateIndex
CREATE INDEX "Run_status_idx" ON "Run"("status");

-- CreateIndex
CREATE INDEX "Run_journeyId_idx" ON "Run"("journeyId");

-- CreateIndex
CREATE INDEX "Run_createdAt_idx" ON "Run"("createdAt");

-- CreateIndex
CREATE INDEX "Run_flowId_idx" ON "Run"("flowId");

-- CreateIndex
CREATE INDEX "Contact_runId_idx" ON "Contact"("runId");

-- CreateIndex
CREATE INDEX "Contact_state_idx" ON "Contact"("state");

-- CreateIndex
CREATE INDEX "Contact_phone_idx" ON "Contact"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLog_twilioSid_key" ON "MessageLog"("twilioSid");

-- CreateIndex
CREATE INDEX "MessageLog_runId_idx" ON "MessageLog"("runId");

-- CreateIndex
CREATE INDEX "MessageLog_contactId_idx" ON "MessageLog"("contactId");

-- CreateIndex
CREATE INDEX "MessageLog_phone_idx" ON "MessageLog"("phone");

-- CreateIndex
CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");

-- CreateIndex
CREATE INDEX "MessageLog_twilioSid_idx" ON "MessageLog"("twilioSid");

-- CreateIndex
CREATE UNIQUE INDEX "Template_contentSid_key" ON "Template"("contentSid");

-- CreateIndex
CREATE INDEX "Template_status_idx" ON "Template"("status");

-- CreateIndex
CREATE INDEX "Template_channel_idx" ON "Template"("channel");

-- CreateIndex
CREATE INDEX "Template_contentSid_idx" ON "Template"("contentSid");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

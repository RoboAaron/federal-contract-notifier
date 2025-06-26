-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "budget" DOUBLE PRECISION,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "postedDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "naicsCodes" TEXT[],
    "setAside" TEXT,
    "pointOfContact" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "regions" TEXT[],
    "minBudget" DOUBLE PRECISION,
    "maxBudget" DOUBLE PRECISION,
    "notificationSettings" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnologyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnologyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OpportunityTechnologies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OpportunityTechnologies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NotifiedOpportunities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NotifiedOpportunities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SalesRepTechnologies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SalesRepTechnologies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_sourceUrl_key" ON "Opportunity"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_email_key" ON "SalesRep"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TechnologyCategory_name_key" ON "TechnologyCategory"("name");

-- CreateIndex
CREATE INDEX "_OpportunityTechnologies_B_index" ON "_OpportunityTechnologies"("B");

-- CreateIndex
CREATE INDEX "_NotifiedOpportunities_B_index" ON "_NotifiedOpportunities"("B");

-- CreateIndex
CREATE INDEX "_SalesRepTechnologies_B_index" ON "_SalesRepTechnologies"("B");

-- AddForeignKey
ALTER TABLE "_OpportunityTechnologies" ADD CONSTRAINT "_OpportunityTechnologies_A_fkey" FOREIGN KEY ("A") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OpportunityTechnologies" ADD CONSTRAINT "_OpportunityTechnologies_B_fkey" FOREIGN KEY ("B") REFERENCES "TechnologyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NotifiedOpportunities" ADD CONSTRAINT "_NotifiedOpportunities_A_fkey" FOREIGN KEY ("A") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NotifiedOpportunities" ADD CONSTRAINT "_NotifiedOpportunities_B_fkey" FOREIGN KEY ("B") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SalesRepTechnologies" ADD CONSTRAINT "_SalesRepTechnologies_A_fkey" FOREIGN KEY ("A") REFERENCES "SalesRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SalesRepTechnologies" ADD CONSTRAINT "_SalesRepTechnologies_B_fkey" FOREIGN KEY ("B") REFERENCES "TechnologyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

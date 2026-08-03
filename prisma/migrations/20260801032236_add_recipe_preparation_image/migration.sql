-- AlterTable
ALTER TABLE "ExternalItemMapping" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "IntegrationAccount" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "image" TEXT,
ADD COLUMN     "preparation" TEXT;

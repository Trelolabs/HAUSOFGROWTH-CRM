-- CreateEnum
CREATE TYPE "EmailBodyType" AS ENUM ('HTML', 'TEXT');

-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "bodyType" "EmailBodyType" NOT NULL DEFAULT 'HTML',
ADD COLUMN     "textContent" TEXT,
ALTER COLUMN "htmlContent" DROP NOT NULL;

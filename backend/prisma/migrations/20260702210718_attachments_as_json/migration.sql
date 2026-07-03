/*
  Warnings:

  - You are about to drop the `TemplateAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TemplateAttachment" DROP CONSTRAINT "TemplateAttachment_templateId_fkey";

-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "attachments" JSONB;

-- DropTable
DROP TABLE "TemplateAttachment";

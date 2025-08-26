/*
  Warnings:

  - You are about to drop the column `actions` on the `automation_workflows` table. All the data in the column will be lost.
  - You are about to drop the column `flowData` on the `automation_workflows` table. All the data in the column will be lost.
  - You are about to drop the column `trigger` on the `automation_workflows` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `integrations` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `integrations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `integrations` table. All the data in the column will be lost.
  - Added the required column `definition` to the `automation_workflows` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."automation_workflows" DROP COLUMN "actions",
DROP COLUMN "flowData",
DROP COLUMN "trigger",
ADD COLUMN     "definition" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "public"."integrations" DROP COLUMN "createdAt",
DROP COLUMN "settings",
DROP COLUMN "updatedAt";

/*
  Warnings:

  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'INSTITUTION_ADMIN', 'TEACHER', 'STUDENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role_new" "Role";

UPDATE "User"
SET "role_new" = (
  CASE UPPER("role")
    WHEN 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
    WHEN 'ADMIN' THEN 'ADMIN'
    WHEN 'INSTITUTION_ADMIN' THEN 'INSTITUTION_ADMIN'
    WHEN 'TEACHER' THEN 'TEACHER'
    WHEN 'STUDENT' THEN 'STUDENT'
    ELSE 'STUDENT'
  END
)::"Role";

ALTER TABLE "User" ALTER COLUMN "role_new" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";

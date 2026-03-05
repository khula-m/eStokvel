-- Multi-Group Roles Migration
-- Purpose: Remove global ADMIN role from UserRole enum.
-- Users are now SUPERADMIN or MEMBER at the global level.
-- Per-group admin/member status comes from the Member.role (MemberRole) field.

-- Step 1: Migrate existing ADMIN users to MEMBER (global role)
-- Their per-group admin status is already correct via Member.role = 'ADMIN'
UPDATE "User" SET "role" = 'MEMBER' WHERE "role" = 'ADMIN';

-- Step 2: Drop the adminId column from stokvel_groups
-- (group admins are now determined by Member.role = 'ADMIN' for that group)
ALTER TABLE "stokvel_groups" DROP COLUMN IF EXISTS "adminId";

-- Step 3: Remove ADMIN from UserRole enum
-- PostgreSQL requires recreating the enum type
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'MEMBER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
DROP TYPE "UserRole_old";

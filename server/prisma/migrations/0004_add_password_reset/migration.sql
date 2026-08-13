-- Add password reset code fields to User (SQLite)
ALTER TABLE "User" ADD COLUMN "resetCode" TEXT;
ALTER TABLE "User" ADD COLUMN "resetCodeExpiresAt" DATETIME;

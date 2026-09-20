-- Add administrative authentication fields to User.
-- Nullable because regular application users do not authenticate
-- through the administrative web login.

ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
